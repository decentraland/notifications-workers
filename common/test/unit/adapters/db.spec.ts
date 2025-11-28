import {
  createDbComponent,
  DbComponent,
  defaultSubscription,
  NotificationRecord,
  NotificationScope
} from '../../../src'
import { IPgComponent } from '@well-known-components/pg-component'
import { NotificationType } from '@dcl/schemas'
import { randomEmail } from '@notifications/inbox/test/utils'

describe('db client tests', () => {
  let pg: IPgComponent
  let db: DbComponent

  beforeEach(async () => {
    pg = {
      query: jest.fn(),
      start: jest.fn(),
      streamQuery: jest.fn(),
      getPool: jest.fn(),
      stop: jest.fn()
    }

    db = createDbComponent({ pg })
  })

  describe('findSubscription', () => {
    describe('when nothing found in db', () => {
      const address = '0x123'
      let result: any

      beforeEach(async () => {
        pg.query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] })
        result = await db.findSubscription(address)
      })

      it('returns default subscription', () => {
        expect(result).toMatchObject({
          address,
          created_at: expect.anything(),
          details: defaultSubscription(),
          email: undefined,
          updated_at: expect.anything()
        })
        expect(pg.query).toHaveBeenCalledTimes(1)
      })
    })

    describe('when subscription found in db', () => {
      const exampleSubscription = {
        address: '0x123',
        email: 'some@example.net',
        details: defaultSubscription(),
        created_at: Date.now(),
        updated_at: Date.now()
      }
      const address = '0x123'
      let result: any

      beforeEach(async () => {
        pg.query = jest.fn().mockResolvedValue({
          rowCount: 1,
          rows: [exampleSubscription]
        })
        result = await db.findSubscription(address)
      })

      it('returns what is found in the db', () => {
        expect(result).toMatchObject(exampleSubscription)
        expect(pg.query).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('findSubscriptions', () => {
    describe('when nothing found in db', () => {
      const address = '0x123'
      let result: any

      beforeEach(async () => {
        pg.query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] })
        result = await db.findSubscriptions([address])
      })

      it('returns default subscriptions', () => {
        expect(result).toMatchObject([
          {
            address,
            created_at: expect.anything(),
            details: defaultSubscription(),
            email: undefined,
            updated_at: expect.anything()
          }
        ])
        expect(pg.query).toHaveBeenCalledTimes(1)
      })
    })

    describe('when subscriptions found in db', () => {
      const exampleSubscription = {
        address: '0x123',
        email: 'some@example.net',
        details: defaultSubscription(),
        created_at: Date.now(),
        updated_at: Date.now()
      }
      const address = '0x123'
      let result: any

      beforeEach(async () => {
        pg.query = jest.fn().mockResolvedValue({
          rowCount: 1,
          rows: [exampleSubscription]
        })
        result = await db.findSubscriptions([address])
      })

      it('returns what is found in the db', () => {
        expect(result).toMatchObject([exampleSubscription])
        expect(pg.query).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('findNotification', () => {
    describe('when nothing found in db', () => {
      const notificationId = 'notif-id'
      let result: any

      beforeEach(async () => {
        pg.query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] })
        result = await db.findNotification(notificationId)
      })

      it('returns undefined', () => {
        expect(result).toBeUndefined()
        expect(pg.query).toHaveBeenCalledTimes(1)
      })
    })

    describe('when notification found in db', () => {
      const notification = {
        id: 'notif-id',
        event_key: 'some-event',
        type: NotificationType.WORLDS_ACCESS_RESTRICTED,
        address: '0x123',
        metadata: {},
        timestamp: Date.now(),
        read_at: undefined,
        created_at: Date.now(),
        updated_at: Date.now()
      }
      let result: any

      beforeEach(async () => {
        pg.query = jest.fn().mockResolvedValue({
          rowCount: 1,
          rows: [notification]
        })
        result = await db.findNotification(notification.id)
      })

      it('returns what is found in the db', () => {
        expect(result).toMatchObject(notification)
        expect(pg.query).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('findNotifications', () => {
    const notification = {
      id: 'notif-id',
      event_key: 'some-event',
      type: NotificationType.WORLDS_ACCESS_RESTRICTED,
      address: '0x123',
      metadata: {},
      timestamp: Date.now(),
      read_at: undefined,
      created_at: Date.now(),
      updated_at: Date.now()
    }
    let result: any

    beforeEach(async () => {
      pg.query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [notification] })
      result = await db.findNotifications([], true, Date.now(), 10)
    })

    it('returns what is returned from the db', () => {
      expect(result).toMatchObject([notification])
      expect(pg.query).toHaveBeenCalledTimes(1)
    })
  })

  describe('markNotificationsAsRead', () => {
    const notification1 = {
      id: 'notif-id-1',
      event_key: 'some-event',
      type: NotificationType.WORLDS_ACCESS_RESTRICTED,
      address: '0x123',
      metadata: {},
      timestamp: Date.now(),
      read_at: undefined,
      created_at: Date.now(),
      updated_at: Date.now()
    }
    const notification2 = {
      id: 'notif-id-2',
      event_key: 'some-event',
      type: NotificationType.WORLDS_MISSING_RESOURCES,
      metadata: {},
      timestamp: Date.now(),
      read_at: undefined,
      created_at: Date.now(),
      updated_at: Date.now()
    }
    let count: number

    beforeEach(async () => {
      pg.query = jest.fn().mockResolvedValue({ rowCount: 1, rows: [notification1.id] })
      count = await db.markNotificationsAsRead(notification1.address, [notification1.id, notification2.id])
    })

    it('marks notifications as read', () => {
      expect(count).toBe(2)
    })
  })

  describe('saveSubscriptionDetails', () => {
    const address = '0x123'
    const details = defaultSubscription()

    beforeEach(async () => {
      pg.query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] })
      await db.saveSubscriptionDetails(address, details)
    })

    it('inserts a new subscription when nothing found in db', () => {
      expect(pg.query).toHaveBeenCalledTimes(1)
    })
  })

  describe('saveSubscriptionEmail', () => {
    const address = '0x123'
    const email = randomEmail()

    beforeEach(async () => {
      pg.query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] })
      await db.saveSubscriptionEmail(address, email)
    })

    it('inserts a new default subscription when nothing found in db', () => {
      expect(pg.query).toHaveBeenCalledTimes(1)
    })
  })

  describe('findUnconfirmedEmail', () => {
    describe('when no unconfirmed email found in db', () => {
      const address = '0x123'
      let result: any

      beforeEach(async () => {
        pg.query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] })
        result = await db.findUnconfirmedEmail(address)
      })

      it('returns undefined', () => {
        expect(result).toBeUndefined()
        expect(pg.query).toHaveBeenCalledTimes(1)
      })
    })

    describe('when unconfirmed email found in db', () => {
      const unconfirmedEmail = {
        address: '0x123',
        email: randomEmail(),
        code: '1234',
        created_at: Date.now(),
        updated_at: Date.now()
      }
      let result: any

      beforeEach(async () => {
        pg.query = jest.fn().mockResolvedValue({ rowCount: 1, rows: [unconfirmedEmail] })
        result = await db.findUnconfirmedEmail(unconfirmedEmail.address)
      })

      it('returns the unconfirmed email found in db', () => {
        expect(result).toMatchObject(unconfirmedEmail)
        expect(pg.query).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('saveUnconfirmedEmail', () => {
    const address = '0x123'
    const email = randomEmail()
    const code = '1234'

    beforeEach(async () => {
      pg.query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] })
      await db.saveUnconfirmedEmail(address, email, code)
    })

    it('saves the unconfirmed email found in db', () => {
      expect(pg.query).toHaveBeenCalledTimes(1)
    })
  })

  describe('deleteUnconfirmedEmail', () => {
    const address = '0x123'

    beforeEach(async () => {
      pg.query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] })
      await db.deleteUnconfirmedEmail(address)
    })

    it('deletes the unconfirmed email from the db', () => {
      expect(pg.query).toHaveBeenCalledTimes(1)
    })
  })

  describe('fetchLastUpdateForNotificationType', () => {
    const notificationType = 'some-notification-type'

    describe('when no record in the db', () => {
      let lastUpdate: number

      beforeEach(async () => {
        pg.query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] })
        lastUpdate = await db.fetchLastUpdateForNotificationType(notificationType)
      })

      it('returns the current time', () => {
        expect(Date.now() - lastUpdate).toBeLessThan(10_000)
        expect(pg.query).toHaveBeenCalledTimes(1)
      })
    })

    describe('when record found in the db', () => {
      const expectedTimestamp = 123456
      let lastUpdate: number

      beforeEach(async () => {
        pg.query = jest.fn().mockResolvedValue({ rowCount: 1, rows: [{ last_successful_run_at: expectedTimestamp }] })
        lastUpdate = await db.fetchLastUpdateForNotificationType(notificationType)
      })

      it('returns the last update', () => {
        expect(lastUpdate).toBe(expectedTimestamp)
        expect(pg.query).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('updateLastUpdateForNotificationType', () => {
    const notificationType = 'some-notification-type'
    const timestamp = 123445

    beforeEach(async () => {
      pg.query = jest.fn().mockResolvedValue({ rowCount: 1, rows: [{ last_successful_run_at: 123456 }] })
      await db.updateLastUpdateForNotificationType(notificationType, timestamp)
    })

    it('updates the last update', () => {
      expect(pg.query).toHaveBeenCalledTimes(1)
    })
  })

  describe('insertNotifications', () => {
    const notification1 = {
      eventKey: 'some-event-1',
      type: NotificationType.WORLDS_ACCESS_RESTRICTED,
      address: '0x123',
      metadata: {},
      timestamp: Date.now()
    }
    const notification2 = {
      eventKey: 'some-event-2',
      type: NotificationType.WORLDS_PERMISSION_REVOKED,
      metadata: {},
      timestamp: Date.now()
    } as NotificationRecord
    let result: any

    beforeEach(async () => {
      pg.query = jest
        .fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ xmax: '0' }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ xmax: '1' }] })

      result = await db.insertNotifications([notification1, notification2])
    })

    it('inserts notifications', () => {
      expect(pg.query).toHaveBeenCalledTimes(2)
      expect(result.inserted).toMatchObject([notification1])
      expect(result.updated).toMatchObject([notification2])
    })
  })

  describe('findNotificationOptOutsForAddressesAndScopes', () => {
    describe('when no pairs provided', () => {
      let result: any

      beforeEach(async () => {
        result = await db.findNotificationOptOutsForAddressesAndScopes([])
      })

      it('returns empty array', () => {
        expect(result).toEqual([])
        expect(pg.query).not.toHaveBeenCalled()
      })
    })

    describe('when matching opt-outs exist', () => {
      const optOut1 = {
        address: '0x123',
        scope: NotificationScope.Community,
        scope_id: 'community-1',
        created_at: Date.now(),
        updated_at: Date.now()
      }
      const optOut2 = {
        address: '0x456',
        scope: NotificationScope.Community,
        scope_id: 'community-2',
        created_at: Date.now(),
        updated_at: Date.now()
      }
      const pairs = [
        { address: '0x123', scope: NotificationScope.Community, scopeId: 'community-1' },
        { address: '0x456', scope: NotificationScope.Community, scopeId: 'community-2' }
      ]
      let result: any

      beforeEach(async () => {
        pg.query = jest.fn().mockResolvedValue({
          rowCount: 2,
          rows: [optOut1, optOut2]
        })
        result = await db.findNotificationOptOutsForAddressesAndScopes(pairs)
      })

      it('returns matching opt-outs for address and scope combinations', () => {
        expect(result).toHaveLength(2)
        expect(result).toMatchObject([optOut1, optOut2])
        expect(pg.query).toHaveBeenCalledTimes(1)
      })
    })

    describe('when some combinations do not exist', () => {
      const optOut1 = {
        address: '0x123',
        scope: NotificationScope.Community,
        scope_id: 'community-1',
        created_at: Date.now(),
        updated_at: Date.now()
      }
      const pairs = [
        { address: '0x123', scope: NotificationScope.Community, scopeId: 'community-1' },
        { address: '0x456', scope: NotificationScope.Community, scopeId: 'community-2' }
      ]
      let result: any

      beforeEach(async () => {
        pg.query = jest.fn().mockResolvedValue({
          rowCount: 1,
          rows: [optOut1]
        })
        result = await db.findNotificationOptOutsForAddressesAndScopes(pairs)
      })

      it('returns only matching opt-outs', () => {
        expect(result).toHaveLength(1)
        expect(result).toMatchObject([optOut1])
        expect(pg.query).toHaveBeenCalledTimes(1)
      })
    })

    describe('when address needs normalization', () => {
      const optOut = {
        address: '0x123',
        scope: NotificationScope.Community,
        scope_id: 'community-1',
        created_at: Date.now(),
        updated_at: Date.now()
      }
      const pairs = [{ address: '0X123', scope: NotificationScope.Community, scopeId: 'community-1' }]

      beforeEach(async () => {
        pg.query = jest.fn().mockResolvedValue({
          rowCount: 1,
          rows: [optOut]
        })
        await db.findNotificationOptOutsForAddressesAndScopes(pairs)
      })

      it('normalizes addresses to lowercase', () => {
        const queryCall = (pg.query as jest.Mock).mock.calls[0][0]
        const values = queryCall.values || []
        expect(values).toContain('0x123')
      })
    })
  })
})
