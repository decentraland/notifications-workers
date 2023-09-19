import { Readable } from 'node:stream'

import { HandlerContextWithPath } from '../../types'

export async function eventsHandler(
  context: HandlerContextWithPath<'logs' | 'eventsDispatcher', '/notifications/events'>
) {
  const { logs, eventsDispatcher } = context.components
  const logger = logs.getLogger('Events Handler')

  const userId = context.verification!.auth

  const stream = new Readable({
    read() {
      // this fn is called every time the readable "needs" a message
    },
    destroy() {
      logger.debug('destroyed')
      eventsDispatcher.removeClient(session)
    }
  })
  const session = eventsDispatcher.addClient({ userId, stream })

  stream // Tell the client to retry every 10 seconds if connectivity is lost
    .push('retry: 10000\n\n')

  return {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive'
    },
    body: stream
  }
}
