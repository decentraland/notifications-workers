import * as fs from 'node:fs'
import * as path from 'path'
import handlebars from 'handlebars'
import { NotificationType } from '@dcl/schemas'
import { Email } from '@notifications/common'
import { NotificationRecord } from '../types'
import { formatMana } from '../logic/utils'

export type IEmailRenderer = {
  renderEmail(emailAddress: string, notification: NotificationRecord): Promise<Email>
}

enum TemplatePart {
  SUBJECT = 'subject',
  CONTENT = 'content'
}

function loadTemplates() {
  handlebars.registerHelper('formatMana', (mana: string) => formatMana(mana))
  handlebars.registerHelper('escape', (variable: string) => {
    const s = JSON.stringify(variable)
    // we remove the start and end quotes
    return s.substring(1, s.length - 1)
  })

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
          ),
          { noEscape: true }
        )
      }
      return acc
    },
    {} as Record<NotificationType, Record<TemplatePart, HandlebarsTemplateDelegate>>
  )
}

export async function createEmailRenderer(): Promise<IEmailRenderer> {
  const templates = loadTemplates()

  async function renderEmail(emailAddress: string, notification: NotificationRecord): Promise<Email> {
    const text = templates[notification.type][TemplatePart.SUBJECT](notification)
    console.log('text', text)
    return {
      to: emailAddress,
      content: templates[notification.type][TemplatePart.CONTENT](notification),
      ...JSON.parse(text)
    }
  }

  return {
    renderEmail
  }
}
