import { NullableObject, NullableProperty } from '../nullable'
import { ModelDefinition } from '../glossary'
import { isObject } from '../utils/isObject'
import { isFunction } from 'lodash'

export function getDefinition(
  definition: ModelDefinition,
  propertyName: string[],
) {
  return propertyName.reduce((reducedDefinition, property) => {
    const value = reducedDefinition[property]

    if (value instanceof NullableProperty) {
      return value
    }

    if (value instanceof NullableObject) {
      // in case the propertyName array includes NullableObject, we get
      // the NullableObject definition and continue the reduce loop
      if (property !== propertyName.at(-1)) {
        return value.objectDefinition
      }
      // in case the propertyName array ends with NullableObject, we just return it and if
      // it should get the value of null, it will override its inner properties
      return value
    }

    // getter functions and nested objects
    if (isFunction(value) || isObject(value)) {
      return value
    }

    return
  }, definition)
}
