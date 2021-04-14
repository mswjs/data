import { factory } from '../factory'

export function drop(db: ReturnType<typeof factory>): void {
  Object.values(db).forEach((model) => {
    model.deleteMany({
      where: {},
    })
  })
}
