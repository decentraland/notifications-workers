import { createConfigComponent } from '@well-known-components/env-config-provider'
import { createLogComponent } from '@well-known-components/logger'
import { ILoggerComponent } from '@well-known-components/interfaces'
import { createEventParser } from '../../../src/logic/event-parser'
import { IEventParser } from '../../../src/types'
import { Events, NotificationType } from '@dcl/schemas'
import { NotificationScope } from '@notifications/common'

describe('when parsing event notifications', () => {
  let config: any
  let logs: ILoggerComponent
  let eventParser: IEventParser
  let fixedTimestamp: number

  beforeEach(async () => {
    fixedTimestamp = 1640995200000 // Fixed timestamp: 2022-01-01T00:00:00.000Z
    config = createConfigComponent({
      CDN_URL: 'https://cdn.decentraland.org',
      DECENTRALAND_URL: 'https://decentraland.org'
    })
    logs = await createLogComponent({ config })
    eventParser = await createEventParser({ logs, config })
  })

  describe('and the event is EVENT_CREATED', () => {
    let event: any

    beforeEach(() => {
      event = {
        type: Events.Type.EVENT,
        subType: Events.SubType.Event.EVENT_CREATED,
        key: 'event-123',
        timestamp: fixedTimestamp,
        metadata: {
          title: 'Community Event Added',
          description: 'The Test Community has added a new event.',
          name: 'Test Event',
          image: 'https://example.com/image.jpg',
          communityId: 'community-123',
          communityName: 'Test Community',
          communityThumbnail: 'https://example.com/community-thumb.jpg',
          attendee: '0x1234567890123456789012345678901234567890'
        }
      }
    })

    it('should parse to EVENT_CREATED notification', () => {
      const notifications = eventParser.parseToNotifications(event)

      expect(notifications).toHaveLength(1)
      expect(notifications[0]).toEqual({
        type: NotificationType.EVENT_CREATED,
        address: '0x1234567890123456789012345678901234567890',
        eventKey: 'event-123',
        timestamp: fixedTimestamp,
        optOutScope: {
          scope: NotificationScope.Community,
          scopeId: 'community-123'
        },
        metadata: {
          title: 'Community Event Added',
          description: 'The Test Community has added a new event.',
          name: 'Test Event',
          image: 'https://example.com/image.jpg',
          communityId: 'community-123',
          communityName: 'Test Community',
          communityThumbnail: 'https://example.com/community-thumb.jpg'
        }
      })
    })
  })

  describe('and the event is EVENT_STARTED', () => {
    let event: any

    beforeEach(() => {
      event = {
        type: Events.Type.EVENT,
        subType: Events.SubType.Event.EVENT_STARTED,
        key: 'event-123',
        timestamp: fixedTimestamp,
        metadata: {
          title: 'Event started',
          description: 'The event Test Event has begun!',
          name: 'Test Event',
          image: 'https://example.com/image.jpg',
          link: 'https://decentraland.org/jump?realm=test&id=event-123',
          communityThumbnail: 'https://example.com/community-thumb.jpg',
          attendee: '0x1234567890123456789012345678901234567890'
        }
      }
    })

    it('should parse to EVENTS_STARTED notification', () => {
      const notifications = eventParser.parseToNotifications(event)

      expect(notifications).toHaveLength(1)
      expect(notifications[0]).toEqual({
        type: NotificationType.EVENTS_STARTED,
        address: '0x1234567890123456789012345678901234567890',
        eventKey: 'event-123',
        timestamp: fixedTimestamp,
        /* optOutScope: {
          scope: NotificationScope.Community,
          scopeId: 'community-123'
        }, */
        metadata: {
          title: 'Event started',
          description: 'The event Test Event has begun!',
          name: 'Test Event',
          image: 'https://example.com/image.jpg',
          link: 'https://decentraland.org/jump?realm=test&id=event-123',
          communityThumbnail: 'https://example.com/community-thumb.jpg'
        }
      })
    })
  })

  describe('and the event is EVENT_STARTS_SOON', () => {
    let event: any

    beforeEach(() => {
      event = {
        type: Events.Type.EVENT,
        subType: Events.SubType.Event.EVENT_STARTS_SOON,
        key: 'event-123',
        timestamp: fixedTimestamp,
        metadata: {
          title: 'Event starts in an hour',
          description: 'The event Test Event starts in an hour.',
          name: 'Test Event',
          image: 'https://example.com/image.jpg',
          link: 'https://decentraland.org/jump?realm=test&id=event-123',
          startsAt: '2024-01-01T10:00:00.000Z',
          endsAt: '2024-01-01T12:00:00.000Z',
          attendee: '0x1234567890123456789012345678901234567890'
        }
      }
    })

    it('should parse to EVENTS_STARTS_SOON notification', () => {
      const notifications = eventParser.parseToNotifications(event)

      expect(notifications).toHaveLength(1)
      expect(notifications[0]).toEqual({
        type: NotificationType.EVENTS_STARTS_SOON,
        address: '0x1234567890123456789012345678901234567890',
        eventKey: 'event-123',
        timestamp: fixedTimestamp,
        metadata: {
          title: 'Event starts in an hour',
          description: 'The event Test Event starts in an hour.',
          name: 'Test Event',
          image: 'https://example.com/image.jpg',
          link: 'https://decentraland.org/jump?realm=test&id=event-123',
          startsAt: '2024-01-01T10:00:00.000Z',
          endsAt: '2024-01-01T12:00:00.000Z'
        }
      })
    })
  })

  describe('and the event is an unsupported type', () => {
    let event: any

    beforeEach(() => {
      event = {
        type: Events.Type.EVENT,
        subType: 'UNSUPPORTED_EVENT_TYPE',
        key: 'event-123',
        timestamp: fixedTimestamp,
        metadata: {
          attendee: '0x1234567890123456789012345678901234567890'
        }
      }
    })

    it('should return empty array', () => {
      const notifications = eventParser.parseToNotifications(event)

      expect(notifications).toHaveLength(0)
    })
  })
})

