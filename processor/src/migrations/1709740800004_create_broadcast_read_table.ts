import { MigrationBuilder, PgType } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('broadcast_read', {
    notification_id: { type: PgType.UUID, notNull: true },
    address: { type: PgType.VARCHAR, notNull: true },
    read_at: { type: PgType.BIGINT, notNull: true }
  })
  pgm.addConstraint('broadcast_read', 'broadcast_read_pkey', {
    primaryKey: ['notification_id', 'address']
  })
  pgm.addConstraint('broadcast_read', 'broadcast_read_id_fkey', {
    foreignKeys: {
      columns: 'notification_id',
      references: 'notifications'
    }
  })
  pgm.createIndex('broadcast_read', 'address', { name: 'broadcast_read_address_idx' })
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('broadcast_read')
}
