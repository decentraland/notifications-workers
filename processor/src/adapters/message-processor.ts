import { AppComponents, IMessageProcessor } from '../types'
import { sleep } from '../logic/utils'
import { NotificationRecord } from '@notifications/common'

export function createMessageProcessor({
  logs,
  queueConsumer,
  notificationsService,
  eventParser
}: Pick<AppComponents, 'logs' | 'queueConsumer' | 'notificationsService' | 'eventParser'>): IMessageProcessor {
  const logger = logs.getLogger('messages-consumer')
  let isRunning = false

  function parseMessageToNotification(message: string): NotificationRecord | undefined {
    try {
      logger.info('Pulled message from queue', { message })
      const parsedMessage = JSON.parse(message)
      return eventParser.parseToNotification(parsedMessage)
    } catch (error: any) {
      logger.error(`Failed while parsing message from queue: ${error?.message || 'Unexpected failure'}`)
      return undefined
    }
  }

  async function start() {
    logger.info('Starting to listen messages from queue')
    isRunning = true
    while (isRunning) {
      const messages = await queueConsumer.receiveMessages()

      if (messages.length === 0) {
        logger.info('No messages found in queue, waiting 10 seconds to check again')
        await sleep(10 * 1000)
        continue
      }

      for (const message of messages) {
        const { Body, ReceiptHandle } = message
        logger.info('Pulled message from queue', { message: Body! })
        const notification: NotificationRecord | undefined = parseMessageToNotification(Body!)

        if (!notification) {
          await queueConsumer.deleteMessage(ReceiptHandle!)
          continue
        }

        try {
          await notificationsService.saveNotifications([notification])
          logger.info(`Created a new ${notification.type} notification.`)
        } catch (error: any) {
          // TODO: handle retries and DLQ
          logger.error(`Failed while processing event notification: ${error?.message || 'Unexpected failure'}`)
        } finally {
          await queueConsumer.deleteMessage(ReceiptHandle!)
        }
      }
    }
  }

  async function stop() {
    isRunning = false
  }

  return { start, stop }
}
