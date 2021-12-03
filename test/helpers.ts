import { factory } from '../src'
import {
  ModelDictionary,
  ENTITY_TYPE,
  PRIMARY_KEY,
  Value,
} from '../src/glossary'

export function testFactory<Dictionary extends ModelDictionary>(
  dictionary: Dictionary,
) {
  const db = factory(dictionary)

  return {
    db,
    dictionary,
    entity<ModelName extends keyof Dictionary>(
      modelName: ModelName,
      properties: Value<Dictionary[ModelName], Dictionary>,
    ) {
      const entity = db[modelName].getAll()[0]
      return {
        [ENTITY_TYPE]: entity[ENTITY_TYPE],
        [PRIMARY_KEY]: entity[PRIMARY_KEY],
        ...properties,
      }
    },
  }
}
