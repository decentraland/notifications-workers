import { AppComponents, NotificationRecord } from '../types'
import { SubscriptionDB } from '@notifications/common'

export type INotificationsService = {
  saveNotifications(notification: NotificationRecord[]): Promise<void>
}

export async function createNotificationsService(
  components: Pick<AppComponents, 'db' | 'emailRenderer' | 'logs' | 'sendGridClient' | 'subscriptionService'>
): Promise<INotificationsService> {
  const { db, emailRenderer, logs, sendGridClient, subscriptionService } = components
  const logger = logs.getLogger('notifications-service')

  async function saveNotifications(notification: NotificationRecord[]): Promise<void> {
    const result = await db.insertNotifications(notification)
    logger.info(
      `Inserted ${result.inserted.length} new notifications and updated ${result.updated.length} existing ones.`
    )

    // Defer the email sending function
    setImmediate(async () => {
      try {
        const addresses = result.inserted.map((notification) => notification.address)
        const uniqueAddresses = [...new Set(addresses)]

        // TODO Optimize this by fetching all subscriptions in a single query
        const addressesWithSubscriptions: Record<string, SubscriptionDB> = {}
        for (const address of uniqueAddresses) {
          addressesWithSubscriptions[address] = await subscriptionService.findSubscriptionForAddress(address)
        }

        for (const notification of result.inserted) {
          const subscription = addressesWithSubscriptions[notification.address]
          if (!subscription?.email || subscription.details.ignore_all_email) {
            continue
          }

          if (subscription.details.message_type[notification.type]?.email) {
            try {
              // TODO Also here, we may send emails in batches
              const email = await emailRenderer.renderEmail(notification)
              await sendGridClient.sendEmail(email)
            } catch (error) {
              logger.warn(`Failed to send email for notification: ${JSON.stringify(notification)}`)
            }
          }
        }
      } catch (error: any) {
        logger.warn(`Failed to send emails: ${error.metadata}`)
      }
    })
  }

  return {
    saveNotifications
  }
}
