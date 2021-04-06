import { random } from 'faker'
import { factory, primaryKey } from '../../src'

const db = factory({
  user: {
    id: primaryKey(random.uuid),
    firstName: String,
    lastName: String,
  },
})

// @ts-ignore
window.db = db
