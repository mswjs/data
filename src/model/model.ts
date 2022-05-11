import { debug, Debugger } from 'debug'
import { invariant } from 'outvariant'
import get from 'lodash/get'
import set from 'lodash/set'
import isFunction from 'lodash/isFunction'
import { NullableProperty } from '../nullable'
import { isObject } from '../utils/isObject'
import { ModelDefinition, NestedModelDefinition, Value } from '../glossary'
import { isModelValueType } from '../utils/isModelValueType'

class Model<Definition extends ModelDefinition> {
  private logger: Debugger
  public properties: string[][]

  constructor(public readonly definition: Definition) {
    this.logger = debug('model')
    this.properties = []

    // Parse the model definition once.
    this.parse()
  }

  public create(initialValues: Partial<Value<Definition, {}>>) {
    const log = this.logger.extend('create')

    log(`creating an entity`, this.definition, this.properties, initialValues)

    const data = this.properties.reduce<Record<string, unknown>>(
      (properties, propertyName) => {
        const initialValue = get(initialValues, propertyName)
        const propertyDefinition = get(this.definition, propertyName)

        if (propertyDefinition instanceof NullableProperty) {
          const value =
            initialValue === null || isModelValueType(initialValue)
              ? initialValue
              : propertyDefinition.getValue()

          set(properties, propertyName, value)
          return properties
        }

        invariant(
          initialValue !== null,
          'Failed to create a "%s" entity: a non-nullable property "%s" cannot be instantiated with null. Use the "nullable" function when defining this property to support nullable value.',
          // this.name,
          propertyName.join('.'),
        )

        if (isModelValueType(initialValue)) {
          log('"%s" has a plain initial value:', propertyName, initialValue)
          set(properties, propertyName, initialValue)
          return properties
        }

        if (isFunction(propertyDefinition)) {
          set(properties, propertyName, propertyDefinition())
          return properties
        }

        return properties
      },
      {},
    )

    return data
  }

  /**
   * Parse the model definition.
   */
  private parse(parentPath?: string[]): void {
    const log = this.logger.extend('parse')

    if (parentPath) {
      log(
        'parsing a nested model definition for "%s"',
        parentPath,
        this.definition,
      )
    }

    const definition = parentPath
      ? get(this.definition, parentPath)
      : this.definition

    for (const [propertyName, value] of Object.entries(definition)) {
      const propertyPath = parentPath
        ? [...parentPath, propertyName]
        : [propertyName]

      if (value instanceof NullableProperty) {
        // Add nullable properties to the same list as regular properties.
        this.properties.push(propertyPath)
        continue
      }

      // Nested objects.
      if (isObject<NestedModelDefinition>(value)) {
        this.parse(propertyPath)
        continue
      }

      // Regular properties.
      this.properties.push(propertyPath)
    }
  }
}

export function model<Definition extends ModelDefinition>(
  definition: Definition,
) {
  return new Model<Definition>(definition)
}
