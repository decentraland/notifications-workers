import { randomUUID } from 'node:crypto'
import { AppComponents } from '../types'
import { Readable } from 'node:stream'
import { NotificationEvent } from '@notifications/commons'

export type Client = {
  userId: string
  stream: Pick<Readable, 'push'>
}

export type EventsDispatcherComponent = {
  start(): void
  stop(): void
  poll(from: number): Promise<void>
  addClient(s: Client): string
  removeClient(uuid: string): void
  sessionsCount(): number
}

export function createEventsDispatcherComponent({
  logs,
  db
}: Pick<AppComponents, 'db' | 'logs'>): EventsDispatcherComponent {
  const logger = logs.getLogger('events-dispatcher')

  const sessions = new Map<string, Client>()

  function addClient(c: Client): string {
    logger.debug('add client')
    const uuid = randomUUID()
    sessions.set(uuid, c)
    return uuid
  }

  function removeClient(uuid: string): void {
    logger.debug('remove client')
    sessions.delete(uuid)
  }

  async function poll(from: number) {
    const users = new Set(Array.from(sessions.values()).map((s) => s.userId))
    const notifications = await db.findNotifications(Array.from(users), true, 100, from)

    const notificationsByUser = new Map<string, NotificationEvent[]>()

    for (const notification of notifications) {
      const userNotifications: NotificationEvent[] = notificationsByUser.get(notification.address) ?? []
      userNotifications.push(notification)
      notificationsByUser.set(notification.address, userNotifications)
    }

    for (const [address, notifications] of notificationsByUser) {
      for (const { userId, stream } of sessions.values()) {
        if (userId === address) {
          // Events are ordered and retrieved by the local timestamp of the database/server, not from the notification origin

          for (const notification of notifications) {
            stream.push(`data: ${JSON.stringify(notification)}\n\n`)
          }
        }
      }
    }
  }

  let interval: any
  function start() {
    let lastCheck = 0
    interval = setInterval(async () => {
      await poll(lastCheck)
      lastCheck = Date.now()
    }, 1000)
  }

  function stop() {
    if (interval) {
      clearInterval(interval)
    }
  }

  function sessionsCount(): number {
    return sessions.size
  }

  return {
    addClient,
    removeClient,
    start,
    stop,
    poll,
    sessionsCount
  }
}
