import { SQS } from 'aws-sdk'
import { AppComponents } from '../types'

export declare type NotificationToSqs = {
  metadata: any
}

async function delay<T>(time: number, value?: T): Promise<T> {
  return Promise.resolve().then(() => new Promise((resolve) => setTimeout(() => resolve(value as T), time)))
}

export class SQSConsumer {
  constructor(public sqs: SQS, public params: AWS.SQS.ReceiveMessageRequest) {}

  async consume(
    taskRunner: (job: NotificationToSqs, components: Pick<AppComponents, 'logs' | 'pg'>) => Promise<void>,
    components: Pick<AppComponents, 'logs' | 'pg'>
  ): Promise<boolean> {
    const logger = components.logs.getLogger('Events Handler')
    try {
      const response = await Promise.race([
        this.sqs.receiveMessage(this.params).promise(),
        delay(30 * 60 * 1000, 'Timed out sqs.receiveMessage')
      ])
      if (typeof response !== 'string' && response?.Messages && response.Messages.length > 0) {
        for (const it of response.Messages) {
          const messageId = it.MessageId!
          const body: NotificationToSqs = JSON.parse(it.Body!)

          try {
            logger.log(`Processing job {
              id: ${messageId},
              message: ${body},
              QueueUrl: ${this.params.QueueUrl},
              ReceiptHandle: ${it.ReceiptHandle!},
            }`)

            await taskRunner({ metadata: body }, components)

            logger.info(`Processed job { id: ${messageId}}`)
          } catch (err: any) {
            logger.error(`Error processing job { id: ${messageId}}`)
          } finally {
            logger.info(`Deleting message from job { id: ${messageId}}`)
            await this.sqs
              .deleteMessage({
                QueueUrl: this.params.QueueUrl,
                ReceiptHandle: it.ReceiptHandle!
              })
              .promise()
          }
        }
      }
      return true
    } catch (err: any) {
      logger.error(`Error consuming SQS: ${err}`)
      return false
    }
  }
}
