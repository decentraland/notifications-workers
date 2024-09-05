import { NotificationType } from '@dcl/schemas'
import { HandlerContextWithPath } from '../../types'
import { NotificationDb } from '@notifications/common'

const EXCLUDED_NOTIFICATIONS_ON_DAPPS = [NotificationType.BADGE_GRANTED]

export async function notificationsHandler(
  context: Pick<
    HandlerContextWithPath<'db' | 'logs', '/notifications'>,
    'url' | 'request' | 'components' | 'verification'
  >
) {
  const { db } = context.components
  const searchParams = context.url.searchParams
  const from = parseInt(searchParams.get('from') || '0', 10) || 0
  const onlyUnread = searchParams.has('onlyUnread')
  const limitParam = parseInt(searchParams.get('limit') || '20', 10)
  const limit = !!limitParam && limitParam > 0 && limitParam <= 50 ? limitParam : 20
  const isCallFromExplorer: boolean = context.request.headers.get('Origin') === 'explorer'

  const userId = context.verification!.auth.toLowerCase()

  const notifications = await db.findNotifications([userId], onlyUnread, from, limit)
  let slimNotifications = notifications.map((notification: NotificationDb) => ({
    id: notification.id,
    type: notification.type,
    address: notification.address,
    metadata: notification.metadata,
    timestamp: notification.timestamp,
    read: !!notification.read_at || !!notification.broadcast_read_at
  }))

  if (!isCallFromExplorer) {
    slimNotifications = slimNotifications.filter(
      (notification) => !EXCLUDED_NOTIFICATIONS_ON_DAPPS.includes(notification.type as NotificationType)
    )
  }

  return {
    body: { notifications: slimNotifications }
  }
}
