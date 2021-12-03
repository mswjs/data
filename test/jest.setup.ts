expect.extend({
  toHaveRelationalProperty(entity, propertyName, value) {
    expect(entity).toHaveProperty(propertyName)

    // Relational property must only have a getter.
    const descriptor = Object.getOwnPropertyDescriptor(entity, propertyName)!
    expect(descriptor.get).toBeInstanceOf(Function)
    expect(descriptor.value).not.toBeDefined()
    expect(descriptor.enumerable).toEqual(true)
    expect(descriptor.configurable).toEqual(true)

    if (value) {
      const actualValue = entity[propertyName]
      expect(actualValue).toEqual(value)
    }

    return {
      pass: true,
      message() {
        return ''
      },
    }
  },
})
