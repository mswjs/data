import type { Collection } from '#/src/collection.js'

export interface Extension {
  /**
   * Name of your extension.
   */
  name: string

  /**
   * A function that is called when your extension is applied by a collection.
   * @param collection Reference to the `Collection` instance that applies the extension.
   */
  extend: (collection: Collection<any>) => void
}

/**
 * Creates a new extension.
 */
export function defineExtension(options: Extension): Extension {
  return options
}
