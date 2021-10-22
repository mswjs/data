import { debug } from 'debug'
import set from 'lodash/set'
import get from 'lodash/get'
import { invariant } from 'outvariant'
import { Database } from '../db/Database'
import {
  Entity,
  ENTITY_TYPE,
  KeyType,
  ModelDictionary,
  PrimaryKeyType,
  PRIMARY_KEY,
  Value,
} from '../glossary'
import { executeQuery } from '../query/executeQuery'
import { QuerySelectorWhere } from '../query/queryTypes'
import { definePropertyAtPath } from '../utils/definePropertyAtPath'
import { findPrimaryKey } from '../utils/findPrimaryKey'
import { first } from '../utils/first'

const log = debug('relation')

export enum RelationKind {
  OneOf = 'ONE_OF',
  ManyOf = 'MANY_OF',
}

export interface RelationAttributes {
  unique: boolean
}

export interface RelationSource {
  modelName: string
  primaryKey: PrimaryKeyType
  propertyPath: string[]
}

export interface RelationDefinition<
  Kind extends RelationKind,
  ModelName extends KeyType,
  Nullable extends boolean,
> {
  to: ModelName
  kind: Kind
  nullable?: Nullable
  attributes?: Partial<RelationAttributes>
}

export type LazyRelation<
  Kind extends RelationKind,
  ModelName extends KeyType,
  Dictionary extends ModelDictionary,
> = (
  modelName: ModelName,
  propertyPath: string,
  dictionary: Dictionary,
  db: Database<Dictionary>,
) => Relation<Kind, ModelName, Dictionary, any>

export type OneOf<
  ModelName extends KeyType,
  Nullable extends boolean = false,
> = Relation<RelationKind.OneOf, ModelName, any, Nullable>

export type ManyOf<
  ModelName extends KeyType,
  Nullable extends boolean = false,
> = Relation<RelationKind.ManyOf, ModelName, any, Nullable>

export type RelationsList = Array<{
  propertyPath: string[]
  relation: Relation<any, any, any, any>
}>

const DEFAULT_RELATION_ATTRIBUTES: RelationAttributes = {
  unique: false,
}

export class Relation<
  Kind extends RelationKind,
  ModelName extends KeyType,
  Dictionary extends ModelDictionary,
  Nullable extends boolean,
  ReferenceType = Kind extends RelationKind.OneOf
    ? Value<Dictionary[ModelName], Dictionary>
    : Value<Dictionary[ModelName], Dictionary>[],
