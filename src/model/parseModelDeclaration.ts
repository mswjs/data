import { debug } from 'debug'
import {
  Relation,
  RelationKind,
  RelationDefinition,
  ModelDictionary,
  Value,
  ModelDeclaration,
  PrimaryKeyType,
  EntityInstance,
} from '../glossary'
import { invariant } from '../utils/invariant'

const log = debug('parseModelDeclaration')

interface ParsedModelDeclaration {
  primaryKey?: PrimaryKeyType
  properties: Value<any, any>
  relations: Record<string, Relation<string>>
}

export function parseModelDeclaration<
  Dictionary extends ModelDictionary,
  ModelName extends string
>(
  modelName: ModelName,
  declaration: ModelDeclaration,
  initialValues?: Partial<Value<Dictionary[ModelName], Dictionary>>,
): ParsedModelDeclaration {
  log(
    `parsing model declaration for "${modelName}" entity`,
    declaration,
    initialValues,
  )

  const result = Object.entries(declaration).reduce<ParsedModelDeclaration>(
    (acc, [key, valueGetter]) => {
      const exactValue = initialValues?.[key]
      log(`initial value for key "${modelName}.${key}"`, exactValue)

      if ('isPrimaryKey' in valueGetter) {
        invariant(
          !!acc.primaryKey,
          `Failed to parse model declaration for "${modelName}": cannot specify more than one primary key for a model.`,
        )

        log(`using "${key}" as the primary key for "${modelName}"`)

        acc.primaryKey = key
        acc.properties[key] = exactValue || valueGetter.getValue()
        return acc
      }

      if (
        typeof exactValue === 'string' ||
        typeof exactValue === 'number' ||
        typeof exactValue === 'boolean' ||
        (exactValue as any)?.constructor.name === 'Date'
      ) {
        log(
          `"${modelName}.${key}" has a plain initial value, setting to`,
          exactValue,
        )

        acc.properties[key] = exactValue
        return acc
      }

      const relationDefinition = declaration[key] as RelationDefinition<
        RelationKind.OneOf,
        ModelName
      >

      if (exactValue) {
        if (Array.isArray(exactValue)) {
          /**
           * @fixme Differentiate between array of references,
           * array of exact values, and a mixed array of two.
           */
          acc.relations[key] = {
            kind: RelationKind.ManyOf,
            modelName: relationDefinition.modelName,
            unique: relationDefinition.unique,
            refs: exactValue.map(
              (entityRef: EntityInstance<Dictionary, ModelName>) => ({
                __type: entityRef.__type,
                __primaryKey: entityRef.__primaryKey,
                __nodeId: entityRef[entityRef.__primaryKey],
              }),
            ),
          }

          return acc
        }

        if ('__primaryKey' in exactValue) {
          const entityRef = exactValue

          log(
            `value for "${modelName}.${key}" references "${
              entityRef.__type
            }" with id "${entityRef[entityRef.__primaryKey]}"`,
            entityRef,
          )

          acc.relations[key] = {
            kind: RelationKind.OneOf,
            modelName: relationDefinition.modelName,
            unique: relationDefinition.unique,
            refs: [
              {
                __type: entityRef.__type,
                __primaryKey: entityRef.__primaryKey,
                __nodeId: entityRef[entityRef.__primaryKey],
              },
            ],
          }

          return acc
        }

        // A plain exact initial value is provided (not a relational property).
        acc.properties[key] = exactValue
        return acc
      }

      if ('kind' in valueGetter) {
        throw new Error(
          `Failed to set "${modelName}.${key}" as its a relational property with no value.`,
        )
      }

      log(
        `"${modelName}.${key}" has no initial value, seeding with`,
        valueGetter,
      )

      // When initial value is not provided, use the value getter function
      // specified in the model declaration.
      acc.properties[key] = valueGetter()
      return acc
    },
    {
      primaryKey: undefined,
      properties: {},
      relations: {},
    },
  )

  // Primary key is required on each model declaration.
  if (result.primaryKey == null) {
    throw new Error(
      `Failed to parse model declaration for "${modelName}": primary key not found.`,
    )
  }

  return result
}
