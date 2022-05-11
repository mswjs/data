import { ModelAst } from '../src/model/v2/ModelAst'
import { id } from '../src/model/v2/attributes/id'
import { createEntity } from '../src/model/v2/createEntity'
import { QueryableContext } from '../src/model/v2/QueryableContext'
import { Database } from '../src/model/v2/Database'

it('creates entity from a static model', () => {
  const ast = new ModelAst({
    id: () => 'abc-123',
    address: {
      street: () => '123 Main St',
    },
  })

  const entity = createEntity({
    ast,
    initialValues: {
      address: {
        street: 'Baker st.',
      },
    },
  })

  expect(entity).toEqual({
    id: 'abc-123',
    address: {
      street: 'Baker st.',
    },
  })
})

it('creates entity in a queryable context', () => {
  const ast = new ModelAst({
    id: id(() => 'abc-123'),
    street: {
      address: () => 'Baker st.',
    },
  })

  const db = new Database()
  const entity = ast.produce({
    context: new QueryableContext({
      modelName: 'user',
      db,
    }),
  })

  expect(entity).toEqual({
    id: 'abc-123',
    street: {
      address: 'Baker st.',
    },
  })
})
