import { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE notifications ALTER COLUMN id SET DEFAULT gen_random_uuid();`)
  pgm.sql(`ALTER TABLE users_notifications ALTER COLUMN id SET DEFAULT gen_random_uuid();`)
  pgm.sql(`ALTER TABLE failed_notifications ALTER COLUMN id SET DEFAULT gen_random_uuid();`)
}

export async function down(_pgm: MigrationBuilder): Promise<void> {}
