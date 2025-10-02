import { invariant } from 'outvariant'
import { unset } from 'lodash-es'
import { defineExtension } from '#/src/extensions/index.js'
import {
  Collection,
  kCollectionId,
  kPrimaryKey,
  kRelationMap,
  type RecordType,
} from '#/src/collection.js'
import { Logger } from '#/src/logger.js'
import type { PropertyPath } from '#/src/utils.js'

const STORAGE_KEY = 'msw/data/storage'
const METADATA_KEY = '__metadata__'

interface SerializedCollection {
  version: number
  collectionId: number
  records: Array<SerializedRecord>
}

export interface SerializedRecord {
  [key: string]: unknown
  [METADATA_KEY]: RecordMetadata
}

interface RecordMetadata {
  primaryKey: string
  relations: Array<{
    path: PropertyPath
    foreignKeys: Array<string>
  }>
}

/**
 * Persists the collection between page reloads.
 */
export function persist() {
  return defineExtension({
    name: 'persist',
    async extend(collection) {
      if (
        typeof window === 'undefined' ||
        typeof localStorage === 'undefined'
      ) {
        return
      }

      const logger = new Logger('extension').extend('persist')
      const COLLECTION_KEY = `${STORAGE_KEY}/${collection[kCollectionId]}`

      // Flush the collection's on page unload.
      window.addEventListener('unload', () => {
        localStorage.setItem(
          COLLECTION_KEY,
          /**
           * @fixme Stringifying relations errors because they produce
           * circular structures. Relations have to be stripped out of the records.
           * Maybe preserved in the metadata?
           */
          JSON.stringify({
            version: 1,
            collectionId: collection[kCollectionId],
            records: collection.all().map(serializeRecord),
          } satisfies SerializedCollection),
        )
      })

      const rawPersistedData = localStorage.getItem(COLLECTION_KEY)

      if (!rawPersistedData) {
        return
      }
      const persistedData = JSON.parse(rawPersistedData) as SerializedCollection

      invariant(
        persistedData.collectionId === collection[kCollectionId],
        'Failed to hydrate data for collection "%s": parsed a state of an unknown collection "%s"',
        collection[kCollectionId],
        persistedData.collectionId,
      )

      logger.log(`found (${persistedData.records.length}) records to hydate!`)

      await Promise.all(
        persistedData.records.map(async (serializedRecord) => {
          logger.log('hydrating record...', { serializedRecord })
          await createFromSerializedRecord(collection, serializedRecord)
        }),
      )

      logger.log('hydration done!', collection.all())
    },
  })
}

export function serializeRecord(record: RecordType): SerializedRecord {
  const result = structuredClone(record) as any as SerializedRecord

  const metadata: RecordMetadata = {
    primaryKey: record[kPrimaryKey],
    relations: [],
  }

  // Delete relational keys since they can produce non-serializable structures.
  const relations = record[kRelationMap]
  for (const [path, relation] of relations) {
    metadata.relations.push({
      path: relation.path,
      foreignKeys: Array.from(relation.foreignKeys),
    })

    unset(result, path)
  }

  result[METADATA_KEY] = metadata

  return result
}

export function deserializeRecord(
  record: SerializedRecord,
): Record<string, any> {
  const metadata = record[METADATA_KEY]

  invariant(
    metadata,
    'Failed to deserialize record (%j): metadata is missing',
    record,
  )

  // Restore the primary key for this record so it's preserved across reloads.
  Object.defineProperties(record, {
    [kPrimaryKey]: {
      enumerable: false,
      configurable: false,
      value: metadata.primaryKey,
    },
  })

  delete record[METADATA_KEY as keyof typeof record]

  invariant(
    !(METADATA_KEY in record),
    'Failed to deserialize record (%j): metadata not cleared',
    record,
  )

  return record
}

export async function createFromSerializedRecord(
  collection: Collection<any>,
  serializedRecord: SerializedRecord,
): Promise<RecordType> {
  const metadata = serializedRecord[METADATA_KEY]
  const initialValues = deserializeRecord(serializedRecord)

  invariant(
    !(METADATA_KEY in initialValues),
    'Failed to create record from deserialized record (%j): metadata not cleared',
    initialValues,
  )

  const record: RecordType = await collection.create(initialValues)
  const relationMap = record[kRelationMap]

  for (const serializedRelation of metadata.relations) {
    const relation = relationMap.get(serializedRelation.path.join('.'))

    if (relation == null) {
      continue
    }

    for (const foreignKey of serializedRelation.foreignKeys) {
      relation.foreignKeys.add(foreignKey)
    }
  }

  return record
}
