import SQL, { SQLStatement } from 'sql-template-strings'
import { NotificationDb, SubscriptionDb } from '../types'
import { IPgComponent } from '@well-known-components/pg-component'
import { defaultSubscription } from '../subscriptions'
import { NotificationChannelType, NotificationType } from '@dcl/schemas'

export type DbComponents = {
  pg: IPgComponent
}

export type DbComponent = {
  findSubscription(address: string): Promise<SubscriptionDb>
  findNotification(id: string): Promise<NotificationDb | undefined>
}

export function createDbComponent({ pg }: Pick<DbComponents, 'pg'>): DbComponent {
  async function findSubscription(address: string): Promise<SubscriptionDb> {
    const query: SQLStatement = SQL`
        SELECT address,
               email,
               details,
               created_at,
               updated_at
        FROM subscriptions n
        WHERE address = ${address.toLowerCase()}
    `

    const result = await pg.query<SubscriptionDb>(query)
    if (result.rowCount === 0) {
      return {
        address: address.toLowerCase(),
        email: undefined,
        details: defaultSubscription(),
        created_at: Date.now(),
        updated_at: Date.now()
      }
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

  return {
    findNotification,
    findSubscription
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
