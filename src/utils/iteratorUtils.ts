export function forEach<K, V>(
  fn: (key: K, value: V) => any,
  map: Map<K, V>,
): void {
  for (const [key, value] of map.entries()) {
    fn(key, value)
  }
}

export function filter<K, V>(
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
