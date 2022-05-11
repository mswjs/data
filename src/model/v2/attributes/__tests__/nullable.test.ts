import { nullable } from '../nullable'
import { Model } from '../../Model'

it('sets nullable property to default value if initial value is not set', () => {
  const ast = new Model({
    age: nullable(() => 24),
  })

  expect(ast.produce()).toEqual({
    age: 24,
  })
})

it('sets nullable property to default null value if initial value is not set', () => {
  const ast = new Model({
    age: nullable(() => null),
  })

  expect(ast.produce()).toEqual({
    age: null,
  })
})

it('produces nested nullable object if the initial value is not set', () => {
  const ast = new Model({
    address: nullable({
      street: () => 'Baker st.',
    }),
  })

  expect(ast.produce()).toEqual({
    address: {
      street: 'Baker st.',
    },
  })
})

it('sets nullable property with nested object to null if the initial value is null', () => {
  const ast = new Model({
    address: nullable({
      street: () => 'Baker st.',
    }),
  })

  expect(
    ast.produce({
      initialValues: {
        address: null,
      },
    }),
  ).toEqual({
    address: null,
  })
})

it('supports nested nullables', () => {
  const ast = new Model({
    address: nullable({
      street: () => 'Baker st.',
      houseNumber: nullable(() => 12),
    }),
  })

  expect(ast.produce()).toEqual({
    address: {
      street: 'Baker st.',
      houseNumber: 12,
    },
  })

  expect(
    ast.produce({
      initialValues: {
        address: {
          houseNumber: null,
        },
      },
    }),
  ).toEqual({
    address: {
      street: 'Baker st.',
      houseNumber: null,
    },
  })
})
