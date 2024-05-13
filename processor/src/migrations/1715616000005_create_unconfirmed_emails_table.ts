import { MigrationBuilder, PgType } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('unconfirmed_emails', {
    address: { type: PgType.VARCHAR, notNull: true, primaryKey: true },
    email: { type: PgType.VARCHAR, notNull: true },
    code: { type: PgType.VARCHAR, notNull: true },
    created_at: { type: PgType.BIGINT, notNull: true },
    updated_at: { type: PgType.BIGINT, notNull: true }
  })
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('unconfirmed_emails')
}
