interface Entity<EntityType> {
  (): EntityType
}

export function entity<
  SchemaType extends Record<string, () => any>,
  EntityType = {
    [K in keyof SchemaType]: ReturnType<SchemaType[K]>
  }
>(schema: SchemaType): Entity<EntityType> {
  return () => {
    return Object.keys(schema).reduce<EntityType>((acc, propertyName) => {
      const getValue = schema[propertyName]
      acc[propertyName] = getValue()
      return acc
    }, {} as EntityType)
  }
}

export function listOf<EntityType>(
  entity: Entity<EntityType>,
  length?: number
): Entity<EntityType[]> {
  return () => {
    return new Array(length).fill(null).map(entity)
  }
}
