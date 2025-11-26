import { NotificationEntity } from './types'
import { NotificationType } from '@dcl/schemas'

export type EntityMetadataConfig = {
  metadataKeys: string[]
  notificationTypes: NotificationType[]
}

export const ENTITY_METADATA_CONFIGS: Record<NotificationEntity, EntityMetadataConfig> = {
  [NotificationEntity.Community]: {
    metadataKeys: ['communityId', 'id'],
    notificationTypes: [
      NotificationType.COMMUNITY_DELETED,
      NotificationType.COMMUNITY_DELETED_CONTENT_VIOLATION,
      NotificationType.COMMUNITY_RENAMED,
      NotificationType.COMMUNITY_MEMBER_BANNED,
      NotificationType.COMMUNITY_MEMBER_REMOVED,
      NotificationType.COMMUNITY_REQUEST_TO_JOIN_RECEIVED,
      NotificationType.COMMUNITY_REQUEST_TO_JOIN_ACCEPTED,
      NotificationType.COMMUNITY_INVITE_RECEIVED,
      NotificationType.COMMUNITY_OWNERSHIP_TRANSFERRED,
      NotificationType.COMMUNITY_POST_ADDED,
      NotificationType.EVENT_CREATED,
      NotificationType.EVENTS_STARTED
    ]
  }
}
