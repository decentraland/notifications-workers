import * as fs from 'node:fs'
import * as path from 'path'
import handlebars from 'handlebars'
import { NotificationType } from '@dcl/schemas'
import { Email } from '@notifications/common'
import { AppComponents, IEmailRenderer, NotificationRecord } from '../types'
import { formatMana } from '../logic/utils'

enum TemplatePart {
  SUBJECT = 'subject',
  CONTENT = 'content'
}

function loadTemplates() {
  handlebars.registerHelper('formatMana', (mana: string) => formatMana(mana))

  return Object.values(NotificationType).reduce(
    (acc, notificationType) => {
      acc[notificationType] = {
        [TemplatePart.SUBJECT]: handlebars.compile(
          fs.readFileSync(
            path.join(__dirname, `email-templates/${notificationType}.${TemplatePart.SUBJECT}.handlebars`),
            'utf8'
          )
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

export async function createRenderer(components: Pick<AppComponents, 'subscriptionService'>): Promise<IEmailRenderer> {
  const { subscriptionService } = components

  const templates = loadTemplates()

  async function renderEmail(notification: NotificationRecord): Promise<Email> {
    const subscription = await subscriptionService.findSubscriptionForAddress(notification.address)
    return {
      to: subscription?.email || '',
      subject: templates[notification.type][TemplatePart.SUBJECT](notification),
      content: templates[notification.type][TemplatePart.CONTENT](notification)
    }
  }

  return {
    renderEmail
  }
}
