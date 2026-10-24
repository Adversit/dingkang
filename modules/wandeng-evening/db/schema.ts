import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const preferences = sqliteTable('wandeng_evening__preferences', {
  owner: text('owner').primaryKey(), history: integer('history').notNull().default(1), memory: integer('memory').notNull().default(1), consent: integer('consent').notNull().default(0), epoch: integer('epoch').notNull().default(0), updated: text('updated').notNull(), nickname: text('nickname').notNull().default(''), tone: text('tone').notNull().default('warm'), replyLength: text('reply_length').notNull().default('normal'),
});
export const conversations = sqliteTable('wandeng_evening__conversations', {
  id: text('id').primaryKey(), owner: text('owner').notNull(), title: text('title').notNull(), mode: text('mode').notNull(), mood: text('mood'), created: text('created').notNull(), updated: text('updated').notNull(),
}, t => [index('wandeng_evening__conversations_owner').on(t.owner, t.updated)]);
export const messages = sqliteTable('wandeng_evening__messages', {
  id: text('id').primaryKey(), owner: text('owner').notNull(), conversation: text('conversation').notNull(), role: text('role').notNull(), content: text('content').notNull(), contextBlocked: integer('context_blocked').notNull().default(0), memoryRefs: text('memory_refs').notNull().default('[]'), created: text('created').notNull(),
}, t => [index('wandeng_evening__messages_owner_conversation').on(t.owner, t.conversation)]);
export const memories = sqliteTable('wandeng_evening__memories', {
  id: text('id').primaryKey(), owner: text('owner').notNull(), type: text('type').notNull(), topic: text('topic').notNull(), content: text('content').notNull(), sources: text('sources').notNull().default('[]'), status: text('status').notNull().default('confirmed'), created: text('created').notNull(), updated: text('updated').notNull(), expires: text('expires'),
}, t => [index('wandeng_evening__memories_owner').on(t.owner, t.updated)]);
export const pages = sqliteTable('wandeng_evening__pages', {
  id: text('id').primaryKey(), owner: text('owner').notNull(), title: text('title').notNull(), content: text('content').notNull(), date: text('date').notNull(), mood: text('mood'), sources: text('sources').notNull().default('[]'), created: text('created').notNull(), updated: text('updated').notNull(),
}, t => [index('wandeng_evening__pages_owner').on(t.owner, t.updated)]);
export const suppressions = sqliteTable('wandeng_evening__suppressions', {
  id: text('id').primaryKey(), owner: text('owner').notNull(), hash: text('hash').notNull(), memoryId: text('memory_id'), sources: text('sources').notNull().default('[]'), created: text('created').notNull(),
}, t => [index('wandeng_evening__suppressions_owner').on(t.owner)]);
export const runs = sqliteTable('wandeng_evening__runs', {
  id: text('id').primaryKey(), owner: text('owner').notNull(), conversation: text('conversation'), model: text('model').notNull(), status: text('status').notNull(), duration: integer('duration'), inputTokens: integer('input_tokens'), outputTokens: integer('output_tokens'), created: text('created').notNull(), expires: text('expires'),
}, t => [index('wandeng_evening__runs_owner').on(t.owner, t.created)]);
