import { MigrationBuilder, PgType } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('notification_opt_outs', {
    address: { type: PgType.VARCHAR, notNull: true },
    metadata_key: { type: PgType.VARCHAR, notNull: true },
    metadata_value: { type: PgType.VARCHAR, notNull: true },
    notification_types: { type: PgType.JSONB, notNull: false },
    created_at: { type: PgType.BIGINT, notNull: true },
    updated_at: { type: PgType.BIGINT, notNull: true }
  })

  // Composite primary key
  pgm.addConstraint('notification_opt_outs', 'notification_opt_outs_pkey', {
    primaryKey: ['address', 'metadata_key', 'metadata_value']
  })

  // Indexes for efficient lookups
  pgm.createIndex('notification_opt_outs', 'address', {
    name: 'notification_opt_outs_address_idx'
  })
  pgm.createIndex('notification_opt_outs', ['metadata_key', 'metadata_value'], {
    name: 'notification_opt_outs_key_value_idx'
  })
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('notification_opt_outs')
}
