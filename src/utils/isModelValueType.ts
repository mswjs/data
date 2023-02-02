import isObjectLike from 'lodash/isObjectLike'
import { ModelValueType, PrimitiveValueType } from '../glossary'

function isPrimitiveValueType(value: any): value is PrimitiveValueType {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    isObjectLike(value) ||
    value?.constructor?.name === 'Date'
  )
}

export function isModelValueType(value: any): value is ModelValueType {
  return isPrimitiveValueType(value)
}
