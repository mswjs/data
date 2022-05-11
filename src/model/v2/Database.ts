import md5 from 'md5'
import { invariant } from 'outvariant'
import { IDENTIFIER, MODEL_NAME } from './contexts/QueryableContext'

let callOrder = 0

export class Database {
  public readonly id: string
  private readonly records: Record<string, Record<string, any>>

  constructor() {
    callOrder++
    this.id = this.generateId()
    this.records = {}
  }

  private generateId(): string {
    const { stack } = new Error()
    const callFrame = stack?.split('\n')[4]
    const salt = `${callOrder}-${callFrame?.trim()}`
    return md5(salt)
  }

  public create(modelName: string, entity: any) {
    invariant(
      entity[MODEL_NAME],
      'Failed to add "%s" to the database: given entity has no model.',
      modelName,
    )

    invariant(
      entity[IDENTIFIER],
      'Failed to add "%s" to the database: given entity has no primary key.',
      modelName,
    )

    const id = entity[entity[IDENTIFIER]]

    this.upsertRecord(modelName, id, entity)
  }

  public has(modelName: string, id: string): boolean {
    return !!this.records[modelName]?.[id]
  }

  private upsertRecord(modelName: string, id: string, record: any): void {
    if (!this.records[modelName]) {
      this.records[modelName] = {}
    }

    this.records[modelName][id] = record
  }
}
