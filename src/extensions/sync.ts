import { set } from 'lodash-es'
import { defineExtension } from '#/src/extensions/index.js'
import {
  kCollectionId,
  kPrimaryKey,
  kRelationMap,
  type Collection,
  type RecordType,
} from '#/src/collection.js'
import { Query } from '#/src/query.js'
import { isObject, type PropertyPath } from '#/src/utils.js'
import { Logger } from '#/src/logger.js'
import {
  serializeRecord,
  createFromSerializedRecord,
  type SerializedRecord,
} from '#/src/extensions/persist.js'

type BroadcastOperation =
  | {
      type: 'create'
      senderId: Collection<any>[typeof kCollectionId]
      record: SerializedRecord
    }
  | {
      type: 'update'
      senderId: Collection<any>[typeof kCollectionId]
      primaryKey: string
      path: PropertyPath
      nextValue: unknown
    }
  | {
      type: 'delete'
      senderId: Collection<any>[typeof kCollectionId]
      primaryKey: string
    }

const BROADCAST_CHANNEL_NAME = 'msw/data/sync'

/**
 * Synchronizes collection operations (create/update/delete)
 * with the same collection in another browser tab(s).
 */
export function sync() {
  const logger = new Logger('extension').extend('sync')

  return defineExtension({
    name: 'sync',
    extend(collection) {
      if (
        typeof window === 'undefined' ||
        typeof BroadcastChannel === 'undefined'
      ) {
        return
      }

      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
      const hookContext = { skip: false }

      logger.log('applying extension...', { channel })

      const performWithoutBroadcasting = async (
        callback: () => Promise<void>,
      ): Promise<void> => {
        try {
          hookContext.skip = true
          await callback()
        } finally {
          hookContext.skip = false
        }
      }

      channel.onmessage = async (event: MessageEvent<BroadcastOperation>) => {
        const { data } = event

        if (!isObject(data)) {
          return
        }

        logger.log(
          `sync event from another collection (${event.data.type})`,
          event,
        )

        // Ignore sync events from irrelevant collections.
        // This only works because collection ID is based on the call order
        // and remains reproducible across runtimes.
        if (data.senderId !== collection[kCollectionId]) {
          logger.log(
            `sender id (${data.senderId}) differs from this collection id (${collection[kCollectionId]}), skipping...`,
          )
          return
        }

        switch (data.type) {
          case 'create': {
            logger.warn('creating new record...', data)

            /**
             * @note Use the `.create()` method to correctly evolve the schema.
             * This way, non-serializable schemas can survive sync as long as
             * the initial values are serializable.
             */
            await performWithoutBroadcasting(async () => {
              const record = await createFromSerializedRecord(
                collection,
                data.record,
              )

              /**
               * @note Extraneous records might not have been associated with their owners
               * at the time of sync. Manually ensure the owner is referenced in those relations.
               */
              record[kRelationMap].forEach((relation) => {
                relation.foreignCollections.forEach((foreignCollection) => {
                  const foreignRecords = foreignCollection.findMany((q) =>
                    q.where((foreignRecord) => {
                      return relation.foreignKeys.has(
                        foreignRecord[kPrimaryKey],
                      )
                    }),
                  )

                  const foreignRelations = foreignRecords.flatMap(
                    (foreignRecord) => {
                      return relation.getRelationsToOwner(foreignRecord)
                    },
                  )
                  foreignRelations.forEach((foreignRelation) => {
                    foreignRelation.foreignKeys.add(record[kPrimaryKey])
                  })
                })
              })
            })
            break
          }

          case 'update': {
            logger.log('updating record...')

            await performWithoutBroadcasting(async () => {
              collection.update(
                (q: Query<any>) =>
                  q.where((record: RecordType) => {
                    return record[kPrimaryKey] === data.primaryKey
                  }),
                {
                  data(record) {
                    set(record, data.path, data.nextValue)
                  },
                },
              )
            })
            break
          }

          case 'delete': {
            logger.log('deleting record...')

            await performWithoutBroadcasting(async () => {
              collection.delete((q: Query<any>) =>
                q.where((record: RecordType) => {
                  return record[kPrimaryKey] === data.primaryKey
                }),
              )
            })
            break
          }

          default: {
            // @ts-expect-error Runtime validation.
            throw new Error(`Unknown sync event type "${data.type}"`)
          }
        }
      }

      channel.onmessageerror = (event) => {
        logger.log('sync channel error!', event)
      }

      const broadcastOperation = (operation: BroadcastOperation): void => {
        logger.log('broadcasting...', operation)
        channel.postMessage(operation)
      }

      collection.hooks.on('create', (event) => {
        const { record, initialValues } = event.data

        logger.warn(
          'record created, should broadcast?',
          { record, initialValues },
          !hookContext.skip,
        )

        if (!hookContext.skip) {
          broadcastOperation({
            type: 'create',
            senderId: collection[kCollectionId],
            record: serializeRecord(record),
          })
        }
      })

      collection.hooks.on('update', (event) => {
        const { prevRecord, path, nextValue } = event.data
        logger.log('record updated, should broadcast?', !hookContext.skip)

        if (!hookContext.skip) {
          broadcastOperation({
            type: 'update',
            senderId: collection[kCollectionId],
            primaryKey: prevRecord[kPrimaryKey],
            path,
            nextValue,
          })
        }
      })

      collection.hooks.on('delete', (event) => {
        logger.log('record deleted, should broadcast?', !hookContext.skip)

        if (!hookContext.skip) {
          broadcastOperation({
            type: 'delete',
            senderId: collection[kCollectionId],
            primaryKey: event.data.deletedRecord[kPrimaryKey],
          })
        }
      })
    },
  })
}
