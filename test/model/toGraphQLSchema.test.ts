import { faker } from '@faker-js/faker'
import { printSchema } from 'graphql'
import { factory, primaryKey } from '../../src'

const db = factory({
  user: {
    id: primaryKey(faker.datatype.uuid),
    firstName: String,
    age: Number,
  },
})

test('generates a graphql schema', () => {
  const schema = db.user.toGraphQLSchema()
  expect(printSchema(schema)).toMatchInlineSnapshot(`
    "type Query {
      user(where: UserQueryInput): User
      users(take: Int, skip: Int, cursor: ID, where: UserQueryInput): [User]
    }

    type User {
      id: ID
      firstName: String
      age: Int
    }

    input UserQueryInput {
      id: IdQueryType
      firstName: StringQueryType
      age: IntQueryType
    }

    input IdQueryType {
      equals: ID
      notEquals: ID
      contains: ID
      notContains: ID
      gt: ID
      gte: ID
      lt: ID
      lte: ID
      in: [ID]
      notIn: [ID]
    }

    input StringQueryType {
      equals: String
      notEquals: String
      contains: String
      notContains: String
      gt: String
      gte: String
      lt: String
      lte: String
      in: [String]
      notIn: [String]
    }

    input IntQueryType {
      equals: Int
      notEquals: Int
      between: [Int]
      notBetween: [Int]
      gt: Int
      gte: Int
      lt: Int
      lte: Int
      in: [Int]
      notIn: [Int]
    }

    type Mutation {
      createUser(data: UserInput): User
      updateUser(where: UserQueryInput, data: UserInput): User
      updateUsers(where: UserQueryInput, data: UserInput): [User]
      deleteUser(where: UserQueryInput): User
      deleteUsers(where: UserQueryInput): [User]
    }

    input UserInput {
      id: ID
      firstName: String
      age: Int
    }"
  `)
})
