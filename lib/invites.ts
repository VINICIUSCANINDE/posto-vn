import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../db';
import { invite, session, user } from '../db/schema';
import { auth } from './auth';

export const INVITE_HOURS = 3;
const hash = (token: string) => createHash('sha256').update(token).digest('hex');

export function appOrigin(req: Request) {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') ?? (host?.startsWith('127.0.0.1') || host?.startsWith('localhost') ? 'http' : 'https');
  return host ? `${proto}://${host}` : process.env.BETTER_AUTH_URL ?? '';
}

export async function createInvite(userId: string, createdBy: string, origin: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + INVITE_HOURS * 3600 * 1000);
  await db.transaction(async (tx) => {
    await tx.update(invite).set({ revokedAt: new Date() }).where(and(eq(invite.userId, userId), isNull(invite.usedAt), isNull(invite.revokedAt)));
    await tx.insert(invite).values({ id: crypto.randomUUID(), userId, tokenHash: hash(token), expiresAt, createdBy });
  });
  return { url: `${origin}/convite?token=${token}`, expiresAt: expiresAt.toISOString() };
}

export async function findValidInvite(token: string) {
  if (!token || token.length > 200) return null;
  const [row] = await db
    .select({ id: invite.id, userId: invite.userId, expiresAt: invite.expiresAt, name: user.name, email: user.email, banned: user.banned })
    .from(invite)
    .innerJoin(user, eq(user.id, invite.userId))
    .where(and(eq(invite.tokenHash, hash(token)), isNull(invite.usedAt), isNull(invite.revokedAt), gt(invite.expiresAt, new Date())));
  return row && !row.banned ? row : null;
}

export async function acceptInvite(token: string, password: string) {
  const found = await findValidInvite(token);
  if (!found) return { ok: false as const, error: 'Este convite expirou ou já foi usado. Peça um novo link ao administrador.' };
  const ctx = await auth.$context;
  const passwordHash = await ctx.password.hash(password);
  const claimed = await db.update(invite).set({ usedAt: new Date() })
    .where(and(eq(invite.id, found.id), isNull(invite.usedAt), isNull(invite.revokedAt))).returning({ id: invite.id });
  if (!claimed.length) return { ok: false as const, error: 'Este convite já foi usado. Peça um novo link ao administrador.' };
  if (await ctx.internalAdapter.findCredentialAccount(found.userId)) await ctx.internalAdapter.updatePassword(found.userId, passwordHash);
  else await ctx.internalAdapter.linkAccount({ userId: found.userId, providerId: 'credential', accountId: found.userId, password: passwordHash });
  await db.update(user).set({ emailVerified: true }).where(eq(user.id, found.userId));
  await db.delete(session).where(eq(session.userId, found.userId));
  return { ok: true as const, email: found.email };
}
