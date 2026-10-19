import { defineConfig } from 'drizzle-kit';

try { process.loadEnvFile('.env.local'); } catch { /* Vercel injeta as variáveis no build */ }

export default defineConfig({
  out: './drizzle',
  schema: './db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL! },
});
