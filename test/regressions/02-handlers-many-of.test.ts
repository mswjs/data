// @vitest-environment jsdom
import fetch from 'node-fetch'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { factory, manyOf, primaryKey } from '../../src'
import { ENTITY_TYPE, PRIMARY_KEY } from '../../src/glossary'

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

it('updates database entity modified via a generated request handler', async () => {
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
    http.get('/user', () => {
      const user = db.user.findFirst({
        strict: true,
        where: {
          id: {
            equals: 'user-1',
          },
        },
      })
      return HttpResponse.json(user)
    }),
    http.put<{ noteId: string }, { title: string }>(
      '/note/:noteId',
      async ({ request, params }) => {
        const note = await request.json()
        const updatedNote = db.note.update({
          strict: true,
          where: {
            id: {
              equals: params.noteId,
            },
          },
          data: {
            title: note.title,
          },
        })

        return HttpResponse.json(updatedNote)
      },
    ),
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
    [ENTITY_TYPE]: 'note',
    [PRIMARY_KEY]: 'id',
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
    [ENTITY_TYPE]: 'user',
    [PRIMARY_KEY]: 'id',
    id: 'user-1',
    notes: [
      {
        [ENTITY_TYPE]: 'note',
        [PRIMARY_KEY]: 'id',
        id: 'note-1',
        title: 'First note',
      },
      {
        [ENTITY_TYPE]: 'note',
        [PRIMARY_KEY]: 'id',
        id: 'note-2',
        title: 'Updated title',
      },
    ],
  })

  // Updates persist in the request handler's mocked response.
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
