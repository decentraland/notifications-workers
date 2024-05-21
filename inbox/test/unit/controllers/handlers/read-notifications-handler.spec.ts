import { createLogComponent } from '@well-known-components/logger'
import { DbComponent } from '../../../../src/adapters/db'
import { Request } from 'node-fetch'
import { readNotificationsHandler } from '../../../../src/controllers/handlers/read-notifications-handler'
import { InvalidRequestError } from '@dcl/platform-server-commons'
import { NotificationDb } from '@notifications/common/dist/types'

describe('read notifications handler unit test', () => {
  async function executeHandler(db: DbComponent, body: any) {
    const logs = await createLogComponent({})
    const verification = {
      auth: 'user1',
      authMetadata: {}
    }
    const request = new Request('', {
      method: 'POST',
      body: JSON.stringify(body)
    })
    return readNotificationsHandler({ components: { db, logs }, verification, request })
  }

  it('should throw InvalidRequestError if no notificationIds are provided', async () => {
    const db: DbComponent = {
      findSubscription: jest.fn(),
      findNotification: jest.fn(),
      findNotifications: jest.fn(),
      markNotificationsAsRead: jest.fn(),
      saveSubscriptionDetails: jest.fn(),
      saveSubscriptionEmail: jest.fn(),
      findUnconfirmedEmail: jest.fn(),
      saveUnconfirmedEmail: jest.fn(),
      deleteUnconfirmedEmail: jest.fn()
    }
    await expect(executeHandler(db, {})).rejects.toThrowError(InvalidRequestError)
  })

  it('should throw InvalidRequestError if no notificationIds are provided (empty list)', async () => {
    const db: DbComponent = {
      findSubscription: jest.fn(),
      findNotification: jest.fn(),
      findNotifications: jest.fn(),
      markNotificationsAsRead: jest.fn(),
      saveSubscriptionDetails: jest.fn(),
      saveSubscriptionEmail: jest.fn(),
      findUnconfirmedEmail: jest.fn(),
      saveUnconfirmedEmail: jest.fn(),
      deleteUnconfirmedEmail: jest.fn()
    }
    await expect(executeHandler(db, { notificationIds: [] })).rejects.toThrowError(InvalidRequestError)
  })

  it('should execute markNotificationsAsRead', async () => {
    const db: DbComponent = {
      findSubscription: jest.fn(),
      findNotification: jest.fn(),
      findNotifications: jest.fn(),
      markNotificationsAsRead: jest.fn().mockReturnValueOnce(10),
      saveSubscriptionDetails: jest.fn(),
      saveSubscriptionEmail: jest.fn(),
      findUnconfirmedEmail: jest.fn(),
      saveUnconfirmedEmail: jest.fn(),
      deleteUnconfirmedEmail: jest.fn()
    }

    const notificationIds = ['n1', 'n2']
    const {
      body: { updated }
    } = await executeHandler(db, { notificationIds })

    expect(updated).toEqual(10)
    expect(db.markNotificationsAsRead).toHaveBeenCalledWith('user1', notificationIds)
  })
})
