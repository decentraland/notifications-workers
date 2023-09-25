import { SQS } from 'aws-sdk'
import { AppComponents } from '../types'

export type SQSComponent = {
  poll(): Promise<SQS.Message[]>
  deleteMessage(receiptHandle: string): Promise<void>
  publish(body: string): Promise<string>
}

export async function createSQSComponent(components: Pick<AppComponents, 'config' | 'logs'>): Promise<SQSComponent> {
  const { logs, config } = components
  const logger = logs.getLogger('SQS')
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

  async function poll(): Promise<SQS.Message[]> {
    const response = await sqs.receiveMessage(params).promise()
    return response?.Messages && response.Messages.length > 0 ? response.Messages : []
  }

  async function deleteMessage(receiptHandle: string) {
    await sqs
      .deleteMessage({
        QueueUrl: params.QueueUrl,
        ReceiptHandle: receiptHandle
      })
      .promise()
  }

  async function publish(body: string) {
    const published = await sqs
      .sendMessage({
        QueueUrl: params.QueueUrl,
        MessageBody: body
      })
      .promise()

    logger.debug(`Published job { id: ${published.MessageId!}}`)

    return published.MessageId!
  }

  return {
    poll,
    deleteMessage,
    publish
  }
}
