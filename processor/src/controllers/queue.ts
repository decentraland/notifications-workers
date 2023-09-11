import { SQS } from 'aws-sdk'
import { NotificationToSqs, SQSConsumer } from '../ports/consumer'
import { AppComponents } from '../types'
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

export async function startListenSQS(components: Pick<AppComponents, 'config' | 'logs' | 'pg' | 'sqsConsumer'>) {
  const logger = components.logs.getLogger('Listen SQS')

  setInterval(async () => {
    logger.log('Start notifications_consumer')
    const sqsConsumed = await components.sqsConsumer.consume(taskRunnerSqs, components)

    if (!sqsConsumed) {
      logger.log(`Check the logs`)
      return
    }
    logger.log(JSON.stringify(sqsConsumed, null, 2))
  }, 15000)
}
