import { PrimaryKeyType } from '../glossary'

export function forEach<K extends PrimaryKeyType, V>(
  fn: (key: K, value: V) => any,
  map: Map<K, V>,
): void {
  for (const [key, value] of map.entries()) {
    fn(key, value)
  }
}

export function filter<K extends PrimaryKeyType, V>(
  predicate: (key: K, value: V) => boolean,
  map: Map<K, V>,
): Map<K, V> {
  const nextMap = new Map<K, V>()

  forEach((key, value) => {
    if (predicate(key, value)) {
      nextMap.set(key, value)
    }
  }, map)

  return nextMap
}
