import { datatype, random, name } from 'faker'
import { factory, primaryKey, snapshot } from '@mswjs/data'
import { measurePerformance, repeat } from '../testUtils'

test('snapshot a database with 1000 records in under 350ms', async () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      firstName: name.firstName,
      lastName: name.lastName,
      age: datatype.number,
      role: random.word,
    },
  })
  repeat(db.user.create, 1000)

  const snapshotPerformance = await measurePerformance('snapshot', () => {
    snapshot(db)
  })

  expect(snapshotPerformance.duration).toBeLessThanOrEqual(350)
})

it('restore a database with 1000 records in under 350ms', async () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      firstName: name.firstName,
      lastName: name.lastName,
      age: datatype.number,
      role: random.word,
    },
  })
  repeat(db.user.create, 1000)

  const restore = snapshot(db)

  const restorePerformance = await measurePerformance('restore', () => {
    restore()
  })

  expect(restorePerformance.duration).toBeLessThanOrEqual(350)
})
