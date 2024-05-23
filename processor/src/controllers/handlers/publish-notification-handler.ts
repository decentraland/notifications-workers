import { HandlerContextWithPath } from '../../types'
import { InvalidRequestError, parseJson } from '@dcl/platform-server-commons'
import Joi from 'joi'
import { NotificationType } from '@dcl/schemas'
import { NotificationRecord } from '@notifications/common'

const schema = Joi.array().items(
  Joi.object().keys({
    type: Joi.string()
      .required()
      .valid(...Object.values(NotificationType))
      .messages({
        'any.only': 'Invalid notification type: {#value}'
      }),
    address: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/),
    eventKey: Joi.string().required(),
    metadata: Joi.object().required(),
    timestamp: Joi.number().integer().required().greater(1672531200000) // 2023-01-01T00:00:00Z
  })
)

export async function publishNotificationHandler(
  context: Pick<HandlerContextWithPath<'logs' | 'notificationsService', '/notifications'>, 'request' | 'components'>
) {
  const { logs, notificationsService } = context.components
  const logger = logs.getLogger('publish-notification-handler')

  const body = await parseJson<NotificationRecord[]>(context.request)

  const validate = schema.validate(body)
  if (validate.error) {
    logger.warn(`Invalid notification object received: ${validate.error.message} (${JSON.stringify(body)}`)
    throw new InvalidRequestError(validate.error.message)
  }

  await notificationsService.saveNotifications(body)

  return {
    status: 204,
    body: {}
  }
}
