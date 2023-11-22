import SQL from 'sql-template-strings'
import { AppComponents } from '../types'
import { NotificationRecord } from '@notifications/commons'

type ResultWithId = {
  id: string
}

export type DbComponent = {
  fetchLastUpdateForNotificationType(notificationType: string): Promise<number>
  updateLastUpdateForNotificationType(notificationType: string, timestamp: Date): Promise<void>
  insertNotification(notificationRecord: NotificationRecord): Promise<void>
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

  async function insertNotification(notificationRecord: NotificationRecord) {
    const createNotificationQuery = SQL`
        INSERT INTO notifications (type, address, metadata, i18n, read_at)
        VALUES (${notificationRecord.type}, ${notificationRecord.address}, ${notificationRecord.metadata}::jsonb,
                ${notificationRecord.i18n}::jsonb, NULL)
        RETURNING id;
    `
    await pg.query<ResultWithId>(createNotificationQuery)
  }

  return {
    fetchLastUpdateForNotificationType,
    updateLastUpdateForNotificationType,
    insertNotification
  }
}
