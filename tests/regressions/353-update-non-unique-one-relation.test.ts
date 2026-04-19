import { z } from 'zod'
import { Collection } from '#/src/collection.js'

it("scopes nested updates to the updated owner's foreign record", async () => {
  const countrySchema = z.object({ code: z.string() })
  const userSchema = z.object({
    name: z.string(),
    country: countrySchema,
  })

  const countries = new Collection({ schema: countrySchema })
  const users = new Collection({ schema: userSchema })

  users.defineRelations(({ one }) => ({
    country: one(countries),
  }))

  const us = await countries.create({ code: 'us' })
  const ca = await countries.create({ code: 'ca' })

  const userOne = await users.create({ name: 'John', country: us })
  await users.create({ name: 'Kate', country: ca })

  await users.update(userOne, {
    data(user) {
      user.country.code = 'uk'
    },
  })

  expect(countries.all()).toEqual([{ code: 'uk' }, { code: 'ca' }])
})
