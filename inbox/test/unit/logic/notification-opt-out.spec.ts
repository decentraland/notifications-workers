import { createNotificationOptOutsManager, INotificationOptOutsManager } from '../../../src/logic/notification-opt-out'
import { DbComponent, NotificationScope } from '@notifications/common'
import { ILoggerComponent } from '@well-known-components/interfaces'

describe('Notification Opt-Outs Manager', () => {
  let mockDb: jest.Mocked<
    Pick<DbComponent, 'saveNotificationOptOut' | 'deleteNotificationOptOut' | 'hasNotificationOptOut'>
  >
  let mockLogs: jest.Mocked<Pick<ILoggerComponent, 'getLogger'>>
  let notificationOptOutsManager: INotificationOptOutsManager

  beforeEach(() => {
    mockDb = {
      saveNotificationOptOut: jest.fn(),
      deleteNotificationOptOut: jest.fn(),
      hasNotificationOptOut: jest.fn()
    } as jest.Mocked<Pick<DbComponent, 'saveNotificationOptOut' | 'deleteNotificationOptOut' | 'hasNotificationOptOut'>>

    mockLogs = {
      getLogger: jest.fn().mockReturnValue({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
      })
    } as jest.Mocked<Pick<ILoggerComponent, 'getLogger'>>

    notificationOptOutsManager = createNotificationOptOutsManager({
      db: mockDb as unknown as DbComponent,
      logs: mockLogs as unknown as ILoggerComponent
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('when creating an opt-out', () => {
    const address = '0x1234567890123456789012345678901234567890'
    const scope = NotificationScope.Community
    const scopeId = 'community-123'
    let result: Awaited<ReturnType<INotificationOptOutsManager['createOptOut']>>

    beforeEach(async () => {
      mockDb.saveNotificationOptOut.mockResolvedValue(undefined)
      result = await notificationOptOutsManager.createOptOut(address.toUpperCase(), scope, scopeId)
    })

    it('persists the normalized opt-out row', () => {
      expect(mockDb.saveNotificationOptOut).toHaveBeenCalledTimes(1)
      expect(mockDb.saveNotificationOptOut).toHaveBeenCalledWith(
        expect.objectContaining({
          address: address.toLowerCase(),
          scope,
          scope_id: scopeId
        })
      )
    })

    it('returns the saved opt-out row', () => {
      expect(result).toMatchObject({
        scope,
        scope_id: scopeId
      })
    })
  })

  describe('when deleting an opt-out', () => {
    const address = '0x1234567890123456789012345678901234567890'
    const scope = NotificationScope.Community
    const scopeId = 'community-123'

    beforeEach(async () => {
      mockDb.deleteNotificationOptOut.mockResolvedValue(undefined)
      await notificationOptOutsManager.deleteOptOut(address, scope, scopeId)
    })

    it('removes the opt-out for the scope', () => {
      expect(mockDb.deleteNotificationOptOut).toHaveBeenCalledTimes(1)
      expect(mockDb.deleteNotificationOptOut).toHaveBeenCalledWith(address, scope, scopeId)
    })
  })

  describe('when checking for an opt-out', () => {
    const address = '0x1234567890123456789012345678901234567890'
    const scope = NotificationScope.Community
    const scopeId = 'community-123'
    let result: boolean

    beforeEach(async () => {
      mockDb.hasNotificationOptOut.mockResolvedValue(true)
      result = await notificationOptOutsManager.hasOptOut(address, scope, scopeId)
    })

    it('delegates to the database and returns the result', () => {
      expect(mockDb.hasNotificationOptOut).toHaveBeenCalledWith(address, scope, scopeId)
      expect(result).toBe(true)
    })
  })
})
