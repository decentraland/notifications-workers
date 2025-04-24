import {
  DeleteMessageCommand,
  Message,
  ReceiveMessageCommand,
  SQSClient,
  SendMessageCommand
} from '@aws-sdk/client-sqs'

import { QueueMessage, IQueueConsumer, AppComponents } from '../types'

export async function createQueueConsumer({ config }: Pick<AppComponents, 'config'>): Promise<IQueueConsumer> {
  const endpoint = await config.requireString('AWS_SQS_ENDPOINT')
  const client = new SQSClient({ endpoint })

  async function send(message: QueueMessage): Promise<void> {
    const sendCommand = new SendMessageCommand({
      QueueUrl: endpoint,
      MessageBody: JSON.stringify({ Message: JSON.stringify(message) })
    })
    await client.send(sendCommand)
  }

  async function receiveMessages(maxMessages: number = 1): Promise<Message[]> {
    const receiveCommand = new ReceiveMessageCommand({
      QueueUrl: endpoint,
      MaxNumberOfMessages: maxMessages,
      VisibilityTimeout: 60, // 1 minute
      WaitTimeSeconds: 20
    })
    const { Messages = [] } = await client.send(receiveCommand)

    return Messages
  }

  async function deleteMessage(receiptHandle: string): Promise<void> {
    const deleteCommand = new DeleteMessageCommand({
      QueueUrl: endpoint,
      ReceiptHandle: receiptHandle
    })
    await client.send(deleteCommand)
  }

  return {
    send,
    receiveMessages,
    deleteMessage
  }
}
