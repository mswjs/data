import type { StandardSchemaV1 } from '@standard-schema/spec'
import { get } from 'lodash-es'
import { apply, create as createDraft, type Draft, type Patch } from 'mutative'
import { invariant, InvariantError } from 'outvariant'
import { Logger } from '#/src/logger.js'
import { createHooksEmitter, type HookEventMap } from '#/src/hooks.js'
import { Query } from '#/src/query.js'
import {
  createRelationBuilder,
  Relation,
  type RelationsFunction,
} from '#/src/relation.js'
import {
  cloneWithInternals,
  definePropertyAtPath,
  isObject,
  isRecord,
  toDeepEntries,
} from '#/src/utils.js'
import { type SortOptions, sortResults } from '#/src/sort.js'
import type { Extension } from '#/src/extensions/index.js'
import { OperationError, OperationErrorCodes } from '#/src/errors.js'
import { TypedEvent, type Emitter } from 'rettime'

let collectionsCreated = 0

export type CollectionOptions<Schema extends StandardSchemaV1> = {
  /**
   * A [Standard Schema](https://standardschema.dev/) describing the records in this collection.
   */
  schema: Schema
  /**
   * Extensions to apply to this collection.
   */
  extensions?: Array<Extension>
}

export type PaginationOptions<Schema extends StandardSchemaV1> =
  | OffsetPaginationOptions
  | CursorPaginationOptions<Schema>

export interface OffsetPaginationOptions {
  cursor?: never
  /**
   * A number of matching records to take (after `skip`, if any).
   */
  take?: number
  /**
   * A number of matching records to skip.
   */
  skip?: number
}

export interface CursorPaginationOptions<Schema extends StandardSchemaV1> {
  skip?: never
  /**
   * A reference to a record to use as a cursor to start the querying from.
   */
  cursor: RecordType<StandardSchemaV1.InferOutput<Schema>>
  /**
   * A number of matching records to take (after the skip).
   */
  take?: number
}

export interface UpdateOptions<T> {
  data: UpdateFunction<T>
}

interface StrictOptions<Strict extends boolean = boolean> {
  /**
   * Throws an error if no records match the given query.
   */
  strict?: Strict
}

export type UpdateFunction<T> = (draft: Draft<T>) => Promise<void> | void

export type RecordType<V = Record<string, any>> = V & {
  [kPrimaryKey]: string
  [kRelationMap]: Map<string, Relation>
}

export const kCollectionId = Symbol('kCollectionId')
export const kPrimaryKey = Symbol('kPrimaryKey')
export const kRelationMap = Symbol('kRelationMap')

/**
 * A collection of data.
 * @example
 * const users = new Collection({ schema: userSchema })
 */
export class Collection<Schema extends StandardSchemaV1> {
  #records: Array<RecordType<StandardSchemaV1.InferOutput<Schema>>>
  #logger: Logger

  private [kCollectionId]: number

  public hooks: Emitter<HookEventMap<Schema>>

  constructor(private readonly options: CollectionOptions<Schema>) {
    this[kCollectionId] = this.#generateCollectionId()

    this.#logger = new Logger('Collection').extend(this[kCollectionId])
    this.#records = []

    this.hooks = createHooksEmitter<Schema>()
    this.options.extensions?.forEach((extension) => extension.extend(this))
  }

