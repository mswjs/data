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
  expect(relation.attributes).toEqual<RelationAttributes>({
    nullable: false,
    unique: false,
  })
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
  expect(relation.attributes).toEqual<RelationAttributes>({
    unique: true,
    nullable: false,
  })
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
  db.getModel('country').get('us')!

  const users = db.create('user', {
    [ENTITY_TYPE]: 'user',
    [PRIMARY_KEY]: 'id',
    id: 'user-1',
  })
  const user = users.get('user-1')!

  relation.apply(user, ['birthPlace'], dictionary, db)

  // When applied, relation is updated with the additional info.
  expect(relation.target.primaryKey).toEqual('code')
  expect(relation.source.modelName).toEqual('user')
  expect(relation.source.primaryKey).toEqual('id')

  // Applying a relation does NOT define the proxy getter.
  expect(user).not.toHaveProperty('birthPlace')
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
  db.getModel('post').get('post-1')!
  db.getModel('post').get('post-2')!

  relation.apply(user, ['posts'], dictionary, db)

  expect(relation.source.modelName).toEqual('user')
  expect(relation.source.primaryKey).toEqual('id')
  expect(relation.target.primaryKey).toEqual('id')

  // Applying a relation does NOT define the proxy getter.
  expect(user).not.toHaveProperty('posts')
})

it('throws an exception when resolving a relation with a non-existing reference', () => {
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

  relation.apply(user, ['birthPlace'], dictionary, db)

  expect(() => {
    relation.resolveWith(user, {
      [ENTITY_TYPE]: 'country',
      [PRIMARY_KEY]: 'code',
      code: 'us',
    })
  }).toThrow(
    'Failed to resolve a "ONE_OF" relationship to "country" at "user.birthPlace" (id: "user-1"): referenced entity "country" (code: "us") does not exist.',
  )
})

it('throws an exception when resolving a unique relation that references an already references entity', () => {
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

  const country = {
    [ENTITY_TYPE]: 'country',
    [PRIMARY_KEY]: 'code',
    code: 'us',
  }
  db.create('country', country)

  // First, apply a new relation to the first user.
  relation.apply(firstUser, ['birthPlace'], dictionary, db)
  relation.resolveWith(firstUser, country)

  // Then, apply the relationship to the second user,
  // referencing the same country (the relationship is unique).
  expect(() => {
    relation.resolveWith(secondUser, country)
  }).toThrow(
    'Failed to resolve a "ONE_OF" relationship to "country" at "user.birthPlace" (id: "user-2"): the referenced "country" (code: "us") belongs to another "user" (id: "user-1").',
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

  // First, apply and resolve a new relation for the first user.
  relation.apply(user, ['birthPlace'], dictionary, db)
  relation.resolveWith(user, {
    [ENTITY_TYPE]: 'country',
    [PRIMARY_KEY]: 'code',
    code: 'us',
  })

  // Update the relational reference to the same referenced country.
  relation.resolveWith(user, {
    [ENTITY_TYPE]: 'country',
    [PRIMARY_KEY]: 'code',
    code: 'us',
  })

  expect(user).toHaveRelationalProperty('birthPlace', country)
})

it('supports creating nullable relations', () => {
  const relation = new Relation({
    to: 'country',
    kind: RelationKind.OneOf,
    attributes: {
      nullable: true,
    },
  })

  expect(relation.attributes.nullable).toBe(true)
})

it('throws an exception when resolving a non-nullable relation with null', () => {
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
  db.create('user', {
    [ENTITY_TYPE]: 'user',
    [PRIMARY_KEY]: 'id',
    id: 'user-1',
  })
  const user = db.getModel('user').get('user-1')!

  const countries = db.create('country', {
    [ENTITY_TYPE]: 'country',
    [PRIMARY_KEY]: 'code',
    code: 'us',
  })
  const country = countries.get('us')

  // First, apply a new relation to the user.
  relation.apply(user, ['birthPlace'], dictionary, db)
  relation.resolveWith(user, {
    [ENTITY_TYPE]: 'country',
    [PRIMARY_KEY]: 'code',
    code: 'us',
  })

  // Then, update the relational property to resolve with null.
  expect(() => {
    relation.resolveWith(user, null)
  }).toThrow(
    'Failed to resolve a "ONE_OF" relationship to "country" at "user.birthPlace" (id: "user-1"): cannot resolve a non-nullable relationship with null.',
  )

  // The relational property still resolves with the previous value.
  expect(user).toHaveRelationalProperty('birthPlace', country)
})

it('does not throw an exception when resolving a nullable relation with null', () => {
  const relation = new Relation({
    to: 'country',
    kind: RelationKind.OneOf,
    attributes: {
      nullable: true,
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
  const user = db.getModel('user').get('user-1')!

  // First, apply a new relation to the user.
  relation.apply(user, ['birthPlace'], dictionary, db)

  // Then, update the relational property to return null.
  expect(() => {
    relation.resolveWith(user, null)
  }).not.toThrow()

  // The relational property now resolves to null.
  expect(user).toHaveRelationalProperty('birthPlace', null)
})
