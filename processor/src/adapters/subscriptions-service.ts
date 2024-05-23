import { AppComponents } from '../types'
import { EthAddress } from '@dcl/schemas'
import { SubscriptionDb } from '@notifications/common'

export type ISubscriptionService = {
  findSubscriptionForAddress(address: EthAddress): Promise<SubscriptionDb>
  findSubscriptionsForAddresses(address: EthAddress[]): Promise<SubscriptionDb[]>
}

export async function createSubscriptionsService(
  components: Pick<AppComponents, 'db' | 'logs'>
): Promise<ISubscriptionService> {
  const { db, logs } = components
  const logger = logs.getLogger('subscriptions-service')

  async function findSubscriptionForAddress(address: EthAddress): Promise<SubscriptionDb> {
    logger.info(`Finding subscription for address ${address}`)
    return await db.findSubscription(address)
  }

  async function findSubscriptionsForAddresses(addresses: EthAddress[]): Promise<SubscriptionDb[]> {
    logger.info(`Finding subscriptions for addresses ${addresses.join(', ')}`)
    return await db.findSubscriptions(addresses)
  }

  return {
    findSubscriptionForAddress,
    findSubscriptionsForAddresses
  }
}
