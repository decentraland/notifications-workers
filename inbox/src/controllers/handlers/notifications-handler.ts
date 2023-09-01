import { HandlerContextWithPath, InvalidRequestError } from '../../types'

import SQL, { SQLStatement } from 'sql-template-strings'

export async function notificationsHandler(
  context: Pick<HandlerContextWithPath<'pg' | 'logs', '/notifications'>, 'url' | 'components'>
) {
  const { pg, logs } = context.components
  const logger = logs.getLogger('notifications-handler')
  const from = context.url.searchParams.get('from')
  const onlyNew = context.url.searchParams.get('onlyNew')
  const userId = context.url.searchParams.get('userId')

  if (!userId || userId === '') {
    throw new InvalidRequestError('Missing userId')
  }

  const query: SQLStatement = SQL`
    SELECT * FROM notifications n
    JOIN users_notifications u ON n.id = u.notification_id`

  const whereClause: SQLStatement[] = [SQL`LOWER(u.address) = LOWER(${userId})`]
  if (!!from) {
    whereClause.push(SQL`n.timestamp >= to_timestamp(${from} / 1000.0)`)
  }
  if (!!onlyNew) {
    whereClause.push(SQL`u.read = false`)
  }
  let where = SQL` WHERE `.append(whereClause[0])
  for (const condition of whereClause.slice(1)) {
    where = where.append(' AND ').append(condition)
  }

  query.append(where)
  query.append(SQL` ORDER BY n.timestamp DESC`)

  logger.debug(`Query: ${query.text}`)

  const notifications = pg.query<any>(query)
  return {
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: notifications
  }
}

export async function readNotificationsHandler(
  context: Pick<HandlerContextWithPath<'pg' | 'logs', '/notifications'>, 'url' | 'request' | 'components'>
) {
  const userId = context.url.searchParams.get('userId')
  const { pg, logs } = context.components
  const logger = logs.getLogger('read-notifications-handler')

  if (!userId || userId === '') {
    throw new InvalidRequestError('Missing userId')
  }

  let body
  try {
    body = await context.request.json()
  } catch (error: any) {
    throw new InvalidRequestError('Invalid body')
  }
  const notificationIds = body.notificationIds
  const fromTimestamp = body.from

  let whereClause
  if (!!notificationIds) {
    whereClause = SQL`id IN (${notificationIds}) AND LOWER(address) = LOWER(${userId})`
  } else if (!!fromTimestamp) {
    whereClause = SQL`timestamp >= to_timestamp(${fromTimestamp} / 1000.0) AND LOWER(address) = LOWER(${userId})`
  } else {
    throw new InvalidRequestError('Missing notificationIds or from')
  }

  const query = SQL`UPDATE users_notifications SET read = true WHERE `.append(whereClause)

  logger.debug(`Query: ${query.text}`)

  const response = pg.query<any>(query)
  return {
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: response
  }
}
