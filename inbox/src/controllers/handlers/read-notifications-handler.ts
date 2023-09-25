import { IHttpServerComponent } from '@well-known-components/interfaces'
import { HandlerContextWithPath, InvalidRequestError } from '../../types'

export async function parseJson(request: IHttpServerComponent.IRequest) {
  try {
    return await request.json()
  } catch (error: any) {
    throw new InvalidRequestError('Invalid body, must be JSON with notificationIds array field')
  }
}

export async function readNotificationsHandler(
  context: Pick<HandlerContextWithPath<'db' | 'logs', '/notifications/read'>, 'request' | 'components' | 'verification'>
) {
  const { db, logs } = context.components
  const logger = logs.getLogger('read-notifications-handler')

  const userId: string = context.verification!.auth
  const body = await parseJson(context.request)
  const notificationIds = body.notificationIds

  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    throw new InvalidRequestError('Missing notificationIds')
  }

  try {
    const rowCount = await db.markNotificationsAsRead(userId, notificationIds)
    return {
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: {
        updated: rowCount
      }
    }
  } catch (error: any) {
    logger.error(`Error updating notifications: ${error.message}`)
    throw new InvalidRequestError('Invalid origin_id and type, as they already exist')
  }
}
