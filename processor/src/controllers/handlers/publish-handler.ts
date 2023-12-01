import { HandlerContextWithPath, NotificationRecord } from '../../types'
import { NotAuthorizedError, parseJson } from '@notifications/commons'

export async function sendNotificationsToSqsHandler(
  context: Pick<HandlerContextWithPath<'config' | 'db', '/notifications'>, 'request' | 'components'>
) {
  const apiKey = await context.components.config.requireString('INTERNAL_API_KEY')
  const authorization = context.request.headers.get('Authorization')
  if (authorization !== `Bearer ${apiKey}`) {
    throw new NotAuthorizedError('Invalid API Key')
  }

  const body = (await parseJson(context.request)) as NotificationRecord
  // TODO: probably we want to validate the payload

  await context.components.db.insertNotifications([body])

  return {
    status: 204,
    body: {}
  }
}
