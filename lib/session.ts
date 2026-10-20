import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { db } from '../db';
import { organization } from '../db/schema';
import { auth } from './auth';

export type Role = 'master' | 'admin' | 'attendant';

const toRole = (role?: string | null): Role => (role === 'master' ? 'master' : role === 'admin' ? 'admin' : 'attendant');

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.banned) return null;
  const role = toRole(session.user.role);
  const organizationId = session.user.organizationId ?? null;
  if (role === 'master') return { ...session.user, role, organizationId: null, organizationName: null };
  // Contas de empresa sem vínculo, ou de empresa desativada, não entram.
  if (!organizationId) return null;
  const [org] = await db.select().from(organization).where(eq(organization.id, organizationId));
  if (!org?.active) return null;
  return { ...session.user, role, organizationId, organizationName: org.name };
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
export type TenantUser = CurrentUser & { organizationId: string };

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
