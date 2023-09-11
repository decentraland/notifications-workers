import { SQS } from 'aws-sdk'
import { AppComponents, NotificationToSqs } from '../types'
import { randomUUID } from 'crypto'

import SQL, { SQLStatement } from 'sql-template-strings'

export async function taskRunnerSqs(job: NotificationToSqs, components: Pick<AppComponents, 'logs' | 'pg'>) {
  const logger = components.logs.getLogger('Task Runner SQS')

  logger.info(`Processing job`)
  console.debug(job.metadata)

  // TODO: Add a transaction here!
  const notification = job.metadata
  const notificationUuid = randomUUID()
  const epoch = notification.epoch
  // The value stored in timestamp is the one from the origin of the notification
  // While this service uses the created_at to order and retrieve notifications
  const createNotificationQuery: SQLStatement = SQL`
      INSERT INTO notifications (id, origin_id, type, source, metadata, timestamp)
      VALUES (${notificationUuid}, ${notification.sid}, 'push', 'sqs', ${notification}, to_timestamp(${epoch}));`
  logger.debug(`Query: ${createNotificationQuery.text}`)
  try {
    await components.pg.query<Notification>(createNotificationQuery)
  } catch (error: any) {
    logger.error(`Error: ${error}`)
  }

  const users = notification.users
  for (const user of users) {
    const userUuid = randomUUID()
    const createUserNotificationQuery: SQLStatement = SQL`
        INSERT INTO users_notifications (id, address, notification_id)
        VALUES (${userUuid}, ${user}, ${notificationUuid});`
    logger.debug(`Query: ${createUserNotificationQuery.text}`)
    try {
      await components.pg.query<Notification>(createUserNotificationQuery)
    } catch (error: any) {
      logger.error(`Error: ${error}`)
    }
  }
}

export async function startListenSQS(components: Pick<AppComponents, 'config' | 'logs' | 'pg'>) {
  const { logs, config } = components
  const logger = logs.getLogger('Listen SQS')
  const queueUrl = await config.requireString('SQS_QUEUE_URL')
  const region = await config.requireString('SQS_QUEUE_REGION')

  const sqs = new SQS({ region: region })
  const params = {
    AttributeNames: ['SentTimestamp'],
    MaxNumberOfMessages: 10,
    MessageAttributeNames: ['All'],
    QueueUrl: queueUrl,
    WaitTimeSeconds: 0,
    VisibilityTimeout: 3 * 3600 // 3 hours
  }

  async function receiveMessages(): Promise<void> {
    const response = await sqs.receiveMessage(params).promise()
    if (response?.Messages && response.Messages.length > 0) {
      for (const it of response.Messages) {
        const messageId = it.MessageId!
        const body: NotificationToSqs = JSON.parse(it.Body!)

        try {
          logger.log(`Processing job {
              id: ${messageId},
              message: ${body},
              QueueUrl: ${params.QueueUrl},
              ReceiptHandle: ${it.ReceiptHandle!},
            }`)

          await taskRunnerSqs({ metadata: body }, components)

          logger.info(`Processed job { id: ${messageId}}`)
        } catch (err: any) {
          // TODO: add metric here
          logger.error(`Error processing job { id: ${messageId}}`)
        } finally {
          logger.info(`Deleting message from job { id: ${messageId}}`)
          await sqs
            .deleteMessage({
              QueueUrl: params.QueueUrl,
              ReceiptHandle: it.ReceiptHandle!
            })
            .promise()
        }
      }
    }

    return receiveMessages()
  }

  receiveMessages().catch(logger.error)
}
