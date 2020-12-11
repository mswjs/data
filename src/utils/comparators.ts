import { compareAsc as compareDates } from 'date-fns'
import { DateQuery, NumberQuery, StringQuery } from '../query/queryTypes'

type QueryToComparator<
  QueryType extends StringQuery | NumberQuery | DateQuery
> = {
  [K in keyof QueryType]: (
    expected: QueryType[K],
    actual: QueryType[K],
  ) => boolean
}

export const stringComparators: QueryToComparator<StringQuery> = {
  equals(expected, actual) {
    return expected === actual
  },
  notEquals(expected, actual) {
    return expected !== actual
  },
  contains(expected, actual) {
    return actual.includes(expected)
  },
  notContains(expected, actual) {
    return !actual.includes(expected)
  },
}

export const numberComparators: QueryToComparator<NumberQuery> = {
  equals(expected, actual) {
    return actual === expected
  },
  notEquals(expected, actual) {
    return actual !== expected
  },
  gt(expected, actual) {
    return actual > expected
  },
  gte(expected, actual) {
    return actual >= expected
  },
  lt(expected, actual) {
    return actual < expected
  },
  lte(expected, actual) {
    return actual <= expected
  },
}

export const dateComparators: QueryToComparator<DateQuery> = {
  equals(expected, actual) {
    return compareDates(expected, actual) === 0
  },
  notEquals(expected, actual) {
    return compareDates(expected, actual) !== 0
  },
  gt(expected, actual) {
    return compareDates(actual, expected) === 1
  },
  gte(expected, actual) {
    return [0, 1].includes(compareDates(actual, expected))
  },
  lt(expected, actual) {
    return compareDates(actual, expected) === -1
  },
  lte(expected, actual) {
    return [-1, 0].includes(compareDates(actual, expected))
  },
}

export function getComparatorsForValue(
  value: string | number,
): QueryToComparator<StringQuery | NumberQuery | DateQuery> {
  switch (value.constructor.name) {
    case 'String':
      return stringComparators

    case 'Number':
      return numberComparators

    case 'Date':
      return dateComparators

    default:
      throw new Error(
        `Failed to find a comparator for the value "${JSON.stringify(
          value,
        )}" of type "${value.constructor.name}".`,
      )
  }
}
