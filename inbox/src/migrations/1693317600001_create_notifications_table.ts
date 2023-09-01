import { MigrationBuilder, PgType } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('notifications', {
    id: { type: PgType.VARCHAR, notNull: true, primaryKey: true },
    type: { type: PgType.VARCHAR, notNull: true },
    source: { type: PgType.VARCHAR, notNull: true },
    metadata: { type: PgType.JSONB, notNull: true },
    timestamp: { type: PgType.TIMESTAMP, notNull: true },
    created_at: { type: PgType.TIMESTAMP, notNull: true },
    updated_at: { type: PgType.TIMESTAMP, notNull: true }
  })
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('notifications')
}
