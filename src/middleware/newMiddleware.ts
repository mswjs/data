import { LiveStorage } from '@mswjs/storage'
import { Database } from '../db/Database'

function propagateUpdate(
  db: Database<any>,
  storage: LiveStorage<Database<any>>,
) {
  return (...args: any[]) => {
    db.stopBroadcasting()

    storage.update((db) => {
      console.warn('Should update dbs', args)
      return db
    })

    db.resumeBroadcasting()
  }
}

export function applyStorage<DatabaseType extends Database<any>>(
  db: DatabaseType,
) {
  const storage = new LiveStorage<DatabaseType>('key', db)

  db.events.on('create', propagateUpdate(db, storage))
}
