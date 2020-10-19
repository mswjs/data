import { name } from 'faker'
import { entity, listOf } from '../src/entity'

test('returns an entity interface', () => {
  const post = entity({
    title: name.title,
  })

  expect(post).toBeInstanceOf(Function)
})

test('allows cross-entity references', () => {
  const user = entity({
    firstName: name.findName,
  })

  const post = entity({
    title: name.title,
    author: user,
  })

  const actualPost = post()
  expect(actualPost).toHaveProperty('title')
  expect(actualPost).toHaveProperty('author')
  expect(actualPost.author).toHaveProperty('firstName')
})

test('generates a list of values from an entity', () => {
  const post = entity({
    title: name.title,
  })
  const postsList = listOf(post, 3)()

  expect(postsList).toBeInstanceOf(Array)
  expect(postsList).toHaveLength(3)
  postsList.forEach((post) => {
    expect(post).toHaveProperty('title')
    expect(typeof post.title).toBe('string')
  })
})

test('generates a complex value', () => {
  const post = entity({
    title: name.title,
  })
  const user = entity({
    firstName: name.firstName,
    posts: listOf(post, 3),
  })
  const db = entity({
    users: listOf(user, 2),
  })
  const dbValue = db()

  expect(dbValue).toHaveProperty('users')
  expect(dbValue.users).toBeInstanceOf(Array)
  expect(dbValue.users).toHaveLength(2)

  dbValue.users.forEach((user) => {
    expect(user).toHaveProperty('firstName')
    expect(typeof user.firstName).toBe('string')
    expect(user).toHaveProperty('posts')
    expect(user.posts).toBeInstanceOf(Array)

    user.posts.forEach((post) => {
      expect(post).toHaveProperty('title')
      expect(typeof post.title).toBe('string')
    })
  })
})
