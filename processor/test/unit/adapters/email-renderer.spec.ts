import { createRenderer } from '../../../src/adapters/email-renderer'
import { IEmailRenderer, NotificationRecord } from '../../../src/types'
import { NotificationType } from '@dcl/schemas'

describe('email rendering tests', () => {
  let renderer: IEmailRenderer

  const notifications: Record<NotificationType, NotificationRecord> = {
    [NotificationType.BID_ACCEPTED]: undefined,
    [NotificationType.BID_RECEIVED]: undefined,
    [NotificationType.EVENTS_STARTS_SOON]: {
      type: NotificationType.EVENTS_STARTS_SOON,
      address: '0x123',
      metadata: {
        link: 'https://events.decentraland.org/music',
        name: 'Music Festival'
      },
      timestamp: Date.now(),
      eventKey: '123'
    },
    [NotificationType.GOVERNANCE_ANNOUNCEMENT]: undefined,
    [NotificationType.GOVERNANCE_AUTHORED_PROPOSAL_FINISHED]: undefined,
    [NotificationType.GOVERNANCE_COAUTHOR_REQUESTED]: undefined,
    [NotificationType.GOVERNANCE_NEW_COMMENT_ON_PROJECT_UPDATE]: undefined,
    [NotificationType.GOVERNANCE_NEW_COMMENT_ON_PROPOSAL]: undefined,
    [NotificationType.GOVERNANCE_PITCH_PASSED]: undefined,
    [NotificationType.GOVERNANCE_PROPOSAL_ENACTED]: undefined,
    [NotificationType.GOVERNANCE_TENDER_PASSED]: undefined,
    [NotificationType.GOVERNANCE_VOTING_ENDED_VOTER]: undefined,
    [NotificationType.ITEM_SOLD]: undefined,
    [NotificationType.LAND_RENTAL_ENDED]: undefined,
    [NotificationType.LAND_RENTED]: undefined,
    [NotificationType.REWARD_ASSIGNED]: undefined,
    [NotificationType.ROYALTIES_EARNED]: undefined,
    [NotificationType.WORLDS_ACCESS_RESTORED]: undefined,
    [NotificationType.WORLDS_ACCESS_RESTRICTED]: undefined,
    [NotificationType.WORLDS_MISSING_RESOURCES]: undefined,
    [NotificationType.WORLDS_PERMISSION_GRANTED]: undefined,
    [NotificationType.WORLDS_PERMISSION_REVOKED]: undefined,
    [NotificationType.EVENTS_STARTED]: {
      type: NotificationType.EVENTS_STARTED,
      address: '0x123',
      metadata: {
        link: 'https://events.decentraland.org/music',
        name: 'Music Festival'
      },
      timestamp: Date.now(),
      eventKey: '123'
    }
  }

  beforeAll(() => {
    renderer = createRenderer()
  })

  const cases = Object.keys(notifications).map((type) => [type, notifications[type]])

  test.each(cases)(`rendering %s`, async (type: NotificationType, notification: NotificationRecord) => {
    expect(renderer.renderEmail(notification)).toMatchSnapshot()
  })
})
