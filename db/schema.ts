import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export * from '../lib/campus/schema';

export const hubStates = sqliteTable('hub_states', {
  ownerId: text('owner_id').notNull(),
  moduleId: text('module_id').notNull(),
  valuesJson: text('values_json').notNull(),
  revision: integer('revision').notNull(),
  updatedAt: text('updated_at').notNull(),
}, table => [primaryKey({ columns: [table.ownerId, table.moduleId] })]);

export const hubStateVersions = sqliteTable('hub_state_versions', {
  ownerId: text('owner_id').notNull(),
  moduleId: text('module_id').notNull(),
  revision: integer('revision').notNull(),
  valuesJson: text('values_json').notNull(),
  updatedAt: text('updated_at').notNull(),
}, table => [primaryKey({ columns: [table.ownerId, table.moduleId, table.revision] })]);

export const hubFiles = sqliteTable('hub_files', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  moduleId: text('module_id').notNull(),
  objectKey: text('object_key').notNull(),
  name: text('name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [index('hub_files_owner_module_created').on(table.ownerId, table.moduleId, table.createdAt), uniqueIndex('hub_files_object_key_unique').on(table.objectKey)]);
