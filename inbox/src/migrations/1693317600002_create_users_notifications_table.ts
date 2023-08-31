import { MigrationBuilder, PgType } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('users_notifications', {
    id: { type: PgType.VARCHAR, notNull: true, primaryKey: true },
    address: {
      type: PgType.VARCHAR,
      notNull: true
    },
    notification_id: {
      type: PgType.VARCHAR,
      notNull: true
    },
    read: { type: PgType.BOOLEAN, notNull: true, default: false },
    created_at: { type: PgType.TIMESTAMP, notNull: true },
    updated_at: { type: PgType.TIMESTAMP, notNull: true }
  })

  pgm.sql(`
    ALTER TABLE users_notifications
    ADD CONSTRAINT notification_id_fkey
    FOREIGN KEY (notification_id) REFERENCES notifications(id);
  `)
  pgm.sql(`CREATE INDEX address_ops_idx ON users_notifications (address varchar_pattern_ops);`)
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('users_notifications')
}
