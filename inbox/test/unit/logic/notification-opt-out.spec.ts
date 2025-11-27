import { createNotificationOptOutsManager, INotificationOptOutsManager } from '../../../src/logic/notification-opt-out'
import { DbComponent, NotificationEntity } from '@notifications/common'
import { ILoggerComponent } from '@well-known-components/interfaces'

describe('Notification Opt-Outs Manager', () => {
  let mockDb: jest.Mocked<
    Pick<DbComponent, 'saveNotificationOptOuts' | 'deleteNotificationOptOut' | 'hasNotificationOptOut'>
  >
  let mockLogs: jest.Mocked<Pick<ILoggerComponent, 'getLogger'>>
  let notificationOptOutsManager: INotificationOptOutsManager

  beforeEach(() => {
    mockDb = {
      saveNotificationOptOuts: jest.fn(),
      deleteNotificationOptOut: jest.fn(),
      hasNotificationOptOut: jest.fn()
    } as jest.Mocked<
      Pick<DbComponent, 'saveNotificationOptOuts' | 'deleteNotificationOptOut' | 'hasNotificationOptOut'>
    >

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

  describe('createOptOut', () => {
    const address = '0x1234567890123456789012345678901234567890'
    const entity = NotificationEntity.Community
    const entityId = 'community-123'

    beforeEach(() => {
      mockDb.saveNotificationOptOuts.mockResolvedValue(undefined)
    })

    it('should normalize address and persist a single opt-out', async () => {
      await notificationOptOutsManager.createOptOut(address.toUpperCase(), entity, entityId)

      expect(mockDb.saveNotificationOptOuts).toHaveBeenCalledTimes(1)
      expect(mockDb.saveNotificationOptOuts).toHaveBeenCalledWith([
        expect.objectContaining({
          address: address.toLowerCase(),
          entity,
          entity_id: entityId
        })
      ])
    })

    it('should return the saved opt-out row', async () => {
      const result = await notificationOptOutsManager.createOptOut(address, entity, entityId)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        entity,
        entity_id: entityId
      })
    })
  })

  describe('deleteOptOut', () => {
    const address = '0x1234567890123456789012345678901234567890'
    const entity = NotificationEntity.Community
    const entityId = 'community-123'

    beforeEach(() => {
      mockDb.deleteNotificationOptOut.mockResolvedValue(undefined)
    })

    it('should remove the opt-out for the entity', async () => {
      await notificationOptOutsManager.deleteOptOut(address, entity, entityId)

      expect(mockDb.deleteNotificationOptOut).toHaveBeenCalledTimes(1)
      expect(mockDb.deleteNotificationOptOut).toHaveBeenCalledWith(address, entity, entityId)
    })
  })

  describe('hasOptOut', () => {
    const address = '0x1234567890123456789012345678901234567890'
    const entity = NotificationEntity.Community
    const entityId = 'community-123'

    it('should delegate to the database', async () => {
      mockDb.hasNotificationOptOut.mockResolvedValue(true)

      const result = await notificationOptOutsManager.hasOptOut(address, entity, entityId)

      expect(mockDb.hasNotificationOptOut).toHaveBeenCalledWith(address, entity, entityId)
      expect(result).toBe(true)
    })
  })
})
