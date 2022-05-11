import { nullable, primaryKey } from '../../src'
import { model } from '../../src/model/model'
import { ModelAst } from '../../src/model/ModelAst'

it('creates a static model', () => {
  const definition = {
    id: primaryKey(() => 'abc-123'),
    age: Number,
    name: nullable(String),
    address: {
      street: String,
    },
  }
  const user = model(definition)

  console.log(ModelAst.parse(definition))

  // expect(user.definition).toBe(definition)
  // expect(user.properties).toEqual([['age'], ['address', 'street']])

  // expect(
  //   user.create({
  //     age: 12,
  //     address: {
  //       street: 'Baker st.',
  //     },
  //   }),
  // ).toEqual({
  //   age: 12,
  //   address: {
  //     street: 'Baker st.',
  //   },
  // })
})
