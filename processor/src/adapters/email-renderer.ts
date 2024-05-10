import * as fs from 'node:fs'
import * as path from 'path'
import mustache from 'mustache'
import { NotificationType } from '@dcl/schemas'
import { AppComponents, Email, IEmailRenderer, NotificationRecord } from '../types'
import { formatMana } from '../logic/utils'

const nonTransformer = (notification: NotificationRecord): NotificationRecord => notification

const formatPriceAsMana = (notification: NotificationRecord) => ({
  ...notification,
  metadata: {
    ...notification.metadata,
    price: formatMana(notification.metadata.price)
  }
})

const formatRoyaltiesCutAsMana = (notification: NotificationRecord) => ({
  ...notification,
  metadata: {
    ...notification.metadata,
    royaltiesCut: formatMana(notification.metadata.royaltiesCut)
  }
})

const transformers: Partial<Record<NotificationType, (notification: NotificationRecord) => NotificationRecord>> = {
  [NotificationType.BID_ACCEPTED]: formatPriceAsMana,
  [NotificationType.BID_RECEIVED]: formatPriceAsMana,
  [NotificationType.ROYALTIES_EARNED]: formatRoyaltiesCutAsMana
}

export async function createRenderer(components: Pick<AppComponents, 'config'>): Promise<IEmailRenderer> {
  const { config } = components

  const from = await config.requireString('SENDGRID_EMAIL_FROM')

  function findEmailForAddress(address: string): string {
    return 'mariano.goldman@decentraland.org'
  }

  const templates = Object.values(NotificationType)
    .map((type) => fs.readFileSync(path.join(__dirname, `email-templates/${type}.mustache`), 'utf8'))
    .reduce(
      (acc, template, index) => {
        acc[Object.values(NotificationType)[index]] = template
        return acc
      },
      {} as Record<NotificationType, string>
    )

  function renderEmail(notification: NotificationRecord): Email {
    const transformer = transformers[notification.type] || nonTransformer
    return {
      from,
      to: findEmailForAddress(notification.address),
      subject: notification.metadata.title || 'Notification from Decentraland',
      content: mustache.render(templates[notification.type], transformer(notification))
    }
  }

  return {
    renderEmail
  }
}
