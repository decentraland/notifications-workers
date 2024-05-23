import { ISendGridClient } from '@notifications/common'

export function createSendGridClientMock(): ISendGridClient {
  return {
    sendEmail: jest.fn()
  }
}
