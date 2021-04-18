export enum OperationErrorType {
  MissingPrimaryKey = 'MissingPrimaryKey',
  DuplicatePrimaryKey = 'DuplicatePrimaryKey',
  EntityNotFound = 'EntityNotFound',
}

export class OperationError<T = OperationErrorType> extends Error {
  public type: T

  constructor(type: T, message?: string) {
    super(message)
    this.name = 'OperationError'
    this.type = type
  }
}
