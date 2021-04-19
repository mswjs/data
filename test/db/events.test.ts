import { primaryKey } from '@mswjs/data'
import { Database } from '../../src/db/Database'
import { createModel } from '../../src/model/createModel'
import { parseModelDefinition } from '../../src/model/parseModelDefinition'

test('emits the "create" event when a new entity is created', (done) => {
  const userDefinition = {
    id: primaryKey(String),
  }
  const db = new Database({
    user: userDefinition,
  })

  db.events.on('create', (id, modelName, entity, primaryKey) => {
    expect(id).toEqual(db.id)
    expect(modelName).toEqual('user')
    expect(entity).toEqual({
      __type: 'user',
      __primaryKey: 'id',
      id: 'abc-123',
    })
    expect(primaryKey).toBeUndefined()
    done()
  })

  db.create(
    'user',
    createModel(
      'user',
      userDefinition,
      parseModelDefinition('user', userDefinition),
      {
        id: 'abc-123',
      },
      db,
    ),
  )
})

test('emits the "update" event when an existing entity is updated', (done) => {
  const userDefinition = {
    id: primaryKey(String),
    firstName: String,
  }
  const db = new Database({
    user: userDefinition,
  })

  db.events.on('update', (id, modelName, prevEntity, nextEntity) => {
    expect(id).toEqual(db.id)
    expect(modelName).toEqual('user')
    expect(prevEntity).toEqual({
      __type: 'user',
      __primaryKey: 'id',
      id: 'abc-123',
      firstName: 'John',
    })
    expect(nextEntity).toEqual({
      __type: 'user',
      __primaryKey: 'id',
      id: 'def-456',
      firstName: 'Kate',
    })
    done()
  })

  db.create(
    'user',
    createModel(
      'user',
      userDefinition,
      parseModelDefinition('user', userDefinition),
      { id: 'abc-123', firstName: 'John' },
      db,
    ),
  )
  db.update(
    'user',
    db.getModel('user').get('abc-123')!,
    createModel(
      'user',
      userDefinition,
      parseModelDefinition('user', userDefinition),
      { id: 'def-456', firstName: 'Kate' },
      db,
    ),
  )
})

test('emits the "delete" event when an existing entity is deleted', (done) => {
  const userDefinition = {
    id: primaryKey(String),
    firstName: String,
  }
  const db = new Database({
    user: userDefinition,
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
      userDefinition,
      parseModelDefinition('user', userDefinition),
      { id: 'abc-123', firstName: 'John' },
      db,
    ),
  )
  db.delete('user', 'abc-123')
})
