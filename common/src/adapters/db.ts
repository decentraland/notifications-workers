import SQL, { SQLStatement } from 'sql-template-strings'
import {
  NotificationDb,
  NotificationEvent,
  NotificationRecord,
  NotificationOptOutDb,
  SubscriptionDb,
  UnconfirmedEmailDb
} from '../types'
import { IPgComponent } from '@well-known-components/pg-component'
import { defaultSubscription } from '../subscriptions'
import { Email, EthAddress, NotificationChannelType, NotificationType, SubscriptionDetails } from '@dcl/schemas'

export type DbComponents = {
  pg: IPgComponent
}

export type UpsertResult<T> = {
  inserted: T[]
  updated: T[]
}

import { NotificationEntity } from '../types'

export type DbComponent = {
  findSubscription(address: EthAddress): Promise<SubscriptionDb>
  findSubscriptions(addresses: EthAddress[]): Promise<SubscriptionDb[]>
  findSubscriptionByEmail(email: Email, excludeAddress?: EthAddress): Promise<SubscriptionDb | undefined>
  findNotification(id: string): Promise<NotificationDb | undefined>
  findNotifications(users: EthAddress[], onlyUnread: boolean, from: number, limit: number): Promise<NotificationDb[]>
  markNotificationsAsRead(userId: EthAddress, notificationIds: string[]): Promise<number>
  saveSubscriptionDetails(address: EthAddress, subscriptionDetails: SubscriptionDetails): Promise<void>
  saveSubscriptionEmail(address: EthAddress, email: Email | undefined): Promise<void>
  findUnconfirmedEmail(address: EthAddress): Promise<UnconfirmedEmailDb | undefined>
  saveUnconfirmedEmail(address: EthAddress, email: string, code: string): Promise<void>
  deleteUnconfirmedEmail(address: EthAddress): Promise<void>
  fetchLastUpdateForNotificationType(notificationType: string): Promise<number>
  updateLastUpdateForNotificationType(notificationType: string, timestamp: number): Promise<void>
  insertNotifications(notificationRecord: NotificationRecord[]): Promise<UpsertResult<NotificationRecord>>
  findNotificationOptOutsForAddresses(addresses: string[]): Promise<NotificationOptOutDb[]>
  saveNotificationOptOuts(optOuts: NotificationOptOutDb[]): Promise<void>
  deleteNotificationOptOut(address: EthAddress, entity: NotificationEntity, entityId: string): Promise<void>
  hasNotificationOptOut(address: EthAddress, entity: NotificationEntity, entityId: string): Promise<boolean>
}

