<p align="center">
  <img src="logo.svg" alt="Data library logo" width="124" />
</p>

<h1 align="center"><code>@mswjs/data</code></h1>

Data modeling and relation library for testing JavaScript applications.

## Motivation

When testing API interactions you often need to mock data. Instead of keeping a hard-coded set of fixtures, this library provides you with must-have tools for data-driven API mocking:

- An intuitive interface to model data
- The ability to create relationships between models
- The ability to query data in a manner similar to an actual database

## Getting started

### Install

```bash
$ npm install @mswjs/data --save-dev
```

### Describe data

With this library, you're modeling data using the `factory` function. That function accepts an object where each key represents a _model name_ and the values are _model definitions_. A model definition is an object where the keys represent model properties and the values are value getters.

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

Throughout this document native JavaScript constructors (i.e. String, Number) will be used as values getters for the models, as they both create a value and define its type. In practice, you may consider using value generators or tools like [faker](#usage-with-faker) for value getters.

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
      where: {
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
- [Model relationships](#model-relationships)
- [Pagination](#pagination)
- [Sorting](#sorting)

### Model methods

Each model has the following methods:

- [`create()`](#create)
- [`findFirst()`](#findFirst)
- [`findMany()`](#findMany)
- [`count()`](#count)
- [`getAll()`](#getAll)
- [`update()`](#update)
- [`updateMany()`](#updateMany)
- [`delete()`](#delete)
- [`deleteMany()`](#deleteMany)
- [`toHandlers()`](#toHandlers)

#### `create`

Creates an entity for the model.

```js
const user = db.user.create()
```

When called without arguments, `.create()` will populate the entity properties using the getter functions you've specified in the model definition.

You can also provide a partial initial values when creating an entity:

```js
const user = db.user.create({
  firstName: 'John',
})
```

> Note that all model properties _are optional_, including [relational properties](#model-relationships).

#### `findFirst`

Returns the first entity that satisfies the given query.

```js
const user = db.user.findFirst({
  where: {
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
  where: {
    followersCount: {
      gte: 1000,
    },
  },
})
```

#### `count`

Returns the number of records for the given model.

```js
db.user.create()
db.user.create()

db.user.count() // 2
```

Can accept an optional query argument to filter the records before counting them.

```js
db.user.count({
  where: {
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
  where: {
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
const updatedUsers = db.user.updateMany({
  // Query for the entity to modify.
  where: {
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
  where: {
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
  where: {
    followersCount: {
      lt: 10,
    },
  },
})
```

#### `toHandlers`

Generates request handlers for the given model to use with [Mock Service Worker](https://github.com/mswjs/msw). All generated handlers are automatically connected to the respective [model methods](#model-methods), enabling you to perform CRUD operations against your mocked database.

##### REST handlers

```js
import { factory, primaryKey } from '@mswjs/data'
import { setupWorker } from 'msw'

const db = factory({
  user: {
    id: primaryKey(String),
    firstName: String,
  },
})

const worker = setupWorker(...db.user.toHandlers('rest'))

worker.start()
```

The following request handlers are generated and connected to the respective database operations:

- `GET /users`, returns all users (supports [pagination](#pagination)).
- `GET /users/:id` (where "id" is your model's primary key), returns a user by primary key.
- `POST /users`, creates a new user.
- `PUT /users/:id`, updates an existing user by primary key.
- `DELETE /users/:id`, deletes an existing user by primary key.

The "/user" part of the route is derived from your model name. For example, if you have a "post" model defined in your `factory`, then the generated handlers will be `/posts`, `/posts/:id`, etc.

With the handlers generated and MSW configured, you can start querying the database:

```js
// Create a new user in the database.
fetch('/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    id: 'abc-123',
    firstName: 'John',
  }),
})
```

##### GraphQL handlers

```js
setupWorker(...db.user.toHandlers('graphql'))
```

The following GraphQL queries and mutations are generated:

- `user(where: UserQueryInput): User`, returns a user matching the query.
- `users(where: UserQueryInput, cursor: ID, skip: Int, take: Int): [User!]`, returns all users matching the query (supports [pagination](#pagination)).
- `createUser(data: UserInput!): User!`, creates a new user.
- `updateUser(where: UserQueryInput!, data: UserInput!): User!`, updates a user.
- `updateUsers(where: UserQueryInput!, data: UserInput!): [User!]`, updates multiple users.
- `deleteUser(where: UserQueryInput!): User!`, deletes a user.
- `deleteUsers(where: UserQueryInput!): [User!]`, deletes multiple users.

> Notice how some operation names contain the plural model name to emphasize that they work on a collection of entities.

The "User" part of operation names is derived from your model name. For example, if you have a "post" model defined in your `factory`, then the generated handlers will have operations like `post`, `createPost`, `updatePosts`, etc.

With the handlers generated and MSW configured, you can start querying the database:

```js
import { gql, useQuery } from '@apollo/client'

const CREATE_USER = gql`
  query CreateUser($initialValues: UserInput!) {
    createUser(data: $initialValues) {
      firstName
    }
  }
`

useQuery(CREATE_USER, {
  variables: {
    initialValues: {
      firstName: 'John',
    },
  },
})
```

> Note that GraphQL queries **must be named** in order to be intercepted.

##### Scoping handlers

The `.toHandlers()` method supports an optional second `baseUrl` argument to scope the generated handlers to a given endpoint:

```js
db.user.toHandlers('rest', 'https://example.com')
db.user.toHandlers('graphql', 'https://example.com/graphql')
```

### Querying data

This library supports querying of the seeded data similar to how one would query a SQL database. The data is queried based on its properties. A query you construct depends on the value type you are querying.

#### String operators

- `equals`
- `notEquals`
- `contains`
- `notContains`
- `in`
- `notIn`

#### Number operators

- `equals`
- `notEquals`
- `gt`
- `gte`
- `lt`
- `lte`
- `between`
- `notBetween`

#### Boolean operators

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
  where: {
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

When querying or updating the entities you can supply the `strict: boolean` property on the query. When supplied, if a query operation fails (i.e. no entity found), the library will throw an exception.

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
  where: {
    id: {
      equals: 'def-456',
    },
  },
  strict: true,
})
```

### Model relationships

- [One-to-One](#one-to-one)
- [One-to-Many](#one-to-many)
- [Many-to-One](#many-to-one)
- [Unique relationships](#unique-relationships)

Defining relationships is a way for one model to reference another. Models are flat by design, so if you wish to have a property that equals an object or an array, you create a relationship of the proper type to another existing model.

#### One-to-One

```js
import { factory, primaryKey, oneOf } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(String),
    firstName: String,
  },
  post: {
    id: primaryKey(String),
    title: String,
    // The "post.author" references a "user" model.
    author: oneOf('user'),
  },
})

const user = db.user.create({ firstName: 'John' })
const post = db.post.create({
  title: 'My journey',
  // Use a "user" entity as the actual value of this post's author.
  author: user,
})

post.author.firstName // "John"
```

#### One-to-Many

```js
import { factory, primaryKey, manyOf } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(String),
    // "user.posts" is a list of the "post" entities.
    posts: manyOf('post'),
  },
  post: {
    id: primaryKey(String),
    title: String,
  },
})

const posts = [
  db.post.create({ title: 'First' }),
  db.post.create({ title: 'Second' }),
]

const user = db.user.create({
  // Assign the list of existing posts to this user.
  posts,
})

user.posts // [{ title: "First" }, { title: "Second" }]
```

#### Many-to-One

```js
import { factory, primaryKey, oneOf } from '@mswjs/data'

const db = factory({
  country: {
    name: primaryKey(String),
  },
  user: {
    id: primaryKey(String),
    country: oneOf('country'),
  },
  car: {
    serialNumber: primaryKey(String),
    country: oneOf('country'),
  },
})

const usa = db.country.create({ name: 'The United States of America' })

// Create a "user" and a "car" with the same country.
db.user.create({ country: usa })
db.car.create({ country: usa })
```

#### Unique relationships

Both `oneOf` and `manyOf` relationships may be marked as unique. A unique relationship is where a referenced entity cannot be assigned to another entity more than once.

In the example below we define the "user" and "invitation" models, and design their relationship so that one invitation cannot be assigned to multiple users.

```js
import { factory, primaryKey, oneOf } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(String),
    invitation: oneOf('invitation', { unique: true }),
  },
  invitation: {
    id: primaryKey(String),
  },
})

const invitation = db.invitation.create()

const john = db.user.create({ invitation })

// Assigning the invitation already used by "john"
// will throw an exception when creating this entity.
const karl = db.user.create({ invitation })
```

### Pagination

This library supports _offset-based_ and _cursor-based_ pagination of the `findMany` method results.

#### Offset-based pagination

```js
const db = factory({
  post: {
    id: primaryKey(String),
    category: String,
  },
})

db.post.findMany({
  where: {
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
  where: {
    category: {
      equals: 'Science',
    },
  },
  take: 15,
  cursor: null,
})

const secondPage = db.post.findMany({
  where: {
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

### Sorting

#### Basic sorting

```js
const db = factory({
  post: {
    id: primaryKey(String),
    title: String,
  },
})

// Return first 10 posts in the "Science" category
// sorted by the post's "title".
db.post.findMany({
  where: {
    category: {
      equals: 'Science',
    },
  },
  take: 10,
  orderBy: {
    title: 'asc',
  },
})
```

> You can use `orderBy` with [pagination](#pagination).

#### Sorting by relational properties

```js
const db = factory({
  post: {
    id: primaryKey(String),
    title: String,
    author: oneOf('user')
  },
  user: {
    id: primaryKey(String),
    firstName: String
  }
})

// Return all posts in the "Science" category
// sorted by the post author's first name.
db.post.findMany({
  where: {
    category: {
      equals: 'Science'
    }
  }
  orderBy: {
    author: {
      firstName: 'asc'
    }
  }
})
```

#### Sorting by multiple criteria

Provide a list of criteria to sort the query result against.

```js
db.post.findMany({
  orderBy: [
    {
      title: 'asc',
    },
    {
      views: 'desc',
    },
  ],
})
```

You can also use a combination of direct and relational properties on a single query:

```js
db.post.findMany({
  orderBy: [
    {
      title: 'asc',
    },
    {
      author: {
        firstName: 'asc',
      },
    },
  ],
})
```

### Database utilities

#### `drop`

Drops the given database, deleting all its entities.

```js
import { factory, drop } from '@mswjs/data'

const db = factory({...})

drop(db)
```

### Usage with `faker`

Libraries like [`faker`](https://github.com/Marak/Faker.js) can help you generate fake data for your models.

```js
import { seed, datatype, name } from 'faker'
import { factory, primaryKey } from '@mswjs/data'

// (Optional) Seed `faker` to ensure reproducible
// random values of model properties.
seed(123)

factory({
  user: {
    id: primaryKey(datatype.uuid),
    firstName: name.firstName,
  },
})
```

## Honorable mentions

- [Prisma](https://www.prisma.io) for inspiring the querying client.
- [Lenz Weber](https://twitter.com/phry) and [Matt Sutkowski](https://twitter.com/de_stroy) for great help with the TypeScript support.
