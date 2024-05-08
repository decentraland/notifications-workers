import { NotificationType } from '@dcl/schemas'
import { IEmailRenderer, NotificationRecord } from '../types'
import * as fs from 'node:fs'
import * as path from 'path'
import mustache from 'mustache'
import { formatMana } from '../logic/utils'

const nonTransformer = (notification: NotificationRecord): NotificationRecord => notification

const formatPriceAsMana = (notification: NotificationRecord) => ({
  ...notification,
  metadata: {
    ...notification.metadata,
    price: formatMana(notification.metadata.price)
  }
})

const transformers: Partial<Record<NotificationType, (notification: NotificationRecord) => NotificationRecord>> = {
  [NotificationType.BID_ACCEPTED]: formatPriceAsMana,
  [NotificationType.BID_RECEIVED]: formatPriceAsMana
}

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
    const transformer = transformers[notification.type] || nonTransformer
    return mustache.render(templates[notification.type], transformer(notification))
  }

  return {
    renderEmail
  }
}
