import { parseModelDefinition } from '../../src/model/parseModelDefinition'
import { oneOf, manyOf, primaryKey } from '../../src'
import { Database } from '../../src/db/Database'
import { RelationKind, ModelDictionary } from '../../src/glossary'
import { createModel } from '../../src/model/createModel'

test('serialized database models into JSON', () => {
  const dictionary: ModelDictionary = {
    user: {
      id: primaryKey(String),
      firstName: () => 'John',
      role: oneOf('role'),
      posts: manyOf('post', { unique: true }),
    },
    role: {
      id: primaryKey(String),
      name: String,
    },
    post: {
      id: primaryKey(String),
      title: String,
    },
  }

  const db = new Database({
    user: dictionary.user,
    role: dictionary.role,
    post: dictionary.post,
  })

  const role = createModel(
    'role',
    dictionary.role,
    parseModelDefinition(dictionary, 'role'),
    { id: 'role-1', name: 'Reader' },
    db,
  )

  const posts = [
    createModel(
      'post',
      dictionary.post,
      parseModelDefinition(dictionary, 'post'),
      { id: 'post-1', title: 'First' },
      db,
    ),
    createModel(
      'post',
      dictionary.post,
      parseModelDefinition(dictionary, 'post'),
      { id: 'post-2', title: 'Second' },
      db,
    ),
  ]

  db.create('role', role)
  posts.forEach((post) => {
    db.create('post', post)
  })

  db.create(
    'user',
    createModel(
      'user',
      dictionary.user,
      parseModelDefinition(dictionary, 'user'),
      {
        id: 'abc-123',
        firstName: 'John',
        role,
        posts,
      },
      db,
    ),
  )

  const json = db.toJson()
  console.log(JSON.stringify(json, null, 2))

  expect(json).toEqual({
    user: [
      [
        'abc-123',
        {
          __type: 'user',
          __primaryKey: 'id',
          id: 'abc-123',
          firstName: 'John',
          role: {
            kind: RelationKind.OneOf,
            modelName: 'role',
            unique: false,
            primaryKey: 'id',
          },
          posts: {
            kind: RelationKind.ManyOf,
            modelName: 'post',
            unique: true,
            primaryKey: 'id',
          },
        },
      ],
    ],
    role: [
      [
        'role-1',
        {
          __type: 'role',
          __primaryKey: 'id',
          id: 'role-1',
          name: 'Reader',
        },
      ],
    ],
    post: [
      [
        'post-1',
        {
          __type: 'post',
          __primaryKey: 'id',
          id: 'post-1',
          title: 'First',
        },
      ],
      [
        'post-2',
        {
          __type: 'post',
          __primaryKey: 'id',
          id: 'post-2',
          title: 'Second',
        },
      ],
    ],
  })
})
