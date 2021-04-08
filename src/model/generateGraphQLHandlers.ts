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
  GraphQLBoolean,
  GraphQLInputType,
  GraphQLScalarType,
} from 'graphql'
import { GraphQLHandler, graphql } from 'msw'
import { ModelAPI, ModelDeclaration, ModelDictionary } from '../glossary'
import { capitalize } from '../utils/capitalize'
import { QueryToComparator } from '../query/queryTypes'
import { booleanComparators } from '../comparators/boolean'
import { stringComparators } from '../comparators/string'
import { numberComparators } from '../comparators/number'

interface GraphQLFieldsMap {
  fields: GraphQLFieldConfigMap<any, any>
  inputFields: GraphQLInputFieldConfigMap
  queryInputFields: GraphQLInputFieldConfigMap
}

/**
 * Derive a GraphQL scalar type from a variable.
 */
export function getGraphQLType(value: any) {
  const resolvedValue = typeof value === 'function' ? value() : value
  switch (resolvedValue.constructor.name) {
    case 'Number':
      return GraphQLInt
    case 'Boolean':
      return GraphQLBoolean
    default:
      return GraphQLString
  }
}

/**
 * Create a GraphQLInputObjectType from a given comparator function.
 */
function createComparatorGraphQLInputType(
  name: string,
  comparators: QueryToComparator<any>,
  type: GraphQLInputType,
) {
  return new GraphQLInputObjectType({
    name,
    fields: Object.keys(comparators).reduce<GraphQLInputFieldConfigMap>(
      (fields, comparatorFn) => {
        fields[comparatorFn] = { type }
        return fields
      },
      {},
    ),
  })
}

export const comparatorTypes = {
  IdQueryType: createComparatorGraphQLInputType(
    'IdQueryType',
    stringComparators,
    GraphQLID,
  ),
  StringQueryType: createComparatorGraphQLInputType(
    'StringQueryType',
    stringComparators,
    GraphQLString,
  ),
  IntQueryType: createComparatorGraphQLInputType(
    'IntQueryType',
    numberComparators,
    GraphQLInt,
  ),
  BooleanQueryType: createComparatorGraphQLInputType(
    'BooleanQueryType',
    booleanComparators,
    GraphQLBoolean,
  ),
}

export function getQueryTypeByValueType(
  valueType: GraphQLScalarType,
): GraphQLInputObjectType {
  switch (valueType.name) {
    case 'ID':
      return comparatorTypes.IdQueryType
    case 'Int':
      return comparatorTypes.IntQueryType
    case 'Boolean':
      return comparatorTypes.BooleanQueryType
    default:
      return comparatorTypes.StringQueryType
  }
}

export function declarationToFields(
  declaration: ModelDeclaration,
): GraphQLFieldsMap {
  return Object.entries(declaration).reduce<GraphQLFieldsMap>(
    (types, [key, value]) => {
      const isPrimaryKey = 'isPrimaryKey' in value
      const valueType = isPrimaryKey ? GraphQLID : getGraphQLType(value)
      const queryType = getQueryTypeByValueType(valueType)

      // Fields describe an entity type.
      types.fields[key] = { type: valueType }

      // Input fields describe a type that can be used
      // as an input when creating entities (initial values).
      types.inputFields[key] = { type: valueType }

      // Query input fields describe a type that is used
      // as a "which" query, with its comparator function types.
      types.queryInputFields[key] = { type: queryType }

      return types
    },
    {
      fields: {},
      inputFields: {},
      queryInputFields: {},
    } as GraphQLFieldsMap,
  )
}

export function generateGraphQLHandlers<
  Dictionary extends ModelDictionary,
  ModelName extends string
>(
  modelName: ModelName,
  declaration: ModelDeclaration,
  model: ModelAPI<Dictionary, ModelName>,
  baseUrl: string = '',
): GraphQLHandler[] {
  const target = baseUrl ? graphql.link(baseUrl) : graphql
  const pluralModelName = pluralize(modelName)
  const capitalModelName = capitalize(modelName)
  const { fields, inputFields, queryInputFields } = declarationToFields(
    declaration,
  )

  const EntityType = new GraphQLObjectType({
    name: capitalModelName,
    fields,
  })
  const EntityInputType = new GraphQLInputObjectType({
    name: `${capitalModelName}Input`,
    fields: inputFields,
  })
  const EntityQueryInputType = new GraphQLInputObjectType({
    name: `${capitalModelName}QueryInput`,
    fields: queryInputFields,
  })

  const objectSchema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: {
        // Get an entity by the primary key.
        [modelName]: {
          type: EntityType,
          args: {
            which: { type: EntityQueryInputType },
          },
          resolve(_, args) {
            return model.findFirst({ which: args.which })
          },
        },
        // Get all entities.
        [pluralModelName]: {
          type: new GraphQLList(EntityType),
          args: {
            which: { type: EntityQueryInputType },
          },
          resolve(_, args) {
            return args.which
              ? model.findMany({ which: args.which })
              : model.getAll()
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
            data: { type: EntityInputType },
          },
          resolve(_, args) {
            return model.create(args.data)
          },
        },
        [`update${capitalModelName}`]: {
          type: EntityType,
          args: {
            which: { type: EntityQueryInputType },
            data: { type: EntityInputType },
          },
          resolve(_, args) {
            return model.update({
              which: args.which,
              data: args.data,
            })
          },
        },
        [`update${capitalize(pluralModelName)}`]: {
          type: new GraphQLList(EntityType),
          args: {
            which: { type: EntityQueryInputType },
            data: { type: EntityInputType },
          },
          resolve(_, args) {
            return model.updateMany({
              which: args.which,
              data: args.data,
            })
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
