import { debug } from 'debug'
import set from 'lodash/set'
import get from 'lodash/get'
import { invariant } from 'outvariant'
import { Database } from '../db/Database'
import {
  Entity,
  InternalEntity,
  InternalEntityProperty,
  KeyType,
  ModelDictionary,
  PrimaryKeyType,
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
  propertyPath: string
}

export interface RelationDefinition<
  Kind extends RelationKind,
  ModelName extends KeyType,
> {
  to: ModelName
  kind: Kind
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
) => Relation<Kind, ModelName, Dictionary>

export type OneOf<ModelName extends KeyType> = Relation<
  RelationKind.OneOf,
  ModelName,
  any
>
export type ManyOf<ModelName extends KeyType> = Relation<
  RelationKind.ManyOf,
  ModelName,
  any
>

export type RelationsMap = Record<string, Relation<any, any, any>>

const DEFAULT_RELATION_ATTRIBUTES: RelationAttributes = {
  unique: false,
}

export class Relation<
  Kind extends RelationKind,
  ModelName extends KeyType,
  Dictionary extends ModelDictionary,
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

  private ready: boolean = false
  private dictionary: Dictionary = null as any
  private db: Database<Dictionary> = null as any

  constructor(definition: RelationDefinition<Kind, ModelName>) {
    log(
      'constructing a "%s" relation to "%s" with attributes: %o',
      definition.kind,
      definition.to,
      definition.attributes,
    )

    this.kind = definition.kind
    this.attributes = {
      ...DEFAULT_RELATION_ATTRIBUTES,
      ...(definition.attributes || {}),
    }
    this.target = {
      modelName: definition.to.toString(),
      primaryKey: null as any,
    }
  }

  public apply(
    entity: Entity<any, any>,
    propertyPath: string,
    refs: ReferenceType,
    dictionary: Dictionary,
    db: Database<Dictionary>,
  ) {
    this.dictionary = dictionary
    this.db = db

    const sourceModelName = entity[InternalEntityProperty.type]
    const sourcePrimaryKey = entity[InternalEntityProperty.primaryKey]

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

    this.ready = true
    this.resolveWith(entity, refs)
  }

  public resolveWith(entity: Entity<any, any>, refs: ReferenceType): void {
    log(
      'resolving a "%s" relational property to "%s" on "%s.%s"',
      this.kind,
      this.target.modelName,
      this.source.modelName,
      this.source.propertyPath,
    )
    log('entity of this relation:', entity)

    invariant(
      this.ready,
      'Failed to define a "%s" relation to "%s" on "%s": relation is not applied to a dictionary.',
      this.kind,
      this.source.propertyPath,
      this.source.modelName,
    )

    const referencesList = ([] as Value<any, any>[]).concat(refs)
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

      const extraneousEntities = executeQuery(
        this.source.modelName,
        this.source.primaryKey,
        {
          where: set<QuerySelectorWhere<any>>(
            {
              // [this.source.primaryKey]: {
              //   notEquals: this.source.entity[this.source.primaryKey],
              // },
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
      // Mark the property as enumerable so it gets listed when listing
      // this entity's properties.
      enumerable: true,
      // Mark the property as configurable so it could be re-defined
      // when updating it during the entity update ("update"/"updateMany").
      configurable: true,
      get: () => {
        log(
          'GET "%s.%s"',
          this.source.modelName,
          this.source.propertyPath,
          this,
        )

        const queryResult = referencesList.reduce<InternalEntity<any, any>[]>(
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
          'resolved "%s" relation at "%s.%s" to:',
          this.kind,
          this.source.modelName,
          this.source.propertyPath,
          queryResult,
        )

        return this.kind === RelationKind.OneOf
          ? first(queryResult)
          : queryResult
      },
    })
  }
}
