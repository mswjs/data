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

Each model **must have a primary key**. That is a root-level property representing the model's identity. Think of it as an "id" column for a particular table in a database.

Declare a primary key by using the `primaryKey` helper function:

```js
import { factory, primaryKey } from '@mswjs/data'

factory({
  user: {
    id: primaryKey(String),
  },
})
```

In the example above, the `id` is the primary key for the `user` model. This means that whenever a `user` is created it must have the `id` property that equals a unique `String`.

### Integrate with API mocks

This library is designed and written to be standalone. However, being in the [Mock Service Worker](https://github.com/mswjs/msw) ecosystem, it features a

- Learn more about [**integrating modeled data into API mocks**](#integrating-with-api-mocks)

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
- **Modeling:**
  - [Nested structures](#nested-structures)
  - [Model relationships](#model-relationships)
- **Querying:**
  - [Querying data](#querying-data)
  - [Strict mode](#strict-mode)
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

const db = factory({
  user: {
    id: primaryKey(String),
    firstName: String,
  },
})

// Generates REST API request handlers.
db.user.toHandlers('rest')
```

- Learn more about [REST API mocking integration](#generate-rest-api).

##### GraphQL handlers

```js
import { factory, primaryKey } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(String),
    firstName: String,
  },
})

// Generates GraphQL API request handlers.
db.user.toHandlers('graphql')
```

- Learn more about [GraphQL API mocking integration](#generate-graphql-api).

##### Scoping handlers

The `.toHandlers()` method supports an optional second `baseUrl` argument to scope the generated handlers to a given endpoint:

```js
db.user.toHandlers('rest', 'https://example.com')
db.user.toHandlers('graphql', 'https://example.com/graphql')
```

### Nested structures

You may use nested objects to design a complex structure of your model:

```js
import { factory, primaryKey } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(String),
    address: {
      billing: {
        street: String,
      },
    },
  },
})

// You can then create and query your data
// based on the nested properties.

db.user.create({
  id: 'user-1',
  address: {
    billing: {
      street: 'Baker st.',
    },
  },
})

db.user.update({
  where: {
    id: {
      equals: 'user-1',
    },
  },
  data: {
    address: {
      billing: {
        street: 'Sunwell ave.',
      },
    },
  },
})
```

> Note that you **cannot** mark a nested property as the [primary key](#using-the-primary-key).

You may also specify _relationships_ nested deeply in your model:

```js
factory({
  user: {
    id: primaryKey(String),
    address: {
      billing: {
        country: oneOf('country'),
      },
    },
  },
  country: {
    code: primaryKey(String),
  },
})
```

> Learn more about [Model relationships](#model-relationships).

### Model relationships

- [One-to-One](#one-to-one)
- [One-to-Many](#one-to-many)
- [Many-to-One](#many-to-one)
- [Unique relationships](#unique-relationships)

Relationship is a way for a model to reference another model.

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
- `in`
- `notIn`

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
  },
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

## Usage with API mocks

This library is designed and implemented as a standalone solution. However, being a part of the [Mock Service Worker](https://github.com/mswjs), it provides an opt-in API for integrating the modeled data into the API mocks that you write.

### Generate request handlers

Both REST and GraphQL [request handlers]() can be generated from a model using the `.toHandlers()` method of that model. When generated, request handlers automatically have that model's CRUD methods like `POST /user` or `mutation CreateUser`.

- Learn more about the [`.toHandlers()`](#tohandlers) API.

#### Generate REST API

REST API request handlers can be generated by calling the `.toHandlers('rest')` method on the respective factory model.

```ts
import { setupServer } from 'msw/node'
import { factory, primaryKey } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(String),
    firstName: String,
  },
})

const handlers = [...db.user.toHandlers('rest')]

// Establish requests interception.
const server = setupServer(...handlers)
server.listen()
```

Given the "user" model definition above, the following request handlers are generated and connected to the respective database operations:

- `GET /users/:id` (where "id" is your model's primary key), returns a user by ID;
- `GET /users`, returns all users (supports [pagination](#pagination));
- `POST /users`, creates a new user;
- `PUT /users/:id`, updates an existing user by ID;
- `DELETE /users/:id`, deletes an existing user by ID;

The "/user" part of the route is derived from your model name. For example, if you had a "post" model defined in your `factory`, then the generated handlers would be `/posts`, `/posts/:id`, etc.

With the request handlers generated and MSW configured, you can query the "database" using REST API:

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

#### Generate GraphQL API

GraphQL API request handlers can be generated by calling the `.toHandlers('graphql')` method on the respective factory model.

```js
import { setupServer } from 'msw/node'
import { factory, primaryKey } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(String),
    firstName: String,
  },
})

const handlers = [...db.user.toHandlers('graphql')]

// Establish requests interception.
const server = setupServer(...handlers)
server.listen()
```

Given the "user" model definition above, the following request handlers are generated and connected to the respective database operations:

- `user(where: UserQueryInput): User`, returns a user matching the query;
- `users(where: UserQueryInput, cursor: ID, skip: Int, take: Int): [User!]`, returns all users matching the query (supports [pagination](#pagination));
- `createUser(data: UserInput!): User!`, creates a new user;
- `updateUser(where: UserQueryInput!, data: UserInput!): User!`, updates a user that match the `where` query;
- `updateUsers(where: UserQueryInput!, data: UserInput!): [User!]`, updates multiple users that match the `where` query;
- `deleteUser(where: UserQueryInput!): User!`, deletes a user that match the `where` query;
- `deleteUsers(where: UserQueryInput!): [User!]`, deletes multiple users that match the `where` query.

The "User" part of the GraphQL operation names is derived from your model's name. For example, if you had a "post" model defined in your `factory`, then the generated handlers would have operations like `post`, `createPost`, `updatePosts`, etc.

With the request handlers generated and MSW configured, you can query the database using GraphQL API:

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

### Manual integration

To gain more control over the mocks and implement more complex mocking scenarios (like authentication), consider manual integration of this library with your API mocking solution.

Take a look at how you can create an entity based on the user's authentication status in a test:

```js
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { factory, primaryKey } from '@mswjs/data'

const db = factory({
  post: {
    id: primaryKey(String),
    title: String,
  },
})

const handlers = [
  rest.post('/post', (req, res, cxt) => {
    // Only authenticated users can create new posts.
    if (req.headers.get('authorization') === 'Bearer AUTH_TOKEN') {
      return res(ctx.status(403))
    }

    // Create a new entity for the "post" model.
    const newPost = db.post.create(req.body)

    // Respond with a mocked response.
    return res(ctx.status(201), ctx.json({ post: newPost }))
  }),
]

// Establish requests interception.
const server = setupServer(...handlers)
server.listen()
```

## Honorable mentions

- [Prisma](https://www.prisma.io) for inspiring the querying client.
- [Lenz Weber](https://twitter.com/phry) and [Matt Sutkowski](https://twitter.com/de_stroy) for great help with the TypeScript support.
