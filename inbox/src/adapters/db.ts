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
               n.address as address,
               metadata,
               timestamp,
               n.read_at as read_at,
               created_at,
               updated_at,
               br.address AS broadcast_address,
               br.read_at AS broadcast_read_at
        FROM notifications n
        LEFT JOIN broadcast_read br ON n.id = br.notification_id
    `

    const lowercaseUsers = users.map((u) => u.toLowerCase())
    const whereClause: SQLStatement[] = [SQL`(n.address IS NULL OR n.address = ANY (${lowercaseUsers}))`]
    if (from > 0) {
      whereClause.push(SQL`timestamp >= ${from}`)
    }
    if (onlyUnread) {
      whereClause.push(SQL`(n.address IS NOT NULL AND n.read_at IS NULL) OR (n.address IS NULL AND br.read_at IS NULL)`)
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
    let notificationCount = (
      await pg.query<NotificationEvent>(SQL`
        UPDATE notifications
        SET read_at    = ${Date.now()},
            updated_at = ${Date.now()}
        WHERE read_at IS NULL
          AND address = ${userId.toLowerCase()}
          AND id = ANY (${notificationIds})
    `)
    ).rowCount

    const broadcastNotificationsIds = (
      await pg.query<DbNotification>(SQL`
        SELECT id
        FROM notifications
        WHERE address IS NULL
          AND id = ANY (${notificationIds})
    `)
    ).rows

    if (broadcastNotificationsIds.length > 0) {
      const lowerUserId = userId.toLowerCase()
      const readAt = Date.now()
      const data = broadcastNotificationsIds.map((n) => SQL`(${n.id}, ${lowerUserId}, ${readAt})`)
      const query = SQL`
        INSERT INTO broadcast_read (notification_id, address, read_at)
        VALUES `
      for (let i = 0; i < data.length; i++) {
        query.append(data[i])
        if (i < data.length - 1) {
          query.append(SQL`, `)
        }
      }
      query.append(SQL`ON CONFLICT (event_key, type, address) DO NOTHING`)
      console.log('insert query', query)

      notificationCount += (await pg.query<NotificationEvent>(query)).rowCount
    }

    return notificationCount
  }

  return {
    findNotifications,
    markNotificationsAsRead
  }
}
