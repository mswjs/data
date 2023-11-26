<p align="center">
  <img src="logo.svg" alt="Data library logo" width="124" />
</p>

<h1 align="center"><code>@mswjs/data</code></h1>

<p align="center">Data modeling and relation library for testing JavaScript applications.</p>
<br />

## Motivation

When testing API interactions you often need to mock data. Instead of keeping a hard-coded set of fixtures, this library provides you with must-have tools for data-driven API mocking:

- An intuitive interface to model data;
- The ability to create relationships between models;
- The ability to query data in a manner similar to an actual database.

## Getting started

### Install

```bash
$ npm install @mswjs/data --save-dev
# or
$ yarn add @mswjs/data --dev
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

> See the [Recipes](#recipes) for more guidelines on data modeling.

Throughout this document native JavaScript constructors (i.e. String, Number) will be used as values getters for the models, as they both create a value and define its type. In practice, you may consider using value generators or tools like [Faker](#usage-with-faker) for value getters.

#### Using the primary key

Each model **must have a primary key**. That is a root-level property representing the model's identity. Think of it as an "id" column for a particular table in a database.

Declare a primary key by using the `primaryKey` function:

```js
import { factory, primaryKey } from '@mswjs/data'

factory({
  user: {
    id: primaryKey(String),
  },
})
```

In the example above, the `id` is the primary key for the `user` model. This means that whenever a `user` is created it must have the `id` property that equals a unique `String`. Any property can be marked as a primary key, it doesn't have to be named "id".

Just like regular model properties, the primary key accepts a getter function that you can use to generate its value when creating entities:

```js
import { faker } from '@faker-js/faker'

factory({
  user: {
    id: primaryKey(faker.datatype.uuid),
  },
})
```

> Each time a new `user` is created, its `user.id` property is seeded with the value returned from the `datatype.uuid` function call.

Once your data is modeled, you can use [Model methods](#model-methods) to interact with it (create/update/delete). Apart from serving as interactive, queryable fixtures, you can also [integrate your data models into API mocks](#usage-with-api-mocks) to supercharge your prototyping/testing workflow.

## API

- [`factory`](#factory)
- [`primaryKey`](#primarykey)
- [`nullable`](#nullable)
- [`oneOf`](#oneof)
- [`manyOf`](#manyof)
- [`drop`](#drop)

### `factory`

The `factory` function is used to model a database. It accepts a _model dictionary_ and returns an API to interact with the described models.

```js
import { factory, primaryKey } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(String),
    firstName: String,
    age: Number,
  },
})
```

> Learn more about the [Model methods](#model-methods) and how you can interact with the described models.

Each `factory` call encapsulates an in-memory database instance that holds the respective models. It's possible to create multiple database instances by calling `factory` multiple times. The entities and relationships, however, are not shared between different database instances.

### `primaryKey`

Marks the property of a model as a primary key.

```js
import { factory, primaryKey } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(String),
  },
})

// Create a new "user" with the primary key "id" equal to "user-1".
db.user.create({ id: 'user-1' })
```

Primary key must be unique for each entity and is used as the identifier to query a particular entity.

### `nullable`

Marks the current model property as nullable.

```js
import { factory, primaryKey, nullable } from '@mswjs/data'

factory({
  user: {
    id: primaryKey(String)
    // "user.title" is a nullable property.
    title: nullable(String)
  }
})
```

> Learn more how to work with [Nullable properties](#nullable-properties).

### `oneOf`

Creates a `*-to-one` relationship with another model.

```js
import { factory, primaryKey, oneOf } from '@mswjs/data'

factory({
  user: {
    id: primaryKey(String),
    role: oneOf('userGroup'),
  },
  userGroup: {
    name: primaryKey(String),
  },
})
```

> Learn more about [Modeling relationships](#model-relationships).

### `manyOf`

Creates a `*-to-many` relationship with another model.

```js
import { factory, primaryKey, manyOf } from '@mswjs/data'

factory({
  user: {
    id: primaryKey(String),
    publications: manyOf('post'),
  },
  post: {
    id: primaryKey(String),
    title: String,
  },
})
```

> Learn more about [Modeling relationships](#model-relationships).

### `drop`

Deletes all entities in the given database instance.

```js
import { factory, drop } from '@mswjs/data'

const db = factory(...models)

drop(db)
```

## Model methods

Each model has the following methods:

- [`create()`](#create)
- [`findFirst()`](#findfirst)
- [`findMany()`](#findmany)
- [`count()`](#count)
- [`getAll()`](#getall)
- [`update()`](#update)
- [`updateMany()`](#updatemany)
- [`delete()`](#delete)
- [`deleteMany()`](#deletemany)
- [`toHandlers()`](#tohandlers)

### `create`

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

### `findFirst`

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

### `findMany`

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

### `count`

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

### `getAll`

Returns all the entities of the given model.

```js
const allUsers = db.user.getAll()
```

### `update`

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

### `updateMany`

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

### `delete`

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

### `deleteMany`

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

### `toHandlers`

Generates request handlers for the given model to use with [Mock Service Worker](https://github.com/mswjs/msw). All generated handlers are automatically connected to the respective [model methods](#model-methods), enabling you to perform CRUD operations against your mocked database.

#### REST handlers

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

#### GraphQL handlers

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

#### Scoping handlers

The `.toHandlers()` method supports an optional second `baseUrl` argument to scope the generated handlers to a given endpoint:

```js
db.user.toHandlers('rest', 'https://example.com')
db.user.toHandlers('graphql', 'https://example.com/graphql')
```

## Recipes

- **Modeling:**
  - [Nullable properties](#nullable-properties)
  - [Nested structures](#nested-structures)
  - [Model relationships](#model-relationships)
- **Querying:**
  - [Querying data](#querying-data)
  - [Strict mode](#strict-mode)
  - [Pagination](#pagination)
  - [Sorting](#sorting)

### Nullable properties

By default, all model properties are non-nullable. You can use the `nullable` function to mark a property as nullable:

```js
import { factory, primaryKey, nullable } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(String),
    firstName: String,
    // "user.age" is a nullable property.
    age: nullable(Number),
  },
})

