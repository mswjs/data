import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { factory, manyOf, primaryKey } from '@mswjs/data'

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

it('updates database entity modified via a generated handler', async () => {
  const db = factory({
    user: {
      id: primaryKey(String),
      notes: manyOf('note'),
    },
    note: {
      id: primaryKey(String),
      title: String,
    },
  })

  db.user.create({
    id: 'user-1',
    notes: [
      db.note.create({ id: 'note-1', title: 'First note' }),
      db.note.create({ id: 'note-2', title: 'Second note' }),
    ],
  })

  server.use(
    rest.get('/user', (req, res, ctx) => {
      const user = db.user.findFirst({
        strict: true,
        where: {
          id: {
            equals: 'user-1',
          },
        },
      })
      return res(ctx.json(user))
    }),
    rest.put<{ title: string }>('/note/:noteId', (req, res, ctx) => {
      const { noteId } = req.params

      const updatedNote = db.note.update({
        strict: true,
        where: {
          id: {
            equals: noteId,
          },
        },
        data: {
          title: req.body.title,
        },
      })

      return res(ctx.json(updatedNote))
    }),
  )

  // Update a referenced relational property via request handler.
  const noteUpdateResponse = await fetch('http://localhost/note/note-2', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Updated title',
    }),
  })
  expect(noteUpdateResponse.status).toEqual(200)

  // Updates persist when querying the updated entity directly.
  expect(
    db.note.findFirst({
      where: {
        id: {
          equals: 'note-2',
        },
      },
    }),
  ).toEqual({
    id: 'note-2',
    title: 'Updated title',
  })

  // Updates persist when querying a parent entity that references
  // the updated relational entity.
  expect(
    db.user.findFirst({
      where: {
        id: {
          equals: 'user-1',
        },
      },
    }),
  ).toEqual({
    id: 'user-1',
    notes: [
      {
        id: 'note-1',
        title: 'First note',
      },
      {
        id: 'note-2',
        title: 'Updated title',
      },
    ],
  })

  //
  const refetchedUser = await fetch('http://localhost/user').then((res) =>
    res.json(),
  )
  expect(refetchedUser).toEqual({
    id: 'user-1',
    notes: [
      {
        id: 'note-1',
        title: 'First note',
      },
      {
        id: 'note-2',
        title: 'Updated title',
      },
    ],
  })
})
