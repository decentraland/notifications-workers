import { Schema } from 'ajv'
import { NotificationEntityType } from '@notifications/common'

export type CreateNotificationOptOutRequestBody = {
  entity: NotificationEntityType
  entityId: string
}

export const CreateNotificationOptOutSchema: Schema = {
  type: 'object',
  required: ['entity', 'entityId'],
  additionalProperties: false,
  properties: {
    entity: {
      type: 'string',
      enum: Object.values(NotificationEntityType)
    },
    entityId: {
      type: 'string',
      minLength: 1
    }
  }
}
