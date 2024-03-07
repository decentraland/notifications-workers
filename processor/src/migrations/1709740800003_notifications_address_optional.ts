import { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.alterColumn('notifications', 'address', { notNull: false })
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.alterColumn('notifications', 'address', { notNull: true })
}
