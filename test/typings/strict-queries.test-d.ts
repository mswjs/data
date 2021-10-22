import { factory, primaryKey } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(String),
  },
})

// @ts-expect-error Value it potentially "null".
db.user.findFirst({
  where: { id: { equals: 'user-1' } },
}).id

// Using "strict" the value is never null.
db.user.findFirst({
  where: { id: { equals: 'user-1' } },
  strict: true,
}).id

// @ts-expect-error Value it potentially "null".
db.user.update({
  where: { id: { equals: 'user-1' } },
}).id

// Using "strict" the value is never null.
db.user.update({
  where: { id: { equals: 'user-1' } },
  data: {},
  strict: true,
}).id

// @ts-expect-error Value it potentially "null".
db.user.updateMany({
  where: { id: { equals: 'user-1' } },
}).forEach

// Using "strict" the value is never null.
db.user.updateMany({
  where: { id: { equals: 'user-1' } },
  data: {},
  strict: true,
}).forEach

// @ts-expect-error Value it potentially "null".
db.user.delete({
  where: { id: { equals: 'user-1' } },
}).id

// Using "strict" the value is never null.
db.user.delete({
  where: { id: { equals: 'user-1' } },
  strict: true,
}).id

// @ts-expect-error Value it potentially "null".
db.user.deleteMany({
  where: { id: { equals: 'user-1' } },
}).forEach

// Using "strict" the value is never null.
db.user.deleteMany({
  where: { id: { equals: 'user-1' } },
  strict: true,
}).forEach
