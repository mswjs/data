import { HttpResponse } from 'msw'
import { primaryKey } from '../../src'
import { ModelDefinition } from '../../src/glossary'
import {
  OperationError,
  OperationErrorType,
} from '../../src/errors/OperationError'
import {
  createUrlBuilder,
  getResponseStatusByErrorType,
  withErrors,
  parseQueryParams,
} from '../../src/model/generateRestHandlers'

describe('createUrlBuilder', () => {
  it('builds a relative URL given no base URL', () => {
    const buildUrl = createUrlBuilder()
    expect(buildUrl('users')).toEqual('/users')
  })

  it('builds a relative URL given a prefix as a base URL', () => {
    const buildUrl = createUrlBuilder('/api/v1')
    expect(buildUrl('users')).toEqual('/api/v1/users')
  })

  it('builds an absolute URL given a base URL', () => {
    const buildUrl = createUrlBuilder('https://example.com')
    expect(buildUrl('users')).toEqual('https://example.com/users')
  })

  it('builds an absolute URL given a base URL with trailing slash', () => {
    const buildUrl = createUrlBuilder('https://example.com/')
    expect(buildUrl('users')).toEqual('https://example.com/users')
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
    const unknownError = new OperationError('UNKNOWN')
    expect(
      getResponseStatusByErrorType(
        // @ts-expect-error Runtime unknown error instance.
        unknownError,
      ),
    ).toEqual(500)
  })
})

describe('withErrors', () => {
  it('executes a successful handler as-is', async () => {
    const resolver = withErrors(() => {
      return HttpResponse.text('ok')
    })
    const response = (await resolver({})) as Response

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('ok')
  })

  it('handles a not-found error as a 404', async () => {
    const resolver = withErrors(() => {
      throw new OperationError(OperationErrorType.EntityNotFound, 'Not found')
    })
    const response = (await resolver({})) as Response

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      message: 'Not found',
    })
  })

  it('handles a duplicate key error as 409', async () => {
    const resolver = withErrors(() => {
      throw new OperationError(
        OperationErrorType.DuplicatePrimaryKey,
        'Duplicate key',
      )
    })
    const response = (await resolver({})) as Response

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ message: 'Duplicate key' })
  })

  it('handles internal errors as a 500', async () => {
    const resolver = withErrors(() => {
      throw new Error('Arbitrary error')
    })
    const response = (await resolver({})) as Response

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      message: 'Arbitrary error',
    })
  })
})

describe('parseQueryParams', () => {
  const definition: ModelDefinition = {
    id: primaryKey(String),
    firstName: String,
  }

  it('parses search params into pagination and filters', () => {
    const result = parseQueryParams(
      'user',
      definition,
      new URLSearchParams({
        take: '10',
        skip: '5',
        firstName: 'John',
      }),
    )
    expect(result).toEqual({
      take: 10,
      skip: 5,
      cursor: null,
      filters: {
        firstName: { equals: 'John' },
      },
    })
  })

  it('returns null as the "take" when none is set', () => {
    const result = parseQueryParams(
      'user',
      definition,
      new URLSearchParams({
        skip: '5',
      }),
    )
    expect(result).toHaveProperty('take', null)
  })

  it('returns null as the "skip" when none is set', () => {
    const result = parseQueryParams(
      'user',
      definition,
      new URLSearchParams({
        take: '10',
      }),
    )
    expect(result).toHaveProperty('skip', null)
  })

  it('returns null as the "cursor" when none is set', () => {
    const result = parseQueryParams(
      'user',
      definition,
      new URLSearchParams({
        take: '10',
        skip: '5',
      }),
    )
    expect(result).toHaveProperty('cursor', null)
  })

  it('returns an empty object given no model definition-based params', () => {
    const result = parseQueryParams(
      'user',
      definition,
      new URLSearchParams({ take: '10', skip: '5' }),
    )
    expect(result).toHaveProperty('filters', {})
  })

  it('throws an error given an unknown model definition-based param', () => {
    const parse = () => {
      return parseQueryParams(
        'user',
        definition,
        new URLSearchParams({
          unknownProp: 'yes',
        }),
      )
    }

    expect(parse).toThrow(
      'Failed to query the "user" model: unknown property "unknownProp".',
    )
  })
})
