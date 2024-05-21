import { AppComponents, ISubscriptionService } from '../types'
import { EthAddress } from '@dcl/schemas'
import { SubscriptionDb } from '@notifications/common'

export async function createSubscriptionsService(
  components: Pick<AppComponents, 'db' | 'logs'>
): Promise<ISubscriptionService> {
  const { db, logs } = components
  const logger = logs.getLogger('subscriptions-service')

  async function findSubscriptionForAddress(address: EthAddress): Promise<SubscriptionDb> {
    logger.info(`Finding subscription for address ${address}`)
    return await db.findSubscription(address)
  }

  return {
    findSubscriptionForAddress
  }
}
