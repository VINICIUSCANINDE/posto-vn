import { headers } from 'next/headers';
import { auth } from './auth';

export type Role = 'admin' | 'attendant';

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.banned) return null;
  return { ...session.user, role: (session.user.role === 'admin' ? 'admin' : 'attendant') as Role };
}

export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
