import { AppComponents } from '../types'
import { NotificationOptOutDb, NotificationEntity, ENTITY_METADATA_CONFIGS } from '@notifications/common'
import { EthAddress } from '@dcl/schemas'

export interface INotificationOptOutsManager {
  createOptOut(address: EthAddress, entity: NotificationEntity, entityId: string): Promise<NotificationOptOutDb[]>
  deleteOptOut(address: EthAddress, entity: NotificationEntity, entityId: string): Promise<void>
  hasOptOut(address: EthAddress, entity: NotificationEntity, entityId: string): Promise<boolean>
}

export function createNotificationOptOutsManager({
  db,
  logs
}: Pick<AppComponents, 'db' | 'logs'>): INotificationOptOutsManager {
  const logger = logs.getLogger('notification-opt-outs-manager')

  function buildOptOutRow(address: string, entity: NotificationEntity, entityId: string): NotificationOptOutDb {
    const config = ENTITY_METADATA_CONFIGS[entity]
    if (!config) {
      throw new Error(`Unhandled entity ${entity}`)
    }

    const now = Date.now()
    return {
      address: address.toLowerCase(),
      entity,
      entity_id: entityId,
      created_at: now,
      updated_at: now
    }
  }

  async function createOptOut(
    address: EthAddress,
    entity: NotificationEntity,
    entityId: string
  ): Promise<NotificationOptOutDb[]> {
    logger.info('Creating notification opt-out', {
      address,
      entity,
      entityId
    })

    const optOut = buildOptOutRow(address, entity, entityId)
    await db.saveNotificationOptOuts([optOut])
    return [optOut]
  }

  async function deleteOptOut(address: EthAddress, entity: NotificationEntity, entityId: string): Promise<void> {
    logger.info('Deleting notification opt-out', {
      address,
      entity,
      entityId
    })

    await db.deleteNotificationOptOut(address, entity, entityId)
  }

  async function hasOptOut(address: EthAddress, entity: NotificationEntity, entityId: string): Promise<boolean> {
    logger.debug('Checking notification opt-out', { address, entity, entityId })
    return await db.hasNotificationOptOut(address, entity, entityId)
  }

  return {
    createOptOut,
    deleteOptOut,
    hasOptOut
  }
}
