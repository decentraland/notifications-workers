import { createLogComponent } from '@well-known-components/logger'
import { createEventsDispatcherComponent } from '../../src/adapters/events-dispatcher'

describe('events dispatcher adapter unit test', () => {
  it('should dispatch to each client', async () => {
    const notifications = [
      {
        notification_id: 'n1',
        origin_id: '91',
        type: 'push',
        source: 'sqs',
        timestamp: Date.now(),
        created_at: Date.now(),
        updated_at: Date.now(),
        address: 'user1',
        read: false,
        metadata: {}
      },
      {
        notification_id: 'n2',
        origin_id: '91',
        type: 'push',
        source: 'sqs',
        timestamp: Date.now(),
        created_at: Date.now(),
        updated_at: Date.now(),
        address: 'user1',
        read: false,
        metadata: {}
      },
      {
        notification_id: 'n3',
        origin_id: '91',
        type: 'push',
        source: 'sqs',
        timestamp: Date.now(),
        created_at: Date.now(),
        updated_at: Date.now(),
        address: 'user2',
        read: false,
        metadata: {}
      }
    ]

    const logs = await createLogComponent({})
    const db = {
      findNotifications: jest.fn(),
      markNotificationsAsRead: jest.fn()
    }

    db.findNotifications.mockResolvedValueOnce(notifications)

    const dispatcher = createEventsDispatcherComponent({ logs, db })

    const user1Stream = {
      push: jest.fn()
    }

    const user2Stream = {
      push: jest.fn()
    }

    const user3Stream = {
      push: jest.fn()
    }

    const user1Session = dispatcher.addClient({ userId: 'user1', stream: user1Stream })
    const user2Session = dispatcher.addClient({ userId: 'user2', stream: user2Stream })
    const user3Session = dispatcher.addClient({ userId: 'user3', stream: user3Stream })

    expect(dispatcher.sessionsCount()).toEqual(3)

    await dispatcher.poll(0)

    expect(user1Stream.push).toHaveBeenCalledTimes(2)
    expect(user2Stream.push).toHaveBeenCalledTimes(1)
    expect(user3Stream.push).toHaveBeenCalledTimes(0)

    dispatcher.removeClient(user1Session)
    dispatcher.removeClient(user2Session)
    dispatcher.removeClient(user3Session)
    expect(dispatcher.sessionsCount()).toEqual(0)
  })
})
