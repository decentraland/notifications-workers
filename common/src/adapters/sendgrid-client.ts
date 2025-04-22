import { IConfigComponent, IFetchComponent, ILoggerComponent } from '@well-known-components/interfaces'
import { Email } from '../types'

export type ISendGridClient = {
  sendEmail: (email: Email, customArgs?: CustomArgs) => Promise<void>
}

export type SendGridComponents = {
  config: IConfigComponent
  logs: ILoggerComponent
  fetch: IFetchComponent
}

export type EmailType = 'notification' | 'validation_attempt'

export type CustomArgs = {
  environment: string
  tracking_id?: string
  email_type?: EmailType
}

export async function createSendGrid(
  components: Pick<SendGridComponents, 'config' | 'fetch' | 'logs'>
): Promise<ISendGridClient> {
  const { config, fetch, logs } = components
  const logger = logs.getLogger('sendgrid-client')

  const [apiBaseUrl, apiKey, emailFrom, emailTemplateId, sandboxMode] = await Promise.all([
    config.requireString('SENDGRID_API_URL'),
    config.requireString('SENDGRID_API_KEY'),
    config.requireString('SENDGRID_EMAIL_FROM'),
    config.requireString('SENDGRID_EMAIL_TEMPLATE_ID'),
    config.getString('SENDGRID_SANDBOX_MODE')
  ])

  async function sendEmail(email: Email, customArgs?: CustomArgs): Promise<void> {
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
            title: email.title,
            titleHighligth: email.titleHighligth,
            bannerUrl: email.bannerUrl,
            bannerLabel: email.bannerLabel,
            unsubscribeAllUrl: email.unsubscribeAllUrl,
            unsubscribeOneUrl: email.unsubscribeOneUrl,
            accountLink: email.accountLink
          }
        }
      ],
      from: {
        email: email.from || emailFrom,
        name: 'Decentraland'
      },
      template_id: emailTemplateId,
      custom_args: customArgs,
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