  /**
   * Creates a new record with the given values.
   * @param initialValues Initial values for the new record.
   * @return The created record.
   *
   * @example
   * await users.create({ id: 1, name: 'John' })
   */
  public async create(
    initialValues: StandardSchemaV1.InferInput<Schema>,
  ): Promise<RecordType<StandardSchemaV1.InferOutput<Schema>>> {
    let logger = this.#logger.extend('create')
    logger.log('initial values:', initialValues)

    const { sanitizedInitialValues, restoreProperties } =
      this.#sanitizeInitialValues(initialValues)

    const validationResult = await this.options.schema['~standard'].validate(
      sanitizedInitialValues,
    )

    if (validationResult.issues) {
      console.error(validationResult.issues)

      throw new OperationError(
        'Failed to create a new record with initial values: does not match the schema. Please see the schema validation errors above.',
        OperationErrorCodes.INVALID_INITIAL_VALUES,
      )
    }

    let record = validationResult.value as RecordType

    invariant.as(
      OperationError.for(OperationErrorCodes.INVALID_INITIAL_VALUES),
      typeof record === 'object',
      'Failed to create a record with initial values (%j): expected the record to be an object or an array',
      initialValues,
    )

    restoreProperties(record)

    // Generate random primary key for every record.
    const primaryKey =
      (isObject(initialValues) &&
        initialValues[kPrimaryKey as keyof typeof initialValues]) ||
      crypto.randomUUID()

    Object.defineProperties(record, {
      [kPrimaryKey]: {
        enumerable: false,
        configurable: false,
        value: primaryKey,
      },
      [kRelationMap]: {
        enumerable: false,
        configurable: false,
        value: new Map<string, Set<[string, string]>>(),
      },
    })

    logger = logger.extend(primaryKey)
    logger.log('symbols defined!', record[kRelationMap])

    if (this.hooks.listenerCount('create') > 0) {
      await this.hooks.emitAsPromise(
        new TypedEvent('create', { data: { record, initialValues } }),
      )
    }
    logger.log('create hooks done!')

    this.#records.push(record)
    logger.log('create done!', record)

    return record
  }

  /**
   * Creates multiple records using the given initial values factory.
   * @param count Number of records to create.
   * @param initialValuesFactory Factory function to generate initial values for each record.
   * @return Array of created records.
   *
   * @example
   * await users.createMany(5, (index) => ({ id: index + 1}))
   */
  public async createMany(
    count: number,
    initialValuesFactory: (
      index: number,
    ) => StandardSchemaV1.InferInput<Schema>,
  ): Promise<Array<RecordType<StandardSchemaV1.InferOutput<Schema>>>> {
    const pendingPromises: Array<Promise<any>> = []

    for (let i = 0; i < count; i++) {
      pendingPromises.push(this.create(initialValuesFactory(i)))
    }

    return await Promise.all(pendingPromises).catch((error) => {
      throw new OperationError(
        'Failed to execute "createMany" on collection: unexpected error',
        OperationErrorCodes.UNEXPECTED_ERROR,
        error,
      )
    })
  }

  /**
   * Returns the first record matching the query.
   * If no query is provided, returns the first record in the collection.
   * @example
   * users.findFirst((q) => q.where({ id: 123 }))
   */
  public findFirst<Strict extends boolean>(
    predicate?:
      | ((query: Query<StandardSchemaV1.InferOutput<Schema>>) => Query<any>)
      | Query<StandardSchemaV1.InferOutput<Schema>>,
    options?: StrictOptions<Strict>,
  ): Strict extends true
    ? RecordType<StandardSchemaV1.InferOutput<Schema>>
    : RecordType<StandardSchemaV1.InferOutput<Schema>> | undefined {
    if (predicate == null) {
      const firstRecord = this.#records[0]

      invariant.as(
        OperationError.for(OperationErrorCodes.STRICT_QUERY_WITHOUT_RESULTS),
        options?.strict ? firstRecord != null : true,
        'Failed to execute "findFirst" on collection without a query: the collection is empty',
      )

      return firstRecord!
    }

    const result = this.#query(
      predicate instanceof Query ? predicate : predicate(new Query()),
    ).next().value

    invariant.as(
      OperationError.for(OperationErrorCodes.STRICT_QUERY_WITHOUT_RESULTS),
      options?.strict ? result != null : true,
      'Failed to execute "findFirst" on collection: no record found matching the query',
    )

