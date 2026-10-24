import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// One tenant-owned aggregate makes cross-product transitions and revision checks atomic.
export const evopm_workbench__workspaces = sqliteTable('evopm_workbench__workspaces', {
  ownerId: text('owner_id').primaryKey(),
  stateJson: text('state_json').notNull(),
  revision: integer('revision').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});

// A receipt and its workspace write commit in the same D1 batch.
export const actionReceipts = sqliteTable('evopm_workbench__action_receipts', {
  ownerId: text('owner_id').notNull(),
  requestId: text('request_id').notNull(),
  requestHash: text('request_hash').notNull(),
  revision: integer('revision').notNull(),
  resultJson: text('result_json').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [primaryKey({ columns: [table.ownerId, table.requestId] })]);

// A short lease prevents concurrent retries from billing the model twice.
export const analysisLeases = sqliteTable('evopm_workbench__analysis_leases', {
  ownerId: text('owner_id').notNull(),
  requestId: text('request_id').notNull(),
  token: text('token').notNull(),
  expiresAt: integer('expires_at').notNull(),
}, table => [primaryKey({ columns: [table.ownerId, table.requestId] })]);
