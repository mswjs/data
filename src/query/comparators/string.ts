import { QueryToComparator, StringQuery } from '../queryTypes'

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
  in(expected, actual) {
    return expected.includes(actual)
  },
  notIn(expected, actual) {
    return !stringComparators.in(expected, actual)
  },
}
