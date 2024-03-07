import { HandlerContextWithPath } from '../../types'
import { InvalidRequestError, parseJson } from '@dcl/platform-server-commons'

export async function readNotificationsHandler(
  context: Pick<HandlerContextWithPath<'db' | 'logs', '/notifications/read'>, 'request' | 'components' | 'verification'>
) {
  const { db, logs } = context.components
  const logger = logs.getLogger('read-notifications-handler')

  const userId: string = context.verification!.auth
  const body = await parseJson<{ notificationIds: string[] }>(context.request)
  const notificationIds = body.notificationIds

  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    throw new InvalidRequestError('Missing notificationIds')
  }

  logger.info(`Marking notifications for user ${userId} as read: ${notificationIds}`)

  try {
    const rowCount = await db.markNotificationsAsRead(userId, notificationIds)
    return {
      body: {
        updated: rowCount
      }
    }
  } catch (error: any) {
    logger.error(`Error marking notifications as read: ${error.message}`)
    throw new Error('Error marking notifications as read')
  }
}
