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
  propertyPath: string[],
  attributes: AttributesType,
) {
  const propertyName = propertyPath[propertyPath.length - 1]
  const parentPath = propertyPath.slice(0, -1)

  if (parentPath.length && !has(target, parentPath)) {
    set(target, parentPath, {})
  }

  const parent = parentPath.length ? get(target, parentPath) : target
  Object.defineProperty(parent, propertyName, attributes)
}