> {
  public kind: Kind
  public attributes: RelationAttributes
  public source: RelationSource = null as any
  public target: {
    modelName: string
    primaryKey: PrimaryKeyType
  }

  // These readonly properties should never be changed to avoid errors
  readonly nullable?: Nullable

  // These lazy properties are set after calling the ".apply()" method.
  private dictionary: Dictionary = null as any
  private db: Database<Dictionary> = null as any

  constructor(definition: RelationDefinition<Kind, ModelName, Nullable>) {
    this.kind = definition.kind
    this.attributes = {
      ...DEFAULT_RELATION_ATTRIBUTES,
      ...(definition.attributes || {}),
    }
    this.target = {
      modelName: definition.to.toString(),
      primaryKey: null as any,
    }
    this.nullable = definition.nullable

    log(
      'constructing a "%s" relation to "%s" with attributes: %o',
      this.kind,
      definition.to,
      this.attributes,
    )
  }

  /**
   * Applies the relation to the given entity.
   * Creates a connection between the relation's target and source.
   * Does not define the proxy property getter.
   */
  public apply(
    entity: Entity<any, any>,
    propertyPath: string[],
    dictionary: Dictionary,
    db: Database<Dictionary>,
  ) {
    this.dictionary = dictionary
    this.db = db

    const sourceModelName = entity[ENTITY_TYPE]
    const sourcePrimaryKey = entity[PRIMARY_KEY]

    this.source = {
      modelName: sourceModelName,
      propertyPath,
      primaryKey: sourcePrimaryKey,
    }

    // Get the referenced model's primary key name.
    const targetPrimaryKey = findPrimaryKey(
      this.dictionary[this.target.modelName],
    )

    invariant(
      targetPrimaryKey,
      'Failed to create a "%s" relation to "%s": referenced model does not exist or has no primary key.',
      this.kind,
      this.target.modelName,
    )
    this.target.primaryKey = targetPrimaryKey
  }

  /**
   * Updates the relation references (values) to resolve the relation with.
   */
  public resolveWith(
    entity: Entity<Dictionary, string>,
    refs: ReferenceType | null,
  ): void {
    invariant(
      this.source,
      'Failed to resolve a "%s" relational property to "%s": relation has not been applied.',
      this.kind,
      this.target.modelName,
    )

    log(
      'resolving a "%s" relational property to "%s" on "%s.%s" ("%s")',
      this.kind,
      this.target.modelName,
      this.source.modelName,
      this.source.propertyPath,
      entity[this.source.primaryKey],
    )
    log('entity of this relation:', entity)

    if (refs === null) {
      invariant(
        this.nullable,
        'Failed to resolve a "%s" relational property to "%s": only nullable relations can resolve with null. Use the "nullable" function when defining your relation',
        this.kind,
        this.target.modelName,
      )
      log('this relation resolves with null')

      return definePropertyAtPath(entity, this.source.propertyPath, {
        // Mark the property as enumerable so it gets listed
        // like a regular property on the entity.
        enumerable: true,
        // Mark the property as configurable so it could be re-defined
        // when updating it during the entity update ("update"/"updateMany").
        configurable: true,
        get: () => {
          log(
            'GET "%s.%s" on "%s" ("%s")',
            this.source.modelName,
            this.source.propertyPath,
            this.source.modelName,
            entity[this.source.primaryKey],
            this,
          )

          log(
            'resolved "%s" relation at "%s.%s" ("%s") to null',
            this.kind,
            this.source.modelName,
            this.source.propertyPath,
            entity[this.source.primaryKey],
          )

          return null
        },
      })
    }

    invariant(
      this.target.primaryKey,
      'Failed to define a "%s" relation to "%s" on "%s": referenced target model has no primary key set.',
      this.kind,
      this.source.propertyPath,
      this.source.modelName,
    )

    const referencesList = ([] as Value<any, Dictionary>[]).concat(refs)
    const records = this.db.getModel(this.target.modelName)

    log('records in the referenced model', records.keys())

    // Ensure all given next references exist in the database.
    // This guards against assigning a compatible plain object
    // as the relational property value.
    referencesList.forEach((entity) => {
      const entityId = entity[this.target.primaryKey]
      invariant(
        records.has(entityId),
        'Failed to define a relational property "%s" on "%s": referenced entity "%s" ("%s") does not exist.',
        this.source.propertyPath,
        this.source.modelName,
        entityId,
        this.target.primaryKey,
      )
    })

    // Ensure that unique relations don't reference
    // entities that are already referenced by other entities.
    if (this.attributes.unique) {
      log(
        'validating a unique "%s" relation to "%s" on "%s.%s"...',
        this.kind,
        this.target.modelName,
        this.source.modelName,
        this.source.propertyPath,
      )

      // Get the list of entities of the same entity type
      // that reference the same relational values.
      const extraneousEntities = executeQuery(
        this.source.modelName,
        this.source.primaryKey,
        {
          where: set<QuerySelectorWhere<any>>(
            {
              // Omit the current entity when querying
              // the list of other entities that reference
              // the same value.
              [this.source.primaryKey]: {
                notEquals: entity[this.source.primaryKey],
              },
            },
            this.source.propertyPath,
            {
              [this.target.primaryKey]: {
                in: referencesList.map((entity) => {
                  return entity[this.target.primaryKey]
                }),
              },
            },
          ),
        },
        this.db,
      )

      log(
        'found other %s referencing the same %s:',
        this.source.modelName,
        this.target.modelName,
        extraneousEntities,
      )

      if (extraneousEntities.length > 0) {
        const extraneousReferences = extraneousEntities.flatMap(
          (extraneous) => {
            const references = ([] as Entity<any, any>[]).concat(
              get(extraneous, this.source.propertyPath),
            )
            return references.map<PrimaryKeyType[]>(
              (entity) => entity[this.target.primaryKey],
            )
          },
        )

        const firstInvalidReference = referencesList.find((entity) => {
          return extraneousReferences.includes(entity[this.target.primaryKey])
        })

        invariant(
          false,
          'Failed to create a unique "%s" relation to "%s" ("%s.%s") for "%s": referenced %s "%s" belongs to another %s ("%s").',
          this.kind,
          this.target.modelName,
          this.source.modelName,
          this.source.propertyPath,
          entity[this.source.primaryKey],
          this.target.modelName,
          firstInvalidReference?.[this.target.primaryKey],
          this.source.modelName,
          extraneousEntities[0]?.[this.source.primaryKey],
        )
      }
    }

    definePropertyAtPath(entity, this.source.propertyPath, {
      // Mark the property as enumerable so it gets listed
      // like a regular property on the entity.
      enumerable: true,
      // Mark the property as configurable so it could be re-defined
      // when updating it during the entity update ("update"/"updateMany").
      configurable: true,
      get: () => {
        log(
          'GET "%s.%s" on "%s" ("%s")',
          this.source.modelName,
          this.source.propertyPath,
          this.source.modelName,
          entity[this.source.primaryKey],
          this,
        )
        log('GET using referenced values', referencesList)

        const queryResult = referencesList.reduce<Entity<any, any>[]>(
          (result, ref) => {
            return result.concat(
              executeQuery(
                this.target.modelName,
                this.target.primaryKey,
                {
                  where: {
                    [this.target.primaryKey]: {
                      equals: ref[this.target.primaryKey],
                    },
                  },
                },
                this.db,
              ),
            )
          },
          [],
        )

        log(
          'resolved "%s" relation at "%s.%s" ("%s") to:',
          this.kind,
          this.source.modelName,
          this.source.propertyPath,
          entity[this.source.primaryKey],
          queryResult,
        )

        return this.kind === RelationKind.OneOf
          ? first(queryResult)
          : queryResult
      },
    })
  }
}
