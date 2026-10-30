import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export * from '../lib/campus/schema';
export * from '../lib/feedback/schema';

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

/** Novel Studio is isolated by authenticated owner; CAS is performed on this single aggregate row. */
export const novelCanonStates = sqliteTable('novel_canon_states', {
  ownerId: text('owner_id').primaryKey(),
  stateJson: text('state_json').notNull(),
  version: integer('version').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/** A generation-gated, owner-scoped archive split into bounded D1 rows. */
export const novelArchiveHeads = sqliteTable('novel_archive_heads', {
  ownerId: text('owner_id').primaryKey(),
  version: integer('version').notNull(),
  writeToken: text('write_token').notNull(),
  chunkCount: integer('chunk_count').notNull(),
  stateHash: text('state_hash').notNull(),
  updatedAt: text('updated_at').notNull(),
  legacyVersion: integer('legacy_version').notNull(),
});
export const novelArchiveChunks = sqliteTable('novel_archive_chunks', {
  ownerId: text('owner_id').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  data: text('data').notNull(),
}, table => [primaryKey({columns:[table.ownerId, table.chunkIndex]})]);
