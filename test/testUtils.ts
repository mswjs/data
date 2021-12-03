import { performance, PerformanceObserver, PerformanceEntry } from 'perf_hooks'
import { factory } from '../src'
import {
  ModelDictionary,
  ENTITY_TYPE,
  PRIMARY_KEY,
  DATABASE_INSTANCE,
  Value,
} from '../src/glossary'

export function repeat(action: () => void, times: number) {
  for (let i = 0; i < times; i++) {
    action()
  }
}

export async function measurePerformance(
  name: string,
  fn: () => void | Promise<void>,
): Promise<PerformanceEntry> {
  const startEvent = `${name}Start`
  const endEvent = `${name}End`

  return new Promise(async (resolve) => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntriesByName(name)
      const lastEntry = entries[entries.length - 1]

      observer.disconnect()
      resolve(lastEntry)
    })
    observer.observe({ entryTypes: ['measure'] })

    performance.mark(startEvent)
    await fn()
    performance.mark(endEvent)
    performance.measure(name, startEvent, endEvent)
  })
}

export function getThrownError(fn: () => void) {
  try {
    fn()
  } catch (error) {
    return error
  }
}

export function testFactory<Dictionary extends ModelDictionary>(
  dictionary: Dictionary,
) {
  const db = factory(dictionary)

  return {
    db,
    databaseInstance: db[DATABASE_INSTANCE],
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
