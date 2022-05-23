import { EntityContext } from '../../contexts/EntityContext'
import { QueryableContext } from '../../contexts/QueryableContext'
import { Database } from '../../Database'
import { Model } from '../../Model'
import { id } from '../id'

const context = new QueryableContext({
  modelName: 'user',
  db: new Database(),
})

it('sets identifier with a custom initial value', () => {
  const model = new Model({
    id: id(String),
  })

  expect(
    model.produce({
      initialValues: {
        id: 'abc-123',
      },
      context,
    }),
  ).toEqual({
    id: 'abc-123',
  })
})

it('sets identifier equal to getter if no initial value was provided', () => {
  const model = new Model({
    id: id(() => 'abc-123'),
  })

  expect(model.produce({ context })).toEqual({
    id: 'abc-123',
  })
})

it('throws error when setting without a context', () => {
  const model = new Model({
    id: id(() => 'abc-123'),
  })

  expect(() => model.produce({})).toThrow(
    'Failed to set identifier at "id": missing context.',
  )
})

it('throws an error when setting with a context other than QueryableContext', () => {
  class CustomContext extends EntityContext {}

  const model = new Model({
    id: id(() => 'abc-123'),
  })

  expect(() =>
    model.produce({
      context: new CustomContext(),
    }),
  ).toThrow(
    'Failed to set identifier at "id": provided context is not an instance of QueryableContext.',
  )
})

it('throws an errow when setting without a value', () => {
  const model = new Model({
    id: id(String),
  })

  expect(() =>
    model.produce({
      context,
    }),
  ).toThrow('Failed to set identifier at "id": value was not provided.')
})

it('throws an error when setting multiple identifiers on a single model', () => {
  const model = new Model({
    id: id(() => 'abc-123'),
    name: id(() => 'John'),
  })

  expect(() =>
    model.produce({
      context,
    }),
  ).toThrow(
    'Failed to set identifier at "name" ("John"): entity already has identifier "id" ("abc-123").',
  )
})
