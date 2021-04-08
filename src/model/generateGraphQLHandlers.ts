import pluralize from 'pluralize'
import {
  graphql as executeGraphQL,
  GraphQLObjectType,
  GraphQLID,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
  GraphQLSchema,
  GraphQLFieldConfigMap,
  GraphQLInputObjectType,
  GraphQLInputFieldConfigMap,
} from 'graphql'
import { GraphQLHandler, graphql } from 'msw'
import {
  ModelAPI,
  ModelDeclaration,
  ModelDictionary,
  PrimaryKeyType,
} from '../glossary'
import { capitalize } from '../utils/capitalize'
import { WeakQuerySelectorWhich } from '../query/queryTypes'

/**
 * Derive a GraphQL field type from a variable.
 */
export function getGraphQLType(value: any) {
  const resolvedValue = typeof value === 'function' ? value() : value
  switch (resolvedValue.constructor.name) {
    case 'Number':
      return GraphQLInt
    default:
      return GraphQLString
  }
}

/**
 * Derive a GraphQL object type from a model declaration.
 */
export function declarationToObjectType(
  declaration: ModelDeclaration,
): GraphQLFieldConfigMap<any, any> {
  return Object.entries(declaration).reduce<GraphQLFieldConfigMap<any, any>>(
    (fields, [key, value]) => {
      fields[key] =
        'isPrimaryKey' in value
          ? {
              type: GraphQLID,
            }
          : {
              type: getGraphQLType(value),
            }

      return fields
    },
    {},
  )
}

/**
 * Derive a GraphQL input object type from a model declaration.
 */
export function declarationToInputObjectType(
  declaration: ModelDeclaration,
): GraphQLInputFieldConfigMap {
  return Object.entries(declaration).reduce<GraphQLInputFieldConfigMap>(
    (fields, [key, value]) => {
      fields[key] =
        'isPrimaryKey' in value
          ? {
              type: GraphQLID,
            }
          : {
              type: getGraphQLType(value),
            }

      return fields
    },
    {},
  )
}

export function generateGraphQLHandlers<
  Dictionary extends ModelDictionary,
  ModelName extends string
>(
  modelName: ModelName,
  primaryKey: PrimaryKeyType,
  declaration: ModelDeclaration,
  model: ModelAPI<Dictionary, ModelName>,
  baseUrl: string = '',
): GraphQLHandler[] {
  const target = baseUrl ? graphql.link(baseUrl) : graphql
  const capitalModelName = capitalize(modelName)

  const EntityType = new GraphQLObjectType({
    name: capitalModelName,
    fields: declarationToObjectType(declaration),
  })
  const EntityInputType = new GraphQLInputObjectType({
    name: `${capitalModelName}Input`,
    fields: declarationToInputObjectType(declaration),
  })

  const objectSchema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: {
        // Get an entity by the primary key.
        [modelName]: {
          type: EntityType,
          args: {
            [primaryKey]: {
              type: GraphQLID,
            },
          },
          resolve(_, args) {
            const which: WeakQuerySelectorWhich<typeof primaryKey> = {
              [primaryKey]: {
                equals: args[primaryKey],
              },
            }
            return model.findFirst({ which: which as any })
          },
        },
        // Get all entities.
        [pluralize(modelName)]: {
          type: new GraphQLList(EntityType),
          resolve() {
            return model.getAll()
          },
        },
      },
    }),
    mutation: new GraphQLObjectType({
      name: 'Mutation',
      fields: {
        // Create a new entity.
        [`create${capitalModelName}`]: {
          type: EntityType,
          args: {
            input: {
              type: EntityInputType,
            },
          },
          resolve(_, args) {
            return model.create(args.input as any)
          },
        },
      },
    }),
  })

  return [
    target.operation(async (req, res, ctx) => {
      if (!req.body) {
        return
      }

      const result = await executeGraphQL({
        schema: objectSchema,
        source: req.body?.query,
        variableValues: req.variables,
      })

      return res(ctx.data(result.data!), ctx.errors(result.errors))
    }),
  ]
}
