import { Subscription } from '@dcl/schemas'

export type NotificationEvent = {
  id: string
  type: string
  address: string
  metadata: any
  timestamp: number
  read: boolean
}

export type SubscriptionDB = Subscription & {
  created_at: number
  updated_at: number
}
