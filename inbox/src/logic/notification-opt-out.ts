import { AppComponents } from '../types'
import { NotificationOptOutDb } from '@notifications/common'
import { EthAddress } from '@dcl/schemas'

export interface INotificationOptOutsManager {
  createOptOut(
    address: EthAddress,
    metadataKey: string,
    metadataValue: string,
    notificationTypes: string[]
  ): Promise<NotificationOptOutDb[]>
  deleteOptOut(
    address: EthAddress,
    metadataKey: string,
    metadataValue: string,
    notificationType?: string
  ): Promise<void>
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
    notificationTypes: string[]
  ): Promise<NotificationOptOutDb[]> {
    if (!notificationTypes || notificationTypes.length === 0) {
      throw new Error('notificationTypes must be a non-empty array')
    }

    logger.info('Creating notification opt-out', {
      address,
      metadataKey,
      metadataValue,
      notificationTypesCount: notificationTypes.length
    })

    const now = Date.now()
    const lowerAddress = address.toLowerCase()

    // Build all opt-outs at once
    const optOuts: NotificationOptOutDb[] = notificationTypes.map((type) => ({
      address: lowerAddress,
      metadata_key: metadataKey,
      metadata_value: metadataValue,
      notification_type: type,
      created_at: now,
      updated_at: now
    }))

    // Batch insert all at once (single query)
    await db.saveNotificationOptOuts(optOuts)

    return optOuts
  }

  async function deleteOptOut(
    address: EthAddress,
    metadataKey: string,
    metadataValue: string,
    notificationType?: string
  ): Promise<void> {
    logger.info('Deleting notification opt-out', {
      address,
      metadataKey,
      metadataValue,
      ...(notificationType && { notificationType })
    })

    await db.deleteNotificationOptOut(address, metadataKey, metadataValue, notificationType)
  }

  async function getOptOuts(address: EthAddress): Promise<NotificationOptOutDb[]> {
    logger.debug('Getting notification opt-outs', { address })

    return await db.findNotificationOptOuts(address)
  }

  return {
    createOptOut,
    deleteOptOut,
    getOptOuts
  }
}
