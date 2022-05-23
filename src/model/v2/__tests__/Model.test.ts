import { nullable, NullableAttributes } from '../attributes/nullable'
import { Model } from '../Model'
import { Token, TokenAttributes } from '../Token'

describe('parse', () => {
  it('parses a single property with a getter', () => {
    const name = () => 'John'
    const model = new Model({
      name,
    })

    expect(model.tokens).toEqual([
      new Token({
        location: ['name'],
        attributes: new TokenAttributes(name),
        children: undefined,
      }),
    ])
  })

  it('parses multiple properties with getters', () => {
    const name = () => 'John'
    const age = () => 42
    const model = new Model({
      name,
      age,
    })

    expect(model.tokens).toEqual([
      new Token({
        location: ['name'],
        attributes: new TokenAttributes(name),
        children: undefined,
      }),
      new Token({
        location: ['age'],
        attributes: new TokenAttributes(age),
        children: undefined,
      }),
    ])
  })

  it('parses nested properties', () => {
    const name = () => 'John'
    const city = () => 'New York'
    const country = () => 'USA'
    const model = new Model({
      name,
      address: {
        city,
        country,
      },
    })

    expect(model.tokens).toEqual([
      new Token({
        location: ['name'],
        attributes: new TokenAttributes(name),
        children: undefined,
      }),
      new Token({
        location: ['address', 'city'],
        attributes: new TokenAttributes(city),
        children: undefined,
      }),
      new Token({
        location: ['address', 'country'],
        attributes: new TokenAttributes(country),
        children: undefined,
      }),
    ])
  })

  it('parses a nullable property', () => {
    const name = () => 'John'
    const model = new Model({
      name: nullable(name),
    })

    expect(model.tokens).toEqual([
      new Token({
        location: ['name'],
        attributes: new NullableAttributes(name),
        children: undefined,
      }),
    ])
  })

  it('parses a nested nullable property', () => {
    const city = () => 'New York'
    const model = new Model({
      address: {
        city: nullable(city),
      },
    })

    expect(model.tokens).toHaveLength(1)
    expect(model.tokens[0].location).toEqual(['address', 'city'])
    expect(model.tokens[0].attributes).toBeInstanceOf(NullableAttributes)
    expect(model.tokens[0].attributes.value).toEqual(city)
    expect(model.tokens[0].attributes.skipChildren).toBe(false)
    expect(model.tokens[0].attributes.childDefinition).toBeUndefined()
    expect(model.tokens[0].children).toBeUndefined()
  })

  it('parses a nested nullable object', () => {
    const city = () => 'New York'
    const model = new Model({
      address: nullable({
        city,
      }),
    })

    expect(model.tokens).toHaveLength(1)
    expect(model.tokens[0].location).toEqual(['address'])

    // Nullable attributes.
    expect(model.tokens[0].attributes).toBeInstanceOf(NullableAttributes)
    // It's only possible to know whether the children should be skipped
    // when providing null as the initial value ot a nullable property ("address").
    expect(model.tokens[0].attributes.skipChildren).toBe(false)
    expect(model.tokens[0].attributes.childDefinition).toEqual({ city })

    // Child definitions.
    expect(model.tokens[0].children).toHaveLength(1)
    expect(model.tokens[0].children?.[0]?.location).toEqual(['address', 'city'])
    expect(model.tokens[0].children?.[0]?.attributes).toEqual(
      new TokenAttributes(city),
    )
  })
})
