import { MigrationBuilder, PgType } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('notification_opt_outs', {
    address: { type: PgType.VARCHAR, notNull: true },
    entity: { type: PgType.VARCHAR, notNull: true },
    entity_id: { type: PgType.VARCHAR, notNull: true },
    created_at: { type: PgType.BIGINT, notNull: true },
    updated_at: { type: PgType.BIGINT, notNull: true }
  })

  pgm.addConstraint('notification_opt_outs', 'notification_opt_outs_pkey', {
    primaryKey: ['address', 'entity', 'entity_id']
  })

  pgm.createIndex('notification_opt_outs', 'address', {
    name: 'notification_opt_outs_address_idx'
  })
  pgm.createIndex('notification_opt_outs', ['entity', 'entity_id'], {
    name: 'notification_opt_outs_entity_idx'
  })
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('notification_opt_outs')
}
