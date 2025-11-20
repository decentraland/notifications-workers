import { Schema } from 'ajv'
import { NotificationType } from '@dcl/schemas'

export type MetadataKey = 'id' | 'communityId'

export type CreateNotificationOptOutRequestBody = {
  metadataKey: MetadataKey
  metadataValue: string
  notificationTypes?: string[] | null
}

export type UpdateNotificationOptOutRequestBody = {
  notificationTypes?: string[] | null
}

const COMMUNITY_NOTIFICATION_TYPES = [
  NotificationType.COMMUNITY_DELETED,
  NotificationType.COMMUNITY_DELETED_CONTENT_VIOLATION,
  NotificationType.COMMUNITY_RENAMED,
  NotificationType.COMMUNITY_MEMBER_BANNED,
  NotificationType.COMMUNITY_MEMBER_REMOVED,
  NotificationType.COMMUNITY_REQUEST_TO_JOIN_RECEIVED,
  NotificationType.COMMUNITY_REQUEST_TO_JOIN_ACCEPTED,
  NotificationType.COMMUNITY_INVITE_RECEIVED,
  NotificationType.COMMUNITY_OWNERSHIP_TRANSFERRED,
  NotificationType.COMMUNITY_POST_ADDED
]

export const CreateNotificationOptOutSchema: Schema = {
  type: 'object',
  required: ['metadataKey', 'metadataValue'],
  additionalProperties: false,
  properties: {
    metadataKey: {
      type: 'string',
      enum: ['id', 'communityId']
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
            enum: COMMUNITY_NOTIFICATION_TYPES
          },
          minItems: 1
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
            enum: COMMUNITY_NOTIFICATION_TYPES
          },
          minItems: 1
        }
      ]
    }
  }
}
