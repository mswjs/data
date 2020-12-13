import { QueryToComparator, StringQuery } from '../query/queryTypes'

export const stringComparators: QueryToComparator<StringQuery> = {
  equals(expected, actual) {
    return expected === actual
  },
  notEquals(expected, actual) {
    return !this.equals(expected, actual)
  },
  contains(expected, actual) {
    return actual.includes(expected)
  },
  notContains(expected, actual) {
    return !this.contains(expected, actual)
  },
  in(expected, actual) {
    return expected.includes(actual)
  },
  notIn(expected, actual) {
    return !this.in(expected, actual)
  },
}
