import { createConfigComponent } from '@well-known-components/env-config-provider'
import { createEmailRenderer, IEmailRenderer } from '../../../src/adapters/email-renderer'
import { createNotificationsService, INotificationsService } from '../../../src/adapters/notifications-service'
import { createDbMock } from '../../mocks/db-mock'
import { createLogComponent } from '@well-known-components/logger'
import { ILoggerComponent } from '@well-known-components/interfaces'
import { DbComponent, ISendGridClient, NotificationEntityType, NotificationOptOutDb } from '@notifications/common'
import { createSubscriptionsService } from '../../../src/adapters/subscriptions-service'
import { createSendGridClientMock } from '../../mocks/sendgrid-mock'
import { NotificationType } from '@dcl/schemas'
import { makeid } from '../../utils'

describe('notifications service tests', () => {
  let config = createConfigComponent({
    SIGNING_KEY: 'some-super-secret-key',
    SERVICE_BASE_URL: 'https://notifications.decentraland.org',
    ACCOUNT_BASE_URL: 'https://decentraland.zone/account',
    ENV: 'test'
  })
  let logs: ILoggerComponent
  let db: DbComponent
  let sendGridClient: ISendGridClient
  let emailRenderer: IEmailRenderer

  let notificationsService: INotificationsService

  beforeEach(async () => {
    logs = await createLogComponent({ config })
    db = createDbMock()
    sendGridClient = createSendGridClientMock()
    emailRenderer = await createEmailRenderer({ config })
    const subscriptionService = await createSubscriptionsService({ db, logs })

    notificationsService = await createNotificationsService({
      config,
      db,
      emailRenderer,
      logs,
      sendGridClient,
      subscriptionService,
      profiles: { getByAddress: jest.fn() }
    })
  })

  describe('when saving notifications', () => {
    const notification = {
      type: NotificationType.WORLDS_ACCESS_RESTORED,
      address: '0x69D30b1875d39E13A01AF73CCFED6d84839e84f2',
      metadata: {
        url: 'https://decentraland.org/builder/worlds?tab=dcl',
        title: 'Worlds available',
        description: 'Access to your Worlds has been restored.'
      },
      timestamp: Date.now(),
      eventKey: makeid(10)
    }

    beforeEach(async () => {
      ;(db.insertNotifications as any).mockResolvedValue({ inserted: [notification], updated: [] })
      await notificationsService.saveNotifications([notification])
    })

    it('persists them in the database', () => {
      expect(db.insertNotifications).toHaveBeenCalledWith([notification])
    })
  })

  describe('when no notifications are provided', () => {
    beforeEach(async () => {
      await notificationsService.saveNotifications([])
    })

    it('does not write to the database', () => {
      expect(db.insertNotifications).not.toHaveBeenCalled()
    })
  })

  describe('when notifications match opt-outs', () => {
    const address = '0x69D30b1875d39E13A01AF73CCFED6d84839e84f2'
    const communityNotification = {
      type: NotificationType.COMMUNITY_POST_ADDED,
      address,
      metadata: {
        communityId: 'community-123'
      },
      entity: {
        type: NotificationEntityType.Community,
        id: 'community-123'
      },
      timestamp: Date.now(),
      eventKey: makeid(10)
    }
    const otherNotification = {
      type: NotificationType.WORLDS_ACCESS_RESTORED,
      address,
      metadata: {},
      timestamp: Date.now(),
      eventKey: makeid(10)
    }

    beforeEach(async () => {
      const optOutRow: NotificationOptOutDb = {
        address: address.toLowerCase(),
        entity: NotificationEntityType.Community,
        entity_id: 'community-123',
        created_at: Date.now(),
        updated_at: Date.now()
      }

      ;(db.findNotificationOptOutsForAddresses as jest.Mock).mockResolvedValue([optOutRow])
      ;(db.insertNotifications as jest.Mock).mockResolvedValue({ inserted: [otherNotification], updated: [] })
      await notificationsService.saveNotifications([communityNotification, otherNotification])
    })

    it('filters out notifications with matching opt-outs', () => {
      expect(db.insertNotifications).toHaveBeenCalledWith([otherNotification])
    })
  })
  describe('when multiple notifications share the same address but only some match an opt-out', () => {
    const address = '0x69D30b1875d39E13A01AF73CCFED6d84839e84f2'
    const communityNotification = {
      type: NotificationType.COMMUNITY_POST_ADDED,
      address,
      metadata: {
        communityId: 'community-123'
      },
      entity: {
        type: NotificationEntityType.Community,
        id: 'community-123'
      },
      timestamp: Date.now(),
      eventKey: makeid(10)
    }
    const otherNotification = {
      type: NotificationType.WORLDS_ACCESS_RESTORED,
      address,
      metadata: {},
      timestamp: Date.now(),
      eventKey: makeid(10)
    }

    beforeEach(async () => {
      const optOutRow: NotificationOptOutDb = {
        address: address.toLowerCase(),
        entity: NotificationEntityType.Community,
        entity_id: 'community-123',
        created_at: Date.now(),
        updated_at: Date.now()
      }

      ;(db.findNotificationOptOutsForAddresses as jest.Mock).mockResolvedValue([optOutRow])
      ;(db.insertNotifications as jest.Mock).mockResolvedValue({ inserted: [otherNotification], updated: [] })
      await notificationsService.saveNotifications([communityNotification, otherNotification])
    })

    it('persists only the notification that does not match the opt-out', () => {
      expect(db.insertNotifications).toHaveBeenCalledWith([otherNotification])
    })
  })

  describe('when notification metadata lacks the configured opt-out key', () => {
    const address = '0x69D30b1875d39E13A01AF73CCFED6d84839e84f2'
    const notification = {
      type: NotificationType.COMMUNITY_POST_ADDED,
      address,
      metadata: {},
      timestamp: Date.now(),
      eventKey: makeid(10)
    }

    beforeEach(async () => {
      const optOutRow: NotificationOptOutDb = {
        address: address.toLowerCase(),
        entity: NotificationEntityType.Community,
        entity_id: 'community-123',
        created_at: Date.now(),
        updated_at: Date.now()
      }

      ;(db.findNotificationOptOutsForAddresses as jest.Mock).mockResolvedValue([optOutRow])
      ;(db.insertNotifications as jest.Mock).mockResolvedValue({ inserted: [notification], updated: [] })
      await notificationsService.saveNotifications([notification])
    })

    it('persists the notification because the metadata key is absent', () => {
      expect(db.insertNotifications).toHaveBeenCalledWith([notification])
    })
  })
})
