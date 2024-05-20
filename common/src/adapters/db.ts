import SQL, { SQLStatement } from 'sql-template-strings'
import { SubscriptionDB } from '../types'
import { IPgComponent } from '@well-known-components/pg-component'
import { defaultSubscription } from '../subscriptions'

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
    return result.rows[0]
  }

  return {
    findSubscription
  }
}
