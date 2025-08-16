import { DbComponent } from '@notifications/common'

export function createDbMock(db: Partial<DbComponent> = {}): DbComponent {
  return {
    findSubscription: jest.fn(),
    findSubscriptions: jest.fn().mockResolvedValue([]),
    findSubscriptionByEmail: jest.fn().mockResolvedValue(undefined),
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
    insertNotifications: jest.fn(),
    ...db
  }
}
