import { AppComponents, IMessageProcessor } from '../types'
import { NotificationRecord } from '@notifications/common'
import { START_COMPONENT, STOP_COMPONENT } from '@well-known-components/interfaces'

export function createMessageProcessor({
  logs,
  queueConsumer,
  notificationsService,
  eventParser
}: Pick<AppComponents, 'logs' | 'queueConsumer' | 'notificationsService' | 'eventParser'>): IMessageProcessor {
  const logger = logs.getLogger('messages-consumer')
  let isRunning = false
  let processLoopPromise: Promise<void> | null = null

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

  async function processLoop() {
    logger.info('Starting to listen messages from queue')
    isRunning = true
    while (isRunning) {
      const messages = await queueConsumer.receiveMessages(10)

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

  async function start() {
    logger.info('Starting messages consumer component')
    isRunning = true

    // Start the processing loop in the background
    processLoopPromise = processLoop()

    // Return immediately to not block other components
    return Promise.resolve()
  }

  async function stop() {
    logger.info('Stopping messages consumer component')
    isRunning = false

    if (processLoopPromise) {
      await processLoopPromise
      processLoopPromise = null
    }
  }

  return {
    [START_COMPONENT]: start,
    [STOP_COMPONENT]: stop
  }
}
