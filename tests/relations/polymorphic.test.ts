import { Collection } from '#/src/collection.js'
import z from 'zod'

const imageSchema = z.object({
  src: z.string(),
  get post() {
    return postSchema.optional()
  },
})

const videoSchema = z.object({
  url: z.string(),
  get post() {
    return postSchema.optional()
  },
})

const postSchema = z.object({
  title: z.string(),
  get attachments() {
    return z.array(z.union([imageSchema, videoSchema]))
  },
})

it('supports polymorphic relations', async () => {
  const posts = new Collection({ schema: postSchema })
  const images = new Collection({ schema: imageSchema })
  const videos = new Collection({ schema: videoSchema })

  posts.defineRelations(({ many }) => ({
    attachments: many([images, videos]),
  }))
  images.defineRelations(({ one }) => ({
    post: one(posts),
  }))
  videos.defineRelations(({ one }) => ({
    post: one(posts),
  }))

  const post = await posts.create({
    title: 'First',
    attachments: [
      await images.create({ src: 'image1.png' }),
      await videos.create({ url: 'video1.mp4' }),
    ],
  })

  expect(post.attachments).toEqual([
    { src: 'image1.png', post },
    { url: 'video1.mp4', post },
  ])

  expect(
    images.findFirst((q) => q.where({ post: { title: 'First' } })),
  ).toEqual({ src: 'image1.png', post })
  expect(
    videos.findFirst((q) => q.where({ post: { title: 'First' } })),
  ).toEqual({ url: 'video1.mp4', post })
})
