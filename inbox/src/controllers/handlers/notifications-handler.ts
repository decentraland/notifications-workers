import { HandlerContextWithPath } from '../../types'
import { NotificationDb } from '@notifications/common'

export async function notificationsHandler(
  context: Pick<HandlerContextWithPath<'db' | 'logs', '/notifications'>, 'url' | 'components' | 'verification'>
) {
  const { db } = context.components
  const searchParams = context.url.searchParams
  const from = parseInt(searchParams.get('from') || '0', 10) || 0
  const onlyUnread = searchParams.has('onlyUnread')
  const limitParam = parseInt(searchParams.get('limit') || '20', 10)
  const limit = !!limitParam && limitParam > 0 && limitParam <= 50 ? limitParam : 20

  const userId = context.verification!.auth.toLowerCase()

  const notifications = await db.findNotifications([userId], onlyUnread, from, limit)
  const slimNotifications = notifications.map((notification: NotificationDb) => ({
    id: notification.id,
    type: notification.type,
    address: notification.address,
    metadata: notification.metadata,
    timestamp: notification.timestamp,
    read: !!notification.read_at || !!notification.broadcast_read_at
  }))

  return {
    body: { notifications: slimNotifications }
  }
}
