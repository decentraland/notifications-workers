import { IPgComponent } from '@well-known-components/pg-component'
import SQL from 'sql-template-strings'

export type NotificationToSqs = {
  sid: string
  users: string[]
  epoch: number
}

export type NotificationContext = {
  type: string
  source: string
}

export async function insertNotification(
  pg: IPgComponent,
  notification: NotificationToSqs,
  context: NotificationContext
) {
  const client = await pg.getPool().connect()

  try {
    await client.query('BEGIN')
    const epoch = notification.epoch

    // The value stored in timestamp is the one from the origin of the notification
    // While this service uses the created_at to order and retrieve notifications
    const createNotificationQuery = SQL`
      INSERT INTO notifications (origin_id, type, source, metadata, timestamp)
      VALUES (${notification.sid}, ${context.type}, ${context.source}, ${notification}, to_timestamp(${epoch})) RETURNING id;`
    const notificationId = (await client.query<any>(createNotificationQuery)).rows[0].id

    const users = notification.users

    const createUserNotificationQuery = SQL`INSERT INTO users_notifications (address, notification_id) VALUES `

    for (let i = 0; i < users.length; ++i) {
      const user = users[i]
      createUserNotificationQuery.append(SQL`(${user}, ${notificationId})`)
      if (i < users.length - 1) {
        createUserNotificationQuery.append(SQL`, `)
      }
    }

    await client.query(createUserNotificationQuery)
    await client.query('COMMIT')
  } catch (e: any) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
