import SQL, { SQLStatement } from 'sql-template-strings'
import { NotificationEvent } from 'commons/dist/logic/db'
import { AppComponents } from '../types'

export type DbComponent = {
  findNotifications(users: string[], onlyNew: boolean, limit: number, from: number): Promise<NotificationEvent[]>
}

export function createDbComponent({ logs, pg }: Pick<AppComponents, 'pg' | 'logs'>): DbComponent {
  const logger = logs.getLogger('db')

  async function findNotifications(
    users: string[],
    onlyNew: boolean,
    limit: number,
    from: number
  ): Promise<NotificationEvent[]> {
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

    const whereClause: SQLStatement[] = [SQL`LOWER(u.address) = ANY (${users})`]
    if (from > 0) {
      whereClause.push(SQL`n.created_at >= to_timestamp(${from} / 1000.0)`)
    }
    if (onlyNew) {
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

    return (await pg.query<NotificationEvent>(query)).rows
  }

  return {
    findNotifications
  }
}
