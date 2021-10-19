import { primaryKey } from '../../src'
import { ENTITY_TYPE, PRIMARY_KEY, ModelDictionary } from '../../src/glossary'
import { Database } from '../../src/db/Database'
import {
  Relation,
  RelationAttributes,
  RelationKind,
} from '../../src/relations/Relation'

it('supports creating a relation without attributes', () => {
  const relation = new Relation({
    to: 'country',
    kind: RelationKind.OneOf,
  })

  expect(relation).toBeInstanceOf(Relation)
  expect(relation.kind).toEqual(RelationKind.OneOf)
  expect(relation.target.modelName).toEqual('country')
  expect(relation.attributes).toEqual({
    unique: false,
  } as RelationAttributes)
})

it('supports creating a relation with attributes', () => {
  const relation = new Relation({
    to: 'country',
    kind: RelationKind.ManyOf,
    attributes: {
      unique: true,
    },
  })

  expect(relation).toBeInstanceOf(Relation)
  expect(relation.kind).toEqual(RelationKind.ManyOf)
  expect(relation.target.modelName).toEqual('country')
  expect(relation.attributes).toEqual({
    unique: true,
  } as RelationAttributes)
})

it('applies a "ONE_OF" relation to an entity', () => {
  const relation = new Relation({
    to: 'country',
    kind: RelationKind.OneOf,
  })
  const dictionary: ModelDictionary = {
    user: {
      birthPlace: relation,
    },
    country: {
      code: primaryKey(String),
    },
  }
  const db = new Database(dictionary)

  db.create('country', {
    [ENTITY_TYPE]: 'country',
    [PRIMARY_KEY]: 'code',
    code: 'us',
  })
  const country = db.getModel('country').get('us')!

  const users = db.create('user', {
    [ENTITY_TYPE]: 'user',
    [PRIMARY_KEY]: 'id',
    id: 'user-1',
  })
  const user = users.get('user-1')!

  relation.apply(user, 'birthPlace', { code: 'us' }, dictionary, db)

  // When applied, relation is updated with the additional info.
  expect(relation.target.primaryKey).toEqual('code')
  expect(relation.source.modelName).toEqual('user')
  expect(relation.source.primaryKey).toEqual('id')

  // When applied, relation defined a proxy property on the entity
  // to resolve the relational value whenever accessed.
  expect(user.birthPlace).toEqual(country)
})

it('applies a "MANY_OF" relation to an entity', () => {
  const relation = new Relation({
    to: 'post',
    kind: RelationKind.ManyOf,
  })
  const dictionary: ModelDictionary = {
    user: {
      posts: relation,
    },
    post: {
      id: primaryKey(String),
    },
  }
  const db = new Database(dictionary)

  const users = db.create('user', {
    [ENTITY_TYPE]: 'user',
    [PRIMARY_KEY]: 'id',
    id: 'user-1',
  })
  const user = users.get('user-1')!

  db.create('post', {
    [ENTITY_TYPE]: 'post',
    [PRIMARY_KEY]: 'id',
    id: 'post-1',
  })
  db.create('post', {
    [ENTITY_TYPE]: 'post',
    [PRIMARY_KEY]: 'id',
    id: 'post-2',
  })
  const firstPost = db.getModel('post').get('post-1')!
  const secondPost = db.getModel('post').get('post-2')!

  relation.apply(
    user,
    'posts',
    [{ id: 'post-1' }, { id: 'post-2' }],
    dictionary,
    db,
  )

  expect(relation.source.modelName).toEqual('user')
  expect(relation.source.primaryKey).toEqual('id')
  expect(relation.target.primaryKey).toEqual('id')

  expect(user.posts).toEqual([firstPost, secondPost])
})

it('throws an exception when applying a relation that references a non-existing entity', () => {
  const relation = new Relation({
    to: 'country',
    kind: RelationKind.OneOf,
  })
  const dictionary: ModelDictionary = {
    user: {
      birthPlace: relation,
    },
    country: {
      code: primaryKey(String),
    },
  }
  const db = new Database(dictionary)
  const users = db.create('user', {
    [ENTITY_TYPE]: 'user',
    [PRIMARY_KEY]: 'id',
    id: 'user-1',
  })
  const user = users.get('user-1')!

  expect(() => {
    relation.apply(user, 'birthPlace', { code: 'us' }, dictionary, db)
  }).toThrow(
    'Failed to define a relational property "birthPlace" on "user": referenced entity "us" ("code") does not exist.',
  )
})

it('throws an exception when applying a unique relation that references an already references entity', () => {
  const relation = new Relation({
    to: 'country',
    kind: RelationKind.OneOf,
    attributes: {
      unique: true,
    },
  })
  const dictionary: ModelDictionary = {
    user: {
      birthPlace: relation,
    },
    country: {
      code: primaryKey(String),
    },
  }
  const db = new Database(dictionary)
  db.create('user', {
    [ENTITY_TYPE]: 'user',
    [PRIMARY_KEY]: 'id',
    id: 'user-1',
  })
  db.create('user', {
    [ENTITY_TYPE]: 'user',
    [PRIMARY_KEY]: 'id',
    id: 'user-2',
  })
  const firstUser = db.getModel('user').get('user-1')!
  const secondUser = db.getModel('user').get('user-2')!

  db.create('country', {
    [ENTITY_TYPE]: 'country',
    [PRIMARY_KEY]: 'code',
    code: 'us',
  })

  // First, apply a new relation to the first user.
  relation.apply(firstUser, 'birthPlace', { code: 'us' }, dictionary, db)

  // Then, apply the relation t othe second user
  // referencing the same country (the relation is unique).
  expect(() => {
    relation.apply(secondUser, 'birthPlace', { code: 'us' }, dictionary, db)
  }).toThrow(
    'Failed to create a unique "ONE_OF" relation to "country" ("user.birthPlace") for "user-2": referenced country "us" belongs to another user ("user-1").',
  )
})

it('does not throw an exception when updating the relational reference to the same reference', () => {
  const relation = new Relation({
    to: 'country',
    kind: RelationKind.OneOf,
    attributes: {
      unique: true,
    },
  })
  const dictionary: ModelDictionary = {
    user: {
      birthPlace: relation,
    },
    country: {
      code: primaryKey(String),
    },
  }
  const db = new Database(dictionary)
  const users = db.create('user', {
    [ENTITY_TYPE]: 'user',
    [PRIMARY_KEY]: 'id',
    id: 'user-1',
  })
  const user = users.get('user-1')!

  const countries = db.create('country', {
    [ENTITY_TYPE]: 'country',
    [PRIMARY_KEY]: 'code',
    code: 'us',
  })
  const country = countries.get('us')

  // First, apply a new relation to the first user.
  relation.apply(user, 'birthPlace', { code: 'us' }, dictionary, db)

  // Update the relational reference to the same referenced country.
  relation.resolveWith(user, { code: 'us' })

  expect(user.birthPlace).toEqual(country)
})
