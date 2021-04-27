import pluralize from 'pluralize'
import { RestContext, RestRequest, ResponseResolver, rest } from 'msw'
import {
  Entity,
  ModelDictionary,
  ModelAPI,
  PrimaryKeyType,
  ModelDefinition,
} from '../glossary'
import { GetQueryFor, QuerySelectorWhere } from '../query/queryTypes'
import { OperationErrorType, OperationError } from '../errors/OperationError'
import { findPrimaryKey } from '../utils/findPrimaryKey'

enum HTTPErrorType {
  BadRequest,
}

const ErrorType = { ...HTTPErrorType, ...OperationErrorType }

class HTTPError extends OperationError<HTTPErrorType> {
  constructor(type: HTTPErrorType, message?: string) {
    super(type, message)
    this.name = 'HTTPError'
  }
}

interface WeakQuerySelectorWhere<KeyType extends PrimaryKeyType> {
  [key: string]: Partial<GetQueryFor<KeyType>>
}

type RequestParams<Key extends PrimaryKeyType> = {
  [K in Key]: string
}

export function createUrlBuilder(baseUrl?: string) {
  return (path: string) => {
    const url = new URL(path, baseUrl || 'http://localhost')
    return baseUrl ? url.toString() : url.pathname
  }
}

export function getResponseStatusByErrorType(
  error: OperationError | HTTPError,
): number {
  switch (error.type) {
    case ErrorType.EntityNotFound:
      return 404
    case ErrorType.DuplicatePrimaryKey:
      return 409
    case ErrorType.BadRequest:
      return 400
    default:
      return 500
  }
}

export function withErrors<RequestBodyType = any, RequestParamsType = any>(
  handler: ResponseResolver<
    RestRequest<RequestBodyType, RequestParamsType>,
    RestContext
  >,
): ResponseResolver<
  RestRequest<RequestBodyType, RequestParamsType>,
  RestContext
> {
  return (req, res, ctx) => {
    try {
      return handler(req, res, ctx)
    } catch (error) {
      return res(
        ctx.status(getResponseStatusByErrorType(error)),
        ctx.json({
          message: error.message,
        }),
      )
    }
  }
}

export function parseQueryParams<ModelName extends string>(
  modelName: ModelName,
  definition: ModelDefinition,
  searchParams: URLSearchParams,
) {
  const paginationKeys = ['cursor', 'skip', 'take']
  const cursor = searchParams.get('cursor')
  const rawSkip = searchParams.get('skip')
  const rawTake = searchParams.get('take')

  const filters: QuerySelectorWhere<any> = {}
  const skip = rawSkip == null ? rawSkip : parseInt(rawSkip, 10)
  const take = rawTake == null ? rawTake : parseInt(rawTake, 10)

  searchParams.forEach((value, key) => {
    if (paginationKeys.includes(key)) {
      return
    }

    if (definition[key]) {
      filters[key] = {
        equals: value,
      }
    } else {
      throw new HTTPError(
        HTTPErrorType.BadRequest,
        `Failed to query the "${modelName}" model: unknown property "${key}".`,
      )
    }
  })

  return {
    cursor,
    skip,
    take,
    filters,
  }
}

export function generateRestHandlers<
  Dictionary extends ModelDictionary,
  ModelName extends string
>(
  modelName: ModelName,
  modelDefinition: ModelDefinition,
  model: ModelAPI<Dictionary, ModelName>,
  baseUrl: string = '',
) {
  const primaryKey = findPrimaryKey(modelDefinition)!
  const modelPath = pluralize(modelName)
  const buildUrl = createUrlBuilder(baseUrl)

  return [
    rest.get(
      buildUrl(modelPath),
      withErrors<Entity<Dictionary, ModelName>>((req, res, ctx) => {
        const { skip, take, cursor, filters } = parseQueryParams(
          modelName,
          modelDefinition,
          req.url.searchParams,
        )

        let options = { where: filters }
        if (take && skip) {
          options = Object.assign(options, { take, skip })
        }
        if (take && cursor) {
          options = Object.assign(options, { take, cursor })
        }

        const records = model.findMany(options)

        return res(ctx.json(records))
      }),
    ),
    rest.get(
      buildUrl(`${modelPath}/:${primaryKey}`),
      withErrors<Entity<Dictionary, ModelName>, RequestParams<PrimaryKeyType>>(
        (req, res, ctx) => {
          const id = req.params[primaryKey]
          const where: WeakQuerySelectorWhere<typeof primaryKey> = {
            [primaryKey]: {
              equals: id,
            },
          }
          const entity = model.findFirst({
            strict: true,
            where: where as any,
          })

          return res(ctx.json(entity))
        },
      ),
    ),
    rest.post(
      buildUrl(modelPath),
      withErrors<Entity<Dictionary, ModelName>>((req, res, ctx) => {
        const createdEntity = model.create(req.body)
        return res(ctx.status(201), ctx.json(createdEntity))
      }),
    ),
    rest.put(
      buildUrl(`${modelPath}/:${primaryKey}`),
      withErrors<Entity<Dictionary, ModelName>, RequestParams<PrimaryKeyType>>(
        (req, res, ctx) => {
          const id = req.params[primaryKey]
          const where: WeakQuerySelectorWhere<typeof primaryKey> = {
            [primaryKey]: {
              equals: id,
            },
          }
          const updatedEntity = model.update({
            strict: true,
            where: where as any,
            data: req.body,
          })!

          return res(ctx.json(updatedEntity))
        },
      ),
    ),
    rest.delete(
      buildUrl(`${modelPath}/:${primaryKey}`),
      withErrors<Entity<Dictionary, ModelName>, RequestParams<PrimaryKeyType>>(
        (req, res, ctx) => {
          const id = req.params[primaryKey]
          const where: WeakQuerySelectorWhere<typeof primaryKey> = {
            [primaryKey]: {
              equals: id,
            },
          }
          const deletedEntity = model.delete({
            strict: true,
            where: where as any,
          })!

          return res(ctx.json(deletedEntity))
        },
      ),
    ),
  ]
}
