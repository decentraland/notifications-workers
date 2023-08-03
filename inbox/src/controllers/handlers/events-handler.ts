import { Readable } from 'node:stream'
import { HandlerContextWithPath } from '../../types'

export async function eventsHandler(context: HandlerContextWithPath<'logs', '/notifications/events'>) {
  const { logs } = context.components
  const logger = logs.getLogger('Events Handler')

  const interval = setInterval(() => {
    logger.log('pushing')
    stream.push(`data: ${JSON.stringify({ now: performance.now() })}\n\n`)
  }, 1500)

  const stream = new Readable({
    read() {
      // this fn is called every time the readable "needs" a message
    },
    destroy() {
      logger.debug('destroyed')
      clearInterval(interval)
    }
  })

  // Tell the client to retry every 10 seconds if connectivity is lost
  stream.push('retry: 10000\n\n')

  return {
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive'
    },
    body: stream
  }
}
