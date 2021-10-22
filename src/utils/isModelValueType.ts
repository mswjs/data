import { ModelValueType, PrimitiveValueType } from '../glossary'

function isPrimitiveValueType(value: any): value is PrimitiveValueType {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value?.constructor?.name === 'Date'
  )
}

export function isModelValueType(value: any): value is ModelValueType {
  return (
    isPrimitiveValueType(value) ||
    (Array.isArray(value) && value.every(isPrimitiveValueType))
  )
}
