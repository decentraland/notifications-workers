import { createLogComponent } from '@well-known-components/logger'
import { notificationsHandler } from '../../../../src/controllers/handlers/notifications-handler'
import { AppComponents } from '../../../../src/types'
import querystring from 'node:querystring'

describe('notifications handler unit test', () => {
  async function mockComponents() {
    return {
      db: {
        findNotifications: jest.fn().mockResolvedValue([]),
        markNotificationsAsRead: jest.fn()
      },
      logs: await createLogComponent({})
    }
  }

  function executeHandler(components: Pick<AppComponents, 'db' | 'logs'>, qs: any) {
    const url = new URL(`http://localhost/notifications?${querystring.stringify(qs)}`)
    const verification = {
      auth: 'user1',
      authMetadata: {}
    }
    return notificationsHandler({ components, url, verification })
  }

  it('default values', async () => {
    const components = await mockComponents()
    await executeHandler(components, {})

    expect(components.db.findNotifications).toBeCalledWith(['user1'], false, 0, 20)
  })

  it('limit is invalid: should use the default', async () => {
    const components = await mockComponents()
    await executeHandler(components, { limit: 'a' })

    expect(components.db.findNotifications).toBeCalledWith(['user1'], false, 0, 20)
  })

  it('limit is out of range: should use the default', async () => {
    const components = await mockComponents()
    await executeHandler(components, { limit: '3000' })

    expect(components.db.findNotifications).toBeCalledWith(['user1'], false, 0, 20)
  })

  it('limit is ok: should use the provided value', async () => {
    const components = await mockComponents()
    await executeHandler(components, { limit: '30' })

    expect(components.db.findNotifications).toBeCalledWith(['user1'], false, 0, 30)
  })

  it('only unread', async () => {
    const components = await mockComponents()
    await executeHandler(components, { onlyUnread: true })

    expect(components.db.findNotifications).toBeCalledWith(['user1'], true, 0, 20)
  })

  it('from is invalid: should use 0', async () => {
    const components = await mockComponents()
    await executeHandler(components, { from: 'a' })

    expect(components.db.findNotifications).toBeCalledWith(['user1'], false, 0, 20)
  })

  it('from is ok: should use the provided value', async () => {
    const components = await mockComponents()
    await executeHandler(components, { from: 100 })

    expect(components.db.findNotifications).toBeCalledWith(['user1'], false, 100, 20)
  })
})
