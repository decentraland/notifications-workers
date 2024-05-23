import { DbComponent } from '@notifications/common'

export function createDbMock(): DbComponent {
  return {
    findSubscription: jest.fn(),
    findSubscriptions: jest.fn().mockResolvedValue([]),
    findNotification: jest.fn(),
    findNotifications: jest.fn().mockResolvedValue([]),
    markNotificationsAsRead: jest.fn(),
    saveSubscriptionDetails: jest.fn(),
    saveSubscriptionEmail: jest.fn(),
    findUnconfirmedEmail: jest.fn(),
    saveUnconfirmedEmail: jest.fn(),
    deleteUnconfirmedEmail: jest.fn(),
    fetchLastUpdateForNotificationType: jest.fn(),
    updateLastUpdateForNotificationType: jest.fn(),
    insertNotifications: jest.fn()
  }
}
