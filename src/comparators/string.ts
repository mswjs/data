import { QueryToComparator, StringQuery } from '../query/queryTypes'

export const stringComparators: QueryToComparator<StringQuery> = {
  equals(expected, actual) {
    return expected === actual
  },
  notEquals(expected, actual) {
    return !stringComparators.equals(expected, actual)
  },
  contains(expected, actual) {
    return actual.includes(expected)
  },
  notContains(expected, actual) {
    return !stringComparators.contains(expected, actual)
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
  in(expected, actual) {
    return expected.includes(actual)
  },
  notIn(expected, actual) {
    return !stringComparators.in(expected, actual)
  },
}
