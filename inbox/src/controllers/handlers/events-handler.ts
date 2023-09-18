import { Readable } from 'node:stream'

import SQL from 'sql-template-strings'
import { HandlerContextWithPath } from '../../types'
import { NotificationEvent } from 'commons/dist/logic/db'

export async function eventsHandler(context: HandlerContextWithPath<'logs' | 'pg', '/notifications/events'>) {
  const { pg, logs } = context.components
  const logger = logs.getLogger('Events Handler')

  let from = context.url.searchParams.get('from') || 0

  const userId: string | undefined = context.verification!.auth

  const interval = setInterval(async () => {
    // Every interval, send a "ping" event.
    stream.push(`event: ping\n\n`)

    // Events are ordered and retrieved by the local timestamp of the database/server, not from the notification origin
    const query = SQL`SELECT  
      n.id AS notification_id,
      n.origin_id AS origin_id,
      n.type AS type,
      n.source AS source,
      date_part('epoch', n.timestamp) * 1000 AS origin_timestamp,
      date_part('epoch', u.created_at) * 1000 AS created_at,
      date_part('epoch', u.updated_at) * 1000 AS updated_at,
      u.address AS address,
      u.read AS read,
      n.metadata AS metadata
    FROM users_notifications u JOIN notifications n ON u.notification_id = n.id
    WHERE u.read = FALSE
    AND LOWER(u.address) = LOWER(${userId})
    AND u.created_at > to_timestamp(${from} / 1000.0)
    ORDER BY u.created_at DESC`

    const notifications = await pg.query<NotificationEvent>(query)
    for (const notification of notifications.rows) {
      stream.push(`data: ${JSON.stringify(notification)}\n\n`)
    }
    const lastTimestamp = notifications.rows[0]?.created_at
    from = lastTimestamp ?? from
  }, 15000)

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
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive'
    },
    body: stream
  }
}
