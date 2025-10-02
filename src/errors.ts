import { InvariantError } from 'outvariant'
import type { Collection } from '#/src/collection.js'
import type { PropertyPath } from '#/src/utils.js'
import type { RelationDeclarationOptions } from '#/src/relation.js'

export interface OperationErrorMap {
  create: {
    initialValues: Parameters<InstanceType<typeof Collection>['create']>[0]
  }
  createMany: {
    count: number
    initialValuesFactory: Parameters<
      InstanceType<typeof Collection>['createMany']
    >[1]
  }
  findFirst: {
    predicate: Parameters<InstanceType<typeof Collection>['findFirst']>[0]
    options: Parameters<InstanceType<typeof Collection>['findFirst']>[1]
  }
  findMany: {
    predicate: Parameters<InstanceType<typeof Collection>['findMany']>[0]
    options: Parameters<InstanceType<typeof Collection>['findMany']>[1]
  }
  update: {
    predicate: Parameters<InstanceType<typeof Collection>['update']>[0]
    options: Parameters<InstanceType<typeof Collection>['update']>[1]
  }
  updateMany: {
    predicate: Parameters<InstanceType<typeof Collection>['updateMany']>[0]
    options: Parameters<InstanceType<typeof Collection>['updateMany']>[1]
  }
  delete: {
    predicate: Parameters<InstanceType<typeof Collection>['delete']>[0]
    options: Parameters<InstanceType<typeof Collection>['delete']>[1]
  }
  deleteMany: {
    predicate: Parameters<InstanceType<typeof Collection>['deleteMany']>[0]
    options: Parameters<InstanceType<typeof Collection>['deleteMany']>[1]
  }
}

export class OperationError<
  OperationName extends keyof OperationErrorMap,
> extends InvariantError {
  static for<OperationName extends keyof OperationErrorMap>(
    operationName: OperationName,
    info: OperationErrorMap[OperationName],
  ) {
    return (message: string) => {
      return new OperationError(message, operationName, info)
    }
  }

  constructor(
    message: string,
    public readonly operationName: OperationName,
    public readonly info: OperationErrorMap[OperationName],
    public readonly cause?: unknown,
  ) {
    super(message)
  }
}

export class StrictOperationError<
  OperationName extends keyof OperationErrorMap,
> extends OperationError<OperationName> {
  static for = OperationError.for
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
