import { Database } from '../Database'
import { IdentifierAttributes } from '../attributes/id'
import { Model, ModelProduceArgs } from '../Model'
import { EntityContext } from './EntityContext'

export const MODEL_NAME = Symbol('modelName')
export const IDENTIFIER = Symbol('identifier')

interface QueryableContextInput {
  modelName: string
  db: Database
}

export class QueryableContext extends EntityContext {
  public readonly modelName: string
  public readonly db: Database

  constructor(input: QueryableContextInput) {
    super()
    this.modelName = input.modelName
    this.db = input.db
  }

  public onEntityCreated(
    entity: any,
    input: ModelProduceArgs<any>,
    model: Model,
  ) {
    const idToken = model.tokens.find(
      (token) => token.attributes instanceof IdentifierAttributes,
    )

    // Assign entity meta data used for querying.
    const queryableEntity = Object.assign({}, entity, {
      [MODEL_NAME]: this.modelName,
      [IDENTIFIER]: idToken?.location[0],
    })

    // Store the created entity in the database.
    this.db.create(this.modelName, queryableEntity)
  }
}
