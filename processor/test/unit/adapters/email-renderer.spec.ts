import { createRenderer } from '../../../src/adapters/email-renderer'
import { IEmailRenderer, NotificationRecord } from '../../../src/types'
import { NotificationType } from '@dcl/schemas'

describe('email rendering tests', () => {
  let renderer: IEmailRenderer

  const notifications: Record<NotificationType, NotificationRecord> = {
    [NotificationType.BID_ACCEPTED]: {
      type: NotificationType.BID_ACCEPTED,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        link: 'https://decentraland.org/marketplace/contracts/0x557539e7792dc12a0555f5ff02d6ec0f0bc88e09/tokens/21',
        image:
          'https://peer.decentraland.org/lambdas/collections/contents/urn:decentraland:matic:collections-v2:0x557539e7792dc12a0555f5ff02d6ec0f0bc88e09:0/thumbnail',
        price: '1500000000000000000',
        title: 'Bid Accepted',
        rarity: 'legendary',
        seller: '0x072f890d413c5b37b2ee7661929dfb681abc6673',
        network: 'polygon',
        nftName: 'Netgate male',
        category: 'wearable',
        description: 'Your bid for 1.50 MANA for this Netgate male was accepted.'
      },
      timestamp: Date.now(),
      eventKey: '123'
    },
    [NotificationType.BID_RECEIVED]: {
      type: NotificationType.BID_RECEIVED,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        link: 'https://decentraland.org/marketplace/account?assetType=nft&section=bids',
        image:
          'https://peer.decentraland.org/lambdas/collections/contents/urn:decentraland:matic:collections-v2:0xf6ed0f2eea302dbd77482bd4771645ee142ecf7c:1/thumbnail',
        price: '1500000000000000000',
        title: 'Bid Received',
        rarity: 'legendary',
        seller: '0x460b8af3f189aa7f396b4ef696f1218f0fcf7f28',
        network: 'polygon',
        nftName: 'Space Jams',
        category: 'wearable',
        description: 'You received a bid of 1.50 MANA for this Space Jams.'
      },
      timestamp: Date.now(),
      eventKey: '123'
    },
    [NotificationType.EVENTS_STARTS_SOON]: {
      type: NotificationType.EVENTS_STARTS_SOON,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
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
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
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

  test('Examples match the type of their keys', () => {
    Object.keys(notifications).forEach((type) => {
      console.log(type)
      expect(notifications[type].type).toBe(type)
    })
  })

  test.each(cases)(`rendering %s`, async (type: NotificationType, notification: NotificationRecord) => {
    expect(renderer.renderEmail(notification)).toMatchSnapshot()
  })
})
