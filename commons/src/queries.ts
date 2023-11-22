export type Language = 'en' | 'es' | 'zh'

export type LocalizedNotification = { title: string; description: string }

export type NotificationRecord = {
  type: string
  address: string
  metadata: any
  i18n: Record<Language, LocalizedNotification>
}

/// DB entities

export type NotificationEvent = {
  notification_id: string
  origin_id: string
  type: string
  source: string
  metadata: any
  timestamp: number
  read: boolean
  created_at: number
  updated_at: number
  address: string
}
