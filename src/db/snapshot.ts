import { ModelDictionary, FactoryAPI, Entity } from '../glossary'

export function snapshot<Dictionary extends ModelDictionary>(
  db: FactoryAPI<Dictionary>,
) {
  const dbSnapshot = Object.keys(db).reduce<
    Record<string, Entity<Dictionary, any>[]>
  >((acc, entityName) => {
    acc[entityName] = db[entityName].getAll()
    return acc
  }, {})

  return () => {
    Object.keys(db).forEach((entityName) => {
      const snapshotEntities = dbSnapshot[entityName]
      db[entityName].deleteMany({ where: {} })
      snapshotEntities.forEach((entity) => {
        db[entityName].create(entity)
      })
    })
  }
}
