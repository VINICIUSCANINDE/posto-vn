import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Empresa cliente (tenant). Cada empresa só enxerga os próprios dados e a própria equipe.
export const organization = pgTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  document: text('document'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
