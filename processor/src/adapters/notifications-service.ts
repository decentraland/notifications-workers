import { AppComponents } from '../types'
import { NotificationOptOutDb, NotificationRecord, NotificationScope, SubscriptionDb } from '@notifications/common'
import { NotificationType } from '@dcl/schemas'

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

  const buildOptOutKey = (address: string, scope: NotificationScope, scopeId: string): string => {
    return `${address.toLowerCase()}:${scope}:${scopeId}`
  }

  const getUniqueAddressScopePairs = (
    notifications: NotificationRecord[]
  ): Array<{ address: string; scope: NotificationScope; scopeId: string }> => {
    const pairsMap = notifications.reduce((acc, { address, optOutScope }) => {
      if (!optOutScope?.scope || !optOutScope?.scopeId || !address) {
        return acc
      }

      const key = buildOptOutKey(address, optOutScope.scope, optOutScope.scopeId)
      if (!acc.has(key)) {
        acc.set(key, {
          address: address.toLowerCase(),
          scope: optOutScope!.scope,
          scopeId: optOutScope!.scopeId
        })
      }
      return acc
    }, new Map<string, { address: string; scope: NotificationScope; scopeId: string }>())
    return Array.from(pairsMap.values())
  }

  const buildOptOutLookup = (optOutRows: Pick<NotificationOptOutDb, 'address' | 'scope' | 'scope_id'>[]): Set<string> =>
    new Set(optOutRows.map(({ address, scope, scope_id }) => buildOptOutKey(address, scope, scope_id)))

  const shouldKeepNotification = (notification: NotificationRecord, optOutLookup: Set<string>): boolean => {
    const { optOutScope, address } = notification
    if (!optOutScope?.scope || !optOutScope?.scopeId || !address) {
      return true
    }

    const key = buildOptOutKey(address, optOutScope.scope, optOutScope.scopeId)
    return !optOutLookup.has(key)
  }

  async function filterNotificationsByOptOuts(notifications: NotificationRecord[]): Promise<NotificationRecord[]> {
    if (notifications.length === 0) {
      return []
    }

    const addressScopePairs = getUniqueAddressScopePairs(notifications)
    if (addressScopePairs.length === 0) {
      // No notifications with optOutScope, return all
      return notifications
    }

    const optOutRows = await db.findNotificationOptOutsForAddressesAndScopes(addressScopePairs)
    if (optOutRows.length === 0) {
      return notifications
    }

    const optOutLookup = buildOptOutLookup(optOutRows)

    return notifications.filter((notification) => shouldKeepNotification(notification, optOutLookup))
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

            // Enrich sender username for TIP_RECEIVED notifications
            if (notification.type === NotificationType.TIP_RECEIVED && notification.metadata.senderAddress) {
              notification.metadata.senderUsername = 'Unknown'
              const senderProfile = await profiles.getByAddress(notification.metadata.senderAddress)

              if (senderProfile && senderProfile.avatars && senderProfile.avatars.length) {
                notification.metadata.senderUsername = senderProfile.avatars[0].name
              }
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
