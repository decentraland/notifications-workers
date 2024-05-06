import { MigrationBuilder, PgType } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('subscriptions', {
    address: { type: PgType.VARCHAR, notNull: true, primaryKey: true },
    email: { type: PgType.VARCHAR },
    details: { type: PgType.JSONB, notNull: true },
    created_at: { type: PgType.BIGINT, notNull: true },
    updated_at: { type: PgType.BIGINT, notNull: true }
  })
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('subscriptions')
}
