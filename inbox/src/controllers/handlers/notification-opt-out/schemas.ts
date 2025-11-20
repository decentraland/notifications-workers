import { Schema } from 'ajv'

// TypeScript types derived from schemas
export type CreateNotificationOptOutRequestBody = {
  metadataKey: string
  metadataValue: string
  notificationTypes?: string[] | null
}

export type UpdateNotificationOptOutRequestBody = {
  notificationTypes?: string[] | null
}

// AJV Schemas
export const CreateNotificationOptOutSchema: Schema = {
  type: 'object',
  required: ['metadataKey', 'metadataValue'],
  additionalProperties: false,
  properties: {
    metadataKey: {
      type: 'string',
      minLength: 1
    },
    metadataValue: {
      type: 'string',
      minLength: 1
    },
    notificationTypes: {
      oneOf: [
        { type: 'null' },
        {
          type: 'array',
          items: {
            type: 'string',
            minLength: 1
          }
        }
      ]
    }
  }
}

export const UpdateNotificationOptOutSchema: Schema = {
  type: 'object',
  required: [],
  additionalProperties: false,
  properties: {
    notificationTypes: {
      oneOf: [
        { type: 'null' },
        {
          type: 'array',
          items: {
            type: 'string',
            minLength: 1
          }
        }
      ]
    }
  }
}
