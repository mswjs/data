import { FactoryAPI } from '../glossary'

export function drop(db: FactoryAPI<any>): void {
  Object.values(db).forEach((model) => {
    model.deleteMany({ where: {} })
  })
}
