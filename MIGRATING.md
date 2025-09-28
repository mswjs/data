# Migrating

## v0 → v1

Version 1.0 is a huge overhaul of the library to address some of the long-standing design issues and missing features. Please take your time to read through the [updated README](./README.md) to get familiar with the new concepts and APIs.

When migrating from v0.x.x, please consult the guide below regarding the breaking changes to the library.

### Terminology

A few changes in the terminology to consider to make this migration guide easier to parse:

- Model → Collection;
- Entry → Record;
- Relationship → Relation.

### Package name

The library has been migrated to a new package name—`@msw/data`.

```diff
-npm i @mswjs/data
+npm i @msw/data
```

### Deprecated: `factory`

The model factory has been deprecated in favor of granular collections of data.

```diff
-const db = factory({ user: {} })
+const users = new Collection({ schema })
```

### Describing data

The proprietary syntax of describing data has been deprecated in favor of the [Standard Schema](https://standardschema.dev/) for describing your data.

```diff
-factory({
-  firstName: () => 'John',
-  lastName: () => 'Maverick'
-})
+new Collection({
+  schema: z.object({
+    firstName: z.string(),
+    lastName: z.string()
+  })
+})
```

> Although the example above is using [Zod](https://zod.dev/), you can use any Standard Schema-compatible schema library.

### Deprecated: `primaryKey`

The concept of a primary key has been deprecated entirely. You do not have to provide primary keys when describing your collections. You can query records by any properties.

### Default values

You can provide default values to the properies of your collection using the respective syntax of your schema library of choice. For example, here's how you list default values in Zod:

```ts
const users = new Collection({
  schema: z.object({
    subscribed: z.boolean().default(false)
  })
})

await users.create() // { subscribed: false }
```

### Deprecated: `nullable`

The `nullable` utility has been deprecated. Use your schema library of choice to describe nullable properties.

### Deprecated: operators

Operators like `equals`, `in`, `lgt`, etc. have been deprecated in favor of _queries_. You can express conditions for your records via literal values as well as function predicates.

```ts
// Find the first user with "id" equal to 1.
users.findFirst(q => q.where({ id: 1 }))

// Find all users whose last name is longer than 5 letters.
users.findMany(
  q => q.where({ lastName: lastName => lastName.length > 5 })
)
```

> Learn more about [Querying](./README.md#querying).

### Relations

The `oneOf` and `manyOf` utilities has been deprecated. Use the `.defineRelations()` method on your collections to define relations between collections.

```ts
const userSchema = z.object({
  id: z.number(),
  get posts() {
    return z.array(postSchema)
  }
})
const postSchema = z.object({
  title: z.string(),
  get author() {
    return userSchema
  }
})

const users = new Collection({ schema: userSchema })
const posts = new Collection({ schema: postSchema })

users.defineRelations(({ many }) => ({
  posts: many(posts)
}))

posts.defineRelations(({ one }) => ({
  author: one(users)
}))
```

> Learn more about [Relations](./README.md#relations).

### Collocated updates

You can now collocate updates of owner and foreign records in a relation by simply changing the foreign record's values as a part of the owner update.

```ts
const posts = new Collection({ schema: postSchema })
const revisions = new Collection({ schema: revisionSchema })

posts.defineRelations(({ one }) => ({
  revision: one(revisions)
}))

await posts.update(q => q.where({ id: 'post-1' }), {
  data(post) {
    post.title = 'Renamed post'
    post.revision.updatedAt = Date.now()
  }
})
```

> The library will automatically translte the `updateAt` change of the reference revision into an implicit update.

### Deprecated: `.toHandlers()`

The `.toHandlers()` method has been deprecated. Generating request handlers is no longer the responsibility of this library. Please use `@msw/source` to generate request handlers from your data collections instead:

```ts
import { fromCollection } from '@msw/source/data'
import { Collection } from '@msw/data'

// ...
```
