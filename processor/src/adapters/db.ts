import SQL from 'sql-template-strings'
import { AppComponents, NotificationRecord } from '../types'

export type DbComponent = {
  fetchLastUpdateForNotificationType(notificationType: string): Promise<number>
  updateLastUpdateForNotificationType(notificationType: string, timestamp: Date): Promise<void>
  insertNotifications(notificationRecord: NotificationRecord[]): Promise<void>
}

export function createDbComponent({ pg }: Pick<AppComponents, 'pg' | 'logs'>): DbComponent {
  async function fetchLastUpdateForNotificationType(notificationType: string): Promise<number> {
    const result = await pg.query<{ last_successful_run_at: number }>(SQL`
        SELECT *
        FROM cursors
        WHERE id = ${notificationType};
    `)
    if (result.rowCount === 0) {
      return new Date().getTime()
    }

    return result.rows[0].last_successful_run_at
  }

  async function updateLastUpdateForNotificationType(notificationType: string, timestamp: Date): Promise<void> {
    const query = SQL`
        INSERT INTO cursors (id, last_successful_run_at, created_at, updated_at)
        VALUES (${notificationType}, ${timestamp}, ${new Date()}, ${new Date()})
        ON CONFLICT (id) DO UPDATE
        SET last_successful_run_at = ${timestamp},
            updated_at             = ${new Date()};
    `

    await pg.query<any>(query)
  }

  async function insertNotifications(notificationRecords: NotificationRecord[]) {
    if (notificationRecords.length === 0) {
      return
    }

    const buildQuery = SQL`
        INSERT INTO notifications (type, address, metadata, timestamp, read_at)
        VALUES `
    for (let i = 0; i < notificationRecords.length; i++) {
      const notificationRecord = notificationRecords[i]
      buildQuery.append(
        SQL`(${notificationRecord.type}, ${notificationRecord.address.toLowerCase()}, ${
          notificationRecord.metadata
        }::jsonb, ${notificationRecord.timestamp}, NULL)`
      )
      if (i < notificationRecords.length - 1) {
        buildQuery.append(',')
      }
    }
    buildQuery.append(';')

    await pg.query(buildQuery)
  }

  return {
    fetchLastUpdateForNotificationType,
    updateLastUpdateForNotificationType,
    insertNotifications
  }
}
