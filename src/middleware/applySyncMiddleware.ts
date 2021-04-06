import { Database, DatabaseEventsMap } from '../db/Database'

/**
 * Synchronizes database updates between multiple clients.
 * Used for client-side execution only.
 */
export function applySyncMiddleware(db: Database<any>) {
  if (typeof window === 'undefined') {
    return
  }

  if (typeof BroadcastChannel === 'undefined') {
    console.warn(
      `[MSW] Failed to apply a synchronization middleware for a virtual database: expected a BroadcastChannel to be defined, but got ${typeof BroadcastChannel}.`,
    )
    return
  }

  const channel = new BroadcastChannel('mswjs-data-channel')

  channel.addEventListener('message', (event) => {
    const { operationType, data } = event.data

    // Stop broadcasting so that the sync operations performed below
    // do not trigger a channel message to other clients, resulting in
    // an infinite loop.
    db.stopBroadcasting()

    if (!(operationType in db)) {
      db.resumeBroadcasting()
      throw new Error(`Unknown database event "${operationType}".`)
    }

    db[operationType](...data)

    db.resumeBroadcasting()
  })

  function broadcastDatabaseEvent<Event extends keyof DatabaseEventsMap>(
    operationType: Event,
  ) {
    return (...data: Parameters<DatabaseEventsMap[Event]>) => {
      channel.postMessage({ operationType, data })
    }
  }

  // Whenever the current database changes, signal that change
  // to all the other database instances to update.
  db.events.on('create', broadcastDatabaseEvent('create'))
  db.events.on('update', broadcastDatabaseEvent('update'))
  db.events.on('delete', broadcastDatabaseEvent('delete'))
}
