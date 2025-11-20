import { createNotificationOptOutsManager, INotificationOptOutsManager } from '../../../src/logic/notification-opt-out'
import { NotificationOptOutDb, DbComponent } from '@notifications/common'
import { ILoggerComponent } from '@well-known-components/interfaces'

describe('Notification Opt-Outs Manager', () => {
  let mockDb: jest.Mocked<
    Pick<DbComponent, 'findNotificationOptOuts' | 'saveNotificationOptOut' | 'deleteNotificationOptOut'>
  >
  let mockLogs: jest.Mocked<Pick<ILoggerComponent, 'getLogger'>>
  let notificationOptOutsManager: INotificationOptOutsManager

  beforeEach(() => {
    mockDb = {
      findNotificationOptOuts: jest.fn(),
      saveNotificationOptOut: jest.fn(),
      deleteNotificationOptOut: jest.fn()
    } as jest.Mocked<
      Pick<DbComponent, 'findNotificationOptOuts' | 'saveNotificationOptOut' | 'deleteNotificationOptOut'>
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
    let address: string
    let metadataKey: string
    let metadataValue: string
    let notificationTypes: string[] | null

    beforeEach(() => {
      address = '0x1234567890123456789012345678901234567890'
      metadataKey = 'communityId'
      metadataValue = 'community-123'
      notificationTypes = null
    })

    it('should create and save the opt-out', async () => {
      await notificationOptOutsManager.createOptOut(address, metadataKey, metadataValue, notificationTypes)

      expect(mockDb.saveNotificationOptOut).toHaveBeenCalledWith(
        expect.objectContaining({
          address: address.toLowerCase(),
          metadata_key: metadataKey,
          metadata_value: metadataValue,
          notification_types: null
        })
      )
    })

    it('should create opt-out with notification types', async () => {
      notificationTypes = ['COMMUNITY_POST_ADDED', 'COMMUNITY_INVITE_RECEIVED']

      await notificationOptOutsManager.createOptOut(address, metadataKey, metadataValue, notificationTypes)

      expect(mockDb.saveNotificationOptOut).toHaveBeenCalledWith(
        expect.objectContaining({
          notification_types: notificationTypes
        })
      )
    })

    it('should normalize address to lowercase', async () => {
      const upperCaseAddress = address.toUpperCase()

      await notificationOptOutsManager.createOptOut(upperCaseAddress, metadataKey, metadataValue)

      expect(mockDb.saveNotificationOptOut).toHaveBeenCalledWith(
        expect.objectContaining({
          address: address.toLowerCase()
        })
      )
    })
  })

  describe('when updating an opt-out', () => {
    let address: string
    let metadataKey: string
    let metadataValue: string
    let existingOptOut: NotificationOptOutDb

    beforeEach(() => {
      address = '0x1234567890123456789012345678901234567890'
      metadataKey = 'communityId'
      metadataValue = 'community-123'
      existingOptOut = {
        address: address.toLowerCase(),
        metadata_key: metadataKey,
        metadata_value: metadataValue,
        notification_types: null,
        created_at: Date.now() - 1000,
        updated_at: Date.now() - 1000
      }

      mockDb.findNotificationOptOuts.mockResolvedValue([existingOptOut])
    })

    it('should update notification types', async () => {
      const newNotificationTypes = ['COMMUNITY_POST_ADDED']

      await notificationOptOutsManager.updateOptOut(address, metadataKey, metadataValue, newNotificationTypes)

      expect(mockDb.saveNotificationOptOut).toHaveBeenCalledWith(
        expect.objectContaining({
          ...existingOptOut,
          notification_types: newNotificationTypes,
          updated_at: expect.any(Number)
        })
      )
    })

    it('should preserve existing notification types when not provided', async () => {
      existingOptOut.notification_types = ['COMMUNITY_POST_ADDED']

      await notificationOptOutsManager.updateOptOut(address, metadataKey, metadataValue, undefined)

      expect(mockDb.saveNotificationOptOut).toHaveBeenCalledWith(
        expect.objectContaining({
          notification_types: ['COMMUNITY_POST_ADDED']
        })
      )
    })

    it('should throw error when opt-out not found', async () => {
      mockDb.findNotificationOptOuts.mockResolvedValue([])

      await expect(notificationOptOutsManager.updateOptOut(address, metadataKey, metadataValue, null)).rejects.toThrow(
        'not found'
      )
    })
  })

  describe('when deleting an opt-out', () => {
    let address: string
    let metadataKey: string
    let metadataValue: string

    beforeEach(() => {
      address = '0x1234567890123456789012345678901234567890'
      metadataKey = 'communityId'
      metadataValue = 'community-123'
    })

    it('should delete the opt-out', async () => {
      await notificationOptOutsManager.deleteOptOut(address, metadataKey, metadataValue)

      expect(mockDb.deleteNotificationOptOut).toHaveBeenCalledWith(address, metadataKey, metadataValue)
    })
  })

  describe('when getting opt-outs', () => {
    let address: string
    let optOuts: NotificationOptOutDb[]

    beforeEach(() => {
      address = '0x1234567890123456789012345678901234567890'
      optOuts = [
        {
          address: address.toLowerCase(),
          metadata_key: 'communityId',
          metadata_value: 'community-123',
          notification_types: null,
          created_at: Date.now(),
          updated_at: Date.now()
        },
        {
          address: address.toLowerCase(),
          metadata_key: 'communityId',
          metadata_value: 'community-456',
          notification_types: ['COMMUNITY_POST_ADDED'],
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ]

      mockDb.findNotificationOptOuts.mockResolvedValue(optOuts)
    })

    it('should return all opt-outs for the address', async () => {
      const result = await notificationOptOutsManager.getOptOuts(address)

      expect(result).toEqual(optOuts)
      expect(mockDb.findNotificationOptOuts).toHaveBeenCalledWith(address)
    })
  })
})
