import has from 'lodash/has'
import set from 'lodash/set'
import get from 'lodash/get'

/**
 * Abstraction over `Object.defineProperty` that supports
 * property paths (nested properties).
 *
 * @example
 * const target = {}
 * definePropertyAtPath(target, 'a.b.c', { get(): { return 2 }})
 * console.log(target.a.b.c) // 2
 */
export function definePropertyAtPath<AttributesType extends PropertyDescriptor>(
  target: Record<string, unknown>,
  propertyPath: string,
  attributes: AttributesType,
) {
  const segments = propertyPath.split('.')
  const propertyName = segments[segments.length - 1]
  const parentPath = segments.slice(0, -1).join('.')

  if (parentPath && !has(target, parentPath)) {
    set(target, parentPath, {})
  }

  const parent = parentPath ? get(target, parentPath) : target
  Object.defineProperty(parent, propertyName, attributes)
}
