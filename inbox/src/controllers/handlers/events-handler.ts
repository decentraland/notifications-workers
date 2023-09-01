import { Readable } from 'node:stream'
import { HandlerContextWithPath, InvalidRequestError, UsersNotification } from '../../types'

import SQL from 'sql-template-strings'

export async function eventsHandler(context: HandlerContextWithPath<'logs' | 'pg', '/notifications/events'>) {
  const { pg, logs } = context.components
  const logger = logs.getLogger('Events Handler')

  let from = context.url.searchParams.get('from') || 0
  const userId = context.url.searchParams.get('userId')?.toString()

  if (!userId || userId === '') {
    throw new InvalidRequestError('Missing userId')
  }

  const interval = setInterval(async () => {
    // Every second, send a "ping" event.
    stream.push(`event: ping\n`)

    const query = SQL`SELECT * FROM users_notifications u JOIN notifications n ON u.notification_id = n.id
    WHERE LOWER(u.address) = LOWER(${userId})
    AND u.timestamp > to_timestamp(${from} / 1000.0)
    ORDER BY u.timestamp DESC`

    logger.debug(`Query: ${query.text}`)

    const notifications = await pg.query<UsersNotification>(query)
    for (const notification of notifications.rows) {
      stream.push(`data: ${JSON.stringify(notification)}\n\n`)
    }
    from = notifications.rows[0]?.timestamp || from
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
