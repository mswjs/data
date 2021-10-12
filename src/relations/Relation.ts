import { debug } from 'debug'
import { invariant } from 'outvariant'
import { KeyType, ModelDictionary, PrimaryKeyType } from '../glossary'
import { findPrimaryKey } from '../utils/findPrimaryKey'

const log = debug('relation')

export enum RelationKind {
  OneOf = 'ONE_OF',
  ManyOf = 'MANY_OF',
}

export type OneOf<ModelName extends KeyType> = Relation<
  RelationKind.OneOf,
  ModelName
>
export type ManyOf<ModelName extends KeyType> = Relation<
  RelationKind.ManyOf,
  ModelName
>

/**
 * Public options objects specified by the developer.
 * @example
 * oneOf('country', { unique: true })
 */
export interface RelationOptions {
  unique: boolean
}

interface RelationDefinitionOptions<
  Kind extends RelationKind,
  ModelName extends KeyType,
> {
  to: ModelName
  kind: Kind
  unique?: boolean
}

export interface ProducedRelation {
  kind: RelationKind
  modelName: string
  unique: boolean
  primaryKey: PrimaryKeyType
}

export type ProducedRelationsMap = Record<string, ProducedRelation>

export class Relation<Kind extends RelationKind, ModelName extends KeyType> {
  public kind: Kind
  public modelName: ModelName
  public unique: boolean

  constructor(definition: RelationDefinitionOptions<Kind, ModelName>) {
    this.modelName = definition.to
    this.kind = definition.kind
    this.unique = !!definition.unique

    log(
      'created a %s relation to "%s": %o',
      this.kind,
      this.modelName,
      definition,
    )
  }

  /**
   * Produces the relation against a given dictionary.
   * This looks up the primary key name of the referenced model
   * in the dictionary and returns a formed relation object.
   */
  public produce(dictionary: ModelDictionary): ProducedRelation {
    log(
      'producing the "%s" relation in the dictionary: %s',
      this.modelName,
      dictionary,
    )

    const primaryKey = findPrimaryKey(dictionary[this.modelName])
    log(
      'primary key for the "%s" model in the dictionary:',
      this.modelName,
      primaryKey,
    )

    invariant(
      primaryKey,
      'Failed to resolve a "%s" relation to "%s": referenced model does not exist or has no primary key.',
      this.kind,
      this.modelName,
    )

    return {
      kind: this.kind,
      modelName: this.modelName.toString(),
      unique: this.unique,
      primaryKey,
    }
  }
}
