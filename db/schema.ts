import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const entries = sqliteTable('entries', {id:text('id').primaryKey(),kind:text('kind').notNull(),data:text('data').notNull(),created:text('created').notNull(),actor:text('actor').notNull()});
