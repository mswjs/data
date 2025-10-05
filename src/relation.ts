import type { StandardSchemaV1 } from '@standard-schema/spec'
import { invariant, format } from 'outvariant'
import { isEqual } from 'es-toolkit'
import { get, set, unset } from 'es-toolkit/compat'
import {
  kPrimaryKey,
  kRelationMap,
  kCollectionId,
  type Collection,
  type RecordType,
} from '#/src/collection.js'
import { Logger } from '#/src/logger.js'
import {
  definePropertyAtPath,
  isRecord,
  type PropertyPath,
} from '#/src/utils.js'
import {
  RelationError,
  RelationErrorCodes,
  type RelationErrorDetails,
} from '#/src/errors.js'

export interface RelationDeclarationOptions {
  /**
   * Unique relation role to disambiguate between multiple relations
   * to the same target collection.
   */
  role?: string

  /**
   * Marks this relation as unique.
   * Unique relations cannot reference foreign records that is already
   * associated with other owner records by the same relation.
   */
  unique?: boolean

  /**
   * Decides how to handle the deletion of the referenced record.
   * - `cascade`: Delete all owner records referencing the deleted record.
   *
   * By default, removes the reference to the deleted record from the owner record.
   */
  onDelete?: 'cascade'
}

export type RelationsFunction<T extends StandardSchemaV1.InferOutput<any>> = (
  builder: RelationBuilder,
) => RelationMapDefinition<T>

type RelationMapDefinition<T extends StandardSchemaV1.InferOutput<any>> =
  T extends Array<infer V>
    ? RelationMapDefinition<V>
    : T extends Record<any, any>
      ? {
          [K in keyof T]?: RelationMapDefinition<T[K]> | (() => Relation)
        }
      : () => Relation

export interface RelationBuilder {
  one: (
    foreignCollection: Collection<any> | Array<Collection<any>>,
    options?: RelationDeclarationOptions,
  ) => () => Relation
  many: (
    foreignCollection: Collection<any> | Array<Collection<any>>,
    options?: RelationDeclarationOptions,
  ) => () => Relation
}

export const createRelationBuilder = <Owner extends Collection<any>>(
  ownerCollection: Owner,
): RelationBuilder => {
  return {
    one(foreignCollection, options) {
      return () =>
        new One(
          ownerCollection,
          Array.isArray(foreignCollection)
            ? foreignCollection
            : [foreignCollection],
          options,
        )
    },
    many(foreignCollection, options) {
      return () =>
        new Many(
          ownerCollection,
          Array.isArray(foreignCollection)
            ? foreignCollection
            : [foreignCollection],
          options,
        )
    },
  }
}

export abstract class Relation {
  #logger: Logger
  #path?: PropertyPath

  public foreignKeys: Set<string>

