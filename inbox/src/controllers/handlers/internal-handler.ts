import { HandlerContextWithPath, InvalidRequestError } from '../../types'
import { randomUUID } from 'crypto'

import SQL, { SQLStatement } from 'sql-template-strings'

export async function createNotificationsHandler(
  context: Pick<HandlerContextWithPath<'pg' | 'logs' | 'config', '/notifications'>, 'url' | 'request' | 'components'>
) {
  const { pg, logs } = context.components
  const logger = logs.getLogger('notifications-handler')
  const apiKey = await context.components.config.getString('INTERNAL_API_KEY')
  const authorization = context.request.headers.get('Authorization')

  if (!(authorization === `Bearer ${apiKey}`)) {
    logger.debug(`Invalid API Key`)
    throw new InvalidRequestError('Invalid API Key')
  }

  let body
  try {
    body = await context.request.json()
  } catch (error: any) {
    logger.debug(`Error parsing body: ${error.message}`)
    throw new InvalidRequestError('Invalid body')
  }

  // TODO: Add a transaction here!

  const notificationUuid = randomUUID()
  const epoch = body.epoch
  // The value stored in timestamp is the one from the origin of the notification
  // While this service uses the created_at to order and retrieve notifications
  const createNotificationQuery: SQLStatement = SQL`
    INSERT INTO notifications (id, origin_id, type, source, metadata, timestamp)
    VALUES (${notificationUuid}, ${body.sid}, 'internal', 'dcl_api', ${body}, to_timestamp(${epoch}));`
  logger.debug(`Running Query: ${createNotificationQuery.text}`)
  try {
    await pg.query<Notification>(createNotificationQuery)
  } catch (error: any) {
    logger.error(`Error: ${error}`)
    throw new InvalidRequestError('Invalid body')
  }

  const users = body.users
  for (const user of users) {
    const userUuid = randomUUID()
    const createUserNotificationQuery: SQLStatement = SQL`
      INSERT INTO users_notifications (id, address, notification_id)
      VALUES (${userUuid}, ${user}, ${notificationUuid});`
    logger.debug(`Running query: ${createUserNotificationQuery.text}`)
    try {
      await pg.query<Notification>(createUserNotificationQuery)
    } catch (error: any) {
      logger.error(`Error: ${error}`)
      throw new InvalidRequestError('Invalid body')
    }
  }

  return {
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: {}
  }
}
