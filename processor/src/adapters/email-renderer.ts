import { NotificationType } from '@dcl/schemas'
import { IEmailRenderer, NotificationRecord } from '../types'
import * as fs from 'node:fs'
import * as path from 'path'
import mustache from 'mustache'

export function createRenderer(): IEmailRenderer {
  const templates = Object.values(NotificationType)
    .map((type) => fs.readFileSync(path.join(__dirname, `email-templates/${type}.mustache`), 'utf8'))
    .reduce(
      (acc, template, index) => {
        acc[Object.values(NotificationType)[index]] = template
        return acc
      },
      {} as Record<NotificationType, string>
    )

  function renderEmail(notification: NotificationRecord): string {
    return mustache.render(templates[notification.type], notification)
  }

  return {
    renderEmail
  }
}
