import * as fs from 'node:fs'
import * as path from 'path'
import handlebars from 'handlebars'
import { NotificationType } from '@dcl/schemas'
import { Email, NotificationRecord } from '@notifications/common'
import { AppComponents } from '../types'
import { formatMana } from '../logic/utils'
import { signUrl } from '@notifications/common/dist/signing'

export type IEmailRenderer = {
  renderTemplate(email: Email): Promise<string>
  renderEmail(emailAddress: string, notification: NotificationRecord): Promise<Email>
}

enum TemplatePart {
  SUBJECT = 'subject',
  CONTENT = 'content'
}

function loadTemplates() {
  handlebars.registerHelper('formatMana', (mana: string) => formatMana(mana))
  handlebars.registerHelper('escape', (variable: string) => {
    const s = JSON.stringify(variable || '""')
    // we remove the start and end quotes
    return s.substring(1, s.length - 1)
  })
  handlebars.registerHelper('land', (variable: string) => {
    // TODO let's do something better here
    return variable
  })
  handlebars.registerHelper('days', (from: string, to: string) => (parseInt(to) - parseInt(from)) / 86400)
  handlebars.registerHelper('insert', (text: string, defaultText: string) => (text ? text : defaultText))

  return Object.values(NotificationType).reduce(
    (acc, notificationType) => {
      acc[notificationType] = {
        [TemplatePart.SUBJECT]: handlebars.compile(
          fs.readFileSync(
            path.join(__dirname, `email-templates/${notificationType}.${TemplatePart.SUBJECT}.handlebars`),
            'utf8'
          ),
          { noEscape: true }
        ),
        [TemplatePart.CONTENT]: handlebars.compile(
          fs.readFileSync(
            path.join(__dirname, `email-templates/${notificationType}.${TemplatePart.CONTENT}.handlebars`),
            'utf8'
          )
        )
      }
      return acc
    },
    {} as Record<NotificationType, Record<TemplatePart, HandlebarsTemplateDelegate>>
  )
}

export async function createEmailRenderer(components: Pick<AppComponents, 'config'>): Promise<IEmailRenderer> {
  const [signingKey, serviceBaseUrl] = await Promise.all([
    components.config.requireString('SIGNING_KEY'),
    components.config.requireString('SERVICE_BASE_URL')
  ])

  const templates = loadTemplates()

  const emailTemplate = handlebars.compile(
    fs.readFileSync(path.join(__dirname, 'email-templates/email-template.handlebars'), 'utf8')
  )

  async function renderTemplate(email: Email): Promise<string> {
    return emailTemplate(email)
  }

  async function renderEmail(emailAddress: string, notification: NotificationRecord): Promise<Email> {
    const unsubscribeAllUrl = signUrl(
      signingKey,
      new URL(`/unsubscribe/${notification.address}`, serviceBaseUrl).toString()
    )
    const unsubscribeOneUrl = signUrl(
      signingKey,
      new URL(`/unsubscribe/${notification.address}/${notification.type}`, serviceBaseUrl).toString()
    )

    return {
      to: emailAddress,
      content: templates[notification.type][TemplatePart.CONTENT](notification),
      ...JSON.parse(templates[notification.type][TemplatePart.SUBJECT](notification)),
      unsubscribeAllUrl,
      unsubscribeOneUrl,
      tracking_id: notification
    }
  }

  return {
    renderTemplate,
    renderEmail
  }
}
