import SQL from 'sql-template-strings'
import { HandlerContextWithPath, InvalidRequestError } from '../../types'

export async function notificationsHandler(
  context: Pick<HandlerContextWithPath<'db' | 'logs', '/notifications'>, 'url' | 'components' | 'verification'>
) {
  const { db, logs } = context.components
  const logger = logs.getLogger('notifications-handler')
  const from = parseInt(context.url.searchParams.get('from') || '')
  const onlyNew = !!context.url.searchParams.get('onlyNew')
  const limitParam = parseInt(context.url.searchParams.get('limit') || '')
  const limit = !!limitParam && limitParam > 0 && limitParam <= 50 ? limitParam : 20

  const userId: string | undefined = context.verification!.auth
  if (!userId) {
    logger.debug(`Invalid userId ${userId} in authChain`)
    throw new InvalidRequestError('Invalid userId in authChain')
  }

  const notifications = await db.findNotifications([userId.toLowerCase()], onlyNew, limit, from || 0)
  return {
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: notifications
  }
}

export async function readNotificationsHandler(
  context: Pick<
    HandlerContextWithPath<'pg' | 'logs', '/notifications/read'>,
    'url' | 'request' | 'components' | 'verification'
  >
) {
  const { pg, logs } = context.components
  const logger = logs.getLogger('read-notifications-handler')

  const userId: string | undefined = context.verification!.auth
  if (!userId) {
    logger.debug(`Invalid userId ${userId} in authChain`)
    throw new InvalidRequestError('Invalid userId in authChain')
  }

  let body
  try {
    body = await context.request.json()
  } catch (error: any) {
    logger.debug(`Error parsing body: ${error.message}`)
    throw new InvalidRequestError('Invalid body, must be JSON with notificationIds array field')
  }
  const notificationIds = body.notificationIds

  const query = SQL`UPDATE users_notifications
  SET read = true, updated_at = NOW()
  WHERE read = false AND LOWER(address) = LOWER(${userId}) AND `

  if (!!notificationIds) {
    query.append(SQL`notification_id IN (`)
    const ids = Array.from(notificationIds).map((id, idx) => {
      console.log(id)
      return idx < notificationIds.length - 1 ? SQL`${id}, ` : SQL`${id}`
    })
    ids.forEach((id) => query.append(id))
    query.append(SQL`)`)
  } else {
    logger.debug(`Missing notificationIds in body ${body}`)
    throw new InvalidRequestError('Missing notificationIds')
  }

  logger.debug(`Running query: ${query.text}`)

  try {
    const response = await pg.query(query)
    return {
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: {
        updated: response.rowCount
      }
    }
  } catch (error: any) {
    logger.error(`Error updating notifications: ${error.message}`)
    throw new InvalidRequestError('Invalid origin_id and type, as they already exist')
  }
}
