import type { Collection } from '#/src/collection.js'
import type { PropertyPath } from '#/src/utils.js'
import type { RelationDeclarationOptions } from '#/src/relation.js'

export enum OperationErrorCodes {
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
  INVALID_INITIAL_VALUES = 'INVALID_INITIAL_VALUES',
  STRICT_QUERY_WITHOUT_RESULTS = 'STRICT_QUERY_WITHOUT_RESULTS',
}

export class OperationError extends Error {
  static for(code: OperationErrorCodes) {
    return (message: string) => {
      return new OperationError(message, code)
    }
  }

  constructor(
    message: string,
    public readonly code: OperationErrorCodes,
    public readonly cause?: unknown,
  ) {
    super(message)
  }
}

export enum RelationErrorCodes {
  RELATION_NOT_READY = 'RELATION_NOT_READY',
  UNEXPECTED_SET_EXPRESSION = 'UNEXPECTED_SET_EXPRESSION',
  INVALID_FOREIGN_RECORD = 'INVALID_FOREIGN_RECORD',
  FORBIDDEN_UNIQUE_CREATE = 'FORBIDDEN_UNIQUE_CREATE',
  FORBIDDEN_UNIQUE_UPDATE = 'FORBIDDEN_UNIQUE_UPDATE',
}

export interface RelationErrorDetails {
  path: PropertyPath
  ownerCollection: Collection<any>
  foreignCollections: Array<Collection<any>>
  options: RelationDeclarationOptions
}

export class RelationError extends Error {
  static for(code: RelationErrorCodes, details: RelationErrorDetails) {
    return (message: string) => {
      return new RelationError(message, code, details)
    }
  }

  constructor(
    message: string,
    public readonly code: RelationErrorCodes,
    public readonly details: RelationErrorDetails,
  ) {
    super(message)
  }
}
