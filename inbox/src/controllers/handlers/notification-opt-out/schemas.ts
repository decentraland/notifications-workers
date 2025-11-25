import { Schema } from 'ajv'
import { NotificationType } from '@dcl/schemas'

export type MetadataKey = 'id' | 'communityId'

export type CreateNotificationOptOutRequestBody = {
  metadataKey: MetadataKey
  metadataValue: string
  notificationTypes: string[]
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
  required: ['metadataKey', 'metadataValue', 'notificationTypes'],
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
      type: 'array',
      items: {
        type: 'string',
        enum: COMMUNITY_NOTIFICATION_TYPES
      },
      minItems: 1,
      uniqueItems: true
    }
  }
}
