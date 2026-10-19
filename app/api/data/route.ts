import { and, asc, eq, isNull } from 'drizzle-orm';
import { headers } from 'next/headers';
import { db } from '../../../db';
import { account, entries, invite, user as users, workshopCounters } from '../../../db/schema';
import { appOrigin, createInvite } from '../../../lib/invites';
import { auth } from '../../../lib/auth';
import { consumption } from '../../../lib/consumption';
import { getCurrentUser, json, sameOrigin } from '../../../lib/session';

export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;
type Entry = typeof entries.$inferSelect;

const read = (r: Entry): Rec => ({ ...JSON.parse(r.data), id: r.id, kind: r.kind, created: r.created });
const fail = (message: string, status = 400) => json({ error: message }, status);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function context() {
  const current = await getCurrentUser();
  if (!current) return { error: fail('Entre na sua conta para continuar.', 401) };
  return { current };
}

async function listMembers() {
  const [rows, credentials, invites] = await Promise.all([
    db.select().from(users).orderBy(asc(users.createdAt)),
    db.select({ userId: account.userId }).from(account).where(eq(account.providerId, 'credential')),
    db.select({ userId: invite.userId, expiresAt: invite.expiresAt }).from(invite).where(and(isNull(invite.usedAt), isNull(invite.revokedAt))),
  ]);
  const withPassword = new Set(credentials.map((c) => c.userId));
  const pending = new Map(invites.map((i) => [i.userId, i.expiresAt]));
  return rows.map((u) => ({
    id: u.id, kind: 'member', name: u.name, email: u.email, role: u.role === 'admin' ? 'admin' : 'attendant',
    active: !u.banned, hasPassword: withPassword.has(u.id), inviteExpiresAt: pending.get(u.id)?.toISOString() ?? null,
    created: u.createdAt.toISOString(),
  }));
}

export async function GET(req: Request) {
  try {
    const c = await context();
    if (c.error) return c.error;
    const { current } = c;
    const [rows, counters] = await Promise.all([db.select().from(entries), db.select().from(workshopCounters)]);
    const balance = new Map(counters.map((c) => [c.id, c.units]));
    const all = rows.map(read).map((r) => r.kind === 'workshop_part' ? { ...r, balanceUnits: balance.get(`part:${r.id}`) ?? 0 }
      : r.kind === 'workshop_plan' ? { ...r, remainingUnits: balance.get(`plan:${r.id}`) ?? 0 }
      : r);
    const admin = current.role === 'admin' && new URL(req.url).searchParams.get('view') !== 'attendant';
    const lastKm: Record<string, number> = {};
    for (const r of all) if (r.kind === 'fill' && (lastKm[r.vehicleId] ?? -1) < r.km) lastKm[r.vehicleId] = r.km;
    const shared = ['institution', 'vehicle', 'fuel', 'workshop_part', 'workshop_in', 'workshop_plan', 'workshop_out'];
    const data = all
      .filter((r) => r.kind !== 'audit' && r.kind !== 'member' && (admin || shared.includes(r.kind) || (r.kind === 'fill' && r.actorId === current.id)))
      .map((r) => r.kind === 'institution' && !admin ? { id: r.id, kind: r.kind, name: r.name }
        : r.kind === 'vehicle' && !admin ? { id: r.id, kind: r.kind, name: r.name, plate: r.plate, institutionId: r.institutionId, kmPerLiter: r.kmPerLiter, lastKm: lastKm[r.id] }
        : r.kind === 'vehicle' ? { ...r, lastKm: lastKm[r.id] }
        : r);
    if (admin) data.push(...(await listMembers()));
    return json({ data, user: { id: current.id, name: current.name, role: current.role, email: current.email } });
  } catch {
    return fail('Não foi possível carregar os dados. Tente novamente.', 500);
  }
}

