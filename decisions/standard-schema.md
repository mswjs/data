# Standard Schema

I chose to adopt [Standard Schema](https://standardschema.dev/) as the way to define models. This library was never meant to have a custom modeling syntax you have to learn. With the introduction of Standard Schema, it can now rely on any standard-compliant modeling library as the input, making it easier for developers to adopt.

```ts
import { Collection } from '@msw/data'
import z from 'zod'

const users = new Collection({
  schema: z.object({
    id: z.number(),
    name: z.string().optional(),
  }),
})
```

> Above, Zod is used to model the `users` collection. You can use any of the Standard Schema-compatible libraries instead.

This decision also allows the library to offload custom features, like derived properties, to the schema libraries. For example, to derive a model's property from another property, you follow your schema library's best practices.

```ts
new Collection({
  schema: z
    .object({
      name: z.string(),
      email: z.email(),
    })
    .transform((user) => {
      user.email = `${user.name.toLowerCase()}@email.com`
      return user
    }),
})
```

> Above, I'm using Zod's `.transform()` method to derive the `email` field from the `name` field.

## Model restrictions

In order to support internal IDs and relations, user-defined models _must be either objects or arrays_.
