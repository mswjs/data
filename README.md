[standard-schema]: https://standardschema.dev/

<p align="center">
  <img src="logo.svg" alt="Data logo" width="124" />
</p>
<h1 align="center"><code>@msw/data</code></h1>
<p align="center">Data querying library for testing JavaScript applications.</p>

## Motivation

This library exists to help developers model and query data when testing and developing their applications. It acts as a convenient way of creating schema-based fixtures and querying them with a familiar ORM-inspired syntax. It can be used standalone or in conjuncture with [Mock Service Worker](https://mswjs.io) for seamless mocking experience both on the network and the data layers.

## Features

- Relies on [Standard Schema][standard-schema] instead of inventing a proprietary modeling syntax you have to learn. You can use any Standard Schema-compliant object modeling library to describe your data, like Zod, ArkType, Valibot, yup, and many others.
- Full runtime and type-safety.
- Provides a powerful [querying syntax](#querying) inspired by Prizma;
- Supports [relations](#relations) for database-like behaviors (inspired by Drizzle);
- Supports extensions (including custom extensions) for things like cross-tab collection synchronization or record persistence.

---

## Getting started

### Install

```
npm i @msw/data
```

### Create collection

You start by defining a data _collection_.

```ts
import { Collection } from '@msw/data'
import z from 'zod'

const users = new Collection({
  schema: z.object({
    id: z.number(),
    name: z.string(),
  }),
})
```

> Above, I'm using [Zod](https://zod.dev/) to describe the `schema` for my users collection. You can use whichever [Standard Schema][standard-schema] compliant library of your choice instead.

### Seed collection

Next, let's put some values into our collection. Those values are called _records_ and you can create individual records via the `.create()` method or create a bunch of them with `.createMany()`.

```ts
await users.create({ id: 1, name: 'John' })

await users.createMany(5, (index) => ({
  id: index + 1,
  name: faker.person.firstName(),
}))
```

> Combine `.createMany()` with tools like [Faker](https://fakerjs.dev/) for random values in your records.

### Use collection

From this point on, you can use your `users` collection for anything data-related. You can create more records, query them, define relations to other collections, update and delete records, etc. Learn more you can do with the library in the documentation below. Good luck!

---

## Querying

### Query syntax

Whenever you have to target a record(s), you construct a _query_. A query acts as a predicate that a record must match in order to be targeted. The most basic query is that describing expected values of the record's properties:

```ts
users.findFirst((q) => q.where({ name: 'John' }))
```

> Above, we are defining a query using the `q` builder that targets the first user whose `name` property equals to `'John'`.

Additionally, any property in a query can be expanded into a function that accepts the value and returns a boolean, indicating whether the record matches:

```ts
users.findFirst((q) =>
  q.where({
    name: (name) => name.startsWith('John'),
  }),
)
```

> This query matches the first user whose `name` starts with `'John'`. Use functions as predicates to express more advanced logic in your queries.

Query functions are supported at any level of nesting, including the top-level record itself.

```ts
users.findFirst((q) => q.where((user) => user.posts.length > 0))

users.findFirst((q) =>
  q.where({
    address: {
      street: (street) => street !== 'Baker st.',
    },
  }),
)
```

#### Logical operators

You can build complex queries via `.or()` and `.and()` logical operators exposed through the query builder. For example, here's a query that matches all users who have posts _or_ are editors:

```ts
users.findMany((q) =>
  q.where({ posts: (posts) => posts.length > 0 }).or({ role: 'editor' }),
)
```

If you prefer functional composition over method chaining, you can wrap predicates in `q.or()` and `q.and()` instead. Both syntaxes result in the same query.

```ts
users.findMany((q) =>
  q.or(
    q.where({ posts: (posts) => posts.length > 0 }),
    q.where({ role: 'editor' }),
  ),
)
```

## Pagination

This library supports offset and cursor-based pagination.

### Offset-based pagination

Provide the `take` property onto the options object of any bulk operation method, like `.findMany()`, `.updateMany()`, or `.deleteMany()`, to limit the number of results returned by the query.

```ts
const users = new Collection({ schema })

users.findMany(
  (q) => q.where({ email: (email) => email.includes('@google.com') }),
  {
    // Return the first 5 matching records.
    take: 5,
  },
)
```

You can also skip the number of first matching results by providing the `skip` property:

```ts
const users = new Collection({ schema })

users.findMany(
  (q) => q.where({ email: (email) => email.includes('@google.com') }),
  {
    // Skip the first 10 matching records.
    skip: 10,
    // And return the next 5.
    take: 5,
  },
)
```

The negative value for `take` is also supported to have backward pagination:

```ts
users.findMany(
  (q) => q.where({ email: (email) => email.includes('@google.com') }),
  {
    take: -5,
  },
)
````

### Cursor-based pagination

Provide a reference to the record of the same collection as the `cursor` property for cursor-based pagination.

```ts
const users = new Collection({ schema })

const john = users.findFirst((q) => q.where({ name: 'John' }))

users.findMany((q) => q.where({ subscribed: true }), {
  cursor: john,
  take: 5,
})
```

## Sorting

You can sort the results of bulk operations, like `.findMany()`, `.updateMany()`, and `.deleteMany()`, by providing the `orderBy` property in that operation's options.

```ts
// Find all users whose name starts with "J"
// and return them sorted by their `name`.
users.findMany((q) => q.where({ name: (name) => name.startsWith('J') }), {
  orderBy: { name: 'asc' },
})
```

You can sort by multiple criteria by providing them in the `orderBy` object:

```ts
users.updateMany((q) => q.where({ name: (name) => name.startsWith('J') }), {
  data(user) {
    user.name = user.name.toUpperCase(),
  },
  orderBy: {
    name: 'asc',
    id: 'desc',
  },
})
```

## Relations

You can define relations by calling the `.defineRelations()` method on the collection.

- [One-to-one](#one-to-one)
- [One-to-many](#one-to-many)
- [One-to-many (inversed)](#one-to-many-inversed)
- [Many-to-many](#many-to-many)
- [Through relations](#through-relations)
- [Unique relations](#unique-relations)
- [Ambiguous relations](#ambiguous-relations)
- [Polymorphic relations](#polymorphic-relations)

### Defining relations

Below, you can find examples of defining various types of relations, but there are a few things that apply to all of them:

- Describe relations on the schema level using your schema library. The `.defineRelations()` API has no effect on the model's schema/types and only operates on known properties;
- Relations are described _after_ a collection is defined (to prevent circular references);
- Relations do not require explicit `foreignKey` associations and instead are bound to internal IDs of related records.

### One-to-one

```ts
const userSchema = z.object({
  // In Zod, relational properties are best described as getters
  // so they can produce self-referencing schemas.
  get country() {
    return countrySchema
  },
})
const countrySchema = z.object({ code: z.string() })

const users = new Collection({ schema: userSchema })
const contries = new Collection({ schema: countrySchema })

// Declare the relations on the `users` collection.
users.defineRelations(({ one }) => ({
  // `user.country` is a one-of relation to the `countries` collection.
  country: one(countries),
}))

const user = await users.create({
  country: await countries.create({ code: 'usa' }),
})
user.country // { code: 'usa' }
```

### One-to-many

```ts
const postSchema = z.object({
  get comments() {
    return z.array(countrySchema)
  },
})
const commentSchema = z.object({
  text: z.string(),
})

const posts = new Collection({ schema: postSchema })
const comments = new Collection({ schema: commentSchema })

posts.defineRelations(({ many }) => ({
  comments: many(comments),
}))

await posts.create({
  comments: [
    await comments.create({ text: 'First!' }),
    await comments.create({ text: 'Thanks for watching.' }),
  ],
})
```

### One-to-many (inversed)

Two collections may self-reference each other. For example, `post.comments` is a list of comments while each `comment.post` references to the parent post.

```ts
const postSchema = z.object({
  get comments() {
    return z.array(countrySchema)
  },
})
const commentSchema = z.object({
  text: z.string(),
  get post() {
    return postSchema
  },
})

const posts = new Collection({ schema: postSchema })
const comments = new Collection({ schema: commentSchema })

posts.defineRelations(({ many }) => ({
  comments: many(comments),
}))
comments.defineRelations(({ one }) => ({
  post: one(posts),
}))

await posts.create({
  comments: [await comments.create({ text: 'First!' })],
})

const comment = comments.findFirst((q) => q.where({ text: 'First!' }))
comment.post // { comments: [{ text: 'First', post: Circular }] }
```

> Inversed relations are updated automatically. Whenever you add a new comment to a post, both `post.comments` and `comment.post` are updated to reference each other. The same is true when setting a new parent `post` on the comment.

### Many-to-many

In the next example, every `user` may have multiple `posts` while each `post` may have multiple `authors`.

```ts
const userSchema = z.object({
  get posts() {
    return z.array(postSchemas)
  },
})
const postSchema = z.object({
  get authors() {
    return z.array(userSchema)
  },
})

const users = new Collection({ schema: userSchema })
const posts = new Collection({ schema: postSchema })

users.defineRelations(({ many }) => ({
  posts: many(posts),
}))
posts.defineRelations(({ many }) => ({
  authors: many(users),
}))
```

### Through relations

Since relational properties resolve via getters, there's no need to define special "through" relations to reference one model through a relation from another.

```ts
const owners = new Collection({ schema: ownerSchema })
const cars = new Collection({ schema: carSchema })
const mechanics = new Collection({ schema: mechanicSchema })

owners.defineRelations(({ many }) => ({
  cars: many(cars),
}))
cars.defineRelations(({ one }) => ({
  owner: one(owners),
}))
mechanics.defineRelations(({ one }) => ({
  car: one(cars),
}))

const owner = await owners.create({ name: 'John' })
const car = await cars.create({ brand: 'bmw', owner })
const mechanic = await mechanics.create({ name: 'Kyle', car })

mechanic.car.owner.name // "John"
```

> Note that although `mechanics` does not define an explcit relation to `owners`, you can get the owner of the car associated with a mechanic through the `car` relation.

### Unique relations

You can mark a relation as unique by setting the `unique` property of the relation options to `true`. Unique relations cannot reference foreign records that are already associated with other owner records.

```ts
posts.defineRelations(({ one }) => ({
  author: one(users, { unique: true }),
}))
```

> In this example, the `author` of each post points to a single _unique_ user. If a post attempts to set its author to a user that's already associated with another post, an error will be thrown.

### Ambiguous relations

You can use the `role` option of the relation to disambiguate between multiple properties referencing the same foreign model.

For example, a single `post` may have both `author` and `reviewer` referencing the same `user` model. To make those properties pointing to _different_ user records, use the `role` that acts as a relation identifier. This way, the library will update the corresponding relational properties for both `users` and `posts` when the referenced relation is updated.

```ts
const users = new Collection({ schema: userSchema })
const posts = new Collection({ schema: postSchema })

users.defineRelations(({ many }) => ({
  posts: many(posts, { role: 'author' }),
  reviews: many(posts, { role: 'reviewer' }),
}))

posts.defineRelations(({ one }) => ({
  author: one(user, { role: 'author' }),
  reviewer: one(user, { role: 'reviewer' }),
}))
```

> The `role` property acts as a de-facto ID of a relation when synchronizing related models.

### Polymorphic relations

Provide an array of foreign collections to a relation to define it as _polymorphic_.

```ts
const posts = new Collection({ schema: postSchema })
const images = new Collection({ schema: imageSchema })
const videos = new Collection({ schema: videoSchema })

posts.defineRelations(({ many }) => ({
  // Providing a record of foreign collections allows
  // all of their records to be set as the value.
  attachments: many([images, videos]),
}))
images.defineRelations(({ one }) => ({
  post: one(posts),
}))
videos.defineRelations(({ one }) => ({
  post: one(posts),
}))
```

> In this example, `post.attachments` is an array of either `images` or `videos`, where records from both collections are allowed.

## Error handling

Data provides multiple different error classes to help you differentiate and handle different errors.

### `OperationError`

- `code` `<OperationErrorCode>`, the error code describing the failed operation;
- `cause` `<Error>` (_optional_), a reference to the original thrown error.

Thrown whenever performing a record operation fails. For example:

- When creating a new record whose initial values do not match the collection's schema;
- When there are no records found for a strict query.

### `RelationError`

- `code` `<RelationErrorCode>`, the error code describing the relation operation;
- `info` `<object>`, additional error information;
  - `path` `<PropertyPath>`, path of the relational property;
  - `ownerCollection` `<Collection>`, a reference to the owner collection;
  - `foreignCollection` `<Array<Collection>>`, an array of foreign collections referenced by this relation;
  - `options` `RelationDefinitionOptions`, the options object passed upon decaring this relation.

Thrown whenever performing a relation operation fails. For example:

- When attempting to reference a foreign record that's already associated with another record in a unique relation;
- When directly assigning value to a relational property.

---

## API

### `new Collection(options)`

- `options` `<Object>`
  - `schema` [Standard Schema][standard-schema] A schema describing each record in this collection.
  - `extensions` (optional) An array of [extensions](#extensions) to use on this collection.

Creates a new collection of data.

#### `.create(initialValues)`

- `initialValues` Initial values for the new record.

Creates a single record with the provided initial values.

```ts
const user = await users.create({ id: 1, name: 'John' })
```

> The `.create()` method returns a promise to support potential asynchronous transformations in your schema.

#### `.createMany(count, initialValuesFactory)`

- `count` `<number>` A number of records to create.
- `initialValuesFactory` `<Function>` A function that returns initial values for each record.

Creates multiple records with the initial value factory.

```ts
const users = await users.createMany(5, (index) => ({
  id: index + 1,
  name: 'John',
}))
```

The initial value factory function accepts the `index` argument indicating the index of the record that's being created. Use it, as well as the function's closure, to generate unique or random values.

#### `.findFirst(query)`

- `query` [`Query`](#new-querypredicate) A query matching the record.

Returns the first record matching the query.

```ts
const users = new Collection({
  schema: z.object({
    id: z.number(),
    name: z.string(),
  }),
})

await users.create({ id: 1, name: 'John' })
await users.create({ id: 2, name: 'John' })

users.findFirst((q) => q.where({ name: 'John' }))
// { id: 1, name: 'John' }
```

#### `.findMany(query)`

- `query` [`Query`](#new-querypredicate) A query matching the records.

Returns all records matching the query.

```ts
const users = new Collection({
  schema: z.object({
    id: z.number(),
    name: z.string(),
  }),
})

await users.create({ id: 1, name: 'John' })
await users.create({ id: 2, name: 'John' })

users.findFirst((q) => q.where({ name: 'John' }))
// [{ id: 1, name: 'John' }, { id: 2, name: 'John' }]
```

#### `.update(query, options)`

- `query` [`Query`](#new-querypredicate) A query matching the record.
- `options` `<Object>`
  - `data` A function that produces changes by modifying the previous record.

Updates the first record matching the query. Returns a promise that resolves with the updated record.

```ts
// Change the name for the user with a specific `id`.
const updatedUser = await users.update((q) => q.where({ id: 123 }), {
  data(user) {
    user.name = 'Johnatan'
  },
})
```

> Update methods return a promise in order to support potential asynchronous transformations defined in your schema.

The `data` function allows you to perform multiple updates upon a record by mutating that record directly. Think of it as a draft function from libraries like `immer` or `mutative` because that's precisely what it is!

You can also provide a record reference as the predicate to the `.update()` method to update that particular record:

```ts
const user = users.findFirst((q) => q.where({ id: 123 }))
await users.update(user, {
  //               👆👆
  data(user) {
    user.id = 456
  },
})
```

#### `.updateMany(query, options)`

- `query` [`Query`](#new-querypredicate) A query matching the records.
- `options` `<Object>`
  - `data` Changes to apply to each record.

Updates all records matching the query. Returns a promise that resolves with an array containing the updated records.

```ts
// Find all the users with the name "John"
// and make their name truly stand out!
const updatedUsers = await users.updateMany((q) => q.where({ name: 'John' }), {
  data(user) {
    user.name = user.name.toUpperCase()
  },
})
```

#### `.delete(query)`

- `query` [`Query`](#new-querypredicate) A query matching the record.

Deletes the first record matching the query. Returns the deleted record.

```ts
// Delete a user with a particular `id`.
const deletedUser = users.delete((q) => q.where({ id: 123 }))
```

You can also provide a record reference as the predicate to the `.delete()` method to delete that particular record:

```ts
const user = users.findFirst((q) => q.where({ id: 123 }))
users.delete(user)
```

#### `.deleteMany(query)`

- `query` [`Query`](#new-querypredicate) A query matching the records.

Deletes all records matching the query. Returns an array containing the deleted records.

```ts
// Delete all users whose trial period has expired.
const deletedUsers = users.deleteMany((q) =>
  q.where({ trial: { expiresAt: (expiresAt) => expiresAt <= Date.now() } }),
)
```

#### `.defineRelations(definition)`

- `definition` `<Function>` A function that accepts relation utilities and returns an object with relational properties.

Defines relations on the current collection.

```ts
const users = new Collection({ schema: userSchema })
const posts = new Collection({ schema: postSchema })

users.defineRelations(({ many }) => ({
  // `user.posts` is a many-of relation to `posts`.
  posts: many(posts)
}))
```

> You can define nested relational properties by nesting them in the object returned from `.defineRelations()`.

##### Relational utilities

The following relational utilies are exposed in the argument to this method:

- `one(collection[, options])`, defines a one-of relation to the given collection;
- `many(collection[, options])`, defines a many-of relation to the given collection.

##### Relation options

- `unique` `<boolean>`, marks this relation as unique. Foreign records referenced by this relation cannot be referenced by other models.

```ts
users.defineRelations(({ many }) => ({
  posts: many(posts)
}))
posts.defineRelations(({ one }) => ({
  author: one(users, { unique: true })
}))

const john = await users.create({
  name: 'John',
  // `john` is associated as the `author` of this post now.
  posts: [await posts.create({ title: 'First post' })]
})

await users.create({
  name: 'Katy',
  // Creating this user will error because it tries to list
  // a post which `author` already references to another user.
  posts: [john.posts[0]]
})
```

- `role` `<string>`, an identifier to differentiate ambiguous relations to the same foreign collection;

```ts
users.defineRelations(({ many }) => ({
  // Both `users` and `posts` reference each other in multiple keys.
  // Using `role` helps the library understand which keys are connected.
  posts: many(posts, { role: 'author' }),
  underReview: many(posts, { role: 'reviewer' })
}))

posts.defineRelations(({ one, many }) => ({
  author: one(users, { role: 'author' }),
  reviewers: many(users, { role: 'reviewer' })
}))
```

- `onDelete` `"cascade" | undefined`, decides how to handle referenced foreign records when the owner is deleted.

```ts
users.defineRelations(({ many }) => ({
  // If a user gets deleted, delete all of the `posts` associated with them.
  posts: many(posts, { onDelete: 'cascade' })
}))
posts.defineRelations(({ one }) => ({
  author: one(users)
}))
```

### `new Query([predicate])`

- `predicate` (optional) An object or a function that acts as a predicate for records.

Creates a new query to match records in a collection. Normally, you query records through the querying methods of the collection (see [Querying](#querying)). You can, however, construct a type-safe `Query` class to abstract common queries or query builders.

```ts
const userSchema = z.object({
  id: z.number(),
  subscribed: z.boolean().default(false),
  role: z.enum(['user', 'editor', 'admin']).default('user'),
})

// Creates a query builder for the users schema.
const query = new Query<typeof userSchema>()
```

#### `.where(predicate)`

- `predicate` A predicate for the records.
- Returns: [`Query`](#new-querypredicate).

```ts
query.where({ id: 2 })
```

#### `.or(predicate)`

- `predicate` A predicate or another [`Query`](#new-querypredicate).
- Returns: [`Query`](#new-querypredicate).

Creates a new query, merging the previous predicates with the new one under a `OR` relation. A record may match _any predicate_ to be considered matching.

```ts
const unsubscribedOrEditorsQuery = query.or(
  query.where({ subscribed: false }),
  query.where({ role: 'editor' }),
)
```

#### `.and(predicate)`

- `predicate` A predicate or another [`Query`](#new-querypredicate).
- Returns: [`Query`](#new-querypredicate).

Creates a new query, merging the previous predicates with the new one under a `AND` relation. A record must match _all predicates_ to be considered matching.

```ts
const exactAdminQuery = query.and(
  query.where({ id: 1 }),
  query.where({ role: 'admin' }),
)
```

#### `.test(record)`

- `record` `<Record>` A reference to a record to test.
- Returns `<boolean>` Indicates whether the given record matches the query.

```ts
query.test({ id: 1 })
```

---

## Extensions

You can extend the behavior of collections via _extensions_. The library comes with the following default extensions, but you can always [create your own](#custom-extensions).

### Default extensions

#### `sync()`

> [!WARNING]
> The `sync()` extension is browser-only. It will be ignored in Node.js.

Synchronizes collection changes, like creating/updating/deleting records, with the same collection in another browser tab via a `BroadcastChannel`.

```ts
import { Collection } from '@msw/data'
import { sync } from '@msw/data/extensions/sync'

const users = new Collection({
  schema,
  extensions: [sync()],
})
```

#### `persist()`

> [!WARNING]
> The `persist()` extension is browser-only. It will be ignored in Node.js.

Persist the records in the collection between page reloads.

```ts
import { Collection } from '@msw/data'
import { persist } from '@msw/data/extensions/persist'

const users = new Collection({
  schema,
  extensions: [persist()],
})
```

### Custom extensions

```ts
// my-extension.ts
import { defineExtension } from '@msw/data/extensions'

export function myExtension() {
  return defineExtension({
    name: 'my-extension',
    extend(collection) {
      // Your logic here.
    },
  })
}
```

```ts
import { Collection } from '@msw/data'
import { myExtension } from './my-extension.js'

new Collection({ schema, extensions: [myExtension()] })
```
