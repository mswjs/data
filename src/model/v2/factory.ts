import { QueryableContext } from './contexts/QueryableContext'
import { Database } from './Database'
import { InitialValues, Model, ModelDefinition } from './Model'

export type ModelDictionary = Record<string, ModelDefinition>

interface ModelApi<Definition extends ModelDefinition> {
  create(initialValues?: InitialValues<Definition>): any
}

type FactoryApi<Dictionary extends ModelDictionary> = {
  [ModelName in keyof Dictionary]: ModelApi<Dictionary[ModelName]>
}

export function factory<Dictionary extends ModelDictionary>(
  dictionary: Dictionary,
) {
  const db = new Database()

  return Object.entries(dictionary).reduce<FactoryApi<Dictionary>>(
    (api, [modelName, definition]) => {
      api[modelName as keyof Dictionary] = createModelApi(
        modelName,
        definition,
        db,
      )

      return api
    },
    {} as FactoryApi<Dictionary>,
  )
}

function createModelApi<Definition extends ModelDefinition>(
  modelName: string,
  definition: Definition,
  db: Database,
): ModelApi<Definition> {
  const model = new Model(definition)
  const context = new QueryableContext({
    modelName,
    db,
  })

  return {
    create(initialValues) {
      return model.produce({
        initialValues,
        context,
      })
    },
  }
}
