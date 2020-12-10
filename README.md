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

### Model methods

#### `create`

Creates an entity of the model.

```js
db.user.create()
```

#### `findOne`

Returns the first entity that satisfies the given query.

```js
db.user.findOne({
  which: {
    id: {
      equals: 'abc-123',
    },
  },
})
```

#### `findMany`

Returns all the entities that satisfy the given query.

```js
db.user.findMany({
  which: {
    followersCount: {
      gte: 1000,
    },
  },
})
```

#### `delete`

Deletes the entity that satisfies the given query.

```js
db.user.delete({
  which: {
    followersCount: {
      equals: 0,
    },
  },
})
```

### Querying data

This library supports querying of the seeded data similar to how one would query an SQL database. The data is queried based on its properties. A query you construct depends on the value type you are querying.

#### String queries

- `equals`
- `notEquals`
- `contains`
- `notContains`

#### Number queries

- `equals`
- `notEquals`
- `gt`
- `gte`
- `lt`
- `lte`
- `between`
- `notBetween`

#### Query example

```js
const db = factory({
  post: {
    id: String,
    likes: Number,
    isDraft: Boolean,
  },
})

// Returns the list of `post` entities
// that satisfy the given query.
const popularPosts = db.post.findMany({
  which: {
    likes: {
      gte: 1000,
    },
    isDraft: {
      equals: false,
    },
  },
})
```

### Models relation

#### One-to-one

```js
import { factory, oneOf } from '@mswjs/data'

const db = factory({
  user: {
    id: String
  },
  post: {
    it: String
    title: String
    // The `post` model has the `author` property
    // that points to the `user` entity.
    author: oneOf('user')
  }
})

const user = db.user.create()
db.post.create({
  title: 'My journey',
  // Set the existing `user` as the author of this post.
  author: user,
})
```

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
