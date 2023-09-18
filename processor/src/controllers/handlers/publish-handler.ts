import { InvalidRequestError, ProcessorHandlerContextWithPath } from '../../types'

export async function sendNotificationsToSqsHandler(
  context: Pick<
    ProcessorHandlerContextWithPath<'pg' | 'logs' | 'config' | 'sqs', '/notifications'>,
    'url' | 'request' | 'components'
  >
) {
  const { logs } = context.components
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

  await context.components.sqs.publish(body)

  return {
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: {}
  }
}
