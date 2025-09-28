import { isObject } from '#/src/utils.js'

export type Condition<T> =
  NonNullable<T> extends Array<infer V>
    ? Condition<V> | PredicateFunction<T> | Extract<V, null | undefined>
    : T extends Record<any, any>
      ? {
          [K in keyof T]?: NonNullable<T[K]> extends Array<infer V>
            ?
                | Condition<V>
                | PredicateFunction<T[K]>
                | Extract<T[K], null | undefined>
            : /**
               * @note Cast T[K] to NonNullable to match
               * Record<any, any> | undefined, too.
               */
              NonNullable<T[K]> extends Record<any, any>
              ? Condition<T[K]> | Extract<T[K], null | undefined>
              : T[K] | PredicateFunction<T[K]>
        }
      : never

export type PredicateFunction<T> = (value: T) => boolean

export class Query<T> {
  #predicate?: PredicateFunction<T>

  constructor(predicate?: PredicateFunction<NoInfer<T>>) {
    this.#predicate = predicate
  }

  public test(value: T): boolean {
    return !!this.#predicate?.(value)
  }

  public where(condition: Condition<T>) {
    return new Query<T>(
      Query.#and(this.#predicate, Query.#normalize(condition)),
    )
  }

  public and(...conditions: Array<Query<T> | Condition<T>>) {
    return new Query<T>(
      Query.#and(this.#predicate, ...conditions.map(Query.#normalize)),
    )
  }

  public or(...conditions: Array<Query<T> | Condition<T>>) {
    return new Query<T>(
      Query.#or(this.#predicate, ...conditions.map(Query.#normalize)),
    )
  }

  static #normalize(
    condition: Query<any> | Condition<any> | PredicateFunction<any>,
  ): PredicateFunction<any> | undefined {
    if (condition instanceof Query) {
      return condition.#predicate
    }

    if (typeof condition === 'function') {
      return condition as PredicateFunction<any>
    }

    if (isObject(condition)) {
      function compileCondition(
        condition: Condition<any>,
      ): PredicateFunction<any> {
        return (record) => {
          if (Array.isArray(record)) {
            return record.every((item) => compileCondition(condition)(item))
          }

          return Object.entries(condition).every(([key, selector]) => {
            const actualValue = record[key]

            if (typeof actualValue === 'undefined') {
              return false
            }

            if (Array.isArray(actualValue)) {
              return actualValue.every((value) => {
                return compileCondition(selector)(value)
              })
            }

            if (isObject(actualValue)) {
              return compileCondition(selector)(actualValue)
            }

            if (typeof selector === 'function') {
              return selector(actualValue)
            }

            return actualValue === selector
          })
        }
      }

      return compileCondition(condition)
    }

    throw new TypeError('Invalid condition type')
  }

  static #and(
    ...predicates: Array<PredicateFunction<any> | undefined>
  ): PredicateFunction<any> | undefined {
    return (value) => {
      return predicates.filter(Boolean).every((predicate) => {
        return predicate?.(value)
      })
    }
  }

  static #or(
    ...predicates: Array<PredicateFunction<any> | undefined>
  ): PredicateFunction<any> | undefined {
    return (value) => {
      return predicates.filter(Boolean).some((predicate) => {
        return predicate?.(value)
      })
    }
  }
}
