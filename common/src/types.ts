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

export type NotificationRecord = {
  id?: string
  eventKey: string
  type: NotificationType
  address: string
  metadata: any
  timestamp: number
}

export type Email = {
  from?: string
  to: string
  subject: string
  content: string
  actionButtonLink?: string
  actionButtonText?: string
  unsubscribeAllUrl?: string
  unsubscribeOneUrl?: string
  attachments?: {
    content: string
    filename: string
    type: string
    disposition: string
  }[]
}

type NotificationTypeUnion = keyof typeof NotificationType
type ExcludedNotificationType = 'BADGE_GRANTED' | 'REWARD_IN_PROGRESS'
type EmailableNotificationTypes = Exclude<NotificationTypeUnion, ExcludedNotificationType>

const emailableNotificationTypeEntries = Object.entries(NotificationType)
  .filter(([key]) => key !== 'BADGE_GRANTED' && key !== 'REWARD_IN_PROGRESS')
  .map(([key, value]) => [key, value] as const)

const EmailableNotificationType = Object.fromEntries(emailableNotificationTypeEntries) as {
  [K in EmailableNotificationTypes]: (typeof NotificationType)[K]
}

export const EmailableNotificationTypeEnum = EmailableNotificationType as any as {
  [key in EmailableNotificationTypes]: `${(typeof EmailableNotificationType)[key]}`
}
