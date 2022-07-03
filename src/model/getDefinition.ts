import { NullableProperty } from '../nullable'
import { ModelDefinition } from '../glossary'

export function getDefinition(
  definition: ModelDefinition,
  propertyName: string[],
) {
  return propertyName.reduce((acc, property) => {
    const value = acc[property]

    // Return the value of getter to generate values for nested properties
    if (
      value instanceof NullableProperty &&
      value.isGetterFunctionReturningObject &&
      property !== propertyName.at(-1)
    ) {
      return value.getValue()
    }

    return value
  }, definition)
}
