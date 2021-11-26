import { spread } from '../../src/utils/spread'

it('spreads a plain object', () => {
  const source = { a: 1, b: { c: 2 } }
  const target = spread(source)

  expect(target).toEqual(source)

  source.a = 2
  source.b.c = 3

  expect(target.a).toEqual(1)
  expect(target.b.c).toEqual(2)
})

it('preserves property getters', () => {
  const source = { a: 1, getCount: undefined }
  Object.defineProperty(source, 'getCount', {
    get() {
      return 123
    },
  })

  const target = spread(source)

  expect(target.a).toEqual(1)
  expect(Object.getOwnPropertyDescriptor(target, 'getCount')).toEqual(
    Object.getOwnPropertyDescriptor(source, 'getCount'),
  )
  expect(target.getCount).toEqual(123)
})

it('does not preserve symbols', () => {
  const symbol = Symbol('secret')
  const source = {} as { [symbol]: number }
  Object.defineProperty(source, symbol, { value: 123 })

  const target = spread(source)

  expect(target[symbol]).toBeUndefined()
  expect(Object.getOwnPropertySymbols(target)).toEqual([])
})
