import { GraphQLID, GraphQLInt, GraphQLString } from 'graphql'
import { primaryKey } from '../../src'
import {
  getGraphQLType,
  declarationToObjectType,
  declarationToInputObjectType,
} from '../../src/model/generateGraphQLHandlers'

describe('getGraphQLType', () => {
  it('derives GraphQL type from a variable', () => {
    expect(getGraphQLType(String)).toEqual(GraphQLString)
    expect(getGraphQLType(Number)).toEqual(GraphQLInt)
    expect(getGraphQLType(Date)).toEqual(GraphQLString)
  })
})

describe('declarationToObjectType', () => {
  it('derives GraphQL object type from a model declaration', () => {
    expect(
      declarationToObjectType({
        id: primaryKey(String),
        firstName: String,
        age: Number,
        createdAt: Date,
      }),
    ).toEqual({
      id: {
        type: GraphQLID,
      },
      firstName: {
        type: GraphQLString,
      },
      age: {
        type: GraphQLInt,
      },
      createdAt: {
        type: GraphQLString,
      },
    })
  })
})

describe('declarationToInputObjectType', () => {
  it('derives GraphQL input object type from a model declaration', () => {
    expect(
      declarationToInputObjectType({
        id: primaryKey(String),
        firstName: String,
        age: Number,
        createdAt: Date,
      }),
    ).toEqual({
      id: {
        type: GraphQLID,
      },
      firstName: {
        type: GraphQLString,
      },
      age: {
        type: GraphQLInt,
      },
      createdAt: {
        type: GraphQLString,
      },
    })
  })
})
