import { factory, primaryKey, oneOf } from '../../../src'

it.skip('supports a collocated update of a parent its ONE_OF relationship', () => {
  const db = factory({
    post: {
      id: primaryKey(String),
      title: String,
      revision: oneOf('revision'),
    },
    revision: {
      id: primaryKey(String),
      isReviewed: Boolean,
    },
  })

  db.post.create({
    id: 'post-1',
    title: 'Initial title',
    revision: db.revision.create({
      id: 'revision-1',
      isReviewed: false,
    }),
  })

  const nextPost = db.post.update({
    where: { id: { equals: 'post-1' } },
    // @ts-ignore
    data: {
      title: 'Next title',
      revision(revision) {
        // Update the "post.revision" from within the "post" update.
        return db.revision.update({
          where: { id: { equals: revision.id } },
          data: {
            isReviewed: true,
          },
        })!
      },
    },
  })!

  // Revision on the updated "post" returns the updated entity.
  expect(nextPost.title).toEqual('Next title')
  expect(nextPost.revision?.isReviewed).toEqual(true)

  // Revision on a newly queried post returns the updated entity.
  const latestPost = db.post.findFirst({ where: { id: { equals: 'post-1' } } })!
  expect(latestPost.title).toEqual('Next title')
  expect(latestPost.revision?.isReviewed).toEqual(true)

  // Direct query on the revision (relational property) returns the updated entity.
  const revision = db.revision.findFirst({
    where: { id: { equals: 'revision-1' } },
  })!
  expect(revision.isReviewed).toEqual(true)
})
