import { Collection } from '#/src/index.js'
import z from 'zod'

it('derives a value from other values', async () => {
  const users = new Collection({
    schema: z
      .object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.email().optional(),
      })
      .transform((user) => {
        user.email = `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}@email.com`
        return user
      }),
  })

  await expect(
    users.create({
      firstName: 'John',
      lastName: 'Doe',
    }),
  ).resolves.toEqual({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@email.com',
  })
})
