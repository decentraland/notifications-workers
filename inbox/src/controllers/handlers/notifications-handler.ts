import { HandlerContextWithPath, InvalidRequestError } from '../../types'

import SQL, { SQLStatement } from 'sql-template-strings'

export async function notificationsHandler(
  context: Pick<HandlerContextWithPath<'pg', '/notifications'>, 'url' | 'components'>
) {
  const { pg } = context.components
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
    whereClause.push(SQL`n.timestamp >= ${from}`)
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

  console.log(query)

  const notifications = pg.query<any>(query)
  return {
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: notifications
  }
}
