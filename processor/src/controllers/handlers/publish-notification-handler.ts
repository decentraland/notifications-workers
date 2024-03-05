import { HandlerContextWithPath, NotificationRecord } from '../../types'
import { InvalidRequestError, parseJson } from '@dcl/platform-server-commons'
import Joi from 'joi'

const schema = Joi.array().items(
  Joi.object().keys({
    type: Joi.string().required(),
    address: Joi.string()
      .required()
      .regex(/^0x[a-fA-F0-9]{40}$/),
    eventKey: Joi.string().required(),
    metadata: Joi.object().required(),
    timestamp: Joi.number().integer().required()
  })
)

export async function publishNotificationHandler(
  context: Pick<HandlerContextWithPath<'db' | 'logs', '/notifications'>, 'request' | 'components'>
) {
  const logger = context.components.logs.getLogger('publish-notification-handler')

  const body = await parseJson(context.request)

  const validate = schema.validate(body)
  if (validate.error) {
    logger.warn(`Invalid notification object received: ${validate.error.message} (${JSON.stringify(body)}`)
    throw new InvalidRequestError(validate.error.message)
  }

  await context.components.db.insertNotifications(body as NotificationRecord[])

  return {
    status: 204,
    body: {}
  }
}
