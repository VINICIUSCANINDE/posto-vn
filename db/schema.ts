import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth-schema';

export * from './auth-schema';

export const entries = pgTable('entries', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  data: text('data').notNull(),
  created: text('created').notNull(),
  actor: text('actor').notNull(),
}, (t) => [index('entries_kind_idx').on(t.kind)]);

// Saldos em milésimos inteiros (sem deriva de arredondamento); o CHECK torna saídas concorrentes atômicas.
export const workshopCounters = pgTable('workshop_counters', {
  id: text('id').primaryKey(),
  units: integer('units').notNull(),
}, (t) => [check('workshop_nonnegative', sql`${t.units} >= 0`)]);

// Convites de acesso: guarda só o hash do token; uso único e validade curta.
export const invite = pgTable('invite', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: text('created_by').notNull(),
}, (t) => [index('invite_user_idx').on(t.userId)]);
