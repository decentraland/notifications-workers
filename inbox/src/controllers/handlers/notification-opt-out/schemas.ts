import { Schema } from 'ajv'
import { NotificationScope } from '@notifications/common'

export type CreateNotificationOptOutRequestBody = {
  scope: NotificationScope
  scopeId: string
}

export const CreateNotificationOptOutSchema: Schema = {
  type: 'object',
  required: ['scope', 'scopeId'],
  additionalProperties: false,
  properties: {
    scope: {
      type: 'string',
      enum: Object.values(NotificationScope)
    },
    scopeId: {
      type: 'string',
      minLength: 1
    }
  }
}
