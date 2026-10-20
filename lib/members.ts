import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '../db';
import { account, invite, session, user } from '../db/schema';

export type MemberRole = 'admin' | 'attendant';

// Edição direta, em vez dos endpoints de admin do Better Auth (globais): quem chama já validou a empresa.
export async function setMember(id: string, fields: { name?: string; email?: string; role?: MemberRole; active?: boolean }, revokeSessions: boolean) {
  const { name, email, role, active } = fields;
  await db.transaction(async (tx) => {
    await tx.update(user).set({
      ...(name != null ? { name } : {}), ...(email != null ? { email } : {}), ...(role != null ? { role } : {}),
      ...(active != null ? { banned: !active, banReason: active ? null : 'Acesso desativado pelo administrador' } : {}),
    }).where(eq(user.id, id));
    if (revokeSessions) await tx.delete(session).where(eq(session.userId, id));
  });
}

// Cria a conta já vinculada à empresa; a senha é definida pela própria pessoa ao aceitar o convite.
export async function createMember(organizationId: string | null, name: string, email: string, role: MemberRole | 'master') {
  const [created] = await db.insert(user).values({ id: crypto.randomUUID(), name, email, role, organizationId, emailVerified: false }).returning({ id: user.id });
  return created.id;
}

export async function listMembers(organizationIds: string[]) {
  if (!organizationIds.length) return [];
  const rows = await db.select().from(user).where(inArray(user.organizationId, organizationIds)).orderBy(asc(user.createdAt));
  const ids = rows.map((u) => u.id);
  const [credentials, invites] = ids.length ? await Promise.all([
    db.select({ userId: account.userId }).from(account).where(and(eq(account.providerId, 'credential'), inArray(account.userId, ids))),
    db.select({ userId: invite.userId, expiresAt: invite.expiresAt }).from(invite).where(and(isNull(invite.usedAt), isNull(invite.revokedAt), inArray(invite.userId, ids))),
  ]) : [[], []];
  const withPassword = new Set(credentials.map((c) => c.userId));
  const pending = new Map(invites.map((i) => [i.userId, i.expiresAt]));
  return rows.map((u) => ({
    id: u.id, kind: 'member', name: u.name, email: u.email, role: (u.role === 'admin' ? 'admin' : 'attendant') as MemberRole,
    organizationId: u.organizationId, active: !u.banned, hasPassword: withPassword.has(u.id),
    inviteExpiresAt: pending.get(u.id)?.toISOString() ?? null, created: u.createdAt.toISOString(),
  }));
}
