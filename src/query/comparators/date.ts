import { compareAsc as compareDates } from 'date-fns'
import { DateQuery, QueryToComparator } from '../queryTypes'

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
