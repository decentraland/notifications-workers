import { createNotificationOptOutsManager, INotificationOptOutsManager } from '../../../src/logic/notification-opt-out'
import { NotificationOptOutDb, DbComponent } from '@notifications/common'
import { ILoggerComponent } from '@well-known-components/interfaces'

describe('Notification Opt-Outs Manager', () => {
  let mockDb: jest.Mocked<
    Pick<DbComponent, 'findNotificationOptOuts' | 'saveNotificationOptOuts' | 'deleteNotificationOptOut'>
  >
  let mockLogs: jest.Mocked<Pick<ILoggerComponent, 'getLogger'>>
  let notificationOptOutsManager: INotificationOptOutsManager

  beforeEach(() => {
    mockDb = {
      findNotificationOptOuts: jest.fn(),
      saveNotificationOptOuts: jest.fn(),
      deleteNotificationOptOut: jest.fn()
    } as jest.Mocked<
      Pick<DbComponent, 'findNotificationOptOuts' | 'saveNotificationOptOuts' | 'deleteNotificationOptOut'>
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
    const metadataKey = 'communityId'
    const metadataValue = 'community-123'

    describe('with valid input', () => {
      describe('with single notification type', () => {
        const notificationTypes = ['community_post_added']

        beforeEach(() => {
          mockDb.saveNotificationOptOuts.mockResolvedValue(undefined)
        })

        it('should create and save opt-out via batch insert', async () => {
          const result = await notificationOptOutsManager.createOptOut(address, metadataKey, metadataValue, notificationTypes)

          expect(mockDb.saveNotificationOptOuts).toHaveBeenCalledTimes(1)
          expect(mockDb.saveNotificationOptOuts).toHaveBeenCalledWith(
            expect.arrayContaining([
              expect.objectContaining({
                address: address.toLowerCase(),
                metadata_key: metadataKey,
                metadata_value: metadataValue,
                notification_type: 'community_post_added'
              })
            ])
          )
          expect(result).toHaveLength(1)
          expect(result[0].notification_type).toBe('community_post_added')
        })
      })

      describe('with multiple notification types', () => {
        const notificationTypes = ['community_post_added', 'community_invite_received']

        beforeEach(() => {
          mockDb.saveNotificationOptOuts.mockResolvedValue(undefined)
        })

        it('should create multiple opt-outs via single batch insert', async () => {
          const result = await notificationOptOutsManager.createOptOut(address, metadataKey, metadataValue, notificationTypes)

          expect(mockDb.saveNotificationOptOuts).toHaveBeenCalledTimes(1)
          expect(mockDb.saveNotificationOptOuts).toHaveBeenCalledWith(
            expect.arrayContaining([
              expect.objectContaining({ notification_type: 'community_post_added' }),
              expect.objectContaining({ notification_type: 'community_invite_received' })
            ])
          )
          expect(result).toHaveLength(2)
        })
      })

      describe('with uppercase address', () => {
        const notificationTypes = ['community_post_added']
        const upperCaseAddress = address.toUpperCase()

        beforeEach(() => {
          mockDb.saveNotificationOptOuts.mockResolvedValue(undefined)
        })

        it('should normalize address to lowercase', async () => {
          await notificationOptOutsManager.createOptOut(upperCaseAddress, metadataKey, metadataValue, notificationTypes)

          expect(mockDb.saveNotificationOptOuts).toHaveBeenCalledWith(
            expect.arrayContaining([
              expect.objectContaining({
                address: address.toLowerCase()
              })
            ])
          )
        })
      })
    })

    describe('with invalid input', () => {
      describe('when notificationTypes is empty array', () => {
        it('should throw error', async () => {
          await expect(
            notificationOptOutsManager.createOptOut(address, metadataKey, metadataValue, [])
          ).rejects.toThrow('notificationTypes must be a non-empty array')
        })
      })
    })
  })

  describe('deleteOptOut', () => {
    const address = '0x1234567890123456789012345678901234567890'
    const metadataKey = 'communityId'
    const metadataValue = 'community-123'

    beforeEach(() => {
      mockDb.deleteNotificationOptOut.mockResolvedValue(undefined)
    })

    describe('when notificationType is not provided', () => {
      it('should delete all opt-outs for key-value pair', async () => {
        await notificationOptOutsManager.deleteOptOut(address, metadataKey, metadataValue)

        expect(mockDb.deleteNotificationOptOut).toHaveBeenCalledTimes(1)
        expect(mockDb.deleteNotificationOptOut).toHaveBeenCalledWith(address, metadataKey, metadataValue, undefined)
      })
    })

    describe('when notificationType is provided', () => {
      const notificationType = 'community_post_added'

      it('should delete specific notification type', async () => {
        await notificationOptOutsManager.deleteOptOut(address, metadataKey, metadataValue, notificationType)

        expect(mockDb.deleteNotificationOptOut).toHaveBeenCalledTimes(1)
        expect(mockDb.deleteNotificationOptOut).toHaveBeenCalledWith(address, metadataKey, metadataValue, notificationType)
      })
    })
  })

  describe('getOptOuts', () => {
    const address = '0x1234567890123456789012345678901234567890'
    let optOuts: NotificationOptOutDb[]

    beforeEach(() => {
      optOuts = [
        {
          address: address.toLowerCase(),
          metadata_key: 'communityId',
          metadata_value: 'community-123',
          notification_type: 'community_post_added',
          created_at: Date.now(),
          updated_at: Date.now()
        },
        {
          address: address.toLowerCase(),
          metadata_key: 'communityId',
          metadata_value: 'community-123',
          notification_type: 'community_invite_received',
          created_at: Date.now(),
          updated_at: Date.now()
        },
        {
          address: address.toLowerCase(),
          metadata_key: 'communityId',
          metadata_value: 'community-456',
          notification_type: 'community_post_added',
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ]

      mockDb.findNotificationOptOuts.mockResolvedValue(optOuts)
    })

    it('should return all opt-outs for the address', async () => {
      const result = await notificationOptOutsManager.getOptOuts(address)

      expect(mockDb.findNotificationOptOuts).toHaveBeenCalledTimes(1)
      expect(mockDb.findNotificationOptOuts).toHaveBeenCalledWith(address)
      expect(result).toEqual(optOuts)
    })
  })
})
