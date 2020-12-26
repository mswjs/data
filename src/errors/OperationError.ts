export enum OperationErrorType {
  EntityNotFound = 'EntityNotFound',
  DuplicatePrimaryKey = 'DuplicatePrimaryKey',
}

export class OperationError extends Error {
  public type: OperationErrorType

  constructor(type: OperationErrorType, message?: string) {
    super(message)
    this.name = 'OperationError'
    this.type = type
  }
}
