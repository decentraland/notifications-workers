import { MigrationBuilder, PgType } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('failed_notifications', {
    id: { type: PgType.UUID, notNull: true, primaryKey: true },
    type: { type: PgType.VARCHAR, notNull: true },
    source: { type: PgType.VARCHAR, notNull: true },
    metadata: { type: PgType.VARCHAR, notNull: true },
    created_at: { type: PgType.TIMESTAMP, notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: PgType.TIMESTAMP, notNull: true, default: pgm.func('current_timestamp') }
  })
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('failed_notifications')
}
