import { MigrationBuilder, PgType } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('notifications', {
    id: { type: PgType.UUID, notNull: true, primaryKey: true },
    origin_id: { type: PgType.VARCHAR, notNull: true },
    type: { type: PgType.VARCHAR, notNull: true },
    source: { type: PgType.VARCHAR, notNull: true },
    metadata: { type: PgType.JSONB, notNull: true },
    timestamp: { type: PgType.TIMESTAMP, notNull: true },
    created_at: { type: PgType.TIMESTAMP, notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: PgType.TIMESTAMP, notNull: true, default: pgm.func('current_timestamp') }
  })

  pgm.sql(`CREATE INDEX origin_id_ops_idx ON notifications (origin_id varchar_pattern_ops);`)
  pgm.sql(`ALTER TABLE notifications
    ADD CONSTRAINT unique_id_source UNIQUE (origin_id,source);`)
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('notifications')
}
