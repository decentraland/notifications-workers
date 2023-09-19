import { IPgComponent } from '@well-known-components/pg-component'
import SQL from 'sql-template-strings'

export type NotificationContext = {
  type: string
  source: string
}

/// DB entities

export type NotificationEvent = {
  notification_id: string
  origin_id: string
  type: string
  source: string
  metadata: any
  timestamp: number
  read: boolean
  created_at: number
  updated_at: number
  address: string
}

export type PushNotification = {
  sid: string
  epoch: number
  users: string[]
}

export async function insertNotification(
  pg: IPgComponent,
  notification: PushNotification,
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
      // The user is stored in Push Server as eip155:0x1234 where 0x1234 is the address
      const user = users[i].replace('eip155:', '')
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
