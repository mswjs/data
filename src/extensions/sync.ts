import { Database, DatabaseEventsMap } from '../db/Database'

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
  const IS_BROWSER = typeof window !== 'undefined'
  const SUPPORTS_BROADCAST_CHANNEL = typeof BroadcastChannel !== 'undefined'

  if (!IS_BROWSER || !SUPPORTS_BROADCAST_CHANNEL) {
    return
  }

  const channel = new BroadcastChannel('mswjs/data/sync')

  channel.addEventListener(
    'message',
    (event: MessageEvent<DatabaseMessageEventData<any>>) => {
      const { operationType, payload } = event.data
      console.warn('[sync]', operationType, payload)

      // Remove database event listener for the signaled operation
      // to prevent an infinite loop when applying this operation.
      const restoreListeners = removeListeners(operationType, db)

      // Apply the database operation signaled from another client
      // to the current database instance.
      // @ts-ignore
      db[operationType](...payload)

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
