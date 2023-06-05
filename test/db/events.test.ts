import {
  Database,
  SerializedEntity,
  SERIALIZED_INTERNAL_PROPERTIES_KEY,
} from '../../src/db/Database'
import { createModel } from '../../src/model/createModel'
import { primaryKey } from '../../src/primaryKey'
import { parseModelDefinition } from '../../src/model/parseModelDefinition'
import { ENTITY_TYPE, PRIMARY_KEY } from '../../src/glossary'

test('emits the "create" event when a new entity is created', (done) => {
  const dictionary = {
    user: {
      id: primaryKey(String),
    },
  }

  const db = new Database({
    user: dictionary.user,
  })

  db.events.on('create', (id, modelName, entity, primaryKey) => {
    expect(id).toEqual(db.id)
    expect(modelName).toEqual('user')
    expect(entity).toEqual({
      /**
       * @note Entity reference in the database event listener
       * contains its serialized internal properties.
       * This allows for this listener to re-create the entity
       * when the data is transferred over other channels
       * (i.e. via "BroadcastChannel" which strips object symbols).
       */
      [SERIALIZED_INTERNAL_PROPERTIES_KEY]: {
        entityType: 'user',
        primaryKey: 'id',
      },
      [ENTITY_TYPE]: 'user',
      [PRIMARY_KEY]: 'id',
      id: 'abc-123',
    } as SerializedEntity)
    expect(primaryKey).toBeUndefined()
    done()
  })

  db.create(
    'user',
    createModel(
      'user',
      dictionary.user,
      dictionary,
      parseModelDefinition(dictionary, 'user', dictionary.user),
      {
        id: 'abc-123',
      },
      db,
    ),
  )
})

test('emits the "update" event when an existing entity is updated', (done) => {
  const dictionary = {
    user: {
      id: primaryKey(String),
      firstName: String,
    },
  }

  const db = new Database({
    user: dictionary.user,
  })

  db.events.on('update', (id, modelName, prevEntity, nextEntity) => {
    expect(id).toEqual(db.id)
    expect(modelName).toEqual('user')
    expect(prevEntity).toEqual({
      [SERIALIZED_INTERNAL_PROPERTIES_KEY]: {
        entityType: 'user',
        primaryKey: 'id',
      },
      [ENTITY_TYPE]: 'user',
      [PRIMARY_KEY]: 'id',
      id: 'abc-123',
      firstName: 'John',
    } as SerializedEntity)

    expect(nextEntity).toEqual({
      [SERIALIZED_INTERNAL_PROPERTIES_KEY]: {
        entityType: 'user',
        primaryKey: 'id',
      },
      [ENTITY_TYPE]: 'user',
      [PRIMARY_KEY]: 'id',
      id: 'def-456',
      firstName: 'Kate',
    } as SerializedEntity)
    done()
  })

  db.create(
    'user',
    createModel(
      'user',
      dictionary.user,
      dictionary,
      parseModelDefinition(dictionary, 'user', dictionary.user),
      { id: 'abc-123', firstName: 'John' },
      db,
    ),
  )
  db.update(
    'user',
    db.getModel('user').get('abc-123')!,
    createModel(
      'user',
      dictionary.user,
      dictionary,
      parseModelDefinition(dictionary, 'user', dictionary.user),
      { id: 'def-456', firstName: 'Kate' },
      db,
    ),
  )
})

test('emits the "delete" event when an existing entity is deleted', (done) => {
  const dictionary = {
    user: {
      id: primaryKey(String),
      firstName: String,
    },
  }

  const db = new Database({
    user: dictionary.user,
  })

  db.events.on('delete', (id, modelName, primaryKey) => {
    expect(id).toEqual(db.id)
    expect(modelName).toEqual('user')
    expect(primaryKey).toEqual('abc-123')
    done()
  })

  db.create(
    'user',
    createModel(
      'user',
      dictionary.user,
      dictionary,
      parseModelDefinition(dictionary, 'user', dictionary.user),
      { id: 'abc-123', firstName: 'John' },
      db,
    ),
  )
  db.delete('user', 'abc-123')
})
