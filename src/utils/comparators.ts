import { NumberQuery, StringQuery } from '../queryTypes'

type QueryToComparator<QueryType extends StringQuery | NumberQuery> = {
  [K in keyof QueryType]: (
    expected: QueryType[K],
    actual: QueryType[K]
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

export function getComparatorsForValue(
  value: string | number
): QueryToComparator<StringQuery | NumberQuery> {
  if (typeof value === 'string') {
    return stringComparators
  }

  return numberComparators
}
