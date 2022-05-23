import { BooleanQuery, QueryToComparator } from '../queryTypes'

export const booleanComparators: QueryToComparator<BooleanQuery> = {
  equals(expected, actual) {
    return actual === expected
  },
  notEquals(expected, actual) {
    return expected !== actual
  },
}
