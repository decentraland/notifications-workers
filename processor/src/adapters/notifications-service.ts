import { AppComponents, NotificationRecord } from '../types'
import { SubscriptionDb } from '@notifications/common'

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

        const subscriptions = await subscriptionService.findSubscriptionsForAddresses(uniqueAddresses)
        const addressesWithSubscriptions = subscriptions.reduce(
          (acc, subscription) => {
            acc[subscription.address] = subscription
            return acc
          },
          {} as Record<string, SubscriptionDb>
        )

        for (const notification of result.inserted) {
          const subscription = addressesWithSubscriptions[notification.address]
          console.log(`subscription: ${subscription}`)
          if (!subscription?.email || subscription.details.ignore_all_email) {
            logger.info(`Skipping sending email for ${notification.address} as all email notifications are ignored`)
            continue
          }

          if (
            !subscription.details.message_type[notification.type] ||
            subscription.details.message_type[notification.type].email
          ) {
            logger.info(
              `Skipping sending email for ${notification.address} as email notifications for ${notification.type} are ignored`
            )
            continue
          }

          try {
            const email = await emailRenderer.renderEmail(subscription.email, notification)
            await sendGridClient.sendEmail(email)
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
        logger.warn(`Failed to send emails: ${error.metadata}`)
      }
    })
  }

  return {
    saveNotifications
  }
}
