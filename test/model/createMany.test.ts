import { name, random } from 'faker'
import { factory, manyOf, oneOf, primaryKey } from '../../src'

test('creates multiple entities with a fixed count', () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
      firstName: name.firstName,
    },
  })

  db.user.createMany(5)

  const allUsers = db.user.getAll()
  expect(allUsers).toHaveLength(5)
})

test('allows to specify count of relational entities to create', () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
      country: oneOf('country'),
      posts: manyOf('post'),
    },
    post: {
      id: primaryKey(random.uuid),
      title: random.words,
    },
    country: {
      id: primaryKey(random.uuid),
      name: random.word,
    },
  })

  db.user.createMany(3, {
    relations: {
      /**
       * @todo How to specify that multiple entities should reuse the same relational model?
       * I.e. multiple users from the same country.
       *
       * @todo `Boolean` value of `oneOf` relation has no sense:
       * an entity cannot be created without all relational models specified.
       */
      country: false,
      posts: 2,
    },
  })

  const allUsers = db.user.getAll()
  const allPosts = db.post.getAll()
  const allCountries = db.country.getAll()

  expect(allUsers).toHaveLength(3)
  // Each of 3 random "user" should have "2" posts created.
  expect(allPosts).toHaveLength(6)
  // Each of 3 random "user" should have its own "country".
  expect(allCountries).toHaveLength(3)

  allUsers.forEach((user, index) => {
    expect(user.posts).toHaveLength(2)
    expect(user.country).toHaveProperty('id', allCountries[index].id)
    expect(user.country).toHaveProperty('name', allCountries[index].name)
  })
})