describe('when parsing governance notifications', () => {
  let config: any
  let logs: ILoggerComponent
  let eventParser: IEventParser
  let fixedTimestamp: number

  beforeEach(async () => {
    fixedTimestamp = 1640995200000 // Fixed timestamp: 2022-01-01T00:00:00.000Z
    config = createConfigComponent({
      CDN_URL: 'https://cdn.decentraland.org',
      DECENTRALAND_URL: 'https://decentraland.org'
    })
    logs = await createLogComponent({ config })
    eventParser = await createEventParser({ logs, config })
  })

  describe('and the event is PROPOSAL_ENACTED', () => {
    let event: any

    beforeEach(() => {
      event = {
        type: Events.Type.GOVERNANCE,
        subType: Events.SubType.Governance.PROPOSAL_ENACTED,
        key: 'proposal-123',
        timestamp: fixedTimestamp,
        metadata: {
          proposalId: 'proposal-123',
          proposalTitle: 'Test Proposal',
          title: 'Proposal Enacted',
          description: 'Your proposal has been enacted.',
          link: 'https://governance.decentraland.org/proposal/123',
          address: '0x1234567890123456789012345678901234567890'
        }
      }
    })

    it('should parse to GOVERNANCE_PROPOSAL_ENACTED notification', () => {
      const notifications = eventParser.parseToNotifications(event)

      expect(notifications).toHaveLength(1)
      expect(notifications[0]).toEqual({
        type: NotificationType.GOVERNANCE_PROPOSAL_ENACTED,
        address: '0x1234567890123456789012345678901234567890',
        eventKey: 'proposal-123',
        timestamp: fixedTimestamp,
        metadata: {
          proposalId: 'proposal-123',
          proposalTitle: 'Test Proposal',
          title: 'Proposal Enacted',
          description: 'Your proposal has been enacted.',
          link: 'https://governance.decentraland.org/proposal/123'
        }
      })
    })
  })

  describe('and the event is COAUTHOR_REQUESTED', () => {
    let event: any

    beforeEach(() => {
      event = {
        type: Events.Type.GOVERNANCE,
        subType: Events.SubType.Governance.COAUTHOR_REQUESTED,
        key: 'proposal-123',
        timestamp: fixedTimestamp,
        metadata: {
          proposalId: 'proposal-123',
          proposalTitle: 'Test Proposal',
          title: 'Co-author Request',
          description: 'You have been requested as a co-author.',
          link: 'https://governance.decentraland.org/proposal/123',
          address: '0x1234567890123456789012345678901234567890'
        }
      }
    })

    it('should parse to GOVERNANCE_COAUTHOR_REQUESTED notification', () => {
      const notifications = eventParser.parseToNotifications(event)

      expect(notifications).toHaveLength(1)
      expect(notifications[0]).toEqual({
        type: NotificationType.GOVERNANCE_COAUTHOR_REQUESTED,
        address: '0x1234567890123456789012345678901234567890',
        eventKey: 'proposal-123',
        timestamp: fixedTimestamp,
        metadata: {
          proposalId: 'proposal-123',
          proposalTitle: 'Test Proposal',
          title: 'Co-author Request',
          description: 'You have been requested as a co-author.',
          link: 'https://governance.decentraland.org/proposal/123'
        }
      })
    })
  })

  describe('and the event is PITCH_PASSED', () => {
    let event: any

    beforeEach(() => {
      event = {
        type: Events.Type.GOVERNANCE,
        subType: Events.SubType.Governance.PITCH_PASSED,
        key: 'proposal-123',
        timestamp: fixedTimestamp,
        metadata: {
          proposalId: 'proposal-123',
          proposalTitle: 'Test Pitch',
          title: 'Pitch Passed',
          description: 'Your pitch has passed.',
          link: 'https://governance.decentraland.org/proposal/123',
          address: '0x1234567890123456789012345678901234567890'
        }
      }
    })

    it('should parse to GOVERNANCE_PITCH_PASSED notification', () => {
      const notifications = eventParser.parseToNotifications(event)

      expect(notifications).toHaveLength(1)
      expect(notifications[0]).toEqual({
        type: NotificationType.GOVERNANCE_PITCH_PASSED,
        address: '0x1234567890123456789012345678901234567890',
        eventKey: 'proposal-123',
        timestamp: fixedTimestamp,
        metadata: {
          proposalId: 'proposal-123',
          proposalTitle: 'Test Pitch',
          title: 'Pitch Passed',
          description: 'Your pitch has passed.',
          link: 'https://governance.decentraland.org/proposal/123'
        }
      })
    })
  })

  describe('and the event is TENDER_PASSED', () => {
    let event: any

    beforeEach(() => {
      event = {
        type: Events.Type.GOVERNANCE,
        subType: Events.SubType.Governance.TENDER_PASSED,
        key: 'proposal-123',
        timestamp: fixedTimestamp,
        metadata: {
          proposalId: 'proposal-123',
          proposalTitle: 'Test Tender',
          title: 'Tender Passed',
          description: 'Your tender has passed.',
          link: 'https://governance.decentraland.org/proposal/123',
          address: '0x1234567890123456789012345678901234567890'
        }
      }
    })

    it('should parse to GOVERNANCE_TENDER_PASSED notification', () => {
      const notifications = eventParser.parseToNotifications(event)

      expect(notifications).toHaveLength(1)
      expect(notifications[0]).toEqual({
        type: NotificationType.GOVERNANCE_TENDER_PASSED,
        address: '0x1234567890123456789012345678901234567890',
        eventKey: 'proposal-123',
        timestamp: fixedTimestamp,
        metadata: {
          proposalId: 'proposal-123',
          proposalTitle: 'Test Tender',
          title: 'Tender Passed',
          description: 'Your tender has passed.',
          link: 'https://governance.decentraland.org/proposal/123'
        }
      })
    })
  })

  describe('and the event is AUTHORED_PROPOSAL_FINISHED', () => {
    let event: any

    beforeEach(() => {
      event = {
        type: Events.Type.GOVERNANCE,
        subType: Events.SubType.Governance.AUTHORED_PROPOSAL_FINISHED,
        key: 'proposal-123',
        timestamp: fixedTimestamp,
        metadata: {
          proposalId: 'proposal-123',
          proposalTitle: 'Test Proposal',
          title: 'Proposal Finished',
          description: 'Your authored proposal has finished.',
          link: 'https://governance.decentraland.org/proposal/123',
          address: '0x1234567890123456789012345678901234567890'
        }
      }
    })

    it('should parse to GOVERNANCE_AUTHORED_PROPOSAL_FINISHED notification', () => {
      const notifications = eventParser.parseToNotifications(event)

      expect(notifications).toHaveLength(1)
      expect(notifications[0]).toEqual({
        type: NotificationType.GOVERNANCE_AUTHORED_PROPOSAL_FINISHED,
        address: '0x1234567890123456789012345678901234567890',
        eventKey: 'proposal-123',
        timestamp: fixedTimestamp,
        metadata: {
          proposalId: 'proposal-123',
          proposalTitle: 'Test Proposal',
          title: 'Proposal Finished',
          description: 'Your authored proposal has finished.',
          link: 'https://governance.decentraland.org/proposal/123'
        }
      })
    })
  })

  describe('and the event is VOTING_ENDED_VOTER', () => {
    let event: any

    beforeEach(() => {
      event = {
        type: Events.Type.GOVERNANCE,
        subType: Events.SubType.Governance.VOTING_ENDED_VOTER,
        key: 'proposal-123',
        timestamp: fixedTimestamp,
        metadata: {
          proposalId: 'proposal-123',
          proposalTitle: 'Test Proposal',
          title: 'Voting Ended',
          description: 'Voting has ended for this proposal.',
          link: 'https://governance.decentraland.org/proposal/123',
          address: '0x1234567890123456789012345678901234567890'
        }
      }
    })

    it('should parse to GOVERNANCE_VOTING_ENDED_VOTER notification', () => {
      const notifications = eventParser.parseToNotifications(event)

      expect(notifications).toHaveLength(1)
      expect(notifications[0]).toEqual({
        type: NotificationType.GOVERNANCE_VOTING_ENDED_VOTER,
        address: '0x1234567890123456789012345678901234567890',
        eventKey: 'proposal-123',
        timestamp: fixedTimestamp,
        metadata: {
          proposalId: 'proposal-123',
          proposalTitle: 'Test Proposal',
          title: 'Voting Ended',
          description: 'Voting has ended for this proposal.',
          link: 'https://governance.decentraland.org/proposal/123'
        }
      })
    })
  })

  describe('and the event is NEW_COMMENT_ON_PROPOSAL', () => {
    let event: any

    beforeEach(() => {
      event = {
        type: Events.Type.GOVERNANCE,
        subType: Events.SubType.Governance.NEW_COMMENT_ON_PROPOSAL,
        key: 'proposal-123',
        timestamp: fixedTimestamp,
        metadata: {
          proposalId: 'proposal-123',
          proposalTitle: 'Test Proposal',
          title: 'New Comment',
          description: 'There is a new comment on your proposal.',
          link: 'https://governance.decentraland.org/proposal/123',
          address: '0x1234567890123456789012345678901234567890'
        }
      }
    })

    it('should parse to GOVERNANCE_NEW_COMMENT_ON_PROPOSAL notification', () => {
      const notifications = eventParser.parseToNotifications(event)

      expect(notifications).toHaveLength(1)
      expect(notifications[0]).toEqual({
        type: NotificationType.GOVERNANCE_NEW_COMMENT_ON_PROPOSAL,
        address: '0x1234567890123456789012345678901234567890',
        eventKey: 'proposal-123',
        timestamp: fixedTimestamp,
        metadata: {
          proposalId: 'proposal-123',
          proposalTitle: 'Test Proposal',
          title: 'New Comment',
          description: 'There is a new comment on your proposal.',
          link: 'https://governance.decentraland.org/proposal/123'
        }
      })
    })
  })

  describe('and the event is NEW_COMMENT_ON_PROJECT_UPDATED', () => {
    let event: any

    beforeEach(() => {
      event = {
        type: Events.Type.GOVERNANCE,
        subType: Events.SubType.Governance.NEW_COMMENT_ON_PROJECT_UPDATED,
        key: 'update-123',
        timestamp: fixedTimestamp,
        metadata: {
          proposalId: 'proposal-123',
          proposalTitle: 'Test Proposal',
          title: 'New Comment on Update',
          description: 'There is a new comment on your project update.',
          link: 'https://governance.decentraland.org/proposal/123/update/456',
          address: '0x1234567890123456789012345678901234567890'
        }
      }
    })

    it('should parse to GOVERNANCE_NEW_COMMENT_ON_PROJECT_UPDATE notification', () => {
      const notifications = eventParser.parseToNotifications(event)

      expect(notifications).toHaveLength(1)
      expect(notifications[0]).toEqual({
        type: NotificationType.GOVERNANCE_NEW_COMMENT_ON_PROJECT_UPDATE,
        address: '0x1234567890123456789012345678901234567890',
        eventKey: 'update-123',
        timestamp: fixedTimestamp,
        metadata: {
          proposalId: 'proposal-123',
          proposalTitle: 'Test Proposal',
          title: 'New Comment on Update',
          description: 'There is a new comment on your project update.',
          link: 'https://governance.decentraland.org/proposal/123/update/456'
        }
      })
    })
  })

  describe('and the event is WHALE_VOTE', () => {
    let event: any

    beforeEach(() => {
      event = {
        type: Events.Type.GOVERNANCE,
        subType: Events.SubType.Governance.WHALE_VOTE,
        key: 'proposal-123',
        timestamp: fixedTimestamp,
        metadata: {
          proposalId: 'proposal-123',
          proposalTitle: 'Test Proposal',
          title: 'Whale Vote',
          description: 'A whale has voted on your proposal.',
          link: 'https://governance.decentraland.org/proposal/123',
          address: '0x1234567890123456789012345678901234567890'
        }
      }
    })

    it('should parse to GOVERNANCE_WHALE_VOTE notification', () => {
      const notifications = eventParser.parseToNotifications(event)

      expect(notifications).toHaveLength(1)
      expect(notifications[0]).toEqual({
        type: NotificationType.GOVERNANCE_WHALE_VOTE,
        address: '0x1234567890123456789012345678901234567890',
        eventKey: 'proposal-123',
        timestamp: fixedTimestamp,
        metadata: {
          proposalId: 'proposal-123',
          proposalTitle: 'Test Proposal',
          title: 'Whale Vote',
          description: 'A whale has voted on your proposal.',
          link: 'https://governance.decentraland.org/proposal/123'
        }
      })
    })
  })

  describe('and the event is VOTED_ON_BEHALF', () => {
    let event: any

    beforeEach(() => {
      event = {
        type: Events.Type.GOVERNANCE,
        subType: Events.SubType.Governance.VOTED_ON_BEHALF,
        key: 'proposal-123',
        timestamp: fixedTimestamp,
        metadata: {
          proposalId: 'proposal-123',
          proposalTitle: 'Test Proposal',
          title: 'Voted on Your Behalf',
          description: 'Someone voted on your behalf.',
          link: 'https://governance.decentraland.org/proposal/123',
          address: '0x1234567890123456789012345678901234567890'
        }
      }
    })

    it('should parse to GOVERNANCE_VOTED_ON_BEHALF notification', () => {
      const notifications = eventParser.parseToNotifications(event)

      expect(notifications).toHaveLength(1)
      expect(notifications[0]).toEqual({
        type: NotificationType.GOVERNANCE_VOTED_ON_BEHALF,
        address: '0x1234567890123456789012345678901234567890',
        eventKey: 'proposal-123',
        timestamp: fixedTimestamp,
        metadata: {
          proposalId: 'proposal-123',
          proposalTitle: 'Test Proposal',
          title: 'Voted on Your Behalf',
          description: 'Someone voted on your behalf.',
          link: 'https://governance.decentraland.org/proposal/123'
        }
      })
    })
  })

  describe('and the event is CLIFF_ENDED', () => {
    let event: any

    beforeEach(() => {
      event = {
        type: Events.Type.GOVERNANCE,
        subType: Events.SubType.Governance.CLIFF_ENDED,
        key: 'proposal-123',
        timestamp: fixedTimestamp,
        metadata: {
          proposalId: 'proposal-123',
          proposalTitle: 'Test Proposal',
          title: 'Cliff Ended',
          description: 'The cliff period has ended.',
          link: 'https://governance.decentraland.org/proposal/123',
          address: '0x1234567890123456789012345678901234567890'
        }
      }
    })

    it('should parse to GOVERNANCE_CLIFF_ENDED notification', () => {
      const notifications = eventParser.parseToNotifications(event)

      expect(notifications).toHaveLength(1)
      expect(notifications[0]).toEqual({
        type: NotificationType.GOVERNANCE_CLIFF_ENDED,
        address: '0x1234567890123456789012345678901234567890',
        eventKey: 'proposal-123',
        timestamp: fixedTimestamp,
        metadata: {
          proposalId: 'proposal-123',
          proposalTitle: 'Test Proposal',
          title: 'Cliff Ended',
          description: 'The cliff period has ended.',
          link: 'https://governance.decentraland.org/proposal/123'
        }
      })
    })
  })
})