  constructor(
    readonly ownerCollection: Collection<any>,
    /** The list of collecftions referenced by this relation. */
    readonly foreignCollections: Array<Collection<any>>,
    readonly options: RelationDeclarationOptions = {},
  ) {
    this.#logger = new Logger('Relation')
    this.#logger.log('creating relation:', {
      ownerCollection,
      foreignCollections,
      options,
    })

    this.foreignKeys = new Set()
  }

  get path(): PropertyPath {
    invariant(
      this.#path != null,
      'Failed to retrieve path for relation: relation is not initialized',
    )

    return this.#path
  }

  /**
   * Initializes the relation on the owner record.
   */
  public initialize(
    record: RecordType,
    path: Array<string>,
    initialValues: unknown,
  ) {
    this.#path = path
    const serializedPath = path.join('.')

    // Whenever a new record is created, initialize its relations.
    // This way, each record has its own instance of a stateful relation.
    this.#initializeRelation(path, record, initialValues)

    for (const foreignCollection of this.foreignCollections) {
      // Update the owner relations when a foreign record is created
      // referencing the owner record.
      foreignCollection.hooks.on('create', (event) => {
        const { record: foreignRecord } = event.data
        const foreignRelations = this.getRelationsToOwner(foreignRecord)

        for (const foreignRelation of foreignRelations) {
          const ownerRecords = this.ownerCollection.findMany((q) =>
            q.where((record) => {
              return foreignRelation.foreignKeys.has(record[kPrimaryKey])
            }),
          )

          for (const ownerRecord of ownerRecords) {
            const ownerRelation = ownerRecord[kRelationMap].get(serializedPath)
            ownerRelation.foreignKeys.add(foreignRecord[kPrimaryKey])
          }
        }
      })

      // Clear the references to deleted foreign records.
      foreignCollection.hooks.on('delete', (event) => {
        const { deletedRecord: deletedForeignRecord } = event.data
        this.foreignKeys.delete(deletedForeignRecord[kPrimaryKey])

        // Delete all the owners referencing the deleted foreign record
        // if the relation is set to cascade on delete.
        if (this.options.onDelete === 'cascade') {
          const foreignRelations =
            this.getRelationsToOwner(deletedForeignRecord)

          this.ownerCollection.deleteMany((q) => {
            return q.where((record) => {
              return foreignRelations.some((foreignRelation) => {
                return foreignRelation.foreignKeys.has(record[kPrimaryKey])
              })
            })
          })
        }
      })
    }

    /**
     * @note Handle foreign record updates through the owner record in an early hook
     * because if such an update occurs, it must NOT translate to the owner "update" event
     * (the owner had no updates, it just updated a foreign record through itself).
     *
     * @example
     * await users.update(q, { data: { country: { code: 'uk' } } })
     */
    this.ownerCollection.hooks.earlyOn('update', (event) => {
      const update = event.data

      if (
        path.every((key, index) => key === update.path[index]) &&
        !isRecord(update.nextValue)
      ) {
        event.preventDefault()
        event.stopImmediatePropagation()

        const foreignUpdatePath = update.path.slice(path.length)

        for (const foreignCollection of this.foreignCollections) {
          foreignCollection.updateMany(
            (q) => {
              return q.where((record) => {
                return this.foreignKeys.has(record[kPrimaryKey])
              })
            },
            {
              data(foreignRecord) {
                set(foreignRecord, foreignUpdatePath, update.nextValue)
              },
            },
          )
        }
      }
    })

    /**
     * Handle owner updates where the relational property changes to another foreign record.
     *
     * @example
     * await users.update(q, { data: { country: await countries.create({}) } })
     */
    this.ownerCollection.hooks.on('update', (event) => {
      const update = event.data

      if (isEqual(update.path, path) && isRecord(update.nextValue)) {
        event.preventDefault()

        // If the owner relation is "one-of", multiple foreign records cannot own this record.
        // Disassociate the old foreign records from pointing to the owner record.
        if (this instanceof One) {
          const oldForeignRecords = this.foreignCollections.flatMap<RecordType>(
            (foreignCollection) => {
              return foreignCollection.findMany((q) => {
                return q.where((record) => {
                  return this.foreignKeys.has(record[kPrimaryKey])
                })
              })
            },
          )

          const foreignRelationsToDisassociate = oldForeignRecords.flatMap(
            (record) => this.getRelationsToOwner(record),
          )

          // Throw if attempting to disassociate unique relations.
          if (this.options.unique) {
            invariant.as(
              RelationError.for(
                RelationErrorCodes.FORBIDDEN_UNIQUE_UPDATE,
                this.#createErrorDetails(),
              ),
              foreignRelationsToDisassociate.length === 0,
              'Failed to update a unique relation at "%s": the foreign record is already associated with another owner',
              update.path.join('.'),
            )
          }

          for (const foreignRelation of foreignRelationsToDisassociate) {
            foreignRelation.foreignKeys.delete(update.prevRecord[kPrimaryKey])
          }

          // Check any other owners associated with the same foreign record.
          // This is important since unique relations are not always two-way.
          const otherOwnersAssociatedWithForeignRecord =
            this.#getOtherOwnerForRecords([update.nextValue])

          invariant.as(
            RelationError.for(
              RelationErrorCodes.FORBIDDEN_UNIQUE_UPDATE,
              this.#createErrorDetails(),
            ),
            otherOwnersAssociatedWithForeignRecord == null,
            'Failed to update a unique relation at "%s": the foreign record is already associated with another owner',
            update.path.join('.'),
          )

          this.foreignKeys.clear()
        }

        // Associate the owner with a foreign record from the update data.
        const foreignRecord = update.nextValue
        this.foreignKeys.add(foreignRecord[kPrimaryKey])

        for (const foreignRelation of this.getRelationsToOwner(foreignRecord)) {
          foreignRelation.foreignKeys.add(update.prevRecord[kPrimaryKey])
        }
      }
    })
  }

  public abstract resolve(foreignKeys: Set<string>): unknown

  public abstract getDefaultValue(): unknown

  #initializeRelation(
    path: Array<string>,
    record: RecordType,
    initialValues: any,
  ): void {
    const logger = this.#logger
    const serializedPath = path.join('.')

    logger.log('owner record is being created:', {
      record,
      path,
      initialValues,
      ownerCollectionId: this.ownerCollection[kCollectionId],
      foreignCollectionIds: Array.from(this.foreignCollections),
    })

    const relationMap = record[kRelationMap]
    logger.log('owner relation map (before update):', relationMap)

    relationMap.set(serializedPath, this)
    logger.log('owner relation map (after update):', relationMap)

    // Replace literal record references in initial values
    // with pointers to the foreign keys.
    const initialValue = get(record, path)

    if (initialValue != null) {
      logger.log(
        `found initial value for "${serializedPath}" relation:`,
        initialValue,
      )

      const initialForeignRecords: Array<RecordType> = Array.prototype
        .concat([], get(initialValues, path))
        /**
         * @note If the initial value as an empty array, concatenating it above
         * results in [undefined]. Filter out undefined values.
         */
        .filter(Boolean)

      logger.log('all foreign entries:', initialForeignRecords)

      if (this.options.unique) {
        // Check if the foreign record isn't associated with another owner.
        const foreignRelations = initialForeignRecords.flatMap(
          (foreignRecord) => {
            return this.getRelationsToOwner(foreignRecord)
          },
        )

        const isUnique = foreignRelations.every(
          (relation) => relation.foreignKeys.size === 0,
        )

        invariant.as(
          RelationError.for(
            RelationErrorCodes.FORBIDDEN_UNIQUE_CREATE,
            this.#createErrorDetails(),
          ),
          isUnique,
          `Failed to create a unique relation at "%s": the foreign record is already associated with another owner`,
          serializedPath,
        )

        // Check if another owner isn't associated with the foreign record.
        const otherOwnersAssociatedWithForeignRecord =
          this.#getOtherOwnerForRecords(initialForeignRecords)

        invariant.as(
          RelationError.for(
            RelationErrorCodes.FORBIDDEN_UNIQUE_CREATE,
            this.#createErrorDetails(),
          ),
          otherOwnersAssociatedWithForeignRecord == null,
          'Failed to create a unique relation at "%s": the foreign record is already associated with another owner',
          serializedPath,
        )
      }

      for (const foreignRecord of initialForeignRecords) {
        const foreignKey = foreignRecord[kPrimaryKey]

        invariant.as(
          RelationError.for(
            RelationErrorCodes.INVALID_FOREIGN_RECORD,
            this.#createErrorDetails(),
          ),
          foreignKey != null,
          'Failed to store foreign record reference for "%s" relation: the referenced record (%j) is missing the primary key',
          serializedPath,
          foreignRecord,
        )

        if (foreignKey != null) {
          this.foreignKeys.add(foreignKey)
        }
      }

      logger.log('updated foreign keys:', this.foreignKeys)
      unset(record, path)
    }

    // Define a getter that resolves foreign entries based on their ids.
    // Specific relation classes implement the `resolve` method to
    // return the appropriate values (i.e one/many).
    definePropertyAtPath(record, path, {
      enumerable: true,
      configurable: true,
      get: () => {
        const returnValue = this.resolve(this.foreignKeys)
        logger.log(
          `resolving "${serializedPath}" for`,
          record,
          'result:',
          returnValue,
        )

        if (typeof returnValue !== 'undefined') {
          return returnValue
        }

        /**
         * @note If the relational key is present in initial values
         * and is null, that means it's a nullable relation. Allow nulls.
         */
        if (initialValue === null) {
          return null
        }

        return this.getDefaultValue()
      },
      set: () => {
        throw new RelationError(
          format(
            'Failed to set property "%s" on collection (%s): relational properties are read-only and can only be updated via collection updates',
            serializedPath,
            this.ownerCollection[kCollectionId],
          ),
          RelationErrorCodes.UNEXPECTED_SET_EXPRESSION,
          this.#createErrorDetails(),
        )
      },
    })

    logger.log(`defined getter over "${serializedPath}"!`)
  }

  /**
   * Returns a list of relations from the given foreign record
   * to the owner collection. Takes `role` into account.
   */
  public getRelationsToOwner(foreignRecord: RecordType): Array<Relation> {
    const result: Array<Relation> = []

    for (const [, relation] of foreignRecord[kRelationMap]) {
      if (
        relation.foreignCollections.some((foreignCollection) => {
          return (
            foreignCollection[kCollectionId] ===
            this.ownerCollection[kCollectionId]
          )
        }) &&
        relation.options.role === this.options.role
      ) {
        result.push(relation)
      }
    }

    return result
  }

  #getOtherOwnerForRecords(
    foreignRecords: Array<RecordType>,
  ): RecordType | undefined {
    const serializedPath = this.path.join('.')

    return this.ownerCollection.findFirst((q) => {
      return q.where((otherOwner) => {
        const otherOwnerRelations = otherOwner[kRelationMap]
        const otherOwnerRelation = otherOwnerRelations.get(serializedPath)

        // Forego any other relation comparisons since the same collection
        // shares the relation definition at the same property path.
        return foreignRecords.some((foreignRecord) => {
          return otherOwnerRelation.foreignKeys.has(foreignRecord[kPrimaryKey])
        })
      })
    })
  }

  #createErrorDetails(): RelationErrorDetails {
    return {
      path: this.path,
      ownerCollection: this.ownerCollection,
      foreignCollections: this.foreignCollections,
      options: this.options,
    }
  }
}

class One extends Relation {
  public resolve(foreignKeys: Set<string>): unknown {
    if (foreignKeys.size === 0) {
      return
    }

    for (const foreignCollection of this.foreignCollections) {
      const record = foreignCollection.findFirst((q) =>
        q.where((record) => {
          return record[kPrimaryKey] === foreignKeys.values().next().value
        }),
      )

      /**
       * @note `null` is a valid value for nullable relations.
       */
      if (typeof record !== 'undefined') {
        return record
      }
    }
  }

  public getDefaultValue(): unknown {
    return undefined
  }
}

export class Many extends Relation {
  public resolve(foreignKeys: Set<string>): unknown {
    if (foreignKeys.size === 0) {
      return
    }

    return this.foreignCollections.flatMap<RecordType>((foreignCollection) => {
      return foreignCollection.findMany((q) =>
        q.where((record) => {
          return foreignKeys.has(record[kPrimaryKey])
        }),
      )
    })
  }

  public getDefaultValue(): unknown {
    return []
  }
}
