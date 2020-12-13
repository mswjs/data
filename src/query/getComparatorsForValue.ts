import { booleanComparators } from '../comparators/boolean'
import { dateComparators } from '../comparators/date'
import { numberComparators } from '../comparators/number'
import { stringComparators } from '../comparators/string'
import {
  DateQuery,
  NumberQuery,
  StringQuery,
  BooleanQuery,
  QueryToComparator,
} from './queryTypes'

export function getComparatorsForValue(
  value: string | number,
): QueryToComparator<StringQuery | NumberQuery | BooleanQuery | DateQuery> {
  switch (value.constructor.name) {
    case 'String':
      return stringComparators

    case 'Number':
      return numberComparators

    case 'Boolean':
      return booleanComparators

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
