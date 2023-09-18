import { SQS } from 'aws-sdk'
import { NotificationToSqs, insertNotification } from 'commons/dist/logic/db'
import SQL from 'sql-template-strings'
import { IQueue, ProcessorComponents } from '../types'

export async function createSQSAdapter(
  components: Pick<ProcessorComponents, 'config' | 'logs' | 'pg'>
): Promise<IQueue> {
  const { logs, config, pg } = components
  const logger = logs.getLogger('Listen SQS')
  const queueUrl = await config.requireString('SQS_QUEUE_URL')
  const region = await config.requireString('SQS_QUEUE_REGION')
  const dcl_channel_app = (await config.getString('PUSH_DCL_CHANNEL')) || 'Decentraland Channel'

  const sqs = new SQS({ region: region })
  const params = {
    AttributeNames: ['SentTimestamp'],
    MaxNumberOfMessages: 10,
    MessageAttributeNames: ['All'],
    QueueUrl: queueUrl,
    WaitTimeSeconds: 15,
    VisibilityTimeout: 3 * 3600 // 3 hours
  }

  return {
    async receiveMessages(): Promise<void> {
      while (true) {
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

              const notification = JSON.parse(body.Message)
              const source = extractSource(notification)
              // TODO (!source || source === 'push')
              if (notification.payload.data.app === dcl_channel_app) {
                await insertNotification(pg, notification, { type: 'dcl', source })
              } else {
                logger.debug(
                  `Notification ${notification.sid} is not from Decentraland Channel and it's from Push Service`
                )
              }

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
      }
    },
    async publish(job: NotificationToSqs) {
      const published = await sqs
        .sendMessage({
          QueueUrl: params.QueueUrl,
          MessageBody: JSON.stringify({
            Message: JSON.stringify(job)
          })
        })
        .promise()

      logger.info(`Published job { id: ${published.MessageId!}}`)

      return published.MessageId!
    }
  }
}

function extractSource(notification: any) {
  return notification.source || 'push'
}

async function storeFailedNotification(body: string, components: Pick<ProcessorComponents, 'logs' | 'pg'>) {
  const logger = components.logs.getLogger('Store Failed Notification')
  const query = SQL`INSERT INTO failed_notifications (type, source, metadata) VALUES ('push', 'sqs', ${body});`
  try {
    await components.pg.query(query)
  } catch (error: any) {
    logger.error(`Error: ${error}`)
  }
}
