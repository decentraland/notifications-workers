import { NotificationRecord } from '@notifications/common'
import { NotificationType } from '@dcl/schemas'
import { createWorkflowMigrationChecker, RegistryState } from '../../../src/logic/workflow-migration-checker'
import { IWorkflowMigrationChecker } from '../../../src/types'

describe('WorkflowMigrationChecker', () => {
  let checker: IWorkflowMigrationChecker

  beforeEach(() => {
    checker = createWorkflowMigrationChecker()
  })

  test('should add a registry with HANDLED_BY_PRODUCER state', () => {
    const notification: NotificationRecord = { eventKey: 'event1', type: NotificationType.BID_ACCEPTED, address: 'address1', timestamp: 123456, metadata: {} }
    checker.addRegistry(notification, 'producer')

    const registries = checker.getRegistries()
    const key = `${notification.eventKey}-${notification.type}-${notification.address}`
    expect(registries.has(key)).toBe(true)
    expect(registries.get(key)).toEqual({ when: notification.timestamp, state: RegistryState.HANDLED_BY_PRODUCER })
  })

  test('should add a registry with HANDLED_BY_EVENT state', () => {
    const notification: NotificationRecord = { eventKey: 'event2', type: NotificationType.BID_ACCEPTED, address: 'address2', timestamp: 123457, metadata: {} }
    checker.addRegistry(notification, 'event')

    const registries = checker.getRegistries()
    const key = `${notification.eventKey}-${notification.type}-${notification.address}`
    expect(registries.has(key)).toBe(true)
    expect(registries.get(key)).toEqual({ when: notification.timestamp, state: RegistryState.HANDLED_BY_EVENT })
  })

  test('should remove a registry when states cancel each other out', () => {
    const notification: NotificationRecord = { eventKey: 'event3', type: NotificationType.BID_ACCEPTED, address: 'address3', timestamp: 123458, metadata: {} }
    checker.addRegistry(notification, 'producer')
    checker.addRegistry(notification, 'event')

    const registries = checker.getRegistries()
    const key = `${notification.eventKey}-${notification.type}-${notification.address}`
    expect(registries.has(key)).toBe(false)
  })

  test('should update registry state correctly', () => {
    const notification: NotificationRecord = { eventKey: 'event4', type: NotificationType.BID_ACCEPTED, address: 'address4', timestamp: 123459, metadata: {} }
    checker.addRegistry(notification, 'producer')
    checker.addRegistry(notification, 'producer')

    const registries = checker.getRegistries()
    const key = `${notification.eventKey}-${notification.type}-${notification.address}`
    expect(registries.has(key)).toBe(true)
    expect(registries.get(key)).toEqual({ when: notification.timestamp, state: RegistryState.HANDLED_BY_PRODUCER })

    checker.addRegistry(notification, 'event')

    expect(registries.has(key)).toBe(false)
  })
})
