import { NotificationType, Subscription } from '@dcl/schemas'

export type NotificationDb = {
  id: string
  event_key: string
  type: string
  address?: string
  metadata: any
  timestamp: number
  read_at?: number
  created_at: number
  updated_at: number
  broadcast_address?: string
  broadcast_read_at?: number
}

export type UnconfirmedEmailDb = {
  address: string
  email: string
  code: string
  created_at: number
  updated_at: number
}

export type NotificationOptOutDb = {
  address: string
  scope: NotificationScope
  scope_id: string
  created_at: number
  updated_at: number
}

export type NotificationEvent = {
  id: string
  type: string
  address: string
  metadata: any
  timestamp: number
  read: boolean
}

export type SubscriptionDb = Subscription & {
  created_at: number
  updated_at: number
}

export enum NotificationScope {
  Community = 'community'
}

export type NotificationOptOutScope = {
  scopeId: string // e.g. community id when scope is community
  scope: NotificationScope
}

export type NotificationRecord = {
  id?: string
  eventKey: string
  type: NotificationType
  address: string
  metadata: any
  timestamp: number
  optOutScope?: NotificationOptOutScope
}

export type Email = {
  from?: string
  to: string
  subject: string
  content: string
  userName?: string
  actionButtonLink?: string
  actionButtonText?: string
  title?: string
  titleHighlight?: string
  bannerUrl?: string
  bannerLabel?: string
  unsubscribeAllUrl?: string
  unsubscribeOneUrl?: string
  attachments?: {
    content: string
    filename: string
    type: string
    disposition: string
  }[]
  accountLink?: string
}

type NotificationTypeUnion = keyof typeof NotificationType

const excludedNotificationTypes = [
  NotificationType.BADGE_GRANTED,
  NotificationType.GOVERNANCE_CLIFF_ENDED,
  NotificationType.GOVERNANCE_WHALE_VOTE,
  NotificationType.GOVERNANCE_VOTED_ON_BEHALF,
  NotificationType.REWARD_CAMPAIGN_GAS_PRICE_HIGHER_THAN_EXPECTED,
  NotificationType.REWARD_DELAYED,
  NotificationType.REWARD_IN_PROGRESS,
  NotificationType.ITEM_PUBLISHED,
  NotificationType.SOCIAL_SERVICE_FRIENDSHIP_REQUEST,
  NotificationType.SOCIAL_SERVICE_FRIENDSHIP_ACCEPTED,
  NotificationType.CREDITS_GOAL_COMPLETED,
  NotificationType.CREDITS_NEW_SEASON_REMINDER,
  NotificationType.TRANSFER_RECEIVED,
  NotificationType.COMMUNITY_DELETED,
  NotificationType.COMMUNITY_DELETED_CONTENT_VIOLATION,
  NotificationType.COMMUNITY_RENAMED,
  NotificationType.COMMUNITY_MEMBER_BANNED,
  NotificationType.COMMUNITY_MEMBER_REMOVED,
  NotificationType.EVENT_CREATED,
  NotificationType.COMMUNITY_REQUEST_TO_JOIN_ACCEPTED,
  NotificationType.COMMUNITY_REQUEST_TO_JOIN_RECEIVED,
  NotificationType.COMMUNITY_INVITE_RECEIVED,
  NotificationType.COMMUNITY_POST_ADDED,
  NotificationType.COMMUNITY_OWNERSHIP_TRANSFERRED,
  NotificationType.COMMUNITY_VOICE_CHAT_STARTED,
  NotificationType.USER_BANNED_FROM_SCENE,
  NotificationType.USER_UNBANNED_FROM_SCENE,
  NotificationType.CREDITS_NEW_SEASON_REMINDER,
  NotificationType.TRANSFER_RECEIVED
].map((type) => type.toUpperCase())

type ExcludedNotificationType = (typeof excludedNotificationTypes)[number]
export type EmailableNotificationTypes = Exclude<NotificationTypeUnion, ExcludedNotificationType>

const emailableNotificationTypeEntries = Object.entries(NotificationType)
  .filter(([key]) => !excludedNotificationTypes.includes(key as ExcludedNotificationType))
  .map(([key, value]) => [key, value] as const)

const EmailableNotificationType = Object.fromEntries(emailableNotificationTypeEntries) as {
  [K in EmailableNotificationTypes]: (typeof NotificationType)[K]
}

export const EmailableNotificationTypeEnum = EmailableNotificationType as any as {
  [key in EmailableNotificationTypes]: `${(typeof EmailableNotificationType)[key]}`
}
