import SQL, { SQLStatement } from 'sql-template-strings'
import { AppComponents, DbNotification, NotificationEvent } from '../types'

export type DbComponent = {
  findNotifications(users: string[], onlyUnread: boolean, from: number, limit: number): Promise<DbNotification[]>
  markNotificationsAsRead(userId: string, notificationIds: string[]): Promise<number>
}

export function createDbComponent({ pg }: Pick<AppComponents, 'pg' | 'logs'>): DbComponent {
  async function findNotifications(
    users: string[],
    onlyUnread: boolean,
    from: number,
    limit: number
  ): Promise<DbNotification[]> {
    const query: SQLStatement = SQL`
        SELECT id,
               event_key,
               type,
               address,
               metadata,
               timestamp,
               read_at,
               created_at,
               updated_at
        FROM notifications
    `

    const lowercaseUsers = users.map((u) => u.toLowerCase())
    const whereClause: SQLStatement[] = [SQL`address = ANY (${lowercaseUsers})`]
    if (from > 0) {
      whereClause.push(SQL`timestamp >= ${from}`)
    }
    if (onlyUnread) {
      whereClause.push(SQL`read_at IS NULL`)
    }
    let where = SQL` WHERE `.append(whereClause[0])
    for (const condition of whereClause.slice(1)) {
      where = where.append(' AND ').append(condition)
    }

    query.append(where)
    query.append(SQL` ORDER BY timestamp DESC`)
    query.append(SQL` LIMIT ${limit}`)

    return (await pg.query<DbNotification>(query)).rows
  }

  async function markNotificationsAsRead(userId: string, notificationIds: string[]) {
    const query = SQL`
        UPDATE notifications
        SET read_at    = ${Date.now()},
            updated_at = ${Date.now()}
        WHERE read_at IS NULL
          AND address = ${userId.toLowerCase()}
          AND id = ANY (${notificationIds})
    `
    return (await pg.query<NotificationEvent>(query)).rowCount
  }

  return {
    findNotifications,
    markNotificationsAsRead
  }
}