export function createDbComponent({ pg }: Pick<DbComponents, 'pg'>): DbComponent {
  async function findSubscription(address: EthAddress): Promise<SubscriptionDb> {
    return (await findSubscriptions([address]))[0]
  }

  async function findSubscriptions(addresses: EthAddress[]): Promise<SubscriptionDb[]> {
    const query: SQLStatement = SQL`
        SELECT address,
               email,
               details,
               created_at,
               updated_at
        FROM subscriptions n
        WHERE address = ANY (${addresses.map((a) => a.toLowerCase())})
    `

    const result = await pg.query<SubscriptionDb>(query)
    const indexedByAddress = result.rows.reduce(
      (acc, row) => {
        acc[row.address] = autoMigrate(row)
        return acc
      },
      {} as Record<EthAddress, SubscriptionDb>
    )

    return addresses.map(
      (address) =>
        indexedByAddress[address.toLowerCase()] || {
          address: address.toLowerCase(),
          email: undefined,
          details: defaultSubscription(),
          created_at: Date.now(),
          updated_at: Date.now()
        }
    )
  }

  async function findSubscriptionByEmail(
    email: Email,
    excludeAddress?: EthAddress
  ): Promise<SubscriptionDb | undefined> {
    const normalizedEmail = email.toLowerCase()

    const query: SQLStatement = excludeAddress
      ? SQL`
          SELECT address,
                 email,
                 details,
                 created_at,
                 updated_at
          FROM subscriptions
          WHERE LOWER(email) = ${normalizedEmail} AND address != ${excludeAddress.toLowerCase()}
          LIMIT 1
        `
      : SQL`
          SELECT address,
                 email,
                 details,
                 created_at,
                 updated_at
          FROM subscriptions
          WHERE LOWER(email) = ${normalizedEmail}
          LIMIT 1
        `

    const result = await pg.query<SubscriptionDb>(query)
    if (result.rowCount === 0) {
      return undefined
    }

    return autoMigrate(result.rows[0])
  }

  async function findNotification(id: string): Promise<NotificationDb | undefined> {
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
        WHERE id = ${id}
    `

    const result = await pg.query<NotificationDb>(query)
    if (result.rowCount === 0) {
      return undefined
    }

    return result.rows[0]
  }

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
  async function fetchLastUpdateForNotificationType(notificationType: string): Promise<number> {
    const result = await pg.query<{ last_successful_run_at: number }>(SQL`
        SELECT *
        FROM cursors
        WHERE id = ${notificationType};
    `)
    if (result.rowCount === 0) {
      return Date.now()
    }

    return result.rows[0].last_successful_run_at
  }

  async function updateLastUpdateForNotificationType(notificationType: string, timestamp: number): Promise<void> {
    const query = SQL`
        INSERT INTO cursors (id, last_successful_run_at, created_at, updated_at)
        VALUES (${notificationType}, ${timestamp}, ${Date.now()}, ${Date.now()})
        ON CONFLICT (id) DO UPDATE
        SET last_successful_run_at = ${timestamp},
            updated_at             = ${Date.now()};
    `

    await pg.query<any>(query)
  }

  async function insertNotifications(
    notificationRecords: NotificationRecord[]
  ): Promise<UpsertResult<NotificationRecord>> {
    if (notificationRecords.length === 0) {
      return { inserted: [], updated: [] }
    }

    const now = Date.now()
    const notificationValues = notificationRecords.map((n) => {
      if (!n.address) {
        return SQL`(${n.eventKey}, ${n.type}, NULL, ${JSON.stringify(n.metadata)}::jsonb, ${n.timestamp}::bigint)`
      }
      return SQL`(${n.eventKey}, ${n.type}, ${n.address.toLowerCase()}, ${JSON.stringify(n.metadata)}::jsonb, ${n.timestamp}::bigint)`
    })

    const query = SQL`
      WITH notifications_to_insert AS (
        SELECT * FROM (VALUES `.append(notificationValues[0])
    for (let i = 1; i < notificationValues.length; i++) {
      query.append(SQL`, `).append(notificationValues[i])
    }
    query.append(
      SQL`) AS t(event_key, type, address, metadata, timestamp)
      )
      INSERT INTO notifications (event_key, type, address, metadata, timestamp, read_at, created_at, updated_at)
      SELECT 
        nti.event_key,
        nti.type,
        nti.address,
        nti.metadata,
        nti.timestamp,
        NULL,
        ${now},
        ${now}
      FROM notifications_to_insert nti
      ON CONFLICT (event_key, type, address) DO UPDATE
        SET metadata = EXCLUDED.metadata,
            timestamp = EXCLUDED.timestamp,
            updated_at = ${now}
      RETURNING id, event_key, type, address, xmax
    `
    )

    const result = await pg.query<{
      id: string
      event_key: string
      type: string
      address: string | null
      xmax: string
    }>(query)

    const inserted: NotificationRecord[] = []
    const updated: NotificationRecord[] = []

    for (const row of result.rows) {
      const notification = notificationRecords.find(
        (n) =>
          n.eventKey === row.event_key &&
          n.type === row.type &&
          (n.address?.toLowerCase() || null) === (row.address?.toLowerCase() || null)
      )
      if (notification) {
        notification.id = row.id
        if (row.xmax === '0') {
          inserted.push(notification)
        } else {
          updated.push(notification)
        }
      }
    }

    return { inserted, updated }
  }

  async function findNotificationOptOutsForAddresses(addresses: string[]): Promise<NotificationOptOutDb[]> {
    if (addresses.length === 0) return []

    const normalizedAddresses = addresses.map((address) => address.toLowerCase())
    const query: SQLStatement = SQL`
      SELECT address, entity, entity_id, created_at, updated_at
      FROM notification_opt_outs
      WHERE address = ANY(${normalizedAddresses})
    `
    const result = await pg.query<NotificationOptOutDb>(query)
    return result.rows
  }

  async function saveNotificationOptOuts(optOuts: NotificationOptOutDb[]): Promise<void> {
    if (optOuts.length === 0) return

    const now = Date.now()
    const query = SQL`INSERT INTO notification_opt_outs (address, entity, entity_id, created_at, updated_at) VALUES `

    const valueClauses: SQLStatement[] = []
    for (const optOut of optOuts) {
      valueClauses.push(SQL`(
        ${optOut.address.toLowerCase()},
        ${optOut.entity},
        ${optOut.entity_id},
        ${optOut.created_at || now},
        ${now}
      )`)
    }

    query.append(valueClauses[0])
    for (let i = 1; i < valueClauses.length; i++) {
      query.append(SQL`, `).append(valueClauses[i])
    }

    query.append(SQL`
      ON CONFLICT (address, entity, entity_id) DO UPDATE
        SET updated_at = ${now}
    `)

    await pg.query(query)
  }

  async function deleteNotificationOptOut(
    address: EthAddress,
    entity: NotificationEntity,
    entityId: string
  ): Promise<void> {
    const query = SQL`
      DELETE FROM notification_opt_outs
      WHERE address = ${address.toLowerCase()}
        AND entity = ${entity}
        AND entity_id = ${entityId}
    `
    await pg.query(query)
  }

  async function hasNotificationOptOut(
    address: EthAddress,
    entity: NotificationEntity,
    entityId: string
  ): Promise<boolean> {
    const query = SQL`
      SELECT 1
      FROM notification_opt_outs
      WHERE address = ${address.toLowerCase()}
        AND entity = ${entity}
        AND entity_id = ${entityId}
      LIMIT 1
    `
    const result = await pg.query(query)
    return result.rowCount > 0
  }

  return {
    findNotification,
    findSubscription,
    findSubscriptions,
    findSubscriptionByEmail,
    fetchLastUpdateForNotificationType,
    updateLastUpdateForNotificationType,
    insertNotifications,
    findNotifications,
    markNotificationsAsRead,
    saveSubscriptionDetails,
    saveSubscriptionEmail,
    findUnconfirmedEmail,
    saveUnconfirmedEmail,
    deleteUnconfirmedEmail,
    findNotificationOptOutsForAddresses,
    saveNotificationOptOuts,
    deleteNotificationOptOut,
    hasNotificationOptOut
  }
}

function autoMigrate(row: SubscriptionDb): SubscriptionDb {
  const defSubscription = defaultSubscription()
  const validMessageTypes = Object.keys(row.details.message_type)
    .filter((key) => key in defSubscription.message_type)
    .reduce(
      (obj, key) => {
        obj[key as NotificationType] = row.details.message_type[key as NotificationType]
        return obj
      },
      {} as Record<NotificationType, NotificationChannelType>
    )
  return {
    ...row,
    details: {
      ...defSubscription,
      ...row.details,
      message_type: {
        ...defSubscription.message_type,
        ...validMessageTypes
      }
    }
  }
}
