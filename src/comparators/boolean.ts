import { BooleanQuery, QueryToComparator } from '../query/queryTypes'

export const booleanComparators: QueryToComparator<BooleanQuery> = {
  equals(expected, actual) {
    return actual === expected
  },
  notEquals(expected, actual) {
    return expected !== actual
  },
}
