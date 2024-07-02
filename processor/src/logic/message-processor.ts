import { EventNotification } from '../event.types'
import { AppComponents, IMessageProcessor } from '../types'
import { sleep } from './utils'

export function createMessageProcessor({
  logs,
  queueConsumer,
  db,
  notificationsService,
  eventParser,
  workflowMigrationChecker
}: Pick<
  AppComponents,
  'logs' | 'queueConsumer' | 'db' | 'notificationsService' | 'eventParser' | 'workflowMigrationChecker'
>): IMessageProcessor {
  const logger = logs.getLogger('messages-consumer')
  let isRunning = false

  function parseMessage(message: string): any {
    try {
      const parsedMessage = JSON.parse(JSON.parse(message).Message)
      return parsedMessage
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
        const parsedMessage = parseMessage(Body!) as EventNotification

        if (!parsedMessage) {
          await queueConsumer.deleteMessage(ReceiptHandle!)
          continue
        }

        try {
          const notification = eventParser.parseToNotification(parsedMessage)
          await notificationsService.saveNotifications([notification])
          await db.updateLastUpdateForNotificationType(notification.type, parsedMessage.lastProducerRun)
          logger.info(`Created a new ${notification.type} notification.`)
          workflowMigrationChecker.removeRegistry(notification)
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
