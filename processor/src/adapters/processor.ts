import { insertNotification } from '@notifications/commons'
import { IBaseComponent } from '@well-known-components/interfaces'
import SQL from 'sql-template-strings'
import { AppComponents } from '../types'

export type ProcessorComponent = IBaseComponent & {
  loop(): Promise<void>
  process(): Promise<void>
}

export async function createProcessorComponent(
  components: Pick<AppComponents, 'config' | 'logs' | 'sqs' | 'pg'>
): Promise<ProcessorComponent> {
  const { logs, config, pg, sqs } = components
  const logger = logs.getLogger('Listen SQS')
  const dcl_channel_app = (await config.getString('PUSH_DCL_CHANNEL')) || 'Decentraland Channel'

  let running = false
  async function loop(): Promise<void> {
    running = true
    while (running) {
      await process()
    }
  }

  async function stop(): Promise<void> {
    running = false
  }

  async function process(): Promise<void> {
    const messages = await sqs.poll()
    for (const { Body, ReceiptHandle } of messages) {
      try {
        logger.log(`Processing job message: ${Body!}, ReceiptHandle: ${ReceiptHandle!}`)
        const body = JSON.parse(Body!)
        const notification = JSON.parse(body.Message)
        const source = notification.source || 'push'
        // Only for notifications from push we need to validate that the channel is Decentraland Channel
        if (notification.source === 'push' && isNotDCLChannel(notification, dcl_channel_app)) {
          logger.debug(`Notification ${notification.sid} is not from Decentraland Channel and it's from Push Service`)
          continue
        }

        await insertNotification(pg, notification, { type: 'dcl', source })
        logger.info('Job proccessed')
      } catch (err: any) {
        // TODO: add metric here
        logger.error(`Error processing job error: ${err}`)

        try {
          await components.pg.query(
            SQL`INSERT INTO failed_notifications (type, source, metadata) VALUES ('push', 'sqs', ${Body!});`
          )
        } catch (error: any) {
          logger.error(`Error: ${error}`)
        }
      } finally {
        logger.info('Deleting message')
        await sqs.deleteMessage(ReceiptHandle!)
      }
    }
  }

  return {
    loop,
    stop,
    process
  }
}

function isNotDCLChannel(notification: any, dcl_channel_app: string) {
  return notification.payload.data.app !== dcl_channel_app
}
