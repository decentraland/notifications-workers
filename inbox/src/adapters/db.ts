import SQL, { SQLStatement } from 'sql-template-strings'
import { Email, EthAddress, SubscriptionDetails } from '@dcl/schemas'
import {
  createDbComponent as createCommonDbComponent,
  DbComponent as CommonDbComponent,
  defaultSubscription,
  NotificationDb
} from '@notifications/common'
import { AppComponents, NotificationEvent, UnconfirmedEmailDb } from '../types'

export type DbComponent = CommonDbComponent & {
  findNotifications(users: EthAddress[], onlyUnread: boolean, from: number, limit: number): Promise<NotificationDb[]>
  markNotificationsAsRead(userId: EthAddress, notificationIds: string[]): Promise<number>
  saveSubscriptionDetails(address: EthAddress, subscriptionDetails: SubscriptionDetails): Promise<void>
  saveSubscriptionEmail(address: EthAddress, email: Email | undefined): Promise<void>
  findUnconfirmedEmail(address: EthAddress): Promise<UnconfirmedEmailDb | undefined>
  saveUnconfirmedEmail(address: EthAddress, email: string, code: string): Promise<void>
  deleteUnconfirmedEmail(address: EthAddress): Promise<void>
}

export function createDbComponent({ pg }: Pick<AppComponents, 'pg'>): DbComponent {
  const baseDbComponent: CommonDbComponent = createCommonDbComponent({ pg })

  async function findNotifications(
    users: EthAddress[],
    onlyUnread: boolean,
    from: number,
    limit: number
  ): Promise<NotificationDb[]> {
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

    return (await pg.query<NotificationDb>(query)).rows
  }

  async function markNotificationsAsRead(userId: EthAddress, notificationIds: string[]) {
    const readAt = Date.now()

    const updateResult = await pg.query<NotificationEvent>(SQL`
        UPDATE notifications
        SET    read_at    = ${readAt},
               updated_at = ${readAt}
        WHERE  read_at IS NULL
          AND  address = ${userId.toLowerCase()}
          AND  id = ANY (${notificationIds})
        RETURNING id
    `)
    let notificationCount = updateResult.rowCount

    const addressedNotificationsIds = new Set(updateResult.rows.map((n) => n.id))
    const potentialBroadcastIds = notificationIds.filter((id) => !addressedNotificationsIds.has(id))
    if (potentialBroadcastIds.length > 0) {
      const lowerUserId = userId.toLowerCase()
      const query = SQL`
        INSERT INTO broadcast_read (notification_id, address, read_at)
          SELECT id, ${lowerUserId}, ${readAt}
          FROM   notifications
          WHERE  id = ANY (${potentialBroadcastIds})
            AND  address IS NULL
        ON CONFLICT (notification_id, address) DO NOTHING`

      notificationCount += (await pg.query<NotificationEvent>(query)).rowCount
    }

    return notificationCount
  }

  async function saveSubscriptionDetails(address: string, subscriptionDetails: SubscriptionDetails): Promise<void> {
    const query: SQLStatement = SQL`
        INSERT INTO subscriptions (address, details, created_at, updated_at)
        VALUES (${address.toLowerCase()},
                ${subscriptionDetails}::jsonb,
                ${Date.now()},
                ${Date.now()}
        )
        ON CONFLICT (address) DO UPDATE
              SET details = ${subscriptionDetails}::jsonb,
              updated_at = ${Date.now()}
    `

    await pg.query(query)
  }

  async function saveSubscriptionEmail(address: string | undefined, email: Email | undefined): Promise<void> {
    const query: SQLStatement = SQL`
        INSERT INTO subscriptions (address, email, details, created_at, updated_at)
        VALUES (${address?.toLowerCase()},
                ${email},
                ${defaultSubscription()}::jsonb,
                ${Date.now()},
                ${Date.now()}
        )
        ON CONFLICT (address) DO UPDATE
              SET email = ${email},
              updated_at = ${Date.now()}
    `

    await pg.query(query)
  }

  async function findUnconfirmedEmail(address: string): Promise<UnconfirmedEmailDb | undefined> {
    const result = await pg.query<UnconfirmedEmailDb>(SQL`
        SELECT address, email, code, created_at, updated_at
        FROM unconfirmed_emails
        WHERE address = ${address.toLowerCase()};
    `)
    if (result.rowCount === 0) {
      return undefined
    }

    return result.rows[0]
  }

  async function saveUnconfirmedEmail(address: string, email: string, code: string): Promise<void> {
    const query: SQLStatement = SQL`
        INSERT INTO unconfirmed_emails (address, email, code, created_at, updated_at)
        VALUES (${address.toLowerCase()},
                ${email},
                ${code},
                ${Date.now()},
                ${Date.now()}
        )
        ON CONFLICT (address) DO UPDATE
              SET email = ${email},
                  code = ${code},
                  updated_at = ${Date.now()}
    `

    await pg.query(query)
  }

  async function deleteUnconfirmedEmail(address: string): Promise<void> {
    const query: SQLStatement = SQL`
        DELETE
        FROM unconfirmed_emails
        WHERE address = ${address.toLowerCase()}
    `

    await pg.query(query)
  }

  return {
    ...baseDbComponent,
    findNotifications,
    markNotificationsAsRead,
    saveSubscriptionDetails,
    saveSubscriptionEmail,
    findUnconfirmedEmail,
    saveUnconfirmedEmail,
    deleteUnconfirmedEmail
  }
}
