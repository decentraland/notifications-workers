/*
 * This file will be used to manage the workflow migration from producers to event-driven
 * architecture. Once the migration is done will be removed
 */

import { NotificationRecord } from '@notifications/common'
import { IWorkflowMigrationChecker } from '../types'

export function createWorkflowMigrationChecker(): IWorkflowMigrationChecker {
  const notifications = new Map<string, number>()

  function addRegistry(notification: NotificationRecord) {
    notifications.set(`${notification.eventKey}-${notification.type}-${notification.address}`, notification.timestamp)
  }

  function removeRegistry(notification: NotificationRecord) {
    notifications.delete(`${notification.eventKey}-${notification.type}-${notification.address}`)
  }

  function getRegistries() {
    return notifications
  }

  return { addRegistry, removeRegistry, getRegistries }
}
