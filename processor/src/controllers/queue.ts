import { SQS } from 'aws-sdk'
import { AppComponents } from '../types'
import { insertNotification } from 'commons/dist/logic/db'
import SQL from 'sql-template-strings'

export async function startListenSQS(components: Pick<AppComponents, 'config' | 'logs' | 'pg'>) {
  const { logs, config, pg } = components
  const logger = logs.getLogger('Listen SQS')
  const queueUrl = await config.requireString('SQS_QUEUE_URL')
  const region = await config.requireString('SQS_QUEUE_REGION')

  const sqs = new SQS({ region: region })
  const params = {
    AttributeNames: ['SentTimestamp'],
    MaxNumberOfMessages: 10,
    MessageAttributeNames: ['All'],
    QueueUrl: queueUrl,
    WaitTimeSeconds: 15,
    VisibilityTimeout: 3 * 3600 // 3 hours
  }

  async function receiveMessages(): Promise<void> {
    const response = await sqs.receiveMessage(params).promise()
    if (response?.Messages && response.Messages.length > 0) {
      for (const it of response.Messages) {
        const messageId = it.MessageId!
        try {
          const body = JSON.parse(it.Body!)
          logger.log(`Processing job {
              id: ${messageId},
              message: ${body},
              QueueUrl: ${params.QueueUrl},
              ReceiptHandle: ${it.ReceiptHandle!},
            }`)

          await insertNotification(pg, body, { type: 'push', source: 'sqs' })

          logger.info(`Processed job { id: ${messageId}}`)
        } catch (err: any) {
          // TODO: add metric here
          logger.error(`Error processing job { id: ${messageId}, body: ${it.Body!}}, error: ${err}`)
          await storeFailedNotification(it.Body!, components)
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

async function storeFailedNotification(body: string, components: Pick<AppComponents, 'logs' | 'pg'>) {
  const logger = components.logs.getLogger('Store Failed Notification')
  const query = SQL`INSERT INTO failed_notifications (type, source, metadata) VALUES ('push', 'sqs', ${body});`
  try {
    await components.pg.query(query)
  } catch (error: any) {
    logger.error(`Error: ${error}`)
  }
}
