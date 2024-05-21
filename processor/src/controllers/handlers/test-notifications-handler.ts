import { HandlerContextWithPath, NotificationRecord } from '../../types'
import { InvalidRequestError, parseJson } from '@dcl/platform-server-commons'
import { NotificationDb } from '@notifications/common'
import { NotificationType } from '@dcl/schemas'
import handlebars from 'handlebars'
import fs from 'node:fs'
import path from 'path'

export async function testRandomNotificationsHandler(
  context: Pick<HandlerContextWithPath<'db' | 'logs' | 'emailRenderer', '/test-notifications'>, 'components'>
) {
  const { db, logs, emailRenderer } = context.components
  const logger = logs.getLogger('test-notifications-handler')

  // await db.findNotifications(body)

  return {
    status: 204,
    body: {}
  }
}

export async function testNotificationPreviewHandler(
  context: Pick<
    HandlerContextWithPath<'db' | 'logs' | 'emailRenderer', '/test-notifications/:notificationId'>,
    'components' | 'params'
  >
) {
  const { db, logs, emailRenderer } = context.components
  const logger = logs.getLogger('test-notification-preview-handler')

  logger.info(`Rendering notification preview for ${context.params.notificationId}`)

  const notificationId = context.params.notificationId
  const notification = await db.findNotification(notificationId)
  if (!notification) {
    throw new InvalidRequestError(`Notification not found: ${notificationId}`)
  }

  const email = await emailRenderer.renderEmail('email@example.com', adapt(notification))
  const html = await emailRenderer.renderTemplate(email)
  logger.info(`Rendered email: ${html}`)

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
