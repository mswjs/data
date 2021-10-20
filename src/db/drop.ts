import { FactoryAPI } from '../glossary'

export function drop(factoryApi: FactoryAPI<any>): void {
  Object.values(factoryApi).forEach((model) => {
    model.deleteMany({ where: {} })
  })
}
