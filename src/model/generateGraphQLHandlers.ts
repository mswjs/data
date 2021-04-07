import pluralize from 'pluralize'
import { graphql as executeGraphQL, buildSchema } from 'graphql'
import { GraphQLHandler, graphql } from 'msw'
import { ModelAPI, ModelDictionary, PrimaryKeyType } from '../glossary'
import { capitalize } from '../utils/capitalize'
import { WeakQuerySelectorWhich } from '../query/queryTypes'

export function generateGraphQLHandlers<
  Dictionary extends ModelDictionary,
  ModelName extends string
>(
  modelName: ModelName,
  primaryKey: PrimaryKeyType,
  model: ModelAPI<Dictionary, ModelName>,
  baseUrl: string = '',
): GraphQLHandler[] {
  const target = baseUrl ? graphql.link(baseUrl) : graphql
  const capitalModelName = capitalize(modelName)
  const pluralModelName = pluralize(modelName)
  const schema = buildSchema(`
    type Query {
      # Get an entity by the primary key.
      ${modelName}(${primaryKey}: ID!): ${capitalModelName}

      # Get all the entities.
      ${pluralModelName}: [${capitalModelName}!]
    }

    type ${capitalModelName} {
      ${primaryKey}: ID!
      firstName: String!
    }
  `)

  return [
    target.operation(async (req, res, ctx) => {
      if (!req.body) {
        return
      }

      const which: WeakQuerySelectorWhich<typeof primaryKey> = {
        [primaryKey]: {
          equals: req.variables[primaryKey],
        },
      }

      const result = await executeGraphQL({
        schema,
        source: req.body?.query,
        variableValues: req.variables,
        rootValue: {
          [modelName]: model.findFirst({
            which: which as any,
          }),
          users: model.getAll(),
        },
      })

      return res(ctx.data(result.data!), ctx.errors(result.errors))
    }),
  ]
}
