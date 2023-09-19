import { randomUUID } from 'node:crypto'
import { AppComponents } from '../types'
import { Readable } from 'node:stream'
import { NotificationEvent } from '@notifications/commons'

export type Session = {
  userId: string
  stream: Readable
}

export type EventsDispatcherComponent = {
  start(): void
  stop(): void
  addClient(s: Session): string
  removeClient(uuid: string): void
}

export function createEventsDispatcherComponent({
  logs,
  db
}: Pick<AppComponents, 'db' | 'logs'>): EventsDispatcherComponent {
  const logger = logs.getLogger('events-dispatcher')

  const clients = new Map<string, Session>()

  function addClient(s: Session): string {
    logger.debug('add client')
    const uuid = randomUUID()
    clients.set(uuid, s)
    return uuid
  }

  function removeClient(uuid: string): void {
    logger.debug('remove client')
    clients.delete(uuid)
  }

  let interval: any
  function start() {
    let lastCheck = 0
    interval = setInterval(async () => {
      const users = new Set(Array.from(clients.values()).map((s) => s.userId))
      const notifications = await db.findNotifications(Array.from(users), true, 100, lastCheck)

      const notificationsByUser = new Map<string, NotificationEvent[]>()

      for (const notification of notifications) {
        const userNotifications: NotificationEvent[] = notificationsByUser.get(notification.address) ?? []
        userNotifications.push(notification)
        notificationsByUser.set(notification.address, userNotifications)
      }

      for (const [address, notifications] of notificationsByUser) {
        for (const { userId, stream } of clients.values()) {
          if (userId === address) {
            stream.push(`event: ping\n\n`)

            // Events are ordered and retrieved by the local timestamp of the database/server, not from the notification origin

            for (const notification of notifications) {
              stream.push(`data: ${JSON.stringify(notification)}\n\n`)
            }
          }
        }
      }

      // Every interval, send a "ping" event.
      lastCheck = Date.now()
    }, 15000)
  }

  function stop() {
    if (interval) {
      clearInterval(interval)
    }
  }

  return {
    addClient,
    removeClient,
    start,
    stop
  }
}
