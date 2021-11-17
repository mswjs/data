import { ENTITY_TYPE, PRIMARY_KEY } from '../glossary'

export function safeStringify(value: any) {
  const seen = new WeakSet()

  return JSON.stringify(value, (_, value) => {
    if (typeof value !== 'object' || value === null) {
      return value
    }

    if (seen.has(value)) {
      const type = value[ENTITY_TYPE]
      const primaryKey = value[PRIMARY_KEY]
      return type && primaryKey
        ? `Entity(type: ${type}, ${primaryKey}: ${value[primaryKey]})`
        : '[Circular Reference]'
    }

    seen.add(value)
    return value
  })
}
