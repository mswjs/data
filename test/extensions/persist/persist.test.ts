import * as path from 'path'
import { pageWith } from 'page-with'
import { FactoryAPI } from '../../../src/glossary'

interface User {
  id: string
  firstName: string
  role: Role
}

interface Role {
  id: string
  name: string
}

declare namespace window {
  export const db: FactoryAPI<{ user: User; role: Role }>
}

test('persists datbase state to session storage', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'persist.runtime.js'),
  })

  await runtime.page.evaluate(() => {
    console.log(window.db.user.getAll())
  })

  await runtime.debug()
})
