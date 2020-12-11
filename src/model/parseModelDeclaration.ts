import { debug } from 'debug'
import {
  BaseTypes,
  EntityInstance,
  ManyOf,
  OneOf,
  RelationalNode,
  RelationKind,
} from '../glossary'

const log = debug('parseModelDeclaration')

export function parseModelDeclaration(
  modelName: string,
  declaration: Record<string, (() => BaseTypes) | OneOf<any> | ManyOf<any>>,
  initialValues?: Record<
    string,
    BaseTypes | EntityInstance<any, any> | undefined
  >,
) {
  log(`create a "${modelName}" entity`, declaration, initialValues)

  return Object.entries(declaration).reduce<{
    properties: Record<string, any>
    relations: Record<string, RelationalNode>
  }>(
    (acc, [key, valueGetter]) => {
      const exactValue = initialValues?.[key]
      log(`initial value for key "${modelName}.${key}"`, exactValue)

      if (
        typeof exactValue === 'string' ||
        typeof exactValue === 'number' ||
        typeof exactValue === 'boolean' ||
        exactValue?.constructor.name === 'Date'
      ) {
        log(
          `"${modelName}.${key}" has a plain initial value, setting to`,
          exactValue,
        )

        acc.properties[key] = exactValue
        return acc
      }

      if (exactValue) {
        if (Array.isArray(exactValue)) {
          /**
           * @fixme Differentiate between array of references,
           * array of exact values, and a mixed array of two.
           */
          acc.relations[key] = {
            kind: RelationKind.ManyOf,
            modelName: key,
            nodes: exactValue,
          }

          return acc
        }

        if ('__nodeId' in exactValue) {
          const relation = exactValue

          log(
            `initial value for "${modelName}.${key}" references "${relation.__type}" with id "${relation.__nodeId}"`,
          )

          acc.relations[key] = {
            kind: RelationKind.OneOf,
            modelName: key,
            nodes: [
              {
                __type: relation.__type,
                __nodeId: relation.__nodeId,
              },
            ],
          }

          return acc
        }

        // A plain exact initial value is provided (not a relational property).
        acc[key] = exactValue
        return acc
      }

      if ('__type' in valueGetter) {
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
      properties: {},
      relations: {},
    },
  )
}
