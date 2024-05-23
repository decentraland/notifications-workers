import { AppComponents } from '../types'
import { EthAddress } from '@dcl/schemas'
import { SubscriptionDb } from '@notifications/common'

export type ISubscriptionService = {
  findSubscriptionsForAddresses(address: EthAddress[]): Promise<SubscriptionDb[]>
}

export async function createSubscriptionsService(
  components: Pick<AppComponents, 'db' | 'logs'>
): Promise<ISubscriptionService> {
  const { db, logs } = components
  const logger = logs.getLogger('subscriptions-service')

  async function findSubscriptionsForAddresses(addresses: EthAddress[]): Promise<SubscriptionDb[]> {
    logger.info(`Finding subscriptions for addresses ${addresses.join(', ')}`)
    return await db.findSubscriptions(addresses)
  }

  return {
    findSubscriptionsForAddresses
  }
}
