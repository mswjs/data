import { Database } from '../db/Database'
import { isBrowser, supports } from '../utils/env'

const STORAGE_KEY_PREFIX = 'mswjs-data'

/**
 * Persists database state into `sessionStorage` and
 * hydrates from it on the initial page load.
 */
export function persist(db: Database<any>) {
  if (!isBrowser() || !supports.sessionStorage()) {
    return
  }

  const key = `${STORAGE_KEY_PREFIX}/${db.id}`

  function persistState() {
    const json = db.toJson()
    console.log('persists state to storage...', json)
    sessionStorage.setItem(key, JSON.stringify(json))
  }

  db.events.addListener('create', persistState)
  db.events.addListener('update', persistState)
  db.events.addListener('delete', persistState)

  function hydrateState() {
    const initialState = sessionStorage.getItem(key)

    if (!initialState) {
      return
    }

    console.log('should hydrate from "%s"', key, initialState)
    db.hydrate(JSON.parse(initialState))
  }

  window.addEventListener('load', hydrateState)
}
