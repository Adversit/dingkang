import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const campusSessions = sqliteTable('campus_sessions', {
  id: text('id').primaryKey(), secretHash: text('secret_hash').notNull(), ownerId: text('owner_id'),
  nickname: text('nickname').notNull(), appearance: text('appearance').notNull(),
  createdAt: integer('created_at').notNull(), expiresAt: integer('expires_at').notNull(),
}, table => [index('campus_sessions_expiry').on(table.expiresAt)]);

export const campusRooms = sqliteTable('campus_rooms', {
  id: text('id').primaryKey(), code: text('code').notNull(), title: text('title').notNull(),
  campus: text('campus').notNull(), ownerId: text('owner_id').notNull(),
  maxPlayers: integer('max_players').notNull().default(8), createdAt: integer('created_at').notNull(),
}, table => [uniqueIndex('campus_rooms_code').on(table.code), index('campus_rooms_campus_created').on(table.campus, table.createdAt)]);

export const campusPlayers = sqliteTable('campus_players', {
  sessionId: text('session_id').primaryKey(), roomId: text('room_id').notNull(),
  x: real('x').notNull(), y: real('y').notNull(), direction: text('direction').notNull().default('down'),
  moving: integer('moving').notNull().default(0), interior: text('interior'), seq: integer('seq').notNull().default(0),
  interiorX: real('interior_x'), interiorY: real('interior_y'),
  updatedAt: integer('updated_at').notNull(), lastSeen: integer('last_seen').notNull(),
  teleportedAt: integer('teleported_at').notNull().default(0),
}, table => [index('campus_players_room_seen').on(table.roomId, table.lastSeen)]);

export const campusMessages = sqliteTable('campus_messages', {
  id: integer('id').primaryKey({autoIncrement:true}), roomId: text('room_id').notNull(),
  scope: text('scope').notNull().default('plaza'), campus: text('campus').notNull().default('south'),
  sessionId: text('session_id').notNull(), nickname: text('nickname').notNull(), text: text('text').notNull(),
  createdAt: integer('created_at').notNull(), deletedAt: integer('deleted_at'),
}, table => [index('campus_messages_room_id').on(table.roomId, table.id), index('campus_messages_plaza').on(table.campus, table.scope, table.id)]);

export const campusReports = sqliteTable('campus_reports', {
  id: integer('id').primaryKey({autoIncrement:true}), messageId: integer('message_id').notNull(),
  reporterId: text('reporter_id').notNull(), reason: text('reason').notNull(), createdAt: integer('created_at').notNull(),
}, table => [uniqueIndex('campus_reports_message_reporter').on(table.messageId, table.reporterId)]);

export const campusLimits = sqliteTable('campus_limits', {
  key: text('key').primaryKey(), hits: integer('hits').notNull(), expiresAt: integer('expires_at').notNull(),
}, table => [index('campus_limits_expiry').on(table.expiresAt)]);

