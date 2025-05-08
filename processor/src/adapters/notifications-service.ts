import { AppComponents } from '../types'
import { NotificationRecord, SubscriptionDb } from '@notifications/common'

export type INotificationsService = {
  saveNotifications(notification: NotificationRecord[]): Promise<void>
}

export async function createNotificationsService(
  components: Pick<
    AppComponents,
    'config' | 'db' | 'emailRenderer' | 'logs' | 'sendGridClient' | 'subscriptionService' | 'profiles' | 'broadcaster'
  >
): Promise<INotificationsService> {
  const { db, emailRenderer, logs, sendGridClient, subscriptionService, config, profiles, broadcaster } = components
  const logger = logs.getLogger('notifications-service')
  const env = await config.requireString('ENV')

  async function saveNotifications(notifications: NotificationRecord[]): Promise<void> {
    if (notifications.length === 0) {
      logger.info('No notifications to save')
      return
    }

    const result = await db.insertNotifications(notifications)
    logger.info(
      `Inserted ${result.inserted.length} new notifications and updated ${result.updated.length} existing ones.`
    )

    for (const notification of [...result.inserted, ...result.updated]) {
      broadcaster.sendMessageToAddress(notification.address, notification)
    }

    if (result.inserted.length > 0) {
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
            const address = notification.address.toLowerCase()
            const subscription = addressesWithSubscriptions[notification.address.toLowerCase()]
            if (!subscription?.email || subscription.details.ignore_all_email) {
              continue
            }

            if (!subscription.details.message_type[notification.type]?.email) {
              continue
            }
            notification.metadata.userName = 'Unknown'

            const profile = await profiles.getByAddress(notification.address)
            if (profile && profile.avatars && profile.avatars.length) {
              notification.metadata.userName = profile.avatars[0].name
            }

            const email = await emailRenderer.renderEmail(subscription.email, notification)
            if (!email) {
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
