import { AppComponents, DbNotification } from '../src/types'
import SQL from 'sql-template-strings'

export async function createNotification(
  { pg }: Pick<AppComponents, 'pg'>,
  notification: DbNotification
): Promise<string> {
  const queryResult = await pg.query(SQL`
      INSERT INTO notifications (event_key, type, address, metadata, timestamp, created_at, updated_at)
      VALUES (${notification.event_key},
              ${notification.type},
              ${notification.address?.toLowerCase()},
              ${notification.metadata}::jsonb,
              ${notification.timestamp},
              ${notification.created_at},
              ${notification.updated_at})
      RETURNING id;
  `)
  notification.id = queryResult.rows[0].id
  return notification.id
}

export async function findNotifications(
  { pg }: Pick<AppComponents, 'pg'>,
  notificationIds: string[]
): Promise<DbNotification[]> {
  const queryResult = await pg.query<DbNotification>(SQL`
      SELECT id,
             event_key,
             type,
             n.address  as address,
             metadata,
             timestamp,
             n.read_at  as read_at,
             created_at,
             updated_at,
             br.address AS broadcast_address,
             br.read_at AS broadcast_read_at
      FROM notifications n
               LEFT JOIN broadcast_read br ON n.id = br.notification_id
      WHERE n.id = ANY (${notificationIds})
  `)

  return queryResult.rows
}
