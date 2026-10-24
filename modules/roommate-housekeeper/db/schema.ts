import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const households = sqliteTable('roommate_housekeeper__demo_households', {
  id: text('id').primaryKey(),
  data: text('data').notNull(),
  version: integer('version').notNull().default(1),
  updatedAt: text('updated_at').notNull(),
});
