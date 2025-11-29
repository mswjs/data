import { Collection } from '#/src/collection.js'
import z from 'zod'

const commentSchema = z.object({
  text: z.string(),
})

const postSchema = z.object({
  get comments() {
    return z.array(commentSchema)
  },
})

describe('many relations updates', () => {
  it('supports updating many relation via reassignment', async () => {
    const posts = new Collection({ schema: postSchema })
    const comments = new Collection({ schema: commentSchema })

    posts.defineRelations(({ many }) => ({
      comments: many(comments),
    }))

    const firstComment = await comments.create({ text: 'First' })
    const secondComment = await comments.create({ text: 'Second' })

    const post = await posts.create({ comments: [firstComment] })

    const updatedPost = await posts.update(
      post,
      {
        data(draft) {
          draft.comments = [...draft.comments, secondComment]
        },
        strict: true,
      },
    )

    expect(updatedPost.comments.map((comment) => comment.text)).toEqual([
      'First',
      'Second',
    ])
  })

  it('supports updating many relation via push', async () => {
    const posts = new Collection({ schema: postSchema })
    const comments = new Collection({ schema: commentSchema })

    posts.defineRelations(({ many }) => ({
      comments: many(comments),
    }))

    const firstComment = await comments.create({ text: 'First' })
    const secondComment = await comments.create({ text: 'Second' })

    const post = await posts.create({ comments: [firstComment] })

    const updatedPost = await posts.update(
      post,
      {
        data(draft) {
          draft.comments.push(secondComment)
        },
        strict: true,
      },
    )

    expect(updatedPost.comments.map((comment) => comment.text)).toEqual([
      'First',
      'Second',
    ])
  })
})
