import debounce from 'lodash/debounce'
import { DATABASE_INSTANCE, FactoryAPI } from '../glossary'
import { isBrowser, supports } from '../utils/env'

type ExtensionOption = {
  storage?: Pick<Storage, 'getItem' | 'setItem'>
  keyPrefix?: string
}

const STORAGE_KEY_PREFIX = 'mswjs-data'

// Timout to persist state with some delay
const DEBOUNCE_PERSIST_TIME_MS = 10

/**
 * Persist database in session storage
 */
export function persist(
  factory: FactoryAPI<any>,
  options: ExtensionOption = {},
) {
  if (!isBrowser() || (!options.storage && !supports.sessionStorage())) {
    return
  }

  const storage = options.storage || sessionStorage
  const keyPrefix = options.keyPrefix || STORAGE_KEY_PREFIX

  const db = factory[DATABASE_INSTANCE]

  const key = `${keyPrefix}/${db.id}`

  const persistState = debounce(function persistState() {
    const json = db.toJson()
    storage.setItem(key, JSON.stringify(json))
  }, DEBOUNCE_PERSIST_TIME_MS)

  function hydrateState() {
    const initialState = storage.getItem(key)

    if (initialState) {
      db.hydrate(JSON.parse(initialState))
    }

    // Add event listeners only after hydration
    db.events.on('create', persistState)
    db.events.on('update', persistState)
    db.events.on('delete', persistState)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateState)
  } else {
    hydrateState()
  }
}
