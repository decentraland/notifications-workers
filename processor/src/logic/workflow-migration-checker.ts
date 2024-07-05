/*
 * This file will be used to manage the workflow migration from producers to event-driven
 * architecture. Once the migration is done will be removed
 */

import { NotificationRecord } from '@notifications/common'
import { IWorkflowMigrationChecker } from '../types'

export enum RegistryState {
  HANDLED_BY_EVENT = -1,
  HANDLED_BY_PRODUCER = 1
}

export function createWorkflowMigrationChecker(): IWorkflowMigrationChecker {
  const notifications = new Map<string, { when: number; state: RegistryState }>()

  function addRegistry(notification: NotificationRecord, from: 'producer' | 'event') {
    const state = from === 'producer' ? RegistryState.HANDLED_BY_PRODUCER : RegistryState.HANDLED_BY_EVENT
    const registry = notifications.get(`${notification.eventKey}-${notification.type}-${notification.address}`)

    if (!registry) {
      notifications.set(`${notification.eventKey}-${notification.type}-${notification.address}`, {
        when: notification.timestamp,
        state
      })
      return
    } else {
      const result = registry.state + state
      if (result === 0) {
        notifications.delete(`${notification.eventKey}-${notification.type}-${notification.address}`)
      } else {
        registry.state = result > 0 ? RegistryState.HANDLED_BY_PRODUCER : RegistryState.HANDLED_BY_EVENT
      }
    }
  }

  function getRegistries() {
    return notifications
  }

  return { addRegistry, getRegistries }
}
