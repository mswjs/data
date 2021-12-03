import { oneOf, primaryKey, nullable } from '../../src'
import {
  Relation,
  RelationKind,
  RelationsList,
} from '../../src/relations/Relation'
import { defineRelationalProperties } from '../../src/model/defineRelationalProperties'
import { testFactory } from '../../test/testUtils'

it('marks relational properties as enumerable', () => {
  const { db, dictionary, databaseInstance } = testFactory({
    user: {
      id: primaryKey(String),
      name: String,
    },
    post: {
      id: primaryKey(String),
      title: String,
      author: oneOf('user'),
    },
  })

  const user = db.user.create({
    id: 'user-1',
    name: 'John Maverick',
  })
  const post = db.post.create({
    id: 'post-1',
    title: 'Test Post',
  })

  const relations: RelationsList = [
    {
      propertyPath: ['author'],
      relation: new Relation({
        to: 'user',
        kind: RelationKind.OneOf,
      }),
    },
  ]

  defineRelationalProperties(
    post,
    {
      author: user,
    },
    relations,
    dictionary,
    databaseInstance,
  )

  expect(post.propertyIsEnumerable('author')).toEqual(true)
})

it('marks nullable relational properties as enumerable', () => {
  const { db, dictionary, databaseInstance } = testFactory({
    user: {
      id: primaryKey(String),
      name: String,
    },
    post: {
      id: primaryKey(String),
      title: String,
      author: nullable(oneOf('user')),
    },
  })

  const user = db.user.create({
    id: 'user-1',
    name: 'John Maverick',
  })

  const post = db.post.create({
    id: 'post-1',
    title: 'Test Post',
  })

  const relations: RelationsList = [
    {
      propertyPath: ['author'],
      relation: new Relation({
        to: 'user',
        kind: RelationKind.OneOf,
      }),
    },
  ]

  defineRelationalProperties(
    post,
    {
      author: user,
    },
    relations,
    dictionary,
    databaseInstance,
  )

  expect(post.propertyIsEnumerable('author')).toEqual(true)
})
