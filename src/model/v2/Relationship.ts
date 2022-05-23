import { invariant } from 'outvariant'
import set from 'lodash/set'
import { definePropertyAtPath } from '../../utils/definePropertyAtPath'
import {
  IDENTIFIER,
  MODEL_NAME,
  QueryableContext,
} from './contexts/QueryableContext'
import { TokenAttributes, TokenSetPayload } from './Token'
import { theIdToken } from './attributes/id'

export enum RelationshipKind {
  OneOf = 'ONE_OF',
  ManyOf = 'MANY_OF',
}

export interface RelationshipModifiers {
  unique: boolean
}

export const DEFAULT_RELATIONSHIP_MODIFIERS: RelationshipModifiers = {
  unique: false,
}

export class RelationshipAttributes extends TokenAttributes<any> {
  public readonly modifiers: RelationshipModifiers

  constructor(
    public readonly kind: RelationshipKind,
    public readonly targetModelName: string,
    modifiers?: RelationshipModifiers,
  ) {
    // Relationships without a value are never set.
    super(() => undefined)

    this.modifiers = {
      ...DEFAULT_RELATIONSHIP_MODIFIERS,
      ...(modifiers || {}),
    }
  }

  public shouldProduceValue({
    model,
    token,
    entity,
    context,
    value,
  }: TokenSetPayload<any, QueryableContext>) {
    invariant(
      context != null,
      'Failed to set a "%s" relationship at "%s": missing context.',
      this.kind,
      token.pointer,
    )

    invariant(
      context instanceof QueryableContext,
      'Failed to set a "%s" relationship at "%s": provided context is not an instance of QueryableContext.',
      this.kind,
      token.pointer,
    )

    if (!value) {
      return false
    }

    const idToken = model.tokens.find(theIdToken)!
    const source = {
      id: idToken.location[0],
      modelName: context.modelName,
    }

    const target = {
      modelName: value[MODEL_NAME],
      id: value[IDENTIFIER],
    }

    invariant(
      target.modelName === this.targetModelName,
      'Cannot reference extraneous model "%s".',
      target.modelName,
    )

    if (this.modifiers.unique) {
      const existingRecords = context.db.query(source.modelName, source.id, {
        where: set(
          {
            // Exclude the current record from the duplicates query.
            [source.id]: {
              notEquals: entity[source.id],
            },
          },
          token.location,
          {
            [target.id]: {
              in: [value[target.id]],
            },
          },
        ),
      })

      invariant(
        existingRecords.length === 0,
        'Failed to set a "%s" relationship at "%s.%s": the referenced "%s" belongs to another "%s" (%s: "%s").',
        this.kind,
        source.modelName,
        token.pointer,
        target.modelName,
        source.modelName,
        existingRecords[0]?.[IDENTIFIER],
        existingRecords[0]?.[source.id],
      )
    }

    definePropertyAtPath(entity, token.location, {
      enumerable: true,
      configurable: false,
      get() {
        return context.db.get(target.modelName, value[target.id])
      },
    })

    // Prevent the default property assignment.
    // Relationships are assigned via getters.
    return false
  }
}
