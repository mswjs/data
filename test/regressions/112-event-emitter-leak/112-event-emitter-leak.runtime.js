import { factory, primaryKey } from '@mswjs/data'

const models = {}

for (let i = 0; i < 100; i++) {
  models[`model${i}`] = {
    id: primaryKey(String),
  }
}

const db = factory(models)

window.db = db