db.user.create({
  id: 'user-1',
  firstName: 'John',
  // Nullable properties can be explicit null as the initial value.
  age: null,
})

db.user.update({
  where: {
    id: {
      equals: 'user-1',
    },
  },
  data: {
    // Nullable properties can be updated to null.
    age: null,
  },
})
```

> You can define [Nullable relationships](#nullable-relationships) in the same manner.

When using Typescript, you can manually set the type of the property when it cannot be otherwise inferred from the seeding function, such as when you want a property to default to `null`:

```typescript
import { factory, primaryKey, nullable } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(String),
    age: nullable<number>(() => null),
  },
})
```

### Nested structures

You may use nested objects to design a complex structure of your model:

```js
import { factory, primaryKey, nullable } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(String),
    address: {
      billing: {
        street: String,
        city: nullable(String),
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
      city: 'London',
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
        city: null,
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
- [Nullable relationships](#nullable-relationships)

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

#### Nullable relationships

Both `oneOf` and `manyOf` relationships may be passed to `nullable` to allow
instantiating and updating that relation to null.

```js
import { factory, primaryKey, oneOf, nullable } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(String),
    invitation: nullable(oneOf('invitation')),
    friends: nullable(manyOf('user')),
  },
  invitation: {
    id: primaryKey(String),
  },
})

const invitation = db.invitation.create()

// Nullable relationships are instantiated with null.
const john = db.user.create({ invitation }) // john.friends === null
const kate = db.user.create({ friends: [john] }) // kate.invitation === null

db.user.updateMany({
  where: {
    id: {
      in: [john.id, kate.id],
    },
  },
  data: {
    // Nullable relationships can be updated to null.
    invitation: null,
    friends: null,
  },
})
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

#### Date operators

- `equals`
- `notEquals`
- `gt`
- `gte`
- `lt`
- `lte`

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
    author: oneOf('user'),
  },
  user: {
    id: primaryKey(String),
    firstName: String,
  },
})

// Return all posts in the "Science" category
// sorted by the post author's first name.
db.post.findMany({
  where: {
    category: {
      equals: 'Science',
    },
  },
  orderBy: {
    author: {
      firstName: 'asc',
    },
  },
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

### Usage with `Faker`

Libraries like [Faker](https://github.com/faker-js/faker) can help you generate fake data for your models.

```js
import { faker } from '@faker-js/faker'
import { factory, primaryKey } from '@mswjs/data'

// (Optional) Seed `faker` to ensure reproducible
// random values of model properties.
faker.seed(123)

factory({
  user: {
    id: primaryKey(faker.datatype.uuid),
    firstName: faker.name.firstName,
  },
})
```

### Collocated updates

When you wish to update a parent entity and one of its relational properties at the same time, collocate such an update operation via the updater function of the [`update`](#update) method.

```js
import { factory, primaryKey, oneOf } from '@mswjs/data'

const db = factory({
  post: {
    id: primaryKey(String),
    title: String,
    revision: oneOf('revision'),
  },
  revision: {
    id: primaryKey(String),
    updatedAt: () => new Date(),
  },
})

db.post.update({
  where: {
    id: { equals: 'post-1' },
  },
  data: {
    title: 'Renamed post',
    // The next value of the "post.revision"
    // is returned from this updater function.
    revision(prevRevision, post) {
      // Update this post's revision as you'd do usually,
      // but nested within the post's update operation.
      return db.revision.update({
        where: {
          id: { equals: post.revision.id },
        },
        data: {
          updatedAt: Date.now(),
        },
      })
    },
  },
})
```

> While the `post` above will get updated, both `post.revision` and the respective `revision` standalone will be updated as well.

Collocating nested updates grants you a predictable behavior when changing multiple related entities.

## Usage with API mocks

While this library can be used standalone, it brings a tremendous benefit in a combination with tools like [Mock Service Worker](https://github.com/mswjs). We provide a build-in API to quickly generate API request handlers based on your models, representing model interactions via HTTP requests.

### Generate request handlers

Both REST and GraphQL [request handlers]() can be generated from a model using the [`.toHandlers()`](#toHandlers) method of that model. When generated, request handlers automatically have that model's CRUD methods like `POST /user` or `mutation CreateUser`.

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
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { factory, primaryKey } from '@mswjs/data'

const db = factory({
  post: {
    id: primaryKey(String),
    title: String,
  },
})

const handlers = [
  http.post('/post', (req, res, cxt) => {
    // Only authenticated users can create new posts.
    if (req.headers.get('authorization') === 'Bearer AUTH_TOKEN') {
      return new HttpResponse(null, { status: 403 })
    }

    // Create a new entity for the "post" model.
    const newPost = db.post.create(req.body)

    // Respond with a mocked response.
    return HttpResponse.json({ post: newPost }, { status: 201 })
  }),
]

// Establish requests interception.
const server = setupServer(...handlers)
server.listen()
```

## Honorable mentions

- [Prisma](https://www.prisma.io) for inspiring the querying client.
- [Lenz Weber](https://twitter.com/phry) and [Matt Sutkowski](https://twitter.com/de_stroy) for great help with the TypeScript support.
