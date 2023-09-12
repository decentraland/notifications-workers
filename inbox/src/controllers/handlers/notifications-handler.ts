import { HandlerContextWithPath, InvalidRequestError } from '../../types'

import SQL, { SQLStatement } from 'sql-template-strings'

export async function notificationsHandler(
  context: Pick<HandlerContextWithPath<'pg' | 'logs', '/notifications'>, 'url' | 'components' | 'verification'>
) {
  const { pg, logs } = context.components
  const logger = logs.getLogger('notifications-handler')
  const from = parseInt(context.url.searchParams.get('from') || '')
  const onlyNew = context.url.searchParams.get('onlyNew')
  const limitParam = parseInt(context.url.searchParams.get('limit') || '')
  const limit = !!limitParam && limitParam > 0 && limitParam <= 50 ? limitParam : 20

  const userId: string | undefined = context.verification!.auth
  if (!userId) {
    logger.debug(`Invalid userId ${userId} in authChain`)
    throw new InvalidRequestError('Invalid userId in authChain')
  }

  const query: SQLStatement = SQL`
    SELECT 
      n.id AS notification_id,
      n.origin_id AS origin_id,
      n.type AS type,
      n.source AS source,
      date_part('epoch', n.timestamp) * 1000 AS origin_timestamp,
      date_part('epoch', u.created_at) * 1000 AS created_at,
      date_part('epoch', u.updated_at) * 1000 AS updated_at,
      u.address AS address, 
      u.read AS read,
      n.metadata AS metadata
    FROM notifications n
    JOIN users_notifications u ON n.id = u.notification_id`

  const whereClause: SQLStatement[] = [SQL`LOWER(u.address) = LOWER(${userId})`]
  if (!!from && from > 0) {
    whereClause.push(SQL`n.created_at >= to_timestamp(${from} / 1000.0)`)
  }
  if (!!onlyNew) {
    whereClause.push(SQL`u.read = false`)
  }
  let where = SQL` WHERE `.append(whereClause[0])
  for (const condition of whereClause.slice(1)) {
    where = where.append(' AND ').append(condition)
  }

  query.append(where)
  query.append(SQL` ORDER BY n.created_at DESC`)
  query.append(SQL` LIMIT ${limit}`)
  
  logger.debug(`Running query: ${query.text}`)

  const notifications = await pg.query<any>(query)
  return {
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: notifications.rows
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
