import { createNotificationOptOutsManager, INotificationOptOutsManager } from '../../../src/logic/notification-opt-out'
import { DbComponent, NotificationEntity, NotificationEntityType } from '@notifications/common'
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

  describe('when creating an opt-out', () => {
    const address = '0x1234567890123456789012345678901234567890'
    const entity = NotificationEntityType.Community
    const entityId = 'community-123'
    let result: Awaited<ReturnType<INotificationOptOutsManager['createOptOut']>>

    beforeEach(async () => {
      mockDb.saveNotificationOptOuts.mockResolvedValue(undefined)
      result = await notificationOptOutsManager.createOptOut(address.toUpperCase(), entity, entityId)
    })

    it('persists the normalized opt-out row', () => {
      expect(mockDb.saveNotificationOptOuts).toHaveBeenCalledTimes(1)
      expect(mockDb.saveNotificationOptOuts).toHaveBeenCalledWith([
        expect.objectContaining({
          address: address.toLowerCase(),
          entity,
          entity_id: entityId
        })
      ])
    })

    it('returns the saved opt-out row', () => {
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        entity,
        entity_id: entityId
      })
    })
  })

  describe('when deleting an opt-out', () => {
    const address = '0x1234567890123456789012345678901234567890'
    const entity = NotificationEntityType.Community
    const entityId = 'community-123'

    beforeEach(async () => {
      mockDb.deleteNotificationOptOut.mockResolvedValue(undefined)
      await notificationOptOutsManager.deleteOptOut(address, entity, entityId)
    })

    it('removes the opt-out for the entity', () => {
      expect(mockDb.deleteNotificationOptOut).toHaveBeenCalledTimes(1)
      expect(mockDb.deleteNotificationOptOut).toHaveBeenCalledWith(address, entity, entityId)
    })
  })

  describe('when checking for an opt-out', () => {
    const address = '0x1234567890123456789012345678901234567890'
    const entity = NotificationEntityType.Community
    const entityId = 'community-123'
    let result: boolean

    beforeEach(async () => {
      mockDb.hasNotificationOptOut.mockResolvedValue(true)
      result = await notificationOptOutsManager.hasOptOut(address, entity, entityId)
    })

    it('delegates to the database and returns the result', () => {
      expect(mockDb.hasNotificationOptOut).toHaveBeenCalledWith(address, entity, entityId)
      expect(result).toBe(true)
    })
  })
})
