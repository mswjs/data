export enum OperationErrorType {
  MissingPrimaryKey = 'MissingPrimaryKey',
  DuplicatePrimaryKey = 'DuplicatePrimaryKey',
  EntityNotFound = 'EntityNotFound',
}

export class OperationError extends Error {
  public type: OperationErrorType

  constructor(type: OperationErrorType, message?: string) {
    super(message)
    this.name = 'OperationError'
    this.type = type
  }
}
