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
  GraphQLFieldConfigArgumentMap,
} from 'graphql'
import { GraphQLHandler, HttpResponse, graphql } from 'msw'
import { ModelAPI, ModelDefinition, ModelDictionary } from '../glossary'
import { PrimaryKey } from '../primaryKey'
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
        const fieldType = ['between', 'notBetween', 'in', 'notIn'].includes(
          comparatorFn,
        )
          ? new GraphQLList(type)
          : type
        fields[comparatorFn] = { type: fieldType }
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

export function definitionToFields(
  definition: ModelDefinition,
): GraphQLFieldsMap {
  return Object.entries(definition).reduce<GraphQLFieldsMap>(
    (types, [key, value]) => {
      const valueType =
        value instanceof PrimaryKey ? GraphQLID : getGraphQLType(value)
      const queryType = getQueryTypeByValueType(valueType)

      // Fields describe an entity type.
      types.fields[key] = { type: valueType }

      // Input fields describe a type that can be used
      // as an input when creating entities (initial values).
      types.inputFields[key] = { type: valueType }

      // Query input fields describe a type that is used
      // as a "where" query, with its comparator function types.
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

export function generateGraphQLSchema<
  Dictionary extends ModelDictionary,
  ModelName extends string,
>(
  modelName: ModelName,
  definition: ModelDefinition,
  model: ModelAPI<Dictionary, ModelName>,
): GraphQLSchema {
  const pluralModelName = pluralize(modelName)
  const capitalModelName = capitalize(modelName)
  const { fields, inputFields, queryInputFields } =
    definitionToFields(definition)

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

  const paginationArgs: GraphQLFieldConfigArgumentMap = {
    take: { type: GraphQLInt },
    skip: { type: GraphQLInt },
    cursor: { type: GraphQLID },
  }

  const objectSchema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: {
        // Get an entity by the primary key.
        [modelName]: {
          type: EntityType,
          args: {
            where: { type: EntityQueryInputType },
          },
          resolve(_, args) {
            return model.findFirst({ where: args.where })
          },
        },
        // Get all entities.
        [pluralModelName]: {
          type: new GraphQLList(EntityType),
          args: {
            ...paginationArgs,
            where: { type: EntityQueryInputType },
          },
          resolve(_, args) {
            const shouldQuery = Object.keys(args).length > 0

            return shouldQuery
              ? model.findMany({
                  where: args.where,
                  skip: args.skip,
                  take: args.take,
                  cursor: args.cursor,
                })
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
        // Update an single entity.
        [`update${capitalModelName}`]: {
          type: EntityType,
          args: {
            where: { type: EntityQueryInputType },
            data: { type: EntityInputType },
          },
          resolve(_, args) {
            return model.update({
              where: args.where,
              data: args.data,
            })
          },
        },
        // Update multiple existing entities.
        [`update${capitalize(pluralModelName)}`]: {
          type: new GraphQLList(EntityType),
          args: {
            where: { type: EntityQueryInputType },
            data: { type: EntityInputType },
          },
          resolve(_, args) {
            return model.updateMany({
              where: args.where,
              data: args.data,
            })
          },
        },
        // Delete a single entity.
        [`delete${capitalModelName}`]: {
          type: EntityType,
          args: {
            where: { type: EntityQueryInputType },
          },
          resolve(_, args) {
            return model.delete({ where: args.where })
          },
        },
        // Delete multiple entities.
        [`delete${capitalize(pluralModelName)}`]: {
          type: new GraphQLList(EntityType),
          args: {
            where: { type: EntityQueryInputType },
          },
          resolve(_, args) {
            return model.deleteMany({ where: args.where })
          },
        },
      },
    }),
  })

  return objectSchema
}

export function generateGraphQLHandlers<
  Dictionary extends ModelDictionary,
  ModelName extends string,
>(
  modelName: ModelName,
  definition: ModelDefinition,
  model: ModelAPI<Dictionary, ModelName>,
  baseUrl: string = '',
): GraphQLHandler[] {
  const target = baseUrl ? graphql.link(baseUrl) : graphql

  const objectSchema = generateGraphQLSchema(modelName, definition, model)

  return [
    target.operation(async ({ query, variables }) => {
      const result = await executeGraphQL({
        schema: objectSchema,
        source: query,
        variableValues: variables,
      })

      return HttpResponse.json(result)
    }),
  ]
}
