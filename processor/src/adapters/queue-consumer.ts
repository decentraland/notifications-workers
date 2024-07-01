import {
  DeleteMessageCommand,
  Message,
  ReceiveMessageCommand,
  SQSClient,
  SendMessageCommand
} from '@aws-sdk/client-sqs'

import { QueueMessage, IQueueConsumer } from '../types'
import { randomUUID } from 'crypto'

export async function createQueueConsumer(endpoint: string): Promise<IQueueConsumer> {
  const client = new SQSClient({ endpoint })

  async function send(message: QueueMessage): Promise<void> {
    const sendCommand = new SendMessageCommand({
      QueueUrl: endpoint,
      MessageBody: JSON.stringify({ Message: JSON.stringify(message) })
    })
    await client.send(sendCommand)
  }

  async function receiveSingleMessage(): Promise<Message[]> {
    const receiveCommand = new ReceiveMessageCommand({
      QueueUrl: endpoint,
      MaxNumberOfMessages: 1,
      VisibilityTimeout: 60 // 1 minute
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
    receiveSingleMessage,
    deleteMessage
  }
}
