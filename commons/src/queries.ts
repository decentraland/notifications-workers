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
