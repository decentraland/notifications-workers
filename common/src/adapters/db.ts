import SQL, { SQLStatement } from 'sql-template-strings'
import { SubscriptionDB } from '../types'
import { IPgComponent } from '@well-known-components/pg-component'
import { defaultSubscription } from '../subscriptions'
import { NotificationChannelType, NotificationType } from '@dcl/schemas'

export type DbComponents = {
  pg: IPgComponent
}

export type DbComponent = {
  findSubscription(address: string): Promise<SubscriptionDB>
}

export function createDbComponent({ pg }: Pick<DbComponents, 'pg'>): DbComponent {
  async function findSubscription(address: string): Promise<SubscriptionDB> {
    const query: SQLStatement = SQL`
        SELECT address,
               email,
               details,
               created_at,
               updated_at
        FROM subscriptions n
        WHERE address = ${address.toLowerCase()}
    `

    const result = await pg.query<SubscriptionDB>(query)
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

  return {
    findSubscription
  }
}

function autoMigrate(row: SubscriptionDB): SubscriptionDB {
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
