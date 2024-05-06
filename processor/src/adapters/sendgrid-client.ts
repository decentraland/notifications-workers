import { AppComponents, ISendGridClient } from '../types'
import { NotificationType } from '@dcl/schemas'

export async function createSendGrid(
  components: Pick<AppComponents, 'fetcher' | 'logs' | 'config'>
): Promise<ISendGridClient> {
  const { fetcher, logs, config } = components
  const logger = logs.getLogger('sendgrid')
  const [apiBaseUrl, apiKey, emailFrom] = await Promise.all([
    config.requireString('SENDGRID_API_URL'),
    config.requireString('SENDGRID_API_KEY'),
    config.requireString('SENDGRID_EMAIL_FROM')
  ])

  async function sendEmail(email: string, type: NotificationType, metadata: any): Promise<void> {
    logger.info(`Sending email to ${email} with type ${type} and metadata ${JSON.stringify(metadata)}`)
    await fetcher.fetch(`${apiBaseUrl}/v3/mail/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: emailFrom },
        subject: 'Hello, World!', // TODO Base this on notification type
        content: [{ type: 'text/plain', value: 'Heya!' }],
        template_id: 'd-3e040098c660453f8ac9c00a0b73925c', // TODO see if we're going to use a single template or one for each type
        dynamic_template_data: { metadata },
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
