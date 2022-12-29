import { NullableObject, NullableProperty } from '../nullable'
import { ModelDefinition } from '../glossary'
import { isObject } from '../utils/isObject'
import { isFunction } from 'lodash'

export function getDefinition(
  definition: ModelDefinition,
  propertyName: string[],
) {
  return propertyName.reduce((reducedDefinition, property) => {
    if (reducedDefinition === null) {
      // this is for the case where NullableObject definition defaults to null
      return
    }
    const value = reducedDefinition[property]

    if (value instanceof NullableProperty) {
      return value
    }

    if (value instanceof NullableObject) {
      // in case the value which is NullableObject is NOT in the last position in the propertyName array
      // we want to get its value and continue the reduce loop to get its children definition
      if (property !== propertyName.at(-1)) {
        return value.getValue()
      }
      // if it is in the last position of the propertyName array, just return it to the caller at createModel
      return value
    }

    // this is for getter functions (String, Number or () => 'some value') and nested objects
    if (isFunction(value) || isObject(value)) {
      return value
    }

    return
  }, definition)
}
