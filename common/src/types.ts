import { Subscription } from '@dcl/schemas'

export type ISendGridClient = {
  sendEmail: (email: Email) => Promise<void>
}

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

export type Email = {
  from?: string
  to: string
  subject: string
  content: string
  actionButtonLink?: string
  actionButtonText?: string
  attachments?: {
    content: string
    filename: string
    type: string
    disposition: string
  }[]
}
