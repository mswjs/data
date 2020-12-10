# Data

Data modeling and relation library for testing JavaScript applications.

## Motivation

## Getting started

### Install

```bash
$ npm install @mswjs/data --save-dev
```

### Describe data

```js
// src/mocks/db.js
import { factory } from '@mswjs/data'

export const db = factory({
  user: {
    id: () => 'abc-123',
    firstName: () => 'John',
    lastName: () => 'Maverick',
  },
})
```

### Integrate with mocks

```js
// src/mocks/browser.js
import { setupWorker, rest } from 'msw'
import { db } from './db'

setupWorker(
  // Mock a user creation operation.
  rest.post('/user', (req, res, ctx) => {
    const { firstName, lastName } = req.body

    const user = db.user.create({
      firstName,
      lastName,
    })

    return res(ctx.json(user))
  }),

  // Retrieve a single user from the database by ID.
  rest.get('/user/:userId', (req, res, ctx) => {
    const user = db.user.findOne({
      which: {
        id: {
          equals: req.params.userId,
        },
      },
    })

    if (!user) {
      return res(ctx.status(404))
    }

    return res(ctx.json(user))
  })
)
```

## Recipes

### Usage with `faker`

```js
import { random, name } from 'faker'
import { factory } from '@mswjs/data'

factory({
  user: {
    id: random.uuid,
    firstName: name.firstName,
  },
})
```
