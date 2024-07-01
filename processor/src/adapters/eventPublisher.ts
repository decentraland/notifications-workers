import { PublishCommand, SNSClient } from '@aws-sdk/client-sns'
import { EventNotification } from '../event.types'
import { AppComponents, IEventPublisher } from '../types'

export async function createEventPublisher({ config }: Pick<AppComponents, 'config'>): Promise<IEventPublisher> {
  const snsArn = await config.requireString('AWS_SNS_ARN')
  const optionalEndpoint = await config.getString('AWS_SNS_ENDPOINT')

  const client = new SNSClient({
    endpoint: optionalEndpoint
  })

  async function publishMessage(event: EventNotification): Promise<string | undefined> {
    const { MessageId } = await client.send(
      new PublishCommand({
        TopicArn: snsArn,
        Message: JSON.stringify(event)
      })
    )

    return MessageId
  }

  return { publishMessage }
}
