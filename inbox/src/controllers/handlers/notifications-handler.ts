import { HandlerContextWithPath, InvalidRequestError } from '../../types'
import { parseJson } from './utils'

export async function notificationsHandler(
  context: Pick<HandlerContextWithPath<'db' | 'logs', '/notifications'>, 'url' | 'components' | 'verification'>
) {
  const { db } = context.components
  const from = parseInt(context.url.searchParams.get('from') || '0', 10)
  const onlyNew = !!context.url.searchParams.get('onlyNew')
  const limitParam = parseInt(context.url.searchParams.get('limit') || '20', 10)
  const limit = !!limitParam && limitParam > 0 && limitParam <= 50 ? limitParam : 20

  const userId: string | undefined = context.verification!.auth
  if (!userId) {
    throw new InvalidRequestError('Invalid userId in authChain')
  }

  const notifications = await db.findNotifications([userId.toLowerCase()], onlyNew, limit, from)
  return {
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: notifications
  }
}

export async function readNotificationsHandler(
  context: Pick<
    HandlerContextWithPath<'db' | 'logs', '/notifications/read'>,
    'url' | 'request' | 'components' | 'verification'
  >
) {
  const { db, logs } = context.components
  const logger = logs.getLogger('read-notifications-handler')

  const userId: string | undefined = context.verification!.auth
  if (!userId) {
    throw new InvalidRequestError('Invalid userId in authChain')
  }

  const body = await parseJson(context.request)
  const notificationIds = body.notificationIds

  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    logger.debug(`Missing notificationIds in body ${body}`)
    throw new InvalidRequestError('Missing notificationIds')
  }

  try {
    const rowCount = await db.markNotificationsAsRead(userId, notificationIds)
    return {
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: {
        updated: rowCount
      }
    }
  } catch (error: any) {
    logger.error(`Error updating notifications: ${error.message}`)
    throw new InvalidRequestError('Invalid origin_id and type, as they already exist')
  }
}
