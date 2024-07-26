import { createConfigComponent } from '@well-known-components/env-config-provider'
import { NotificationType } from '@dcl/schemas'
import { createEmailRenderer, IEmailRenderer } from '../../../src/adapters/email-renderer'
import { NotificationRecord } from '@notifications/common'

describe('email rendering tests', () => {
  let config = createConfigComponent({
    SIGNING_KEY: 'some-super-secret-key',
    SERVICE_BASE_URL: 'https://notifications.decentraland.org',
    ENV: 'test'
  })
  let renderer: IEmailRenderer

  type EmailableNotificationTypes = Exclude<NotificationType, NotificationType.BADGE_GRANTED | NotificationType.REWARD_IN_PROGRESS>

  const notifications: Record<EmailableNotificationTypes, NotificationRecord> = {
    [NotificationType.BID_ACCEPTED]: {
      id: '123456789',
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
      id: '123456789',
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
      id: '123456789',
      type: NotificationType.EVENTS_STARTS_SOON,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        link: 'https://play.decentraland.org/?position=-99%2C35&realm=main',
        name: 'UNMONDAY YOURSELF',
        image: 'https://events-assets-099ac00.decentraland.org/poster/215052d46626a2a8.png',
        title: 'Event starts in an hour',
        endsAt: '2024-05-20T21:00:00.000Z',
        startsAt: '2024-03-18T19:00:00.000Z',
        description: 'The event UNMONDAY  YOURSELF starts in an hour.'
      },
      timestamp: Date.now(),
      eventKey: '123'
    },
    [NotificationType.EVENTS_STARTED]: {
      id: '123456789',
      type: NotificationType.EVENTS_STARTED,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        link: 'https://play.decentraland.org/?position=14%2C100&realm=main',
        name: 'Live DJ Music and Dancing in the Unity Café',
        image: 'https://events-assets-099ac00.decentraland.org/poster/3b8e6fc465ee4488.png',
        title: 'Event started',
        description: 'The event Live DJ Music and Dancing in the Unity Café has begun!'
      },
      timestamp: Date.now(),
      eventKey: '123'
    },
    [NotificationType.GOVERNANCE_ANNOUNCEMENT]: {
      id: '123456789',
      type: NotificationType.GOVERNANCE_ANNOUNCEMENT,
      address: null,
      metadata: {
        title: 'Some title',
        description: 'Some content',
        link: 'https://governance.decentraland.org/some-link'
      },
      timestamp: Date.now(),
      eventKey: '123'
    },
    [NotificationType.GOVERNANCE_AUTHORED_PROPOSAL_FINISHED]: {
      id: '123456789',
      type: NotificationType.GOVERNANCE_AUTHORED_PROPOSAL_FINISHED,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        link: 'https://governance.decentraland.org/proposal/?id=c9564934-1f5e-44a3-836e-c0e94c1f593f',
        title: 'Voting ended on your proposal Limit Grants Re-Submissions',
        proposalId: 'c9564934-1f5e-44a3-836e-c0e94c1f593f',
        description: 'The votes are in! Find out the outcome of the voting on your proposal now',
        proposalTitle: 'Limit Grants Re-Submissions'
      },
      timestamp: Date.now(),
      eventKey: '123'
    },
    [NotificationType.GOVERNANCE_COAUTHOR_REQUESTED]: {
      id: '123456789',
      type: NotificationType.GOVERNANCE_COAUTHOR_REQUESTED,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        link: 'https://governance.decentraland.org/proposal/?id=cacb1ce3-b5e9-4133-901a-cb787f43871f',
        title: 'Co-author request received',
        proposalId: 'cacb1ce3-b5e9-4133-901a-cb787f43871f',
        description:
          "You've been invited to collaborate as a co-author on a published proposal. Accept it or reject it here",
        proposalTitle: 'DCL Community Video Library'
      },
      timestamp: Date.now(),
      eventKey: '123'
    },
    [NotificationType.GOVERNANCE_NEW_COMMENT_ON_PROJECT_UPDATE]: {
      id: '123456789',
      type: NotificationType.GOVERNANCE_NEW_COMMENT_ON_PROJECT_UPDATE,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        link: 'https://governance.decentraland.org/update/?id=a38ec7d7-7eb2-4f9a-b9c8-363785fdcbd6&proposalId=1b8eef75-add3-49d6-9181-3061daaf22ec',
        title:
          'New comment on your update for your project Duel Arena P2E Continuum, Refinement & Game Expansion [ Resubmission ]',
        proposalId: '1b8eef75-add3-49d6-9181-3061daaf22ec',
        description: 'Engage in a productive conversation by replying to this comment.',
        proposalTitle: 'Duel Arena P2E Continuum, Refinement & Game Expansion [ Resubmission ]'
      },
      timestamp: Date.now(),
      eventKey: '123'
    },
    [NotificationType.GOVERNANCE_NEW_COMMENT_ON_PROPOSAL]: {
      id: '123456789',
      type: NotificationType.GOVERNANCE_NEW_COMMENT_ON_PROPOSAL,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        link: 'https://governance.decentraland.org/proposal/?id=578d3d3e-9fd2-48cb-bea3-ddc6fb5ab1dd',
        title: 'New comment posted on proposal Decentraland No-Code UI Design Studio',
        proposalId: '578d3d3e-9fd2-48cb-bea3-ddc6fb5ab1dd',
        description: 'Engage in a productive conversation by replying to this comment.',
        proposalTitle: 'Decentraland No-Code UI Design Studio'
      },
      timestamp: Date.now(),
      eventKey: '123'
    },
    [NotificationType.GOVERNANCE_PITCH_PASSED]: {
      id: '123456789',
      type: NotificationType.GOVERNANCE_PITCH_PASSED,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        proposalId: 'c9564934-1f5e-44a3-836e-c0e94c1f593f',
        proposalTitle: 'Limit Grants Re-Submissions',
        title: 'The Pitch "Limit Grants Re-Submissions" can now receive Tenders',
        description: 'Help to advance this idea by proposing potential solutions',
        link: 'https://governance.decentraland.org/proposal/?id=c9564934-1f5e-44a3-836e-c0e94c1f593f'
      },
      timestamp: Date.now(),
      eventKey: '123'
    },
    [NotificationType.GOVERNANCE_PROPOSAL_ENACTED]: {
      id: '123456789',
      type: NotificationType.GOVERNANCE_PROPOSAL_ENACTED,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        link: 'https://governance.decentraland.org/proposal/?id=578d3d3e-9fd2-48cb-bea3-ddc6fb5ab1dd',
        title: 'Your Project has been funded',
        proposalId: '578d3d3e-9fd2-48cb-bea3-ddc6fb5ab1dd',
        description:
          'Congratulations! Your Project has been successfully enacted and a funding Vesting Contract was created',
        proposalTitle: 'Decentraland No-Code UI Design Studio'
      },
      timestamp: Date.now(),
      eventKey: '123'
    },
    [NotificationType.GOVERNANCE_TENDER_PASSED]: {
      id: '123456789',
      type: NotificationType.GOVERNANCE_TENDER_PASSED,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        proposalId: 'c9564934-1f5e-44a3-836e-c0e94c1f593f',
        proposalTitle: 'Limit Grants Re-Submissions',
        title: 'The Tender "Limit Grants Re-Submissions" can now receive Bid Projects',
        description: 'If think you can tackle this solution, propose a Project and get funding from the DAO',
        link: 'https://governance.decentraland.org/proposal/?id=c9564934-1f5e-44a3-836e-c0e94c1f593f'
      },
      timestamp: Date.now(),
      eventKey: '123'
    },
    [NotificationType.GOVERNANCE_VOTING_ENDED_VOTER]: {
      id: '123456789',
      type: NotificationType.GOVERNANCE_VOTING_ENDED_VOTER,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        link: 'https://governance.decentraland.org/proposal/?id=c9564934-1f5e-44a3-836e-c0e94c1f593f',
        title: 'Voting ended on a proposal you voted on Limit Grants Re-Submissions',
        proposalId: 'c9564934-1f5e-44a3-836e-c0e94c1f593f',
        description: 'Discover the results of the proposal you participated in as a voter. Your input matters!',
        proposalTitle: 'Limit Grants Re-Submissions'
      },
      timestamp: Date.now(),
      eventKey: '123'
    },
    [NotificationType.ITEM_SOLD]: {
      id: '123456789',
      type: NotificationType.ITEM_SOLD,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        link: 'https://decentraland.org/marketplace/contracts/0xca520eea5aadff51b48d9e9b3038001a751139ca/tokens/180',
        image:
          'https://peer.decentraland.org/lambdas/collections/contents/urn:decentraland:matic:collections-v2:0xca520eea5aadff51b48d9e9b3038001a751139ca:0/thumbnail',
        title: 'Item Sold',
        rarity: 'epic',
        seller: '0x8967ad851ccbd4c1a2d57a128d3c606fcab29bad',
        network: 'polygon',
        nftName: 'HeartPrint Shoes',
        category: 'wearable',
        description: 'You just sold this HeartPrint Shoes.'
      },
      timestamp: Date.now(),
      eventKey: '123'
    },
    [NotificationType.LAND_RENTAL_ENDED]: {
      id: '123456789',
      type: NotificationType.LAND_RENTAL_ENDED,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        link: 'https://decentraland.org/marketplace/contracts/0x959e104e1a4db6317fa58f8295f586e1a978c297/tokens/1249/manage',
        title: 'Rent Period Ending',
        lessor: '0x95606705b7452e96a9e88901ee418ef4e3d19847',
        tenant: '0x135b17eaa25e3e0f3ce8f0a575bcc8867031f77c',
        endedAt: '1710627683',
        tokenId: '1249',
        contract: '0x959e104e1a4db6317fa58f8295f586e1a978c297',
        operator: '0x135b17eaa25e3e0f3ce8f0a575bcc8867031f77c',
        startedAt: '1679091683',
        land: '3,2',
        description: 'The rent of your LAND at 3,2 has ended.'
      },
      timestamp: Date.now(),
      eventKey: '123'
    },
    [NotificationType.LAND_RENTED]: {
      id: '123456789',
      type: NotificationType.LAND_RENTED,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        link: 'https://decentraland.org/marketplace/contracts/0x959e104e1a4db6317fa58f8295f586e1a978c297/tokens/5051/manage',
        title: 'LAND Rented',
        lessor: '0xea09431b6ddc2a52a997d690573934a72c8eb95b',
        tenant: '0x951a6698f644a9b1c634abc416b9d9902aaf3db9',
        endedAt: '1742748707',
        tokenId: '5051',
        contract: '0x959e104e1a4db6317fa58f8295f586e1a978c297',
        operator: '0x55651e399ca32d7e2f44034fb62996937af0bc49',
        startedAt: '1711212707',
        land: '1,2',
        description: 'Your LAND at 1,2 was rented by 0x951a6698f644a9b1c634abc416b9d9902aaf3db9.'
      },
      timestamp: Date.now(),
      eventKey: '123'
    },
    [NotificationType.REWARD_ASSIGNED]: {
      id: '123456789',
      type: NotificationType.REWARD_ASSIGNED,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        title: 'New item received',
        tokenName: 'MESHfair 2024 Halo',
        tokenImage:
          'https://peer.decentraland.org/lambdas/collections/contents/urn:decentraland:matic:collections-v2:0x2cbd78a88c8556ac22186b365c4260e8c7855df0:0/thumbnail',
        description: 'This MESHfair 2024 Halo is already in your backpack',
        tokenRarity: 'epic'
      },
      timestamp: Date.now(),
      eventKey: '123'
    },
    [NotificationType.ROYALTIES_EARNED]: {
      id: '123456789',
      type: NotificationType.ROYALTIES_EARNED,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        link: 'https://decentraland.org/marketplace/contracts/0x08cbc78c1b2e2eea7627c39c8adf660d52e3d82c/tokens/945',
        image:
          'https://peer.decentraland.org/lambdas/collections/contents/urn:decentraland:matic:collections-v2:0x08cbc78c1b2e2eea7627c39c8adf660d52e3d82c:0/thumbnail',
        title: 'Royalties Earned',
        rarity: 'uncommon',
        network: 'polygon',
        nftName: 'Blue santa hat',
        category: 'wearable',
        description: 'You earned 0.90 MANA for this Blue santa hat.',
        royaltiesCut: '900000000000000000',
        royaltiesCollector: '0x99352b315b769efbacaa4107e68203bd47a8bdda'
      },
      timestamp: Date.now(),
      eventKey: '123'
    },
    [NotificationType.WORLDS_ACCESS_RESTORED]: {
      id: '123456789',
      type: NotificationType.WORLDS_ACCESS_RESTORED,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        url: 'https://decentraland.org/builder/worlds?tab=dcl',
        title: 'Worlds available',
        description: 'Access to your Worlds has been restored.'
      },
      timestamp: Date.now(),
      eventKey: '123'
    },
    [NotificationType.WORLDS_ACCESS_RESTRICTED]: {
      id: '123456789',
      type: NotificationType.WORLDS_ACCESS_RESTRICTED,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        title: 'Worlds restricted',
        description: 'Access to your Worlds has been restricted due to insufficient resources.',
        url: `https://decentraland.org/builder/worlds?tab=dcl`,
        when: Date.now()
      },
      timestamp: Date.now(),
      eventKey: '123'
    },
    [NotificationType.WORLDS_MISSING_RESOURCES]: {
      id: '123456789',
      type: NotificationType.WORLDS_MISSING_RESOURCES,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        url: 'https://decentraland.org/builder/worlds?tab=dcl',
        when: 1711929897037,
        title: 'Missing Resources',
        description: 'World access at risk in 48hs. Rectify now to prevent disruption.'
      },
      timestamp: Date.now(),
      eventKey: '123'
    },
    [NotificationType.WORLDS_PERMISSION_GRANTED]: {
      id: '123456789',
      type: NotificationType.WORLDS_PERMISSION_GRANTED,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        title: 'Worlds permission granted',
        description: 'You have been granted access permission for world el.dcl.eth',
        world: 'el.dcl.eth',
        permissions: ['access'],
        url: 'https://decentraland.org/builder/worlds?tab=dcl'
      },
      timestamp: Date.now(),
      eventKey: '123'
    },
    [NotificationType.WORLDS_PERMISSION_REVOKED]: {
      id: '123456789',
      type: NotificationType.WORLDS_PERMISSION_REVOKED,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        title: 'World permission revoked',
        description: 'Your streaming permission for world el.dcl.eth has been revoked',
        world: 'el.dcl.eth',
        permissions: ['streaming'],
        url: 'https://decentraland.org/builder/worlds?tab=dcl'
      },
      timestamp: Date.now(),
      eventKey: '123'
    }
  }

  beforeAll(async () => {
    renderer = await createEmailRenderer({ config })
  })

  const cases = Object.keys(notifications).map((type) => [type, notifications[type]])

  test('Examples match the type of their keys', () => {
    Object.keys(notifications).forEach((type) => {
      expect(notifications[type].type).toBe(type)
    })
  })

  test.each(cases)(`rendering %s`, async (_type: NotificationType, notification: NotificationRecord) => {
    expect(await renderer.renderEmail('email@example.com', notification)).toMatchSnapshot()
  })
})
