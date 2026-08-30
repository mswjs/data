import { invariant } from 'outvariant'
import { isPlainObject } from 'es-toolkit'
import { kPrimaryKey, kRelationMap, type RecordType } from '#/src/collection.js'

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

/**
 * Sanitizes the given object so it can be accepted as the input to Standard Schema validation.
 * This resolves relational getters into plain values and breaks self-referencing cycles
 * by replacing the relations of a revisited record with their default values.
 * This also drops the internal symbols but gives a function to restore them back.
 */
export function sanitizeInitialValues(initialValues: unknown) {
  const propertiesToRestore: Array<{
    path: Array<string | number | symbol>
    descriptor: PropertyDescriptor
  }> = []

  // Track visited records by primary key to detect cycles
  // in self-referencing relations. Only strip relation values
  // when revisiting a record (i.e. an actual cycle), not for
  // all nested records indiscriminately.
  const visited = new Set<string>()

  const sanitize = (
    value: unknown,
    path: Array<string | number | symbol> = [],
  ): unknown => {
    if (Array.isArray(value)) {
      return value.map((value, index) => sanitize(value, path.concat(index)))
    }

    if (isObject(value)) {
      const record = isRecord(value) ? value : undefined
      const isRevisit = record != null && visited.has(record[kPrimaryKey])

      if (record && !isRevisit) {
        visited.add(record[kPrimaryKey])
      }

      const relations = record ? record[kRelationMap] : undefined

      return Object.fromEntries(
        Reflect.ownKeys(value).map((key) => {
          const childValue = value[key as keyof typeof value]
          const childPath = path.concat(key)

          if (typeof key === 'symbol') {
            /**
             * @note Preserve primary keys on sanitized initial values.
             * Otherwise, internal symbols are stripped off and record references are lost.
             * This is curcial when handling relations for records that were created
             * before the relation was defined.
             */
            if (key === kPrimaryKey) {
              propertiesToRestore.push({
                path: childPath,
                descriptor: Object.getOwnPropertyDescriptor(value, key)!,
              })
            }
            return [key, childValue]
          }

          const relation = relations?.get(key)

          // Only strip relation values when revisiting a record
          // to break self-referencing cycles. Non-circular nested
          // relations are left intact for proper schema validation.
          if (isRevisit && relation && childValue != null) {
            propertiesToRestore.push({
              path: childPath,
              descriptor: Object.getOwnPropertyDescriptor(value, key)!,
            })
            return [key, relation.getDefaultValue()]
          }

          return [key, sanitize(childValue, childPath)]
        }),
      )
    }

    return value
  }

  const sanitizedInitialValues = sanitize(initialValues)

  return {
    sanitizedInitialValues,
    /**
     * Restores record properties that were stripped off during the sanitization
     * (e.g. relational properties, internal symbols of records given as initial value, etc).
     */
    restoreProperties(record: RecordType): void {
      for (const { path, descriptor } of propertiesToRestore) {
        definePropertyAtPath(record, path, descriptor)
      }
    },
  }
}
