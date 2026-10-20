import { and, count, eq, isNotNull } from 'drizzle-orm';
import { db } from '../../../db';
import { entries, organization, session, user } from '../../../db/schema';
import { appOrigin, createInvite } from '../../../lib/invites';
import { createMember, listMembers, setMember } from '../../../lib/members';
import { getCurrentUser, json, sameOrigin } from '../../../lib/session';

export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

const fail = (error: string, status = 400) => json({ error }, status);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (v: unknown, max = 120) => String(v ?? '').trim().slice(0, max);

async function requireMaster() {
  const current = await getCurrentUser();
  if (!current) return { error: fail('Entre na sua conta para continuar.', 401) };
  if (current.role !== 'master') return { error: fail('Somente o acesso master gerencia as empresas.', 403) };
  return { current };
}

export async function GET() {
  try {
    const c = await requireMaster();
    if (c.error) return c.error;
    const [orgs, usage] = await Promise.all([
      db.select().from(organization).orderBy(organization.createdAt),
      db.select({ organizationId: entries.organizationId, kind: entries.kind, total: count() }).from(entries).groupBy(entries.organizationId, entries.kind),
    ]);
    const members = await listMembers(orgs.map((o) => o.id));
    const stat = (id: string, kind: string) => usage.find((u) => u.organizationId === id && u.kind === kind)?.total ?? 0;
    return json({
      user: { name: c.current.name, email: c.current.email },
      organizations: orgs.map((o) => ({
        id: o.id, name: o.name, document: o.document, active: o.active, created: o.createdAt.toISOString(),
        vehicles: stat(o.id, 'vehicle'), fills: stat(o.id, 'fill'),
        members: members.filter((m) => m.organizationId === o.id),
      })),
    });
  } catch {
    return fail('Não foi possível carregar as empresas. Tente novamente.', 500);
  }
}

async function emailTaken(email: string) {
  const [taken] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  return Boolean(taken);
}

// Somente contas de empresa: o master não altera outros acessos master por aqui.
async function findMember(id: string) {
  const [found] = await db.select().from(user).where(and(eq(user.id, id), isNotNull(user.organizationId)));
  return found;
}

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return fail('Origem inválida.', 403);
    const c = await requireMaster();
    if (c.error) return c.error;
    const { current } = c;
    const { action, values = {} } = (await req.json().catch(() => ({}))) as { action?: string; values?: Rec };
    const origin = appOrigin(req);

    if (action === 'createOrganization' || action === 'addMember') {
      const isNew = action === 'createOrganization';
      const name = text(values.memberName), email = text(values.email, 200).toLowerCase();
      const role = isNew || values.role === 'admin' ? 'admin' : 'attendant';
      if (!name) return fail(isNew ? 'Informe o nome do administrador.' : 'Informe o nome.');
      if (!EMAIL.test(email)) return fail('Informe um e-mail válido.');
      if (await emailTaken(email)) return fail('Este e-mail já está cadastrado.');
      let organizationId = text(values.organizationId, 64);
      if (isNew) {
        const orgName = text(values.name);
        if (!orgName) return fail('Informe o nome da empresa.');
        organizationId = crypto.randomUUID();
        await db.insert(organization).values({ id: organizationId, name: orgName, document: text(values.document, 30) || null });
      } else {
        const [org] = await db.select().from(organization).where(eq(organization.id, organizationId));
        if (!org) return fail('Empresa não encontrada.', 404);
      }
      const userId = await createMember(organizationId, name, email, role);
      const invite = await createInvite(userId, current.id, origin);
      return json({ ok: true, organizationId, invite: { name, email, ...invite } });
    }

    if (action === 'updateOrganization') {
      const id = text(values.id, 64);
      const [org] = await db.select().from(organization).where(eq(organization.id, id));
      if (!org) return fail('Empresa não encontrada.', 404);
      const name = values.name != null ? text(values.name) : org.name;
      if (!name) return fail('Informe o nome da empresa.');
      const active = values.active != null ? values.active === true || values.active === 'true' : org.active;
      await db.transaction(async (tx) => {
        await tx.update(organization).set({ name, document: values.document != null ? text(values.document, 30) || null : org.document, active }).where(eq(organization.id, id));
        // Ao desativar a empresa, todos os acessos dela caem na hora.
        if (!active) {
          const people = await tx.select({ id: user.id }).from(user).where(eq(user.organizationId, id));
          for (const p of people) await tx.delete(session).where(eq(session.userId, p.id));
        }
      });
      return json({ ok: true });
    }

    if (action === 'updateMember') {
      const member = await findMember(text(values.id, 64));
      if (!member) return fail('Acesso não encontrado.', 404);
      const role = values.role === 'admin' ? 'admin' : values.role === 'attendant' ? 'attendant' : undefined;
      const active = values.active != null ? values.active === true || values.active === 'true' : undefined;
      await setMember(member.id, { role, active }, (role != null && role !== member.role) || active === false);
      return json({ ok: true });
    }

    if (action === 'invite') {
      const member = await findMember(text(values.id, 64));
      if (!member) return fail('Acesso não encontrado.', 404);
      if (member.banned) return fail('Reative o acesso antes de gerar um novo link.');
      const invite = await createInvite(member.id, current.id, origin);
      return json({ ok: true, invite: { name: member.name, email: member.email, ...invite } });
    }

    return fail('Operação inválida.');
  } catch {
    return fail('Não foi possível concluir. Confira os dados e tente novamente.', 500);
  }
}
