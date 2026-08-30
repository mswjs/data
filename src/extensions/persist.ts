import { invariant } from 'outvariant'
import { defineExtension } from '#/src/extensions/index.js'
import {
  kCollectionId,
  kPrimaryKey,
  kRelationMap,
  type Collection,
  type RecordType,
} from '#/src/collection.js'
import { Logger } from '#/src/logger.js'
import { isObject, isRecord, sanitizeInitialValues } from '#/src/utils.js'

const STORAGE_KEY = 'msw/data/storage'
const STORAGE_VERSION = 2
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
}

function isSerializedRecord(value: unknown): value is SerializedRecord {
  return isObject(value) && METADATA_KEY in value
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

      /**
       * @note Flush the collection whenever the page becomes hidden.
       * This covers reloads, navigations, and closing the page.
       * The `unload` event is deprecated and blocked by Chrome.
       */
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'hidden') {
          return
        }

        localStorage.setItem(
          COLLECTION_KEY,
          JSON.stringify({
            version: STORAGE_VERSION,
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

      if (persistedData.version !== STORAGE_VERSION) {
        logger.warn(
          `skipping hydration: persisted data version (${persistedData.version}) is incompatible with the current version (${STORAGE_VERSION})`,
        )
        return
      }

      invariant(
        persistedData.collectionId === collection[kCollectionId],
        'Failed to hydrate data for collection "%s": parsed a state of an unknown collection "%s"',
        collection[kCollectionId],
        persistedData.collectionId,
      )

      logger.log(`found (${persistedData.records.length}) records to hydrate!`)

      /**
       * @note Defer hydration until the collection is constructed so that
       * relations defined right after the construction are initialized
       * for the hydrated records.
       */
      await Promise.resolve()

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

/**
 * Serializes the given record into a plain structure that is a valid input
 * to the schema of its collection. Relational properties are resolved into
 * snapshots of the foreign records, breaking self-referencing cycles
 * the same way the collection does when validating records.
 * Primary keys of the record and all the nested records are preserved in the metadata.
 */
export function serializeRecord(record: RecordType): SerializedRecord {
  const { sanitizedInitialValues } = sanitizeInitialValues(record)
  const serializedRecord = attachMetadata(sanitizedInitialValues)

  invariant(
    isSerializedRecord(serializedRecord),
    'Failed to serialize record "%s": serialized value is not a record',
    record[kPrimaryKey],
  )

  return serializedRecord
}

function attachMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(attachMetadata)
  }

  if (isObject(value)) {
    for (const key of Object.keys(value)) {
      value[key] = attachMetadata(value[key])
    }

    if (isRecord(value)) {
      const metadata: RecordMetadata = { primaryKey: value[kPrimaryKey] }
      value[METADATA_KEY] = metadata
    }
  }

  return value
}

/**
 * Restores the internal properties of the serialized record and all the nested records.
 */
export function deserializeRecord(
  serializedRecord: SerializedRecord,
): Record<string, unknown> {
  restoreInternals(serializedRecord)
  return serializedRecord
}

function restoreInternals(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(restoreInternals)
    return
  }

  if (!isObject(value)) {
    return
  }

  for (const key of Object.keys(value)) {
    restoreInternals(value[key])
  }

  if (isSerializedRecord(value)) {
    const { primaryKey } = value[METADATA_KEY]
    Reflect.deleteProperty(value, METADATA_KEY)

    Object.defineProperties(value, {
      [kPrimaryKey]: {
        enumerable: false,
        configurable: false,
        value: primaryKey,
      },
      /**
       * @note Snapshots of foreign records have no relations of their own.
       * Define an empty relation map so they are treated as records
       * (e.g. when checking unique relations).
       */
      [kRelationMap]: {
        enumerable: false,
        configurable: true,
        value: new Map(),
      },
    })
  }
}

export async function createFromSerializedRecord(
  collection: Collection<any>,
  serializedRecord: SerializedRecord,
): Promise<RecordType> {
  return collection.create(deserializeRecord(serializedRecord))
}
