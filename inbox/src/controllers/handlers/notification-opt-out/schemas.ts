import { Schema } from 'ajv'
import { NotificationEntity } from '@notifications/common'

export type CreateNotificationOptOutRequestBody = {
  entity: NotificationEntity
  entityId: string
}

export const CreateNotificationOptOutSchema: Schema = {
  type: 'object',
  required: ['entity', 'entityId'],
  additionalProperties: false,
  properties: {
    entity: {
      type: 'string',
      enum: Object.values(NotificationEntity)
    },
    entityId: {
      type: 'string',
      minLength: 1
    }
  }
}
