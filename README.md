<p align="center">
  <img src="logo.svg" alt="Data library logo" width="124" />
</p>

<h1 align="center"><code>@mswjs/data</code></h1>

Data modeling and relation library for testing JavaScript applications.

## Motivation

When testing API interactions you often need to mock data. Instead of keeping a hard-coded set of fixtures, this library provides you with an intuitive interface to model your data, create relations between models, and query it in a way similar to an actual database. A must-have tool for data-driven API mocking.

## Getting started

### Install

```bash
$ npm install @mswjs/data --save-dev
```

### Describe data

With this library you're modeling data using the `factory` function. That function accepts an object where each key represents a _model name_ and values are _model declarations_. Model declaration, in turn, is also an object where keys stand for model properties and values for value getter functions.

```js
// src/mocks/db.js
import { factory, primaryKey } from '@mswjs/data'

export const db = factory({
  // Create a "user" model,
  user: {
    // ...with these properties and value getters.
    id: primaryKey(() => 'abc-123'),
    firstName: () => 'John',
    lastName: () => 'Maverick',
  },
})
```

> See the [Recipes](#recipes) for more tips and tricks on data modeling.

#### Using the primary key

Each model **must have a primary key**. That is a single key that can be used to reference an entity of that model. Think of it as an ID column for a particular table in a database.

Declare a primary key by using the `primaryKey` helper function:

```js
import { factory, primaryKey } from '@mswjs/data'

factory({
  user: {
    id: primaryKey(String),
  },
})
```

In the example above the `id` is the primary key for the `user` model. This means that whenever a `user` is created it must have the `id` property that equals a unique `String`.

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

- [Model methods](#model-methods)
- [Querying data](#querying-data)
- [Strict mode](#strict-mode)
- [Models relation](#models-relation)
- [Pagination](#pagination)

### Model methods

Each model has the following methods:

- [`create()`](#create)
- [`findFirst()`](#findFirst)
- [`findMany()`](#findMany)
- [`getAll()`](#getAll)
- [`update()`](#update)
- [`updateMany()`](#updateMany)
- [`delete()`](#delete)
- [`deleteMany()`](#deleteMany)

#### `create`

Creates an entity for the model.

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

#### `count`

Returns the amount of records for the given model.

```js
db.user.create()
db.user.create()

db.user.count() // 2
```

Can accept an optional query argument to filter the records before counting them.

```js
db.user.count({
  which: {
    role: {
      equals: 'reader',
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

Updates the first entity that matches the query.

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
    // Specify the exact next value.
    firstName: 'John',

    // Alternatively, derive the next value from
    // the previous one and the unmodified entity.
    role: (prevRole, user) => reformatRole(prevRole),
  },
})
```

#### `updateMany`

Updates multiple entities that match the query.

```js
const updatedUser = db.user.updateMany({
  // Query for the entity to modify.
  which: {
    id: {
      in: ['abc-123', 'def-456'],
    },
  },
  // Provide partial next data to be
  // merged with the existing properties.
  data: {
    firstName: (firstName) => firstName.toUpperCase(),
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

Deletes multiple entities that match the query.

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

### Strict mode

When querying or updating the entities you can supply the `strict: boolean` property on the query. When supplied, if a query operation fails (i.e. no entity found), the library would throw an exception.

```js
import { factory, primaryKey } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(String),
  },
})

db.user.create({ id: 'abc-123' })

// This will throw an exception, because there are
// no "user" entities matching this query.
db.user.findFirst({
  which: {
    id: {
      equals: 'def-456',
    },
  },
  strict: true,
})
```

### Models relation

#### One-to-one

```js
import { factory, primaryKey, oneOf } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(String)
  },
  post: {
    id: String
    title: String
    // The `post` model has the `author` property
    // that references to the `user` entity.
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

### Pagination

This library supports _offset-based_ and _cursor-based_ pagination of the `findMany` query results.

#### Offset-based pagination

```js
const db = factory({
  post: {
    id: primaryKey(String),
    category: String,
  },
})

db.post.findMany({
  which: {
    category: {
      equals: 'Science',
    },
  },
  take: 15,
  skip: 10,
})
```

#### Cursor-based pagination

The `cursor` option of the `findMany` query expects a primary key value of a model to start the pagination from.

```js
const db = factory({
  post: {
    // The `id` primary key will be used as a cursor.
    id: primaryKey(String),
    category: String,
  },
})

const firstPage = db.post.findMany({
  which: {
    category: {
      equals: 'Science',
    },
  },
  take: 15,
  cursor: null,
})

const secondPage = db.post.findMany({
  which: {
    category: {
      equals: 'Science',
    },
  },
  take: 15,
  // The second page will start from the last post
  // of the `firstPage`.
  cursor: firstPage[firstPage.length - 1].id,
})
```

### Database utilities

#### `drop`

```js
import { factory, drop } from '@mswjs/data'

const db = factory({...})

// Deletes all records in the database.
drop(db)
```

### Usage with `faker`

Libraries like [`faker`](https://github.com/Marak/Faker.js) can help you generate fake data for your models.

```js
import { seed, random, name } from 'faker'
import { factory, primaryKey } from '@mswjs/data'

// Seed `faker` to ensure reproducible random values
// of model properties.
seed(123)

factory({
  user: {
    id: primaryKey(random.uuid),
    firstName: name.firstName,
  },
})
```

## Honorable mentions

- [Prisma](https://www.prisma.io) for inspiring the querying client.
- [Lenz Weber](https://twitter.com/phry) and [Matt Sutkowski](https://twitter.com/de_stroy) for great help with the TypeScript support.