    return result!
  }

  /**
   * Returns all records matching the query.
   * If no query is provided, returns all records in the collection.
   * @example
   * users.findMany((q) => q.where({ subscribed: false }))
   */
  public findMany(
    predicate?:
      | ((query: Query<StandardSchemaV1.InferOutput<Schema>>) => Query<any>)
      | Query<StandardSchemaV1.InferOutput<Schema>>,
    options?: PaginationOptions<Schema> & SortOptions<Schema> & StrictOptions,
  ): Array<RecordType<StandardSchemaV1.InferOutput<Schema>>> {
    const query =
      predicate == null
        ? new Query(() => true)
        : predicate instanceof Query
          ? predicate
          : predicate(new Query())

    const results = Array.from(this.#query(query, options)).filter(
      (result) => !!result,
    )

    invariant.as(
      OperationError.for(OperationErrorCodes.STRICT_QUERY_WITHOUT_RESULTS),
      options?.strict ? results.length > 0 : true,
      'Failed to execute "findMany" on collection: no records found matching the query',
    )

    if (options?.orderBy) {
      sortResults(options, results)
    }

    return results
  }

  /**
   * Updates the first record matching the query.
   * Returns the updated record.
   * @example
   * await users.update(
   *   (q) => q.where({ name: 'John' }),
   *   {
   *     data(user) {
   *       user.name = 'Johnatan'
   *     }
   *   }
   * )
   */
  public async update<Strict extends boolean>(
    predicate:
      | ((query: Query<StandardSchemaV1.InferOutput<Schema>>) => Query<any>)
      | Query<StandardSchemaV1.InferOutput<Schema>>
      | RecordType<StandardSchemaV1.InferOutput<Schema>>,
    options: UpdateOptions<StandardSchemaV1.InferOutput<Schema>> &
      StrictOptions<Strict>,
  ): Promise<
    Strict extends true
      ? RecordType<StandardSchemaV1.InferOutput<Schema>>
      : RecordType<StandardSchemaV1.InferOutput<Schema>> | undefined
  > {
    const prevRecord = this.findFirst(
      isRecord(predicate)
        ? new Query<any>((record) => {
            return record[kPrimaryKey] === predicate[kPrimaryKey]
          })
        : predicate,
    )

    if (prevRecord == null) {
      invariant.as(
        OperationError.for(OperationErrorCodes.STRICT_QUERY_WITHOUT_RESULTS),
        !options.strict,
        'Failed to execute "update" on collection: no record found matching the query',
      )

      return undefined!
    }

    const nextRecord = await this.#produceRecord(prevRecord, options.data)
    this.#replaceRecord(prevRecord, nextRecord)

    return nextRecord
  }

  /**
   * Updates all records matching the query.
   * Resolves to the list of updated records.
   * @example
   * await users.updateMany(
   *   (q) => q.where({ subscribed: false }),
   *   {
   *     data(user) {
   *       user.subscribed = true
   *     }
   *   }
   * )
   */
  public async updateMany(
    predicate:
      | ((query: Query<StandardSchemaV1.InferOutput<Schema>>) => Query<any>)
      | Query<StandardSchemaV1.InferOutput<Schema>>,
    options: UpdateOptions<StandardSchemaV1.InferOutput<Schema>> &
      SortOptions<Schema> &
      StrictOptions,
  ): Promise<Array<RecordType<StandardSchemaV1.InferOutput<Schema>>>> {
    const prevRecords = this.findMany(predicate)

    if (prevRecords.length === 0) {
      invariant.as(
        OperationError.for(OperationErrorCodes.STRICT_QUERY_WITHOUT_RESULTS),
        !options.strict,
        'Failed to execute "updateMany" on collection: no records found matching the query',
      )

      return []
    }

    const nextRecords = []

    for (const prevRecord of prevRecords) {
      const nextRecord = await this.#produceRecord(prevRecord, options.data)
      this.#replaceRecord(prevRecord, nextRecord)
      nextRecords.push(nextRecord)
    }

    if (options.orderBy) {
      sortResults(options, nextRecords)
    }

    return nextRecords
  }

  /**
   * Deletes the first record matching the query.
   * @example
   * users.delete((q) => q.where({ id: 123 }))
   */
  public delete<Strict extends boolean>(
    predicate:
      | ((query: Query<StandardSchemaV1.InferOutput<Schema>>) => Query<any>)
      | Query<StandardSchemaV1.InferOutput<Schema>>
      | RecordType<StandardSchemaV1.InferOutput<Schema>>,
    options?: StrictOptions<Strict>,
  ): Strict extends true
    ? RecordType<StandardSchemaV1.InferOutput<Schema>>
    : RecordType<StandardSchemaV1.InferOutput<Schema>> | undefined {
    if (isRecord(predicate)) {
      this.#deleteRecord(predicate)
      return predicate
    }

    const record = this.findFirst(predicate)

    if (record == null) {
      invariant.as(
        OperationError.for(OperationErrorCodes.STRICT_QUERY_WITHOUT_RESULTS),
        !options?.strict,
        'Failed to execute "delete" on collection: no record found matching the query',
      )

      return undefined!
    }

    this.#deleteRecord(record)
    return record
  }

  /**
   * Deletes all records matching the query.
   * @example
   * users.deleteMany((q) => q.where({ subscribed: false }))
   */
  public deleteMany(
    predicate:
      | ((query: Query<StandardSchemaV1.InferOutput<Schema>>) => Query<any>)
      | Query<StandardSchemaV1.InferOutput<Schema>>,
    options?: SortOptions<Schema> & StrictOptions,
  ): Array<RecordType<StandardSchemaV1.InferOutput<Schema>>> {
    /**
     * @note Do NOT forward the sorting options to the querying phase
     * so the results are returned in the order they are present in the store.
     * That way, we can delete them right-to-left correctly.
     */
    const records = this.findMany(predicate)

    for (let i = records.length - 1; i >= 0; i--) {
      this.#deleteRecord(records[i]!)
    }

    if (records.length === 0) {
      invariant.as(
        OperationError.for(OperationErrorCodes.STRICT_QUERY_WITHOUT_RESULTS),
        !options?.strict,
        'Failed to execute "deleteMany" on collection: no records found matching the query',
      )

      return []
    }

    if (options?.orderBy) {
      sortResults(options, records)
    }

    return records
  }

  /**
   * Returns the total number of records in this collection.
   * @example
   * const users = new Collection({ schema })
   * await users.create({ id: 1, name: 'John' })
   * users.count() // 1
   */
  public count(): number {
    return this.#records.length
  }

  /**
   * Returns a list of all records from this collection.
   */
  public all(): Array<RecordType<StandardSchemaV1.InferOutput<Schema>>> {
    /**
     * @note Preserve exact record references so they might be used
     * when querying (must contain primary keys).
     */
    return this.#records
  }

  /**
   * Deletes all the records in this collection.
   */
  public clear(): void {
    this.#records.length = 0
  }

  /**
   * Defines relations for the records in this collection.
   * @example
   * users.defineRelations(({ many }) => ({
   *   posts: many(posts),
   * }))
   */
  public defineRelations(
    resolver: RelationsFunction<StandardSchemaV1.InferOutput<Schema>>,
  ) {
    let logger = this.#logger.extend('defineRelations')
    logger.log('defining relations...')

    const relations = toDeepEntries<() => Relation>(
      resolver(createRelationBuilder(this)) as any,
    )
    logger.log('relations declaration:', relations)

    const initializeRelations = (
      record: RecordType,
      initialValues: StandardSchemaV1.InferInput<Schema> = record,
    ) => {
      for (const [path, createRelation] of relations) {
        logger.log(`initializing relation for "${path.join('.')}"...`)

        const relation = createRelation()
        relation.initialize(record, path as Array<string>, initialValues)

        logger.log('relation initialized!', relation)
      }
    }

    // Initialize relations for the existing records that were created
    // before these relations were defined.
    for (const record of this.#records) {
      initializeRelations(record)
    }

    // Initialize relations for all records created from now on.
    this.hooks.earlyOn('create', (event) => {
      initializeRelations(event.data.record, event.data.initialValues)
    })
  }

  /**
   * Sanitizes the given object so it can be accepted as the input to Standard Schema validation.
   * This removes getters to prevent potentially infinite object references in self-referencing
   * relations. This also drops the internal symbols but gives a function to restore them back.
   */
  #sanitizeInitialValues(initialValues: unknown) {
    const propertiesToRestore: Array<{
      path: Array<string | number | symbol>
      descriptor: PropertyDescriptor
    }> = []

    const sanitize = (
      value: unknown,
      path: Array<string | number | symbol> = [],
    ): unknown => {
      if (Array.isArray(value)) {
        return value.map((value, index) => sanitize(value, path.concat(index)))
      }

      if (isObject(value)) {
        const relations = isRecord(value) ? value[kRelationMap] : undefined

        return Object.fromEntries(
          Reflect.ownKeys(value).map((key) => {
            const childValue = value[key as keyof typeof value]
            const childPath = path.concat(key)

            if (typeof key === 'symbol') {
              /**
               * @note Preserve primary keys on sanitized initial values.
               * Otherwise, internal symbols are stripped off and record references are lost.
               * This is curcial when handling relations for records that were created
               * before the relation was defined.
               */
              if (key === kPrimaryKey) {
                propertiesToRestore.push({
                  path: childPath,
                  descriptor: Object.getOwnPropertyDescriptor(value, key)!,
                })
              }
              return [key, childValue]
            }

            const relation = relations?.get(key)

            if (relation && childValue != null) {
              propertiesToRestore.push({
                path: childPath,
                descriptor: Object.getOwnPropertyDescriptor(value, key)!,
              })
              return [key, relation.getDefaultValue()]
            }

            return [key, sanitize(childValue, childPath)]
          }),
        )
      }

      return value
    }

    const sanitizedInitialValues = sanitize(initialValues)
    return {
      sanitizedInitialValues,
      /**
       * Restores record properties that were stripped off during the sanitization
       * (e.g. relational properties, internal symbols of records given as initial value, etc).
       */
      restoreProperties(record: RecordType): void {
        for (const { path, descriptor } of propertiesToRestore) {
          definePropertyAtPath(record, path, descriptor)
        }
      },
    }
  }

  *#query(
    query: Query<StandardSchemaV1.InferOutput<Schema>>,
    options: PaginationOptions<Schema> = { take: Infinity },
  ): Generator<
    RecordType<StandardSchemaV1.InferOutput<Schema>> | undefined,
    undefined,
    RecordType<StandardSchemaV1.InferOutput<Schema>> | undefined
  > {
    const { take, cursor, skip } = options

    invariant(
      typeof skip !== 'undefined' ? Number.isInteger(skip) && skip >= 0 : true,
      'Failed to query the collection: expected the "skip" pagination option to be a number larger or equal to 0 but got %j',
      skip,
    )

    let taken = 0
    let skipped = 0

    // if (cursor != null) {
    //   const cursorIndex = store.findIndex((record) => {
    //     return record[kPrimaryKey] === cursor[kPrimaryKey]
    //   })

    //   if (cursorIndex === -1) {
    //     return
    //   }

    //   store = store.slice(cursorIndex + 1)
    // }

    const shouldTake = Math.abs(take ?? Infinity)
    const delta = take && take < 0 ? -1 : 1
    let start = delta === 1 ? 0 : this.#records.length - 1
    const end = delta === 1 ? this.#records.length : -1

    if (cursor != null) {
      const cursorIndex = this.#records.findIndex((record) => {
        return record[kPrimaryKey] === cursor[kPrimaryKey]
      })

      if (cursorIndex === -1) {
        return
      }

      start = cursorIndex
    }

    for (let i = start; i !== end; i += delta) {
      const record = this.#records[i]

      if (query.test(record)) {
        if (skip != null) {
          if (skipped < skip) {
            skipped++
            continue
          }
        }

        yield record
        taken++
      }

      if (taken >= shouldTake) {
        break
      }
    }
  }

  /**
   * Returns the index of the given record in this collection.
   * Performs a primary key-based lookup instead of a reference lookup
   * because certain references (like root-level arrays) might become stale
   * after updates, but will retain their primary keys.
   */
  #indexOf(record: RecordType): number {
    return this.#records.findIndex((existingRecord) => {
      return existingRecord[kPrimaryKey] === record[kPrimaryKey]
    })
  }

  /**
   * Replaces the given record with the next version of it.
   */
  #replaceRecord(prevRecord: RecordType, nextRecord: RecordType): void {
    const index = this.#indexOf(prevRecord)

    invariant(
      index !== -1,
      'Failed to replace record "%j" with "%j": previous record not found',
      prevRecord,
      nextRecord,
    )

    this.#records[index] = nextRecord
  }

  /**
   * Deletes the given record from the collection.
   */
  #deleteRecord(record: RecordType): void {
    const index = this.#indexOf(record)

    if (index !== -1) {
      const deleteEvent = new TypedEvent('delete', {
        data: { deletedRecord: record },
      })
      this.hooks.emit(deleteEvent)

      if (!deleteEvent.defaultPrevented) {
        this.#records.splice(index, 1)
      }
    }
  }

  /**
   * Produces the next version of the given record by applying the `data` changes to it.
   * Re-applies the schema to the end record to ensure validity and apply user-defined transforms.
   */
  async #produceRecord(
    prevRecord: RecordType<StandardSchemaV1.InferOutput<Schema>>,
    updateData: UpdateOptions<StandardSchemaV1.InferOutput<Schema>>['data'],
  ): Promise<RecordType<StandardSchemaV1.InferOutput<Schema>>> {
    const logger = this.#logger.extend('produceRecord')
    logger.log('updating the record with options:', prevRecord, updateData)

    /**
     * @note Clone the previous record, preserving the symbols (so it's considered a record)
     * but stripping off relational keys (getters) to preserve the values of foreign records
     * at the moment of update.
     */
    const frozenPrevRecord = cloneWithInternals(
      prevRecord,
      ({ key, descriptor }) => {
        return typeof key === 'symbol' && descriptor.get == null
      },
    )

    invariant(
      isRecord(frozenPrevRecord),
      'Failed to update a record (%j): frozen previous record copy is not a record',
      prevRecord,
    )

    const [maybeNextRecord, patches, inversePatches] = await createDraft(
      prevRecord,
      updateData,
      {
        strict: false,
        enablePatches: true,
      },
    )

    Object.defineProperties(maybeNextRecord, {
      [kPrimaryKey]: {
        value: prevRecord[kPrimaryKey],
        enumerable: false,
        configurable: false,
      },
      [kRelationMap]: {
        value: prevRecord[kRelationMap],
        enumerable: false,
        configurable: false,
      },
    })

    invariant(
      isRecord(maybeNextRecord),
      'Failed to update a record (%j): a record produced by the draft is not a record',
      prevRecord,
    )

    // Route the updates produces by the draft through the hooks
    // so the hooks could reverse some of them.
    const patchesToUndo: Array<Patch> = []

    for (let i = 0; i < patches.length; i++) {
      const patch = patches[i]

      if (!patch) {
        continue
      }

      const updateEvent = new TypedEvent('update', {
        data: {
          prevRecord: frozenPrevRecord,
          nextRecord: maybeNextRecord,
          path: patch.path,
          prevValue: get(prevRecord, patch.path),
          nextValue: patch.value,
        },
      })

      this.hooks.emit(updateEvent)

      if (updateEvent.defaultPrevented) {
        const inversePatch = inversePatches[i]

        invariant(
          inversePatch != null,
          'Failed to update a record (%j): missing inverse patch at index %d',
          prevRecord,
          i,
        )

        patchesToUndo.push(inversePatch)
      }
    }

    const nextRecord =
      patchesToUndo.length > 0
        ? apply(maybeNextRecord, patchesToUndo)
        : maybeNextRecord

    logger.log('re-applying the schema...')
    const { sanitizedInitialValues } = this.#sanitizeInitialValues(nextRecord)
    const validationResult = await this.options.schema['~standard'].validate(
      sanitizedInitialValues,
    )

    if (validationResult.issues) {
      console.error(validationResult.issues)
      throw new InvariantError(
        'Failed to update record (%j): resulting record does not match the schema',
        frozenPrevRecord,
      )
    }

    const finalRecord = validationResult.value as RecordType
    logger.log('schema re-applied!')

    const descriptors = Object.getOwnPropertyDescriptors(prevRecord)
    for (const key of Reflect.ownKeys(descriptors)) {
      const descriptor = descriptors[key as keyof typeof descriptors]
      if (typeof key === 'symbol' || typeof descriptor.get === 'function') {
        Object.defineProperty(finalRecord, key, descriptor)
      }
    }

    return finalRecord
  }

  /**
   * Returns a reproducible collection ID number based on the collection
   * creation order. Collection ID has to be reproducible across runtimes
   * to enable synchronization.
   */
  #generateCollectionId(): number {
    collectionsCreated++
    const seed = 0
    const value = collectionsCreated.toString()

    let h1 = 0xdeadbeef ^ seed,
      h2 = 0x41c6ce57 ^ seed
    for (let i = 0, ch; i < value.length; i++) {
      ch = value.charCodeAt(i)
      h1 = Math.imul(h1 ^ ch, 2654435761)
      h2 = Math.imul(h2 ^ ch, 1597334677)
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)

    return 4294967296 * (2097151 & h2) + (h1 >>> 0)
  }
}
