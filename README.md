<p align="center">
  <img src="logo.svg" alt="Data library logo" width="124" />
</p>

<h1 align="center"><code>@mswjs/data</code></h1>

Data modeling and relation library for testing JavaScript applications.

## Motivation

When testing API interactions you often need to mock the data. Instead of keeping a hard-coded set of fixtures, this library provides you with an intuitive interface to model your data, create relations between different models, and query them alike to an actual database. A must-have for a data-driven API mocking.

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

Although this library can be used standalone, it's specifically fine-tuned to integrate with [Mock Service Worker](https://github.com/mswjs/msw) to compose an unrivaled API mocking experience for both testing and development of your JavaScript applications.

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
    const user = db.user.findFirst({
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
  }),
)
```

## Recipes

### Model methods

#### `create`

Creates an entity of the model.

```js
const user = db.user.create()
```

#### `findFirst`

Returns the first entity that satisfies the given query.

```js
const user = db.user.findFirst({
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
const users = db.user.findMany({
  which: {
    followersCount: {
      gte: 1000,
    },
  },
})
```

#### `getAll`

Returns all the entities of the given model.

```js
const allUsers = db.user.getAll()
```

#### `update`

```js
const updatedUser = db.user.update({
  // Query for the entity to modify.
  which: {
    id: {
      equals: 'abc-123',
    },
  },
  // Provide partial next data to be
  // merged with the existing properties.
  data: {
    firstName: 'John',
  },
})
```

#### `delete`

Deletes the entity that satisfies the given query.

```js
const deletedUser = db.user.delete({
  which: {
    followersCount: {
      equals: 0,
    },
  },
})
```

#### `deleteMany`

```js
const deletedUsers = db.user.deleteMany({
  which: {
    followersCount: {
      lt: 10,
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
- `in`
- `notIn`

#### Number queries

- `equals`
- `notEquals`
- `gt`
- `gte`
- `lt`
- `lte`
- `between`
- `notBetween`

#### Boolean queries

- `equals`
- `notEquals`

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
