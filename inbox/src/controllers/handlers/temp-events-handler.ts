import { Readable } from 'node:stream'

import { HandlerContextWithPath } from '../../types'

export async function tempEventsHandler(
  context: Pick<
    HandlerContextWithPath<'eventsDispatcher' | 'logs', '/notifications/events/:address'>,
    'components' | 'params'
  >
) {
  const { logs, eventsDispatcher } = context.components
  const logger = logs.getLogger('events-handler')

  // const userId = context.verification!.auth
  const userId = context.params.address

  const stream = new Readable({
    read() {
      // this fn is called every time the readable "needs" a message
    },
    destroy() {
      logger.info(`Closing event stream for user ${userId} (session: ${session})`)
      eventsDispatcher.removeClient(session)
    }
  })
  const session = eventsDispatcher.addClient({ userId, stream })
  logger.info(`New event stream for user ${userId} (session: ${session})`)

  stream // Tell the client to retry every 10 seconds if connectivity is lost
    .push('retry: 10000\n\n')

  return {
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive'
    },
    body: stream
  }
}
