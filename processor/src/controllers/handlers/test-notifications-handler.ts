import { HandlerContextWithPath } from '../../types'
import { InvalidRequestError } from '@dcl/platform-server-commons'
import { NotificationDb, NotificationRecord } from '@notifications/common'
import { NotificationType } from '@dcl/schemas'

export async function testRandomNotificationsHandler(
  context: Pick<HandlerContextWithPath<'pg' | 'logs' | 'emailRenderer', '/test-notifications'>, 'components' | 'url'>
) {
  const {
    url,
    components: { pg, logs }
  } = context

  const logger = logs.getLogger('test-random-notifications-handler')
  logger.info('Rendering list of notifications available for preview')

  const result = await pg.query<NotificationDb>(`
      SELECT DISTINCT ON (type) *
      FROM (
               SELECT *
               FROM notifications
               ORDER BY type, created_at DESC
           ) AS randomized_notifications;
  `)

  const body = result.rows.reduce(
    (acc, notification) => {
      acc[notification.type] = new URL(`${url.href}/${notification.id}`)
      return acc
    },
    {} as Record<string, URL>
  )
  return {
    status: 200,
    body: body
  }
}

export async function testNotificationPreviewHandler(
  context: Pick<
    HandlerContextWithPath<'db' | 'logs' | 'emailRenderer', '/test-notifications/:notificationId'>,
    'components' | 'params'
  >
) {
  const {
    components: { db, logs, emailRenderer },
    params
  } = context

  const logger = logs.getLogger('test-notification-preview-handler')
  logger.info(`Rendering notification preview for ${params.notificationId}`)

  const notificationId = params.notificationId
  const notification = await db.findNotification(notificationId)
  if (!notification) {
    throw new InvalidRequestError(`Notification not found: ${notificationId}`)
  }

  const email = await emailRenderer.renderEmail('email@example.com', adapt(notification))
  if (!email) {
    return {
      status: 204
    }
  }

  const html = await emailRenderer.renderTemplate(email)

  return {
    status: 200,
    headers: {
      'Content-Type': 'text/html'
    },
    body: html
  }
}

function adapt(notification: NotificationDb): NotificationRecord {
  return {
    eventKey: notification.event_key,
    type: notification.type as NotificationType,
    address: notification.address || '',
    metadata: notification.metadata,
    timestamp: notification.timestamp
  }
}
