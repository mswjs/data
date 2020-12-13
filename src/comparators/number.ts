import { NumberQuery, QueryToComparator } from '../query/queryTypes'
import { numberInRange } from '../utils/numberInRange'

export const numberComparators: QueryToComparator<NumberQuery> = {
  equals(expected, actual) {
    return actual === expected
  },
  notEquals(expected, actual) {
    return !this.equals(expected, actual)
  },
  between(expected, actual) {
    return numberInRange(expected[0], expected[1], actual)
  },
  notBetween(expected, actual) {
    return !this.between(expected, actual)
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
