import SQL from 'sql-template-strings'
import { createDbComponent as createCommonDbComponent, DbComponent as CommonDbComponent } from '@notifications/common'
import { AppComponents, NotificationRecord } from '../types'

export type UpsertResult<T> = {
  inserted: T[]
  updated: T[]
}

export type DbComponent = CommonDbComponent & {
  fetchLastUpdateForNotificationType(notificationType: string): Promise<number>
  updateLastUpdateForNotificationType(notificationType: string, timestamp: number): Promise<void>
  insertNotifications(notificationRecord: NotificationRecord[]): Promise<UpsertResult<NotificationRecord>>
}

export function createDbComponent({ pg }: Pick<AppComponents, 'pg' | 'logs'>): DbComponent {
  const baseDbComponent: CommonDbComponent = createCommonDbComponent({ pg })

  async function fetchLastUpdateForNotificationType(notificationType: string): Promise<number> {
    const result = await pg.query<{ last_successful_run_at: number }>(SQL`
        SELECT *
        FROM cursors
        WHERE id = ${notificationType};
    `)
    if (result.rowCount === 0) {
      return Date.now()
    }

    return result.rows[0].last_successful_run_at
  }

  async function updateLastUpdateForNotificationType(notificationType: string, timestamp: number): Promise<void> {
    const query = SQL`
        INSERT INTO cursors (id, last_successful_run_at, created_at, updated_at)
        VALUES (${notificationType}, ${timestamp}, ${Date.now()}, ${Date.now()})
        ON CONFLICT (id) DO UPDATE
        SET last_successful_run_at = ${timestamp},
            updated_at             = ${Date.now()};
    `

    await pg.query<any>(query)
  }

  async function insertNotifications(
    notificationRecords: NotificationRecord[]
  ): Promise<UpsertResult<NotificationRecord>> {
    const upsertResult: UpsertResult<NotificationRecord> = {
      inserted: [],
      updated: []
    }

    for (const notificationRecord of notificationRecords) {
      const buildQuery = SQL`
          INSERT INTO notifications (event_key, type, address, metadata, timestamp, read_at, created_at, updated_at)
          VALUES (${notificationRecord.eventKey},
                  ${notificationRecord.type},
                  ${notificationRecord.address?.toLowerCase() || null},
                  ${notificationRecord.metadata}::jsonb,
                  ${notificationRecord.timestamp},
                  NULL,
                  ${Date.now()},
                  ${Date.now()})
          ON CONFLICT (event_key, type, address) DO UPDATE
              SET metadata   = ${notificationRecord.metadata}::jsonb,
                  timestamp  = ${notificationRecord.timestamp},
                  updated_at = ${Date.now()}
          RETURNING xmax;
      `

      const result = await pg.query(buildQuery)
      if (result.rows[0].xmax === '0') {
        upsertResult.inserted.push(notificationRecord)
      } else {
        upsertResult.updated.push(notificationRecord)
      }
    }

    return upsertResult
  }

  return {
    ...baseDbComponent,
    fetchLastUpdateForNotificationType,
    updateLastUpdateForNotificationType,
    insertNotifications
  }
}
