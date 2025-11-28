import { START_COMPONENT, STOP_COMPONENT } from '@well-known-components/interfaces'
import { NotificationRecord } from '@notifications/common'
import { NotificationType } from '@dcl/schemas'
import { createMessageProcessor } from '../../../src/adapters/message-processor'
import { IQueueConsumer, IEventParser } from '../../../src/types'
import { INotificationsService } from '../../../src/adapters/notifications-service'

describe('message processor', () => {
  let queueConsumer: jest.Mocked<IQueueConsumer>
  let notificationsService: jest.Mocked<INotificationsService>
  let eventParser: jest.Mocked<IEventParser>
  let processor: ReturnType<typeof createMessageProcessor>
  let processingComplete: Promise<void>
  let deleteComplete: Promise<void>

  beforeEach(() => {
    const logger = { info: jest.fn(), error: jest.fn() }
    const logs = { getLogger: jest.fn().mockReturnValue(logger) } as unknown as any

    queueConsumer = {
      receiveMessages: jest.fn(),
      deleteMessage: jest.fn(),
      send: jest.fn()
    } as unknown as jest.Mocked<IQueueConsumer>

    notificationsService = {
      saveNotifications: jest.fn()
    } as jest.Mocked<INotificationsService>

    eventParser = {
      parseToNotifications: jest.fn()
    } as jest.Mocked<IEventParser>

    processor = createMessageProcessor({
      logs,
      queueConsumer,
      notificationsService,
      eventParser
    })
  })

  describe('when queue returns a parsable message', () => {
    const parsedNotifications: NotificationRecord[] = [
      {
        type: NotificationType.WORLDS_ACCESS_RESTORED,
        address: '0x69D30b1875d39E13A01AF73CCFED6d84839e84f2',
        metadata: {},
        timestamp: Date.now(),
        eventKey: 'payload-1'
      }
    ]

    beforeEach(() => {
      eventParser.parseToNotifications.mockReturnValue(parsedNotifications)

      const message = {
        Body: JSON.stringify({ some: 'event' }),
        ReceiptHandle: 'receipt-1'
      }

      queueConsumer.receiveMessages.mockResolvedValueOnce([message as any]).mockResolvedValue([])

      processingComplete = new Promise<void>((resolve) => {
        notificationsService.saveNotifications.mockImplementation(async () => {
          resolve()
        })
      })
    })

    it('forwards parsed notifications and deletes the queue message', async () => {
      await processor[START_COMPONENT](undefined as never)
      await processingComplete
      await processor[STOP_COMPONENT]()

      expect(notificationsService.saveNotifications).toHaveBeenCalledWith(parsedNotifications)
      expect(queueConsumer.deleteMessage).toHaveBeenCalledWith('receipt-1')
    })
  })

  describe('when queue message cannot be parsed', () => {
    beforeEach(() => {
      queueConsumer.receiveMessages
        .mockResolvedValueOnce([{ Body: '{invalid-json}', ReceiptHandle: 'receipt-2' } as any])
        .mockResolvedValue([])

      deleteComplete = new Promise<void>((resolve) => {
        queueConsumer.deleteMessage.mockImplementation(async () => {
          resolve()
        })
      })
    })

    it('still removes the queue message', async () => {
      await processor[START_COMPONENT](undefined as never)
      await deleteComplete
      await processor[STOP_COMPONENT]()

      expect(notificationsService.saveNotifications).not.toHaveBeenCalled()
      expect(eventParser.parseToNotifications).not.toHaveBeenCalled()
    })
  })
})
