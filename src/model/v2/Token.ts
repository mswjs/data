import set from 'lodash/set'
import { invariant } from 'outvariant'
import type { EntityContext } from './contexts/EntityContext'
import type { ModelValue, Getter, Model, ModelDefinition } from './Model'

export type TokenLocation = string[]

type TokenInput = {
  location: TokenLocation
  attributes: TokenAttributes<any>
  children?: Token[]
}

export interface TokenSetArgs<Value extends unknown = ModelValue> {
  model: Model
  entity: any
  context?: EntityContext
  initialValue?: Value
}

export interface TokenSetPayload<
  Value extends unknown,
  Context extends EntityContext = never,
> {
  model: Model
  token: Token<Value>
  entity: any
  context?: Context
  value: Value
  initialValue?: Value
}

export class Token<Value extends unknown = ModelValue> {
  public readonly location: TokenLocation
  public readonly attributes: TokenAttributes<Value, EntityContext>
  public readonly children?: Token[]

  constructor(input: TokenInput) {
    this.location = input.location
    this.attributes = input.attributes
    this.children = input.children
  }

  public get pointer(): string {
    return this.location.join('.')
  }

  public set(args: TokenSetArgs<Value>) {
    const value =
      typeof args.initialValue !== 'undefined'
        ? args.initialValue
        : this.attributes.value()

    const payload: TokenSetPayload<Value, any> = {
      model: args.model,
      token: this,
      entity: args.entity,
      context: args.context,
      value,
      initialValue: args.initialValue,
    }

    const shouldProduceValue = this.attributes.shouldProduceValue(payload)

    if (!shouldProduceValue) {
      return
    }

    set(args.entity, this.location, value)
  }
}

export class TokenAttributes<
  Value extends unknown,
  Context extends EntityContext = never,
> {
  /**
   * Determine if the children tokens should be skipped
   * when producing this token.
   */
  public skipChildren: boolean

  constructor(
    public readonly value: Getter<Value>,
    public readonly childDefinition?: ModelDefinition<Value>,
  ) {
    this.skipChildren = false
  }

  /**
   * Controls whether the token should be set on the entity.
   */
  public shouldProduceValue(args: TokenSetPayload<Value, Context>): boolean {
    // Regular tokens do not support explicit "null" as the value.
    // You should use "nullable" to explicitly state that demand.
    invariant(
      args.value != null,
      'Cannot set token "%s": values cannot be null. Did you mean to wrap it in "nullable"?',
      args.token.pointer,
    )

    return true
  }
}
