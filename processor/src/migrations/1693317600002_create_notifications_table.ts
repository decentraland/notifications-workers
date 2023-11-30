import { MigrationBuilder, PgType } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('notifications', {
    id: { type: PgType.UUID, notNull: true, primaryKey: true, default: pgm.func('gen_random_uuid()') },
    event_key: { type: PgType.VARCHAR, notNull: true },
    type: { type: PgType.VARCHAR, notNull: true },
    address: { type: PgType.VARCHAR, notNull: true },
    metadata: { type: PgType.JSONB, notNull: true },
    timestamp: { type: PgType.BIGINT, notNull: true },
    read_at: { type: PgType.TIMESTAMP, notNull: false },
    created_at: { type: PgType.TIMESTAMP, notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: PgType.TIMESTAMP, notNull: true, default: pgm.func('current_timestamp') }
  })

  pgm.sql(`CREATE INDEX address_ops_idx ON notifications (address varchar_pattern_ops);`)
  pgm.sql(`CREATE UNIQUE INDEX business_key_idx ON notifications (event_key, type, address varchar_pattern_ops);`)
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('notifications')
}
