import { AppComponents } from '../types'
import { NotificationOptOutDb, NotificationRecord, SubscriptionDb } from '@notifications/common'

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

  const getUniqueAddresses = (notifications: NotificationRecord[]): string[] => {
    return [...new Set(notifications.map((notification) => notification.address.toLowerCase()))]
  }

  const groupOptOutsByAddress = (optOutRows: NotificationOptOutDb[]) =>
    optOutRows.reduce<Record<string, NotificationOptOutDb[]>>((acc, optOut) => {
      const address = optOut.address.toLowerCase()
      const existing = acc[address] ?? []
      acc[address] = [...existing, optOut]
      return acc
    }, {})

  const shouldKeepNotification = (
    notification: NotificationRecord,
    optOutsByAddress: Record<string, NotificationOptOutDb[]>
  ): boolean => {
    const address = notification.address.toLowerCase()
    const optOuts = optOutsByAddress[address]
    if (!optOuts) {
      return true
    }

    const entity = notification.entity
    if (!entity || !entity.type || !entity.id) {
      return true
    }

    return !optOuts.some((optOut) => optOut.entity === entity.type && optOut.entity_id === entity.id)
  }

  async function filterNotificationsByOptOuts(notifications: NotificationRecord[]): Promise<NotificationRecord[]> {
    if (notifications.length === 0) {
      return []
    }

    const uniqueAddresses = getUniqueAddresses(notifications)
    if (uniqueAddresses.length === 0) {
      return notifications
    }

    const optOutRows = await db.findNotificationOptOutsForAddresses(uniqueAddresses)
    if (optOutRows.length === 0) {
      return notifications
    }

    const optOutsByAddress = groupOptOutsByAddress(optOutRows)

    return notifications.filter((notification) => shouldKeepNotification(notification, optOutsByAddress))
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
