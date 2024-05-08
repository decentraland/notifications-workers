import { AppComponents, ISendGridClient, NotificationRecord } from '../types'
import { NotificationType } from '@dcl/schemas'

export async function createSendGrid(
  components: Pick<AppComponents, 'config' | 'emailRenderer' | 'fetcher' | 'logs'>
): Promise<ISendGridClient> {
  const { emailRenderer, fetcher, logs, config } = components
  const logger = logs.getLogger('sendgrid')
  const [apiBaseUrl, apiKey, emailFrom, emailTemplateId] = await Promise.all([
    config.requireString('SENDGRID_API_URL'),
    config.requireString('SENDGRID_API_KEY'),
    config.requireString('SENDGRID_EMAIL_FROM'),
    config.requireString('SENDGRID_EMAIL_TEMPLATE_ID')
  ])

  async function sendEmail(email: string, type: NotificationType, notification: NotificationRecord): Promise<void> {
    logger.info(`Sending email to ${email} with type ${type} and metadata ${JSON.stringify(notification.metadata)}`)
    await fetcher.fetch(`${apiBaseUrl}/v3/mail/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: emailFrom },
        subject: notification.metadata.title,
        content: [{ type: 'text/html' }],
        template_id: emailTemplateId,
        dynamic_template_data: {
          address: notification.address,
          content: emailRenderer.renderEmail(notification),
          actionButtonLink: 'https://decentraland.org',
          actionButtonText: 'Enter'
        },
        mail_settings: {
          sandbox_mode: {
            enable: true // TODO base on env
          }
        }
      })
    })
  }

  return {
    sendEmail
  }
}
