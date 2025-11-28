import { AppComponents } from '../types'
import { NotificationOptOutDb, NotificationScope } from '@notifications/common'
import { EthAddress } from '@dcl/schemas'

export interface INotificationOptOutsManager {
  createOptOut(address: EthAddress, scope: NotificationScope, scopeId: string): Promise<NotificationOptOutDb>
  deleteOptOut(address: EthAddress, scope: NotificationScope, scopeId: string): Promise<void>
  hasOptOut(address: EthAddress, scope: NotificationScope, scopeId: string): Promise<boolean>
}

export function createNotificationOptOutsManager({
  db,
  logs
}: Pick<AppComponents, 'db' | 'logs'>): INotificationOptOutsManager {
  const logger = logs.getLogger('notification-opt-outs-manager')

  async function createOptOut(
    address: EthAddress,
    scope: NotificationScope,
    scopeId: string
  ): Promise<NotificationOptOutDb> {
    logger.info('Creating notification opt-out', {
      address,
      scope,
      scopeId
    })

    const now = Date.now()
    const optOut = {
      address: address.toLowerCase(),
      scope,
      scope_id: scopeId,
      created_at: now,
      updated_at: now
    }
    await db.saveNotificationOptOut(optOut)
    return optOut
  }

  async function deleteOptOut(address: EthAddress, scope: NotificationScope, scopeId: string): Promise<void> {
    logger.info('Deleting notification opt-out', {
      address,
      scope,
      scopeId
    })

    await db.deleteNotificationOptOut(address, scope, scopeId)
  }

  async function hasOptOut(address: EthAddress, scope: NotificationScope, scopeId: string): Promise<boolean> {
    logger.debug('Checking notification opt-out', { address, scope, scopeId })
    return await db.hasNotificationOptOut(address, scope, scopeId)
  }

  return {
    createOptOut,
    deleteOptOut,
    hasOptOut
  }
}
