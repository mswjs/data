import { manyOf, primaryKey } from '../../src'
import { Database } from '../../src/db/Database'
import { InternalEntityProperty, Relation } from '../../src/glossary'
import { defineRelationalProperties } from '../../src/model/defineRelationalProperties'

it('returns an enumerable relation property', () => {
  const dictionary = {
    user: {
      id: primaryKey(String),
      posts: manyOf('post'),
    },
    post: {
      id: primaryKey(String),
      title: String,
    },
  }

  const db = new Database(dictionary)

  db.create('post', {
    [InternalEntityProperty.primaryKey]: 'id',
    [InternalEntityProperty.type]: 'post',
    id: 'post-1',
    title: 'First Post',
  })
  db.create('post', {
    [InternalEntityProperty.primaryKey]: 'id',
    [InternalEntityProperty.type]: 'post',
    id: 'post-2',
    title: 'Second Post',
  })

  const relations: Record<string, Relation> = {
    posts: {
      ...dictionary.user.posts,
      primaryKey: 'id',
    },
  }

  const user = {
    [InternalEntityProperty.primaryKey]: 'id',
    [InternalEntityProperty.type]: 'post',
    id: 'abc-123',
  }
  const initialValues = {
    posts: [{ id: 'post-1' }, { id: 'post-2' }],
  }

  defineRelationalProperties(user, initialValues, relations, db)

  expect(user.propertyIsEnumerable('posts')).toBe(true)
})
