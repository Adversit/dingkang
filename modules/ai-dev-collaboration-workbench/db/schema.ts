import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const ai_dev_collaboration_workbench__workspaces = sqliteTable('ai_dev_collaboration_workbench__workspaces', {
  userId: text('user_id').primaryKey().notNull(),
  data: text('data').notNull(),
  revision: integer('revision').notNull().default(1),
  updatedAt: text('updated_at').notNull(),
});
export const adminReads=sqliteTable('ai_dev_collaboration_workbench__admin_reads',{
  id:integer('id').primaryKey({autoIncrement:true}),
  actor:text('actor').notNull(),
  target:text('target').notNull(),
  action:text('action').notNull(),
  reason:text('reason').notNull(),
  createdAt:text('created_at').notNull(),
},table=>[index('ai_dev_collaboration_workbench__admin_reads_created_at').on(table.createdAt)]);

export const deliveryProjects=sqliteTable('ai_dev_collaboration_workbench__delivery_projects',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),title:text('title').notNull(),state:text('state').notNull(),revision:integer('revision').notNull().default(1),operation:text('operation').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()
});
export const deliveryEvents=sqliteTable('ai_dev_collaboration_workbench__delivery_events',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),projectId:text('project_id').notNull(),operation:text('operation').notNull(),action:text('action').notNull(),revision:integer('revision').notNull(),summary:text('summary').notNull(),createdAt:text('created_at').notNull()
},t=>[uniqueIndex('ai_dev_collaboration_workbench__delivery_event_operation').on(t.owner,t.operation),uniqueIndex('ai_dev_collaboration_workbench__delivery_event_revision').on(t.projectId,t.revision)]);
export const deliveryCalls=sqliteTable('ai_dev_collaboration_workbench__delivery_calls',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),operation:text('operation').notNull(),projectId:text('project_id').notNull(),status:text('status').notNull(),createdAt:text('created_at').notNull()
},t=>[uniqueIndex('ai_dev_collaboration_workbench__delivery_call_operation').on(t.owner,t.operation)]);
