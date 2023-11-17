import {
  Database,
  SerializedEntity,
  SERIALIZED_INTERNAL_PROPERTIES_KEY,
  DatabaseEventsMap,
} from '../../src/db/Database'
import { createModel } from '../../src/model/createModel'
import { primaryKey } from '../../src/primaryKey'
import { parseModelDefinition } from '../../src/model/parseModelDefinition'
import { ENTITY_TYPE, PRIMARY_KEY } from '../../src/glossary'

test('emits the "create" event when a new entity is created', async () => {
  const dictionary = {
    user: {
      id: primaryKey(String),
    },
  }

  const db = new Database({
    user: dictionary.user,
  })

  const createCallbackPromise = new Promise<DatabaseEventsMap['create']>(
    (resolve) => {
      db.events.on('create', (...args) => resolve(args))
    },
  )

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

  const [id, modelName, entity, customPrimaryKey] = await createCallbackPromise
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
  expect(customPrimaryKey).toBeUndefined()
})

test('emits the "update" event when an existing entity is updated', async () => {
  const dictionary = {
    user: {
      id: primaryKey(String),
      firstName: String,
    },
  }

  const db = new Database({
    user: dictionary.user,
  })

  const updateCallbackPromise = new Promise<DatabaseEventsMap['update']>(
    (resolve) => {
      db.events.on('update', (...args) => resolve(args))
    },
  )

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

  const [id, modelName, prevEntity, nextEntity] = await updateCallbackPromise
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
})

test('emits the "delete" event when an existing entity is deleted', async () => {
  const dictionary = {
    user: {
      id: primaryKey(String),
      firstName: String,
    },
  }

  const db = new Database({
    user: dictionary.user,
  })

  const deleteCallbackPromise = new Promise<DatabaseEventsMap['delete']>(
    (resolve) => {
      db.events.on('delete', (...args) => {
        resolve(args)
      })
    },
  )

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

  const [id, modelName, deletedPrimaryKey] = await deleteCallbackPromise
  expect(id).toEqual(db.id)
  expect(modelName).toEqual('user')
  expect(deletedPrimaryKey).toEqual('abc-123')
})
