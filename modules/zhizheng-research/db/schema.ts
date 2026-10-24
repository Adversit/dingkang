import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const projects = sqliteTable('zhizheng_research__projects', {
 id:text('id').primaryKey(), ownerId:text('owner_id').notNull(), title:text('title').notNull(),
 state:text('state').notNull(), revision:integer('revision').notNull().default(1), updatedAt:text('updated_at').notNull(),
}, t=>[index('zhizheng_research__projects_owner').on(t.ownerId)]);
export const versions = sqliteTable('zhizheng_research__versions', {id:text('id').primaryKey(),projectId:text('project_id').notNull(),ownerId:text('owner_id').notNull(),revision:integer('revision').notNull(),state:text('state').notNull(),createdAt:text('created_at').notNull()},t=>[uniqueIndex('zhizheng_research__version_project_revision').on(t.projectId,t.revision)]);
export const files = sqliteTable('zhizheng_research__files', {id:text('id').primaryKey(),projectId:text('project_id').notNull(),ownerId:text('owner_id').notNull(),name:text('name').notNull(),hash:text('hash').notNull(),kind:text('kind').notNull(),size:integer('size').notNull(),pages:integer('pages'),status:text('status').notNull(),createdAt:text('created_at').notNull()},t=>[index('zhizheng_research__files_owner_project').on(t.ownerId,t.projectId)]);
export const aiUsage = sqliteTable('zhizheng_research__ai_usage', {id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),projectId:text('project_id').notNull(),model:text('model').notNull(),status:text('status').notNull(),latency:integer('latency').notNull(),usage:text('usage'),createdAt:text('created_at').notNull()});
