import type { Model, ModelProduceArgs } from '../Model'

export abstract class EntityContext {
  public onEntityCreated(
    entity: any,
    input: ModelProduceArgs<any>,
    model: Model,
  ) {}
}
