import { nullable } from '../nullable'
import { Model } from '../../Model'

/**
 * Nullable properties retain value getter return type.
 */
new Model({
  age: nullable(() => 12),
}).produce({
  initialValues: {
    age: 24,
  },
})

/**
 * Nullable properties can have `null` as initial value.
 */
new Model({
  age: nullable(() => 12),
}).produce({
  initialValues: {
    age: null,
  },
})

/**
 * Nullable properties respect the value getter return type.
 */
new Model({
  age: nullable(() => 12),
}).produce({
  initialValues: {
    // @ts-expect-error string is not assignable to number.
    age: 'hello',
  },
})
