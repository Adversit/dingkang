import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const hubFeedback = sqliteTable('hub_feedback', {
  id: text('id').primaryKey(),
  requestId: text('request_id').notNull().unique(),
  requestHash: text('request_hash').notNull(),
  moduleId: text('module_id').notNull(),
  category: text('category').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  expected: text('expected').notNull().default(''),
  contact: text('contact').notNull().default(''),
  pagePath: text('page_path').notNull(),
  reporterId: text('reporter_id'),
  createdAt: text('created_at').notNull(),
  status: text('status').notNull().default('pending_review'),
  version: integer('version').notNull().default(1),
  reviewNote: text('review_note').notNull().default(''),
  reviewedBy: text('reviewed_by'),
  reviewedAt: text('reviewed_at'),
}, table => [index('hub_feedback_status_created').on(table.status, table.createdAt), index('hub_feedback_created').on(table.createdAt)]);

export const hubFeedbackLimits = sqliteTable('hub_feedback_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expiresAt: text('expires_at').notNull(),
});

export const hubFeedbackReviews = sqliteTable('hub_feedback_reviews', {
  id: text('id').primaryKey(),
  feedbackId: text('feedback_id').notNull(),
  decision: text('decision').notNull(),
  note: text('note').notNull(),
  actorId: text('actor_id').notNull(),
  version: integer('version').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [index('hub_feedback_reviews_feedback').on(table.feedbackId, table.version)]);
