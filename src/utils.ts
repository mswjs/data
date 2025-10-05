import { invariant } from 'outvariant'
import { isPlainObject } from 'es-toolkit'
import { kPrimaryKey, type RecordType } from '#/src/collection.js'

/**
 * Checks if the given value is a plain object.
 */
export function isObject(value: unknown): value is Record<string, any> {
  return isPlainObject(value)
}

/**
 * Checks if the given value is a record object.
 */
export function isRecord(value: unknown): value is RecordType {
  /**
   * @note Have a loose object check, allowing arrays, since records
   * might be root-level arrays.
   */
  return typeof value === 'object' && value != null && kPrimaryKey in value
}

export function definePropertyAtPath(
  target: Record<string | number | symbol, any>,
  path: Array<string | number | symbol>,
  descriptor: PropertyDescriptor,
): void {
  let deepTarget = target
  const lastKey = path[path.length - 1]

  invariant(
    lastKey != null,
    'Failed to define a property at path "%j": expected the path to have at least one item',
    path,
  )

  for (const key of path.slice(0, -1)) {
    invariant(
      typeof deepTarget[key] === 'object',
      'Failed to define property at path "%j": part "%s" is not an object',
      path,
      key,
    )
    deepTarget = deepTarget[key]
  }

  Object.defineProperty(deepTarget, lastKey, descriptor)
}

export type PropertyPath = Array<string | number | symbol>

export function toDeepEntries<V>(
  source: Record<string | symbol, V>,
  entryPredicate: (value: unknown, path: PropertyPath) => boolean = () => true,
  parentPath: PropertyPath = [],
): Array<[PropertyPath, V]> {
  return Reflect.ownKeys(source).flatMap((key) => {
    const value = source[key]
    const path = parentPath.concat(key)

    if (entryPredicate(value, path)) {
      if (isObject(value)) {
        return toDeepEntries(value, entryPredicate, path)
      }
    }

    return [[path, value]]
  })
}

export function cloneWithInternals<T>(
  value: T,
  predicate: (args: {
    key: string | symbol
    descriptor: PropertyDescriptor
  }) => boolean,
): T {
  const clone = structuredClone(value)
  const descriptors = Object.getOwnPropertyDescriptors(value)

  for (const key of Reflect.ownKeys(descriptors)) {
    const descriptor = descriptors[key as keyof typeof descriptors]

    if (predicate({ key, descriptor }) ?? true) {
      Object.defineProperty(clone, key, descriptor)
    }
  }

  return clone
}
