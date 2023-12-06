import { HandlerContextWithPath } from '../../types'

export async function notificationsHandler(
  context: Pick<HandlerContextWithPath<'db' | 'logs', '/notifications'>, 'url' | 'components' | 'verification'>
) {
  const { db } = context.components
  const searchParams = context.url.searchParams
  const from = parseInt(searchParams.get('from') || '0', 10) || 0
  const onlyUnread = searchParams.has('onlyUnread')
  const limitParam = parseInt(searchParams.get('limit') || '20', 10)
  const limit = !!limitParam && limitParam > 0 && limitParam <= 50 ? limitParam : 20

  const userId = context.verification!.auth.toLowerCase()

  const notifications = await db.findNotifications([userId], onlyUnread, from, limit)
  return {
    body: { notifications }
  }
}
