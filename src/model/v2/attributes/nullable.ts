import { invariant } from 'outvariant'
import {
  AnotherValue,
  Getter,
  ModelValue,
  ModelDefinitionValue,
} from '../Model'
import { TokenAttributes, TokenSetPayload } from '../Token'

export type Nullable<T> = T | null

/**
 * Define a nullable token.
 * Nullable tokens can have `null` as an initial value, and can also
 * be updated to `null` in the queryable context.
 * @example
 * nullable(() => 'Baker st.')
 * nullable((): Nullable<string> => null)
 * nullable({ nested: () => 'John' })
 */
export function nullable<
  Value extends ModelValue,
  Input extends Getter<Value> | ModelDefinitionValue<unknown>,
>(input: Input) {
  return new NullableAttributes<AnotherValue<Input>>(input)
}

class NullableAttributes<Value extends ModelValue> extends TokenAttributes<
  Nullable<Value>
> {
  constructor(input: Getter<any> | ModelDefinitionValue<any>) {
    invariant(
      !(input instanceof TokenAttributes),
      'Failed to construct NullableAttributes: token attributes as an input is not supported.',
    )

    if (typeof input === 'function') {
      super(input)
      return
    }

    super(() => undefined as any, input)
  }

  public shouldProduceValue(payload: TokenSetPayload<Value>) {
    // If the parent nullable token value an explicit "null",
    // skip producing any potential children.
    if (payload.value === null) {
      this.skipChildren = true
    }

    // Nullable tokens can always be set.
    return true
  }
}
