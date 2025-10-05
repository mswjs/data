# Query syntax

## Query methods

Query methods like `.findFirst()`, `.findMany()`, `.update()`, `.updateMany()`, and others were chosen due to developer familiarity as they might find those (or similar) methods in ORM libraries, like Prisma or Drizzle. I personally like create-find-update-delete terminology.

## Query builder

I went with the query builder pattern over something like `{ OR, AND }` key syntax you might find in Prisma because I dislike mixing record properties and logical properties.

```ts
users.findFirst({
  where: {
    OR: [{ id: 2 }, { name: 'Bob', AND: [{ subscribed: true }] }],
  },
})
```

Mixing record properties and logical properties results in queries that are hard to read. Compare this to the builder syntax that wraps predicates in logical expressions instead:

```ts
users.findFirst((q) =>
  q.where({ id: 2 }).or(q.where({ name: 'Bob', subscribed: true })),
)
```

Query predicates always include only the record properties, which makes them easy to write. They can be abstracted and composed in any arrangement of logical `q.or` or `q.and` sequences. This composition also allows for mix-and-matching of syntax with zero additional handling on the library's side:

```ts
users.findFirst((q) => q.or(q.where({ id: 2 }), q.where({ name: 'Bob' })))
```

## Convenience keys

Convenience keys like `equals`, `in`, `lg`, `notContains`, and others were dropped in favor of function predicates. Functions are infinitely more powerful and the internal overhead of differentiating between reserved convenience keys and user-provided keys is not worth whatever little brevity gained as a result.

You can describe custom logic in your query predicates since any field (or the entire record) can be described as a function.

```ts
users.findFirst((q) =>
  q.where({
    id: (id) => isList.includes(id), // vs { in: idList }
  }),
)

users.findFirst((q) =>
  q.where((user) => {
    // Custom predicate accepting the entire record.
    return hasRole('admin', user)
  }),
)
```
