import { primaryKey } from '../../src'
import { Database } from '../../src/db/Database'
import { createModel } from '../../src/model/createModel'

test('emits the "create" event when a new entity is created', (done) => {
  const db = new Database({
    user: {
      id: primaryKey(String),
    },
  })

  db.events.on('create', (modelName, entity, primaryKey) => {
    expect(modelName).toEqual('user')
    expect(entity).toEqual({
      __type: 'user',
      __primaryKey: 'id',
      id: 'abc-123',
    })
    expect(primaryKey).toBeUndefined()
    done()
  })

  db.create('user', createModel('user', 'id', { id: 'abc-123' }, {}, db))
})

test('emits the "update" event when an existing entity is updated', (done) => {
  const db = new Database({
    user: {
      id: primaryKey(String),
      firstName: String,
    },
  })

  db.events.on('update', (modelName, prevEntity, nextEntity) => {
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
    createModel('user', 'id', { id: 'abc-123', firstName: 'John' }, {}, db),
  )
  db.update(
    'user',
    db.getModel('user').get('abc-123')!,
    createModel('user', 'id', { id: 'def-456', firstName: 'Kate' }, {}, db),
  )
})

test('emits the "delete" event when an existing entity is deleted', (done) => {
  const db = new Database({
    user: {
      id: primaryKey(String),
      firstName: String,
    },
  })

  db.events.on('delete', (modelName, primaryKey) => {
    expect(modelName).toEqual('user')
    expect(primaryKey).toEqual('abc-123')
    done()
  })

  db.create(
    'user',
    createModel('user', 'id', { id: 'abc-123', firstName: 'John' }, {}, db),
  )
  db.delete('user', 'abc-123')
})
