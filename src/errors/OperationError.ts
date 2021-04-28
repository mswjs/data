export enum OperationErrorType {
  MissingPrimaryKey = 'MissingPrimaryKey',
  DuplicatePrimaryKey = 'DuplicatePrimaryKey',
  EntityNotFound = 'EntityNotFound',
}

export class OperationError<ErrorType = OperationErrorType> extends Error {
  public type: ErrorType

  constructor(type: ErrorType, message?: string) {
    super(message)
    this.name = 'OperationError'
    this.type = type
  }
}
