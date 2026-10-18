import { sqliteTable, text, integer, check } from 'drizzle-orm/sqlite-core';
import {sql} from 'drizzle-orm';
export const entries = sqliteTable('entries', {id:text('id').primaryKey(),kind:text('kind').notNull(),data:text('data').notNull(),created:text('created').notNull(),actor:text('actor').notNull()});
// Integer thousandths prevent rounding drift. Constraints make concurrent withdrawals atomic.
export const workshopCounters = sqliteTable('workshop_counters', {
 id:text('id').primaryKey(),units:integer('units').notNull(),
},table=>[check('workshop_nonnegative',sql`${table.units} >= 0`)]);
