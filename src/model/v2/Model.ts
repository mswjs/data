import get from 'lodash/get'
import type { AnyObject } from '../../glossary'
import { isObject } from '../../utils/isObject'
import type { EntityContext } from './contexts/EntityContext'
import { Token, TokenAttributes, TokenLocation } from './Token'

export type PrimitiveValue = string | number | boolean | Date
export type ModelValue = PrimitiveValue[] | PrimitiveValue
export type Getter<Value extends unknown> = () => Value

export type AnotherValue<V extends unknown> = V extends TokenAttributes<infer T>
  ? T
  : V extends Getter<infer T>
  ? T
  : V extends AnyObject
  ? Partial<Values<V>>
  : never

export type Values<Definition extends ModelDefinition> = {
  [K in keyof Definition]: AnotherValue<Definition[K]>
}

export type ModelDefinitionValue<V> =
  | ModelDefinition<V>
  | Getter<V>
  | TokenAttributes<any>

export interface ModelDefinition<V extends unknown = ModelValue> {
  [propertyName: string]: ModelDefinitionValue<V>
}

export class Model<Definition extends ModelDefinition = ModelDefinition> {
  public tokens: Token[]

  constructor(definition: Definition) {
    this.tokens = Model.parse(definition)
  }

  static parse(
    definition: ModelDefinition,
    fullLocation: TokenLocation = [],
    tokens: Token[] = [],
  ): Token[] {
    for (const [propertyName, value] of Object.entries(definition)) {
      const location = fullLocation.concat(propertyName)

      // Token attributes.
      if (value instanceof TokenAttributes) {
        const children =
          typeof value.childDefinition !== 'undefined'
            ? Model.parse(value.childDefinition, location)
            : undefined

        tokens.push(
          new Token({
            location,
            attributes: value,
            children,
          }),
        )
        continue
      }

      // Nested model definitions (objects).
      if (isObject<ModelDefinition>(value)) {
        Model.parse(value, location, tokens)
        continue
      }

      // Primitive values.
      tokens.push(
        new Token({
          location,
          attributes: new TokenAttributes(value),
        }),
      )
    }

    return tokens
  }

  /**
   * Create a plain Object from the model.
   * Optionally, populate the model with the given initial values.
   */
  public produce(args: ModelProduceArgs<Definition> = {}, entity = {}): any {
    const produceToken = (token: Token): void => {
      const initialValue = get(args.initialValues || {}, token.location)

      token.set({
        model: this,
        entity,
        context: args.context,
        initialValue,
      })

      if (token.children) {
        if (token.attributes.skipChildren) {
          return
        }

        for (const childToken of token.children) {
          produceToken(childToken)
        }
      }
    }

    for (const token of this.tokens) {
      produceToken(token)
    }

    // Notify the context, if any, about a new entity
    // being created.
    args.context?.onEntityCreated(entity, args, this)

    return entity
  }
}

export interface ModelProduceArgs<Definition extends ModelDefinition> {
  initialValues?: InitialValues<Definition>
  context?: EntityContext
}

export type InitialValues<Definition extends ModelDefinition> = Partial<
  Values<Definition>
>
