import { AppComponents } from '../types'
import {
  ENTITY_METADATA_CONFIGS,
  EntityMetadataConfig,
  NotificationEntity,
  NotificationOptOutDb,
  NotificationRecord,
  SubscriptionDb
} from '@notifications/common'

const ENTITY_METADATA_ENTRIES = Object.entries(ENTITY_METADATA_CONFIGS) as [NotificationEntity, EntityMetadataConfig][]

export type INotificationsService = {
  saveNotifications(notification: NotificationRecord[]): Promise<void>
}

export async function createNotificationsService(
  components: Pick<
    AppComponents,
    'config' | 'db' | 'emailRenderer' | 'logs' | 'sendGridClient' | 'subscriptionService' | 'profiles'
  >
): Promise<INotificationsService> {
  const { db, emailRenderer, logs, sendGridClient, subscriptionService, config, profiles } = components
  const logger = logs.getLogger('notifications-service')
  const env = await config.requireString('ENV')

  async function filterNotificationsByOptOuts(notifications: NotificationRecord[]): Promise<NotificationRecord[]> {
    if (notifications.length === 0) {
      return []
    }

    const normalizedAddresses = notifications
      .map((notification) => notification.address?.toLowerCase())
      .filter((address): address is string => Boolean(address))

    if (normalizedAddresses.length === 0) {
      return notifications
    }

    const uniqueAddresses = [...new Set(normalizedAddresses)]
    const optOutRows = await db.findNotificationOptOutsForAddresses(uniqueAddresses)

    if (optOutRows.length === 0) {
      return notifications
    }

    const optOutsByAddress = optOutRows.reduce((map, optOut) => {
      const address = optOut.address.toLowerCase()
      const existing = map.get(address)
      if (existing) {
        existing.push(optOut)
      } else {
        map.set(address, [optOut])
      }
      return map
    }, new Map<string, NotificationOptOutDb[]>())

    return notifications.filter((notification) => {
      const address = notification.address?.toLowerCase()
      if (!address) {
        return true
      }

      const optOuts = optOutsByAddress.get(address)
      if (!optOuts || optOuts.length === 0) {
        return true
      }

      return !hasOptOutForNotification(notification, optOuts)
    })
  }

  function hasOptOutForNotification(notification: NotificationRecord, optOuts: NotificationOptOutDb[]): boolean {
    const metadata = (notification.metadata ?? {}) as Record<string, unknown>
    for (const [entity, config] of ENTITY_METADATA_ENTRIES) {
      if (!config.notificationTypes.includes(notification.type)) {
        continue
      }

      for (const metadataKey of config.metadataKeys) {
        const metadataValue = metadata[metadataKey]
        if (metadataValue === undefined || metadataValue === null) {
          continue
        }

        const entityId = String(metadataValue)
        if (optOuts.some((optOut) => optOut.entity === entity && optOut.entity_id === entityId)) {
          return true
        }
      }
    }

    return false
  }

  async function saveNotifications(notifications: NotificationRecord[]): Promise<void> {
    if (notifications.length === 0) {
      return
    }

    const filteredNotifications = await filterNotificationsByOptOuts(notifications)
    if (filteredNotifications.length === 0) {
      return
    }

    const result = await db.insertNotifications(filteredNotifications)
    logger.info(
      `Inserted ${result.inserted.length} new notifications and updated ${result.updated.length} existing ones.`
    )
    if (result.inserted.length > 0) {
      // Defer the email sending function
      setImmediate(async () => {
        try {
          const addresses = result.inserted.map((notification) => notification.address.toLowerCase())
          const uniqueAddresses = [...new Set(addresses)]

          const subscriptions = await subscriptionService.findSubscriptionsForAddresses(uniqueAddresses)
          const addressesWithSubscriptions = subscriptions.reduce(
            (acc, subscription) => {
              acc[subscription.address] = subscription
              return acc
            },
            {} as Record<string, SubscriptionDb>
          )

          for (const notification of result.inserted) {
            const subscription = addressesWithSubscriptions[notification.address.toLowerCase()]
            if (!subscription?.email || subscription.details.ignore_all_email) {
              logger.info(`Skipping sending email for ${notification.address} as all email notifications are ignored`)
              continue
            }

            if (!subscription.details.message_type[notification.type]?.email) {
              logger.info(
                `Skipping sending email for ${notification.address} as email notifications for ${notification.type} are ignored`
              )

              continue
            }

            notification.metadata.userName = 'Unknown'

            const profile = await profiles.getByAddress(notification.address)

            if (profile && profile.avatars && profile.avatars.length) {
              notification.metadata.userName = profile.avatars[0].name
            }

            const email = await emailRenderer.renderEmail(subscription.email, notification)
            if (!email) {
              logger.info(
                `Skipping sending email for ${notification.address} as there is no template for ${notification.type}`
              )

              continue
            }

            try {
              await sendGridClient.sendEmail(email, {
                environment: env,
                tracking_id: notification.id,
                email_type: 'notification'
              })
            } catch (error: any) {
              logger.warn(
                `Failed to send email for notification: ${JSON.stringify({
                  type: notification.type,
                  address: notification.address,
                  eventKey: notification.eventKey
                })}. Error: ${error.message}`
              )
            }
          }
        } catch (error: any) {
          logger.warn(`Failed to send emails: ${error}`)
        }
      })
    }
  }

  return {
    saveNotifications
  }
}
