import { IHttpServerComponent } from '@well-known-components/interfaces'
import { InvalidRequestError, NotFoundError, NotificationError } from '../../types'

function handleError(error: any): { status: number; body: NotificationError } {
  if (error instanceof InvalidRequestError) {
    return {
      status: 400,
      body: {
        error: 'Bad request',
        message: error.message
      }
    }
  }

  if (error instanceof NotFoundError) {
    return {
      status: 404,
      body: {
        error: 'Not Found',
        message: error.message
      }
    }
  }

  throw error
}

export async function errorHandler(
  ctx: IHttpServerComponent.DefaultContext<object>,
  next: () => Promise<IHttpServerComponent.IResponse>
): Promise<IHttpServerComponent.IResponse> {
  try {
    return await next()
  } catch (error: any) {
    try {
      return handleError(error)
    } catch (err: any) {
      console.log(`Error handling ${ctx.url.toString()}: ${error.message}`)
      return {
        status: 500,
        body: {
          error: 'Internal Server Error'
        }
      }
    }
  }
}