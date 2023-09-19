import { IHttpServerComponent } from '@well-known-components/interfaces'
import { InvalidRequestError } from '../../types'

export async function parseJson(request: IHttpServerComponent.IRequest) {
  try {
    return await request.json()
  } catch (error: any) {
    throw new InvalidRequestError('Invalid body, must be JSON with notificationIds array field')
  }
}
