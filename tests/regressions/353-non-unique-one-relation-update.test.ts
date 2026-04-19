import { z } from 'zod'
import { Collection } from '#/src/collection.js'

it('updates a non-unique one relation to a foreign record already associated with another owner', async () => {
  const languageSchema = z.object({ code: z.string() })
  const userSchema = z.object({
    name: z.string(),
    language: languageSchema,
  })

  const languages = new Collection({ schema: languageSchema })
  const users = new Collection({ schema: userSchema })

  users.defineRelations(({ one }) => ({
    language: one(languages, { unique: false }),
  }))

  const langPt = await languages.create({ code: 'pt' })
  const langEn = await languages.create({ code: 'en' })

  const userOne = await users.create({ name: 'User One', language: langPt })
  await users.create({ name: 'User Two', language: langEn })

  await users.update(userOne, {
    data(user) {
      user.language = langEn
    },
  })

  expect(users.all()).toEqual([
    { name: 'User One', language: { code: 'en' } },
    { name: 'User Two', language: { code: 'en' } },
  ])
})
