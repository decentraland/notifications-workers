import { IConfigComponent, IFetchComponent, ILoggerComponent } from '@well-known-components/interfaces'
import { Email } from '../types'

export type ISendGridClient = {
  sendEmail: (email: Email) => Promise<void>
}

export type SendGridComponents = {
  config: IConfigComponent
  logs: ILoggerComponent
  fetch: IFetchComponent
}

export async function createSendGrid(
  components: Pick<SendGridComponents, 'config' | 'fetch' | 'logs'>
): Promise<ISendGridClient> {
  const { config, fetch, logs } = components
  const logger = logs.getLogger('sendgrid-client')

  const [env, apiBaseUrl, apiKey, emailFrom, emailTemplateId, sandboxMode] = await Promise.all([
    config.requireString('ENV'),
    config.requireString('SENDGRID_API_URL'),
    config.requireString('SENDGRID_API_KEY'),
    config.requireString('SENDGRID_EMAIL_FROM'),
    config.requireString('SENDGRID_EMAIL_TEMPLATE_ID'),
    config.getString('SENDGRID_SANDBOX_MODE')
  ])

  async function sendEmail(email: Email): Promise<void> {
    logger.info(`Sending email to ${email.to} with subject "${email.subject}"`)
    const data = {
      personalizations: [
        {
          to: [
            {
              email: email.to
            }
          ],
          dynamic_template_data: {
            subject: email.subject,
            address: email.to,
            content: email.content,
            actionButtonLink: email.actionButtonLink,
            actionButtonText: email.actionButtonText,
            unsubscribeAllUrl: email.unsubscribeAllUrl,
            unsubscribeOneUrl: email.unsubscribeOneUrl
          }
        }
      ],
      from: {
        email: email.from || emailFrom,
        name: 'Decentraland'
      },
      template_id: emailTemplateId,
      custom_args: {
        environment: env,
        tracking_id: email.tracking_id
      },
      attachments: email.attachments,
      mail_settings: {
        sandbox_mode: {
          enable: sandboxMode === 'true'
        }
      }
    }

    await fetch.fetch(`${apiBaseUrl}/v3/mail/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
  }

  return {
    sendEmail
  }
}
