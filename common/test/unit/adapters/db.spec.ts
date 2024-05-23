import { createDbComponent, DbComponent, defaultSubscription } from '../../../src'
import { IPgComponent } from '@well-known-components/pg-component'
import { NotificationType } from '@dcl/schemas'

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
      const address = '0x123'
      const res = await db.findNotification('notif-id')
      expect(res).toBeUndefined()
      expect(pg.query).toHaveBeenCalledTimes(1)
    })

    test('findSubscription returns what is found in the db', async () => {
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
})