async function saveMember(req: Request, current: { id: string }, values: Rec, id?: string) {
  const name = String(values.name ?? '').trim().slice(0, 120);
  const email = String(values.email ?? '').trim().toLowerCase();
  const role = values.role === 'admin' ? 'admin' : 'attendant';
  const active = values.active !== false && values.active !== 'false';
  const h = await headers();
  if (!name) return fail('Informe o nome.');
  if (!EMAIL.test(email)) return fail('Informe um e-mail válido.');
  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (taken && taken.id !== id) return fail('Este e-mail já está cadastrado.');

  if (!id) {
    const created = await auth.api.createUser({ headers: h, body: { name, email, role } });
    const link = await createInvite(created.user.id, current.id, appOrigin(req));
    return json({ ok: true, record: { id: created.user.id, kind: 'member' }, invite: link });
  }
  const [existing] = await db.select().from(users).where(eq(users.id, id));
  if (!existing) return fail('Registro não encontrado.', 404);
  if (id === current.id && (role !== 'admin' || !active)) return fail('Você não pode remover o próprio acesso de administrador.');
  await auth.api.adminUpdateUser({ headers: h, body: { userId: id, data: { name, email, role } } });
  if (active === !!existing.banned) {
    if (active) await auth.api.unbanUser({ headers: h, body: { userId: id } });
    else await auth.api.banUser({ headers: h, body: { userId: id, banReason: 'Acesso desativado pelo administrador' } });
  }
  const link = values.newInvite === true || values.newInvite === 'true' ? await createInvite(id, current.id, appOrigin(req)) : undefined;
  return json({ ok: true, record: { id, kind: 'member' }, invite: link });
}

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return fail('Origem inválida.', 403);
    const c = await context();
    if (c.error) return c.error;
    const { current } = c;
    const { kind, values = {}, id } = (await req.json()) as { kind: string; values?: Rec; id?: string };
    const admin = current.role === 'admin';
    if (!['institution', 'vehicle', 'person', 'contract', 'fuel', 'fill', 'member'].includes(kind)) return fail('Cadastro inválido.');
    if (!admin && kind !== 'fill') return fail('Somente administradores podem alterar cadastros.', 403);
    if (kind === 'member') return await saveMember(req, current, values, id);

    const all = (await db.select().from(entries)).map(read);
    const str = (key: string) => String(values[key] || '').trim().slice(0, 200);
    let v: Rec = {};
    if (kind === 'fill') {
      if (id) return fail('Abastecimentos não podem ser sobrescritos.');
      const vehicle = all.find((r) => r.id === str('vehicleId') && r.kind === 'vehicle');
      const fuel = all.find((r) => r.id === str('fuelId') && r.kind === 'fuel');
      const institution = all.find((r) => r.id === vehicle?.institutionId && r.kind === 'institution');
      const liters = Number(values.liters), km = Number(values.km), date = str('date');
      if (!vehicle || !fuel || !institution) return fail('Selecione um veículo vinculado a uma instituição e um combustível cadastrado.');
      if (!Number.isFinite(liters) || liters <= 0 || liters > 10000 || !Number.isInteger(km) || km < 0 || km > 9999999) return fail('Confira a quantidade de litros e o odômetro.');
      const today = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + 'T12:00:00Z')) || new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) !== date || date > today) return fail('Informe uma data válida, até hoje.');
      const vehicleFills = all.filter((r) => r.kind === 'fill' && r.vehicleId === vehicle.id).sort((a, b) => a.date.localeCompare(b.date) || a.created.localeCompare(b.created));
      const before = [...vehicleFills].reverse().find((r) => r.date <= date);
      const after = vehicleFills.find((r) => r.date > date);
      if (before && km < before.km) return fail(`O odômetro não pode ser menor que o último registro (${before.km.toLocaleString('pt-BR')} km).`);
      if (after && km > after.km) return fail('O odômetro não pode ser maior que um abastecimento já registrado em data posterior.');
      v = {
        vehicleId: vehicle.id, institutionId: institution.id, plate: vehicle.plate, vehicle: vehicle.name, institution: institution.name,
        fuel: fuel.name, priceCents: fuel.priceCents, liters, km, date, driver: str('driver'), note: str('note'),
        totalCents: Math.round(liters * fuel.priceCents), actorId: current.id, attendant: current.name,
      };
      // Registra a média do trecho para o controle de consumo; o primeiro abastecimento do veículo não tem trecho.
      const avg = consumption(before?.km, km, liters, vehicle.kmPerLiter);
      if (avg) {
        const { status, ...figures } = avg;
        v = { ...v, previousKm: before!.km, ...figures, consumption: status };
      }
    } else {
      v = { name: str('name') };
      if (!v.name) return fail('Informe o nome.');
      if (kind === 'institution' || kind === 'person') v = { ...v, document: str('document'), contact: str('contact') };
      if (kind === 'vehicle') {
        v = { ...v, plate: str('plate').toUpperCase().replace(/[^A-Z0-9]/g, ''), institutionId: str('institutionId'), kmPerLiter: Math.round(Number(values.kmPerLiter) * 100) / 100 };
        if (!Number.isFinite(v.kmPerLiter) || v.kmPerLiter < 0.5 || v.kmPerLiter > 100) return fail('Informe o consumo esperado do veículo, entre 0,5 e 100 km/L.');
        if (!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(v.plate) || !all.some((r) => r.kind === 'institution' && r.id === v.institutionId)) return fail('Informe uma placa válida e a instituição.');
        if (all.some((r) => r.kind === 'vehicle' && r.plate === v.plate && r.id !== id)) return fail('Esta placa já está cadastrada.');
      }
      if (kind === 'fuel') {
        v.priceCents = Math.round(Number(values.price) * 100);
        if (!Number.isFinite(v.priceCents) || v.priceCents <= 0 || v.priceCents > 10000) return fail('Informe um preço entre R$ 0,01 e R$ 100,00.');
      }
      if (kind === 'contract') {
        v = { ...v, institutionId: str('institutionId'), personId: str('personId'), vehicleId: str('vehicleId'), start: str('start'), end: str('end'), note: str('note') };
        if (!all.some((r) => r.kind === 'institution' && r.id === v.institutionId)) return fail('Selecione uma instituição.');
        if (v.vehicleId && !all.some((r) => r.kind === 'vehicle' && r.id === v.vehicleId && r.institutionId === v.institutionId)) return fail('O veículo deve pertencer à instituição do contrato.');
        if (v.personId && !all.some((r) => r.kind === 'person' && r.id === v.personId)) return fail('Pessoa inválida.');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v.start) || !/^\d{4}-\d{2}-\d{2}$/.test(v.end) || v.end < v.start) return fail('Confira as datas de vigência.');
      }
    }
    const now = new Date().toISOString();
    const record = { id: id || crypto.randomUUID(), kind, data: JSON.stringify(v), created: now, actor: current.id };
    if (id) {
      const old = all.find((r) => r.id === id && r.kind === kind);
      if (!old) return fail('Registro não encontrado.', 404);
      await db.transaction(async (tx) => {
        await tx.update(entries).set({ data: record.data, actor: record.actor }).where(and(eq(entries.id, id), eq(entries.kind, kind)));
        await tx.insert(entries).values({ id: crypto.randomUUID(), kind: 'audit', data: JSON.stringify({ recordId: id, before: old, after: v }), created: now, actor: current.id });
      });
    } else {
      await db.insert(entries).values(record);
    }
    return json({ ok: true, record: read(record) });
  } catch {
    return fail('Não foi possível salvar. Confira os dados e tente novamente.', 500);
  }
}
