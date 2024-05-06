import * as fs from 'node:fs'
import * as path from 'path'
import handlebars from 'handlebars'
import { NotificationType } from '@dcl/schemas'
import { Email } from '@notifications/common'
import { AppComponents, IEmailRenderer, NotificationRecord } from '../types'
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

function loadTemplates(part: string) {
  return Object.values(NotificationType)
    .map((type) => fs.readFileSync(path.join(__dirname, `email-templates/${type}.${part}.handlebars`), 'utf8'))
    .reduce(
      (acc, template, index) => {
        acc[Object.values(NotificationType)[index]] = handlebars.compile(template, {})
        return acc
      },
      {} as Record<NotificationType, HandlebarsTemplateDelegate>
    )
}

export async function createRenderer(components: Pick<AppComponents, 'subscriptionService'>): Promise<IEmailRenderer> {
  const { subscriptionService } = components

  const contentTemplates = loadTemplates('content')
  const subjectTemplates = loadTemplates('subject')

  async function renderEmail(notification: NotificationRecord): Promise<Email> {
    const subscription = await subscriptionService.findSubscriptionForAddress(notification.address)
    const transformed = (transformers[notification.type] || nonTransformer)(notification)
    return {
      to: subscription?.email || '',
      subject: subjectTemplates[notification.type](transformed),
      content: contentTemplates[notification.type](transformed)
    }
  }

  return {
    renderEmail
  }
}
