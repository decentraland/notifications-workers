import { AppComponents } from '../types'
import { NotificationOptOutDb } from '@notifications/common'
import { EthAddress } from '@dcl/schemas'

export interface INotificationOptOutsManager {
  createOptOut(
    address: EthAddress,
    metadataKey: string,
    metadataValue: string,
    notificationTypes?: string[] | null
  ): Promise<NotificationOptOutDb>
  updateOptOut(
    address: EthAddress,
    metadataKey: string,
    metadataValue: string,
    notificationTypes?: string[] | null
  ): Promise<NotificationOptOutDb>
  deleteOptOut(address: EthAddress, metadataKey: string, metadataValue: string): Promise<void>
  getOptOuts(address: EthAddress): Promise<NotificationOptOutDb[]>
}

export function createNotificationOptOutsManager({
  db,
  logs
}: Pick<AppComponents, 'db' | 'logs'>): INotificationOptOutsManager {
  const logger = logs.getLogger('notification-opt-outs-manager')

  async function createOptOut(
    address: EthAddress,
    metadataKey: string,
    metadataValue: string,
    notificationTypes?: string[] | null
  ): Promise<NotificationOptOutDb> {
    logger.info('Creating notification opt-out', {
      address,
      metadataKey,
      metadataValue
    })

    const optOut: NotificationOptOutDb = {
      address: address.toLowerCase(),
      metadata_key: metadataKey,
      metadata_value: metadataValue,
      notification_types: notificationTypes ?? null,
      created_at: Date.now(),
      updated_at: Date.now()
    }

    await db.saveNotificationOptOut(optOut)

    return optOut
  }

  async function updateOptOut(
    address: EthAddress,
    metadataKey: string,
    metadataValue: string,
    notificationTypes?: string[] | null
  ): Promise<NotificationOptOutDb> {
    logger.info('Updating notification opt-out', {
      address,
      metadataKey,
      metadataValue
    })

    // Get existing opt-out to preserve other fields
    const existingOptOuts = await db.findNotificationOptOuts(address)
    const existingOptOut = existingOptOuts.find(
      (opt) => opt.metadata_key === metadataKey && opt.metadata_value === metadataValue
    )

    if (!existingOptOut) {
      throw new Error(`Opt-out not found: ${metadataKey}/${metadataValue} for address ${address}`)
    }

    const updatedOptOut: NotificationOptOutDb = {
      ...existingOptOut,
      notification_types: notificationTypes !== undefined ? notificationTypes : existingOptOut.notification_types,
      updated_at: Date.now()
    }

    await db.saveNotificationOptOut(updatedOptOut)

    return updatedOptOut
  }

  async function deleteOptOut(address: EthAddress, metadataKey: string, metadataValue: string): Promise<void> {
    logger.info('Deleting notification opt-out', {
      address,
      metadataKey,
      metadataValue
    })

    await db.deleteNotificationOptOut(address, metadataKey, metadataValue)
  }

  async function getOptOuts(address: EthAddress): Promise<NotificationOptOutDb[]> {
    logger.debug('Getting notification opt-outs', { address })

    return await db.findNotificationOptOuts(address)
  }

  return {
    createOptOut,
    updateOptOut,
    deleteOptOut,
    getOptOuts
  }
}
