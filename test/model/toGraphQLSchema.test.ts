import { datatype } from 'faker'
import { printSchema } from 'graphql'
import { factory, primaryKey, oneOf } from '@mswjs/data'

it('generates a graphql schema', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      firstName: String,
      age: Number,
    },
  })
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
      in: ID
      notIn: ID
    }

    input StringQueryType {
      equals: String
      notEquals: String
      contains: String
      notContains: String
      in: String
      notIn: String
    }

    input IntQueryType {
      equals: Int
      notEquals: Int
      between: Int
      notBetween: Int
      gt: Int
      gte: Int
      lt: Int
      lte: Int
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
    }
    "
  `)
})

it.only('infers relational property types', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      role: oneOf('role'),
    },
    role: {
      id: primaryKey(datatype.uuid),
      name: String,
    },
  })
  const schema = db.user.toGraphQLSchema()

  expect(printSchema(schema)).toMatchInlineSnapshot(`
    "type Query {
      user(where: UserQueryInput): User
      users(take: Int, skip: Int, cursor: ID, where: UserQueryInput): [User]
    }

    type User {
      id: ID
      role: Role
    }

    input UserQueryInput {
      id: IdQueryType
      role: StringQueryType
    }

    input IdQueryType {
      equals: ID
      notEquals: ID
      contains: ID
      notContains: ID
      in: ID
      notIn: ID
    }

    input StringQueryType {
      equals: String
      notEquals: String
      contains: String
      notContains: String
      in: String
      notIn: String
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
      role: String
    }
    "
  `)
})
