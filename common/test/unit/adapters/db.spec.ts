import { createDbComponent, DbComponent, defaultSubscription, NotificationRecord } from '../../../src'
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
    test('returns default subscription when nothing found in db', async () => {
      pg.query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] })
      const address = '0x123'
      const res = await db.findSubscription(address)
      expect(res).toMatchObject({
        address,
        created_at: expect.anything(),
        details: defaultSubscription(),
        email: undefined,
        updated_at: expect.anything()
      })
      expect(pg.query).toHaveBeenCalledTimes(1)
    })

    test('returns what is found in the db', async () => {
      const exampleSubscription = {
        address: '0x123',
        email: 'some@example.net',
        details: defaultSubscription(),
        created_at: Date.now(),
        updated_at: Date.now()
      }
      pg.query = jest.fn().mockResolvedValue({
        rowCount: 1,
        rows: [exampleSubscription]
      })

      const address = '0x123'
      const res = await db.findSubscription(address)
      expect(res).toMatchObject(exampleSubscription)
      expect(pg.query).toHaveBeenCalledTimes(1)
    })
  })

  describe('findSubscriptions', () => {
    test('returns default subscriptions when nothing found in db', async () => {
      pg.query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] })
      const address = '0x123'
      const res = await db.findSubscriptions([address])
      expect(res).toMatchObject([
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

    test('returns what is found in the db', async () => {
      const exampleSubscription = {
        address: '0x123',
        email: 'some@example.net',
        details: defaultSubscription(),
        created_at: Date.now(),
        updated_at: Date.now()
      }
      pg.query = jest.fn().mockResolvedValue({
        rowCount: 1,
        rows: [exampleSubscription]
      })

      const address = '0x123'
      const res = await db.findSubscriptions([address])
      expect(res).toMatchObject([exampleSubscription])
      expect(pg.query).toHaveBeenCalledTimes(1)
    })
  })

  describe('findNotification', () => {
    test('returns undefined when nothing found in db', async () => {
      pg.query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] })
      const res = await db.findNotification('notif-id')
      expect(res).toBeUndefined()
      expect(pg.query).toHaveBeenCalledTimes(1)
    })

    test('returns what is found in the db', async () => {
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
      pg.query = jest.fn().mockResolvedValue({
        rowCount: 1,
        rows: [notification]
      })

      const res = await db.findNotification(notification.id)
      expect(res).toMatchObject(notification)
      expect(pg.query).toHaveBeenCalledTimes(1)
    })
  })

  describe('findNotifications', () => {
    test('returns what is returned from the db', async () => {
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
      pg.query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [notification] })
      const res = await db.findNotifications([], true, Date.now(), 10)
      expect(res).toMatchObject([notification])
      expect(pg.query).toHaveBeenCalledTimes(1)
    })
  })

  describe('markNotificationsAsRead', () => {
    test('marks notifications as read', async () => {
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
      pg.query = jest.fn().mockResolvedValue({ rowCount: 1, rows: [notification1.id] })

      const count = await db.markNotificationsAsRead(notification1.address, [notification1.id, notification2.id])
      expect(count).toBe(2)
    })
  })

  describe('saveSubscriptionDetails', () => {
    test('inserts a new subscription when nothing found in db', async () => {
      pg.query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] })
      const address = '0x123'
      const details = defaultSubscription()
      await db.saveSubscriptionDetails(address, details)
      expect(pg.query).toHaveBeenCalledTimes(1)
    })
  })

  describe('saveSubscriptionEmail', () => {
    test('inserts a new default subscription when nothing found in db', async () => {
      pg.query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] })
      const address = '0x123'
      const email = randomEmail()
      await db.saveSubscriptionEmail(address, email)
      expect(pg.query).toHaveBeenCalledTimes(1)
    })
  })

  describe('findUnconfirmedEmail', () => {
    test('returns undefined when no unconfirmed email found in db', async () => {
      pg.query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] })
      const address = '0x123'
      expect(await db.findUnconfirmedEmail(address)).toBeUndefined()
      expect(pg.query).toHaveBeenCalledTimes(1)
    })
    test('returns the unconfirmed email found in db', async () => {
      const unconfirmedEmail = {
        address: '0x123',
        email: randomEmail(),
        code: '1234',
        created_at: Date.now(),
        updated_at: Date.now()
      }
      pg.query = jest.fn().mockResolvedValue({ rowCount: 1, rows: [unconfirmedEmail] })
      expect(await db.findUnconfirmedEmail(unconfirmedEmail.address)).toMatchObject(unconfirmedEmail)
      expect(pg.query).toHaveBeenCalledTimes(1)
    })
  })

  describe('saveUnconfirmedEmail', () => {
    test('saves the unconfirmed email found in db', async () => {
      pg.query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] })
      const address = '0x123'
      const email = randomEmail()
      await db.saveUnconfirmedEmail(address, email, '1234')
      expect(pg.query).toHaveBeenCalledTimes(1)
    })
  })

  describe('deleteUnconfirmedEmail', () => {
    test('deletes the unconfirmed email from the db', async () => {
      pg.query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] })
      const address = '0x123'
      await db.deleteUnconfirmedEmail(address)
      expect(pg.query).toHaveBeenCalledTimes(1)
    })
  })

  describe('fetchLastUpdateForNotificationType', () => {
    test('returns the current time if no record in the db', async () => {
      pg.query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] })
      const lastUpdate = await db.fetchLastUpdateForNotificationType('some-notification-type')
      expect(Date.now() - lastUpdate).toBeLessThan(10_000)
      expect(pg.query).toHaveBeenCalledTimes(1)
    })
    test('returns the last update when found in the db', async () => {
      pg.query = jest.fn().mockResolvedValue({ rowCount: 1, rows: [{ last_successful_run_at: 123456 }] })
      const lastUpdate = await db.fetchLastUpdateForNotificationType('some-notification-type')
      expect(lastUpdate).toBe(123456)
      expect(pg.query).toHaveBeenCalledTimes(1)
    })
  })

  describe('updateLastUpdateForNotificationType', () => {
    test('updates the last update', async () => {
      pg.query = jest.fn().mockResolvedValue({ rowCount: 1, rows: [{ last_successful_run_at: 123456 }] })
      await db.updateLastUpdateForNotificationType('some-notification-type', 123445)
      expect(pg.query).toHaveBeenCalledTimes(1)
    })
  })

  describe('insertNotifications', () => {
    test('inserts notifications', async () => {
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
      pg.query = jest
        .fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ xmax: '0' }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ xmax: '1' }] })

      const result = await db.insertNotifications([notification1, notification2])
      expect(pg.query).toHaveBeenCalledTimes(2)
      expect(result.inserted).toMatchObject([notification1])
      expect(result.updated).toMatchObject([notification2])
    })
  })
})
