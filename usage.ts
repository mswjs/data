import { random, name } from 'faker'

type BaseTypes = string | number | boolean

type OneOf<T extends string | number | symbol> = { __type: 'oneOf'; name: T }
type ManyOf<T extends string | number | symbol> = { __type: 'manyOf'; name: T }

type Limit<T extends Record<string, any>> = {
  [RK in keyof T]: {
    [SK in keyof T[RK]]: T[RK][SK] extends
      | (() => BaseTypes)
      | OneOf<keyof T>
      | ManyOf<keyof T>
      ? T[RK][SK]
      : {
          error: 'expected BaseType or'
          oneOf: keyof T
        }
  }
}

type Returns<T extends Record<string, any>> = {
  [K in keyof T]: Value<T[K], T>
}

type Value<
  T extends Record<string, any>,
  Parent extends Record<string, any>
> = {
  [K in keyof T]: T[K] extends OneOf<any>
    ? Value<Parent[T[K]['name']], Parent>
    : T[K] extends ManyOf<any>
    ? Value<Parent[T[K]['name']], Parent>[]
    : ReturnType<T[K]>
}

declare function factory<
  T extends Record<string, Record<string, any>> & Limit<T>
>(dict: T): Returns<T>
declare function oneOf<T extends string>(name: T): OneOf<T>
declare function manyOf<T extends string>(name: T): ManyOf<T>

const db = factory({
  user: {
    firstName: name.firstName,
    posts: manyOf('post'),
  },
  post: {
    id: random.uuid,
    author: oneOf('user'),
  },
})

// How to annotate referenced properties to their
// values in the `db` factory?
db.post.author // string
db.post.id // number
db.user.firstName // string
db.post.author.firstName // string;

db.user.posts[1].author
