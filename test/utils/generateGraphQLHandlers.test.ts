import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLString,
} from 'graphql'
import { primaryKey } from '../../src'
import {
  comparatorTypes,
  getGraphQLType,
  getQueryTypeByValueType,
  definitionToFields,
} from '../../src/model/generateGraphQLHandlers'

describe('getGraphQLType', () => {
  it('derives GraphQL type from a variable', () => {
    expect(getGraphQLType(String)).toEqual(GraphQLString)
    expect(getGraphQLType(Number)).toEqual(GraphQLInt)
    expect(getGraphQLType(Date)).toEqual(GraphQLString)
  })
})

describe('getQueryTypeByValueType', () => {
  it('returns ID query type given GraphQLID value type', () => {
    expect(getQueryTypeByValueType(GraphQLID)).toEqual(
      comparatorTypes.IdQueryType,
    )
  })

  it('returns Int query type given GraphQLInt value type', () => {
    expect(getQueryTypeByValueType(GraphQLInt)).toEqual(
      comparatorTypes.IntQueryType,
    )
  })

  it('returns Boolean query type given GraphQLBoolean value type', () => {
    expect(getQueryTypeByValueType(GraphQLBoolean)).toEqual(
      comparatorTypes.BooleanQueryType,
    )
  })

  it('returns String query type given GraphQLString value type', () => {
    expect(getQueryTypeByValueType(GraphQLString)).toEqual(
      comparatorTypes.StringQueryType,
    )
  })

  it('returns String query type given an unknown GraphQLScalar type', () => {
    expect(getQueryTypeByValueType(GraphQLFloat)).toEqual(
      comparatorTypes.StringQueryType,
    )
  })
})

describe('definitionToFields', () => {
  it('derives fields, input fields, and query input fields from a model definition', () => {
    expect(
      definitionToFields({
        id: primaryKey(String),
        firstName: String,
        age: Number,
      }),
    ).toEqual({
      fields: {
        id: { type: GraphQLID },
        firstName: { type: GraphQLString },
        age: { type: GraphQLInt },
      },
      inputFields: {
        id: { type: GraphQLID },
        firstName: { type: GraphQLString },
        age: { type: GraphQLInt },
      },
      queryInputFields: {
        id: { type: comparatorTypes.IdQueryType },
        firstName: { type: comparatorTypes.StringQueryType },
        age: { type: comparatorTypes.IntQueryType },
      },
    })
  })
})
