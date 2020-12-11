import { rest, RestContext, MockedRequest, ResponseResolver } from 'msw'
import pluralize from 'pluralize'
import {
  EntityInstance,
  ModelDictionary,
  ModelAPI,
  PrimaryKeyType,
  Value,
} from '../glossary'
import { BulkQueryOptions, QuerySelector } from '../query/queryTypes'
import { OperationErrorType, OperationError } from '../errors/OperationError'

function normalizeUrl(path: string, baseUri?: string) {
  const url = new URL(path, baseUri || 'http://localhost')
  return baseUri ? url.toString() : url.pathname
}

function getResponseStatusByErrorType(error: OperationError) {
  switch (error.type) {
    case OperationErrorType.EntityNotFound:
      return 404
    case OperationErrorType.DuplicatePrimaryKey:
      return 409
    default:
      return 500
  }
}

function withErrors<RequestBodyType = any, RequestParamsType = any>(
  handler: ResponseResolver<
    MockedRequest<RequestBodyType, RequestParamsType>,
    RestContext
  >,
) {
  return (req, res, ctx) => {
    try {
      return handler(req, res, ctx)
    } catch (e) {
      return res(
        ctx.status(getResponseStatusByErrorType(e)),
        ctx.json({
          message: e.message,
        }),
      )
    }
  }
}

export function generateHandlers<
  Dictionary extends ModelDictionary,
  ModelName extends string
>(
  modelName: ModelName,
  primaryKey: PrimaryKeyType,
  api: ModelAPI<Dictionary, ModelName>,
  baseUri: string = '',
) {
  const modelPath = pluralize(modelName)

  return [
    rest.get(
      normalizeUrl(modelPath, baseUri),
      withErrors((req, res, ctx) => {
        const skip = parseInt(req.url.searchParams.get('skip') ?? '0', 10)
        const cursor = req.url.searchParams.get('cursor')
        const take = parseInt(req.url.searchParams.get('take'), 10)
        let options = { which: {} }
        if (!isNaN(take) && !isNaN(skip))
          options = Object.assign(options, { take, skip })
        if (!isNaN(take) && cursor)
          options = Object.assign(options, { take, cursor })
        const records = api.findMany(options)

        return res(ctx.status(200), ctx.json(records))
      }),
    ),
    rest.get(
      normalizeUrl(`${modelPath}/:${primaryKey}`, baseUri),
      withErrors<void, { id: PrimaryKeyType }>((req, res, ctx) => {
        const id = req.params[primaryKey]

        const entity = api.findFirst({
          strict: true,
          which: {
            [primaryKey]: {
              equals: id,
            },
          },
        } as any)
        return res(ctx.status(200), ctx.json(entity))
      }),
    ),
    rest.post(
      normalizeUrl(modelPath, baseUri),
      withErrors<EntityInstance<Dictionary, ModelName>>((req, res, ctx) => {
        const payload = req.body
        const createdEntity = api.create(payload)
        return res(ctx.status(201), ctx.json(createdEntity))
      }),
    ),
    rest.post(
      normalizeUrl(modelPath, baseUri),
      withErrors<EntityInstance<Dictionary, ModelName>>((req, res, ctx) => {
        const payload = req.body
        const createdEntity = api.create(payload)
        return res(ctx.status(201), ctx.json(createdEntity))
      }),
    ),
    rest.put(
      normalizeUrl(`${modelPath}/:${primaryKey}`, baseUri),
      withErrors<EntityInstance<Dictionary, ModelName>, { id: PrimaryKeyType }>(
        (req, res, ctx) => {
          const payload = req.body
          const id = req.params[primaryKey]
          const updatedEntity = api.update({
            strict: true,
            which: {
              [primaryKey]: {
                equals: id,
              },
            },
            data: payload,
          } as any)
          return res(ctx.status(200), ctx.json(updatedEntity))
        },
      ),
    ),
  ]
}
