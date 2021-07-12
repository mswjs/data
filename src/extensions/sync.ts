import { Database, DatabaseEventsMap } from '../db/Database'
import { isBrowser, supports } from '../utils/env'

interface DatabaseMessageEventData<
  OperationType extends keyof DatabaseEventsMap
> {
  operationType: OperationType
  payload: DatabaseEventsMap[OperationType]
}

function removeListeners<Event extends keyof DatabaseEventsMap>(
  event: Event,
  db: Database<any>,
) {
  const listeners = db.events.listeners(event) as DatabaseEventsMap[Event][]
  listeners.forEach((listener) => {
    db.events.removeListener(event, listener)
  })

  return () => {
    listeners.forEach((listener) => {
      db.events.addListener(event, listener)
    })
  }
}

/**
 * Synchronizes database operations across multiple clients.
 */
export function sync(db: Database<any>) {
  if (!isBrowser() || !supports.broadcastChannel()) {
    return
  }

  const channel = new BroadcastChannel('mswjs/data/sync')

  channel.addEventListener(
    'message',
    (event: MessageEvent<DatabaseMessageEventData<any>>) => {
      const { operationType, payload } = event.data
      const [sourceId, ...args] = payload

      // Ignore messages originating from unrelated databases.
      // Useful in case of multiple databases on the same page.
      if (db.id !== sourceId) {
        return
      }

      // Remove database event listener for the signaled operation
      // to prevent an infinite loop when applying this operation.
      const restoreListeners = removeListeners(operationType, db)

      // Apply the database operation signaled from another client
      // to the current database instance.
      // @ts-ignore
      db[operationType](...args)

      // Re-attach database event listeners.
      restoreListeners()
    },
  )

  function broadcastDatabaseEvent<Event extends keyof DatabaseEventsMap>(
    operationType: Event,
  ) {
    return (...args: Parameters<DatabaseEventsMap[Event]>) => {
      channel.postMessage({
        operationType,
        payload: args,
      })
    }
  }

  db.events.on('create', broadcastDatabaseEvent('create'))
  db.events.on('update', broadcastDatabaseEvent('update'))
  db.events.on('delete', broadcastDatabaseEvent('delete'))
}
