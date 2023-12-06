import { randomUUID } from 'node:crypto'
import { AppComponents, Client, EventsDispatcherComponent, NotificationEvent } from '../types'

export function createEventsDispatcherComponent({
  db,
  logs
}: Pick<AppComponents, 'db' | 'logs'>): EventsDispatcherComponent {
  const logger = logs.getLogger('events-dispatcher')

  const sessions = new Map<string, Client>()

  function addClient(c: Client): string {
    const uuid = randomUUID()
    sessions.set(uuid, c)
    return uuid
  }

  function removeClient(uuid: string): void {
    sessions.delete(uuid)
  }

  async function poll(from: number) {
    const since = Math.floor(from / 1000)

    if (sessions.size === 0) {
      logger.info(`No need to poll since ${since} as there are currently no active sessions.`)
      return
    }

    logger.info(`Polling for new notifications since ${since} for ${sessions.size} active sessions.`)

    const users = new Set(Array.from(sessions.values()).map((s) => s.userId))
    const notifications = await db.findNotifications(Array.from(users), true, since, 10_000)
    logger.info(`Found ${notifications.length} new notifications.`)

    const notificationsByUser = new Map<string, NotificationEvent[]>()
    for (const notification of notifications) {
      const userNotifications: NotificationEvent[] = notificationsByUser.get(notification.address) ?? []
      userNotifications.push(notification)
      notificationsByUser.set(notification.address, userNotifications)
    }
    console.log('notificationsByUser', notificationsByUser)

    for (const [address, notifications] of notificationsByUser) {
      for (const { userId, stream } of sessions.values()) {
        console.log('userId', userId, 'address', address)
        if (userId === address) {
          // Events are ordered and retrieved by the local timestamp of the database/server, not from the notification origin

          for (const notification of notifications) {
            logger.info(`Sending new notification to user ${userId}: ${notification.id}`)
            stream.push(`data: ${JSON.stringify(notification)}\n\n`)
          }
        }
      }
    }
  }

  let interval: any
  function start() {
    let lastCheck = Date.now()
    interval = setInterval(async () => {
      await poll(lastCheck)
      lastCheck = Date.now()
    }, 10_000)
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
