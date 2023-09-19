import { insertNotification } from '@notifications/commons'
import { test } from '../components'

test('db adapter integration tests', function ({ components }) {
  beforeEach(async () => {
    const { pg } = components
    await pg.query('TRUNCATE notifications, users_notifications')
  })

  it('should work', async () => {
    const { pg, db } = components

    const notification1 = {
      sid: 'n1',
      epoch: Date.now(),
      users: ['user1', 'user2']
    }

    const notification2 = {
      sid: 'n2',
      epoch: Date.now(),
      users: ['user1']
    }

    await insertNotification(pg, notification1, { type: 'dcl', source: 'push' })
    await insertNotification(pg, notification2, { type: 'dcl', source: 'push' })

    const notifications = await db.findNotifications(['user1'], false, 50, 0)
    expect(notifications).toEqual('asdad')
  })
})
