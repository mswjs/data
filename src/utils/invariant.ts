import OperationError, { ErrorType } from '../exceptions/OperationError'

export function invariant(
  value: boolean,
  message: string,
  errorType: ErrorType = 'GENERAL',
) {
  if (value) {
    throw new OperationError(message, errorType)
  }
}
