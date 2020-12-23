export type ErrorType = 'GENERAL' | 'ENTITY_NOT_FOUND' | 'DUPLICATE_KEY_ERROR'

class OperationError extends Error {
  type: ErrorType
  constructor(message: string, type: ErrorType) {
    super(message)
    this.type = type
  }
}

export default OperationError
