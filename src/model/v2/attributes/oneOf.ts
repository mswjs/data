import {
  RelationshipAttributes,
  RelationshipKind,
  RelationshipModifiers,
} from '../Relationship'

export function oneOf(modelName: string, modifiers?: RelationshipModifiers) {
  return new RelationshipAttributes(
    RelationshipKind.OneOf,
    modelName,
    modifiers,
  )
}
