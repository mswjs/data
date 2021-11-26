import { isObject } from './isObject'

/**
 * Clones the given object, preserving its setters/getters.
 */
export function spread<
  ObjectType extends Record<string | number | symbol, unknown>,
>(source: ObjectType): ObjectType {
  const target = {} as ObjectType
  const descriptors = Object.getOwnPropertyDescriptors(source)

  for (const [propertyName, descriptor] of Object.entries(descriptors)) {
    // Spread nested objects, preserving their descriptors.
    if (isObject(descriptor.value)) {
      Object.defineProperty(target, propertyName, {
        ...descriptor,
        value: spread(descriptor.value),
      })
      continue
    }

    Object.defineProperty(target, propertyName, descriptor)
  }

  return target
}
