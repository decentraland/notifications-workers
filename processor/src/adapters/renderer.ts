import { NotificationType } from '@dcl/schemas'
import { AppComponents, IEmailRenderer, NotificationRecord } from '../types'
import * as fs from 'node:fs'
import * as path from 'path'

export function createRenderer({ pg: _pg }: Pick<AppComponents, 'pg' | 'logs'>): IEmailRenderer {
  const templates = Object.values(NotificationType)
    .map((type) => fs.readFileSync(path.join(__dirname, `email-templates/${type}.html`), 'utf8'))
    .reduce(
      (acc, template, index) => {
        acc[Object.values(NotificationType)[index]] = template
        return acc
      },
      {} as Record<NotificationType, string>
    )

  function renderEmail(notification: NotificationRecord): string {
    return templates[notification.type]
  }

  return {
    renderEmail
  }
}
