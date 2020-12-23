import { QuerySelector } from '../query/queryTypes'

class EntityNotFound<
  ModelName extends string,
  Query extends QuerySelector<any>
> extends Error {
  constructor(
    method: string,
    modelName: ModelName,
    multipleEntities: boolean,
    query: Query,
  ) {
    super(
      `Failed to execute "${method}" on the "${modelName}" model: no ${
        multipleEntities ? 'entities' : 'entity'
      } found matching the query "${JSON.stringify(query.which)}".`,
    )
  }
}

export default EntityNotFound
