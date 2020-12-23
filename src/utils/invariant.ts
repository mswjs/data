import {
  OperationError,
  DuplicateKeyError,
  EntityNotFound,
} from '../exceptions'

const errors = {
  OperationError,
  DuplicateKeyError,
  EntityNotFound,
}

type Errors = keyof typeof errors

export function invariant<
  T extends Errors,
  K extends ConstructorParameters<typeof errors[T]>
>(value: boolean, errorClassName: T, ...rest: K) {
  if (value) {
    //@ts-ignore
    throw new errors[errorClassName](...rest)
  }
}
