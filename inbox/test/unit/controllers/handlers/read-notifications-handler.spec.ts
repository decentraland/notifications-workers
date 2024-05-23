import { createLogComponent } from '@well-known-components/logger'
import { Request } from 'node-fetch'
import { readNotificationsHandler } from '../../../../src/controllers/handlers/read-notifications-handler'
import { InvalidRequestError } from '@dcl/platform-server-commons'
import { DbComponent } from '@notifications/common'
import { createDbMock } from '@notifications/processor/test/mocks/db-mock'

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
    const db = createDbMock()
    await expect(executeHandler(db, {})).rejects.toThrowError(InvalidRequestError)
  })

  it('should throw InvalidRequestError if no notificationIds are provided (empty list)', async () => {
    const db = createDbMock()
    await expect(executeHandler(db, { notificationIds: [] })).rejects.toThrowError(InvalidRequestError)
  })

  it('should execute markNotificationsAsRead', async () => {
    const db = createDbMock({
      markNotificationsAsRead: jest.fn().mockReturnValueOnce(10)
    })

    const notificationIds = ['n1', 'n2']
    const {
      body: { updated }
    } = await executeHandler(db, { notificationIds })

    expect(updated).toEqual(10)
    expect(db.markNotificationsAsRead).toHaveBeenCalledWith('user1', notificationIds)
  })
})
