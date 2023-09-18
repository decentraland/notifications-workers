import { insertNotification } from 'commons/dist/logic/db'
import { HandlerContextWithPath, InvalidRequestError } from '../../types'

export async function createNotificationsHandler(
  context: Pick<HandlerContextWithPath<'pg' | 'logs' | 'config', '/notifications'>, 'url' | 'request' | 'components'>
) {
  const { pg, logs } = context.components
  const logger = logs.getLogger('notifications-handler')
  const apiKey = await context.components.config.getString('INTERNAL_API_KEY')
  const authorization = context.request.headers.get('Authorization')

  if (!(authorization === `Bearer ${apiKey}`)) {
    logger.debug(`Invalid API Key`)
    throw new InvalidRequestError('Invalid API Key')
  }

  let body
  try {
    body = await context.request.json()
  } catch (error: any) {
    logger.debug(`Error parsing body: ${error.message}`)
    throw new InvalidRequestError('Invalid body')
  }

  await insertNotification(pg, body, {
    type: 'internal',
    source: 'dcl_api'
  })

  return {
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: {}
  }
}
