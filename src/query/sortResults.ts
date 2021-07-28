import debug from 'debug'
import get from 'lodash.get'
import { Entity, InternalEntity } from 'src/glossary'
import { OrderBy, SortDirection } from './queryTypes'

const log = debug('sortResults')

type FlatSortCriteria = [string[], SortDirection]

function warnOnIneffectiveSortingKeys(sortCriteria: Record<string, any>): void {
  const [mainCriteria, ...siblings] = Object.keys(sortCriteria)

  if (siblings.length > 0) {
    console.warn(
      'Sorting by "%s" has no effect: already sorted by "%s".',
      siblings.join(','),
      mainCriteria,
    )
  }
}

function flattenSortCriteria<EntityType extends Entity<any, any>>(
  orderBy: OrderBy<EntityType>[],
  propertyPath: string[] = [],
): FlatSortCriteria[] {
  log('flattenSortCriteria:', orderBy, propertyPath)

  return orderBy.reduce<FlatSortCriteria[]>((criteria, properties) => {
    warnOnIneffectiveSortingKeys(properties)

    // Multiple properties in a single criteria object are forbidden.
    // Use the list of criteria objects for multi-criteria sort.
    const property = Object.keys(properties)[0] as keyof OrderBy<EntityType>
    const sortDirection = properties[property]!
    const path = propertyPath.concat(property.toString())
    log({ property, sortDirection, path })

    // Recursively flatten order criteria when referencing
    // relational properties.
    const newCriteria =
      typeof sortDirection === 'object'
        ? flattenSortCriteria([sortDirection], path)
        : ([[path, sortDirection]] as FlatSortCriteria[])

    log('pushing new criteria:', newCriteria)
    return criteria.concat(newCriteria)
  }, [])
}

/**
 * Sorts the given list of entities by a certain criteria.
 */
export function sortResults<EntityType extends Entity<any, any>>(
  orderBy: OrderBy<EntityType> | OrderBy<EntityType>[],
  data: InternalEntity<any, any>[],
): void {
  log('sorting data:', data)
  log('order by:', orderBy)

  const criteriaList = ([] as OrderBy<EntityType>[]).concat(orderBy)
  log('criteria list:', criteriaList)

  const criteria = flattenSortCriteria(criteriaList)
  log('flattened criteria:', JSON.stringify(criteria))

  data.sort((left, right) => {
    for (const [path, sortDirection] of criteria) {
      const leftValue = get(left, path)
      const rightValue = get(right, path)

      log(
        'comparing value at "%s" (%s): "%s" / "%s"',
        path,
        sortDirection,
        leftValue,
        rightValue,
      )

      if (leftValue > rightValue) {
        return sortDirection === 'asc' ? 1 : -1
      }

      if (leftValue < rightValue) {
        return sortDirection === 'asc' ? -1 : 1
      }
    }

    return 0
  })

  log('sorted results:\n', data)
}
