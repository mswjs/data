import { response, restContext } from 'msw'
import {
  OperationError,
  OperationErrorType,
} from '../../src/errors/OperationError'
import {
  createUrlBuilder,
  getResponseStatusByErrorType,
  withErrors,
} from '../../src/model/generateHandlers'

describe('createUrlBuilder', () => {
  it('builds a relative URL given no base URL', () => {
    const buildUrl = createUrlBuilder()
    expect(buildUrl('/users')).toEqual('/users')
  })

  it('builds an absolute URL given a base URL', () => {
    const buildUrl = createUrlBuilder('https://example.com')
    expect(buildUrl('/users')).toEqual('https://example.com/users')
  })
})

describe('getResponseStatusByErrorType', () => {
  it('returns 505 for the not-found operation error', () => {
    const notFoundError = new OperationError(OperationErrorType.EntityNotFound)
    expect(getResponseStatusByErrorType(notFoundError)).toEqual(404)
  })

  it('returns 409 for the duplicate key operation error', () => {
    const duplicateKeyError = new OperationError(
      OperationErrorType.DuplicatePrimaryKey,
    )
    expect(getResponseStatusByErrorType(duplicateKeyError)).toEqual(409)
  })

  it('returns 500 for any other operation error', () => {
    const unknownError = new OperationError('UNKNOWN' as any)
    expect(getResponseStatusByErrorType(unknownError)).toEqual(500)
  })
})

describe('withErrors', () => {
  it('executes a successful handler as-is', async () => {
    const handler = withErrors((req, res, ctx) => {
      return res(ctx.text('ok'))
    })
    const result = await handler({} as any, response, restContext)

    expect(result).toHaveProperty('status', 200)
    expect(result).toHaveProperty('body', 'ok')
  })

  it('handles a not-found error as a 404', async () => {
    const handler = withErrors(() => {
      throw new OperationError(OperationErrorType.EntityNotFound, 'Not found')
    })
    const result = await handler({} as any, response, restContext)

    expect(result).toHaveProperty('status', 404)
    expect(result).toHaveProperty(
      'body',
      JSON.stringify({ message: 'Not found' }),
    )
  })

  it('handles a duplicate key error as 409', async () => {
    const handler = withErrors(() => {
      throw new OperationError(
        OperationErrorType.DuplicatePrimaryKey,
        'Duplicate key',
      )
    })
    const result = await handler({} as any, response, restContext)

    expect(result).toHaveProperty('status', 409)
    expect(result).toHaveProperty(
      'body',
      JSON.stringify({ message: 'Duplicate key' }),
    )
  })

  it('handles internal errors as a 500', async () => {
    const handler = withErrors(() => {
      throw new Error('Arbitrary error')
    })
    const result = await handler({} as any, response, restContext)

    expect(result).toHaveProperty('status', 500)
    expect(result).toHaveProperty(
      'body',
      JSON.stringify({ message: 'Arbitrary error' }),
    )
  })
})