describe('when parsing worlds notifications', () => {
  let config: any
  let logs: ILoggerComponent
  let eventParser: IEventParser
  let fixedTimestamp: number

  beforeEach(async () => {
    fixedTimestamp = 1640995200000 // Fixed timestamp: 2022-01-01T00:00:00.000Z
    config = createConfigComponent({
      CDN_URL: 'https://cdn.decentraland.org',
      DECENTRALAND_URL: 'https://decentraland.org'
    })
    logs = await createLogComponent({ config })
    eventParser = await createEventParser({ logs, config })
  })

  describe('and the event is WORLDS_PERMISSION_GRANTED', () => {
    let event: any

    beforeEach(() => {
      event = {
        type: Events.Type.WORLD,
        subType: Events.SubType.Worlds.WORLDS_PERMISSION_GRANTED,
        key: 'world-123',
        timestamp: fixedTimestamp,
        metadata: {
          title: 'Permission Granted',
          description: 'You have been granted permissions to access this world.',
          world: 'test-world.dcl.eth',
          permissions: ['deploy', 'edit'],
          url: 'https://builder.decentraland.org/worlds?tab=dcl',
          address: '0x1234567890123456789012345678901234567890'
        }
      }
    })

    it('should parse to WORLDS_PERMISSION_GRANTED notification', () => {
      const notifications = eventParser.parseToNotifications(event)

      expect(notifications).toHaveLength(1)
      expect(notifications[0]).toEqual({
        type: NotificationType.WORLDS_PERMISSION_GRANTED,
        address: '0x1234567890123456789012345678901234567890',
        eventKey: 'world-123',
        timestamp: fixedTimestamp,
        metadata: {
          title: 'Permission Granted',
          description: 'You have been granted permissions to access this world.',
          world: 'test-world.dcl.eth',
          permissions: ['deploy', 'edit'],
          url: 'https://builder.decentraland.org/worlds?tab=dcl'
        }
      })
    })
  })

  describe('and the event is WORLDS_PERMISSION_REVOKED', () => {
    let event: any

    beforeEach(() => {
      event = {
        type: Events.Type.WORLD,
        subType: Events.SubType.Worlds.WORLDS_PERMISSION_REVOKED,
        key: 'world-123',
        timestamp: fixedTimestamp,
        metadata: {
          title: 'Permission Revoked',
          description: 'Your permissions to access this world have been revoked.',
          world: 'test-world.dcl.eth',
          permissions: ['deploy', 'edit'],
          url: 'https://builder.decentraland.org/worlds?tab=dcl',
          address: '0x1234567890123456789012345678901234567890'
        }
      }
    })

    it('should parse to WORLDS_PERMISSION_REVOKED notification', () => {
      const notifications = eventParser.parseToNotifications(event)

      expect(notifications).toHaveLength(1)
      expect(notifications[0]).toEqual({
        type: NotificationType.WORLDS_PERMISSION_REVOKED,
        address: '0x1234567890123456789012345678901234567890',
        eventKey: 'world-123',
        timestamp: fixedTimestamp,
        metadata: {
          title: 'Permission Revoked',
          description: 'Your permissions to access this world have been revoked.',
          world: 'test-world.dcl.eth',
          permissions: ['deploy', 'edit'],
          url: 'https://builder.decentraland.org/worlds?tab=dcl'
        }
      })
    })
  })

  describe('and the event is WORLDS_ACCESS_RESTORED', () => {
    let event: any

    beforeEach(() => {
      event = {
        type: Events.Type.WORLD,
        subType: Events.SubType.Worlds.WORLDS_ACCESS_RESTORED,
        key: 'world-123',
        timestamp: fixedTimestamp,
        metadata: {
          title: 'Worlds available',
          description: 'Access to your Worlds has been restored.',
          url: 'https://builder.decentraland.org/worlds?tab=dcl',
          attendee: '0x1234567890123456789012345678901234567890'
        }
      }
    })

    it('should parse to WORLDS_ACCESS_RESTORED notification', () => {
      const notifications = eventParser.parseToNotifications(event)

      expect(notifications).toHaveLength(1)
      expect(notifications[0]).toEqual({
        type: NotificationType.WORLDS_ACCESS_RESTORED,
        address: '0x1234567890123456789012345678901234567890',
        eventKey: 'world-123',
        timestamp: fixedTimestamp,
        metadata: {
          title: 'Worlds available',
          description: 'Access to your Worlds has been restored.',
          url: 'https://builder.decentraland.org/worlds?tab=dcl'
        }
      })
    })
  })

  describe('and the event is WORLDS_ACCESS_RESTRICTED', () => {
    let event: any

    beforeEach(() => {
      event = {
        type: Events.Type.WORLD,
        subType: Events.SubType.Worlds.WORLDS_ACCESS_RESTRICTED,
        key: 'world-123',
        timestamp: fixedTimestamp,
        metadata: {
          title: 'Worlds restricted',
          description: 'Access to your Worlds has been restricted due to insufficient resources.',
          when: fixedTimestamp + 86400000, // 24 hours from now
          address: '0x1234567890123456789012345678901234567890'
        }
      }
    })

    it('should parse to WORLDS_ACCESS_RESTRICTED notification', () => {
      const notifications = eventParser.parseToNotifications(event)

      expect(notifications).toHaveLength(1)
      expect(notifications[0]).toEqual({
        type: NotificationType.WORLDS_ACCESS_RESTRICTED,
        address: '0x1234567890123456789012345678901234567890',
        eventKey: 'world-123',
        timestamp: fixedTimestamp,
        metadata: {
          title: 'Worlds restricted',
          description: 'Access to your Worlds has been restricted due to insufficient resources.',
          when: fixedTimestamp + 86400000
        }
      })
    })
  })

  describe('and the event is WORLDS_MISSING_RESOURCES', () => {
    let event: any

    beforeEach(() => {
      event = {
        type: Events.Type.WORLD,
        subType: Events.SubType.Worlds.WORLDS_MISSING_RESOURCES,
        key: 'world-123',
        timestamp: fixedTimestamp,
        metadata: {
          title: 'Missing Resources',
          description: 'World access at risk in 48hs. Rectify now to prevent disruption.',
          url: 'https://builder.decentraland.org/worlds?tab=dcl',
          when: fixedTimestamp + 172800000, // 48 hours from now
          address: '0x1234567890123456789012345678901234567890'
        }
      }
    })

    it('should parse to WORLDS_MISSING_RESOURCES notification', () => {
      const notifications = eventParser.parseToNotifications(event)

      expect(notifications).toHaveLength(1)
      expect(notifications[0]).toEqual({
        type: NotificationType.WORLDS_MISSING_RESOURCES,
        address: '0x1234567890123456789012345678901234567890',
        eventKey: 'world-123',
        timestamp: fixedTimestamp,
        metadata: {
          title: 'Missing Resources',
          description: 'World access at risk in 48hs. Rectify now to prevent disruption.',
          url: 'https://builder.decentraland.org/worlds?tab=dcl',
          when: fixedTimestamp + 172800000
        }
      })
    })
  })
})
