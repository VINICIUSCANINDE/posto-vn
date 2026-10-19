import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { admin } from 'better-auth/plugins';
import { db } from '../db';
import * as schema from '../db/schema';
import { resetPasswordEmail, sendEmail } from './email';
import { ac, roles } from './permissions';

const vercelOrigins = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
  .filter(Boolean)
  .map((host) => `https://${host}`);

export const auth = betterAuth({
  appName: 'Controle de Transporte',
  baseURL: process.env.BETTER_AUTH_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined),
  trustedOrigins: ['http://127.0.0.1:3000', 'http://localhost:3000', ...vercelOrigins],
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({ to: user.email, ...resetPasswordEmail(user.name, url) });
    },
  },
  user: {
    additionalFields: {
      mustChangePassword: { type: 'boolean', defaultValue: false, input: false },
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  plugins: [admin({ ac, roles, defaultRole: 'attendant', adminRoles: ['admin'] }), nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
