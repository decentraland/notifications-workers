import { NotificationType } from '@dcl/schemas'
import { EmailableNotificationTypeEnum } from '../../src/types'

describe('when listing the emailable notification types', () => {
  it('should leave favorite discount notifications out, so they are in-app only', () => {
    expect(Object.values(EmailableNotificationTypeEnum)).not.toContain(NotificationType.ITEM_DISCOUNTED)
  })

  it('should keep the types that are emailed', () => {
    expect(Object.values(EmailableNotificationTypeEnum)).toContain(NotificationType.BID_RECEIVED)
  })
})
