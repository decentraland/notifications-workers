import { HandlerContextWithPath } from '../../types'
import { InvalidRequestError, parseJson } from '@notifications/commons'

export async function readNotificationsHandler(
  context: Pick<HandlerContextWithPath<'db' | 'logs', '/notifications/read'>, 'request' | 'components' | 'verification'>
) {
  const { db, logs } = context.components
  const logger = logs.getLogger('read-notifications-handler')

  const userId: string = context.verification!.auth
  const body = await parseJson<any>(context.request)
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
    logger.error(`Error updating notifications: ${error.message}`)
    throw new InvalidRequestError('Invalid origin_id and type, as they already exist')
  }
}
