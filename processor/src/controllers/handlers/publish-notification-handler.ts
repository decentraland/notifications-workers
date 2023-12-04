import { HandlerContextWithPath, NotificationRecord } from '../../types'
import { InvalidRequestError, NotAuthorizedError, parseJson } from '@notifications/commons'
import Joi from 'joi'

const schema = Joi.object().keys({
  type: Joi.string().required(),
  address: Joi.string()
    .required()
    .regex(/^0x[a-fA-F0-9]{40}$/),
  eventKey: Joi.string().required(),
  metadata: Joi.object().required(),
  timestamp: Joi.number().integer().required()
})

export async function publishNotificationHandler(
  context: Pick<HandlerContextWithPath<'config' | 'db' | 'logs', '/notifications'>, 'request' | 'components'>
) {
  const logger = context.components.logs.getLogger('publish-notification-handler')
  const apiKey = await context.components.config.requireString('INTERNAL_API_KEY')
  const authorization = context.request.headers.get('Authorization')
  if (authorization !== `Bearer ${apiKey}`) {
    throw new NotAuthorizedError('Invalid API Key')
  }

  const body = await parseJson(context.request)

  const validate = schema.validate(body)
  if (validate.error) {
    logger.warn(`Invalid notification object received: ${validate.error.message} (${JSON.stringify(body)}`)
    throw new InvalidRequestError(validate.error.message)
  }

  await context.components.db.insertNotifications([body as NotificationRecord])

  return {
    status: 204,
    body: {}
  }
}
