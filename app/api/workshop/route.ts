import { eq, sql } from 'drizzle-orm';
import { db } from '../../../db';
import { entries, workshopCounters } from '../../../db/schema';
import { getCurrentUser, json, sameOrigin } from '../../../lib/session';

export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

const fail = (error: string, status = 400) => json({ error }, status);
const UNITS = ['un', 'jogo', 'kit', 'L', 'kg', 'm'];
const today = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);

class Conflict extends Error {}

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return fail('Origem inválida.', 403);
    const current = await getCurrentUser();
    if (!current) return fail('Entre na sua conta.', 401);
    const organizationId = current.organizationId;
    if (!organizationId) return fail('O acesso master usa o painel de empresas.', 403);

    const { action, values } = (await req.json().catch(() => ({}))) as { action?: string; values?: Rec };
    if (!action || !['part', 'in', 'plan', 'out', 'return'].includes(action) || !values || typeof values !== 'object') return fail('Operação inválida.');
    const text = (key: string) => String(values[key] ?? '').trim().slice(0, 200);
    const thousandths = (key: string) => {
      const n = Number(values[key]);
      return Number.isFinite(n) && n > 0 && n <= 1000000 && Math.abs(n * 1000 - Math.round(n * 1000)) < 1e-6 ? Math.round(n * 1000) : 0;
    };
    const validDate = (date: string, allowFuture: boolean) =>
      /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date + 'T12:00:00Z'))
      && new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) === date && (allowFuture || date <= today());

    // Peças, planejamentos e veículos vêm só da empresa do usuário, o que também isola os contadores de estoque.
    const all = (await db.select().from(entries).where(eq(entries.organizationId, organizationId))).map((x) => ({ ...JSON.parse(x.data), id: x.id, kind: x.kind }) as Rec);
    const id = crypto.randomUUID();
    const created = new Date().toISOString();
    const record = (data: Rec) => ({ id, kind: `workshop_${action}`, data: JSON.stringify(data), created, actor: current.id, organizationId });

    if (action === 'part') {
      const name = text('name'), code = text('code').toUpperCase(), unit = text('unit');
      const minimum = Number(values.minimum || 0);
      if (!name || !code || !UNITS.includes(unit)) return fail('Informe nome, código e unidade da peça.');
      if (!Number.isFinite(minimum) || minimum < 0 || minimum > 1000000 || Math.abs(minimum * 1000 - Math.round(minimum * 1000)) > 1e-6) return fail('Estoque mínimo inválido.');
      if (all.some((x) => x.kind === 'workshop_part' && x.code === code)) return fail('Já existe uma peça com esse código.');
      const v = { name, code, unit, minimumUnits: Math.round(minimum * 1000), note: text('note') };
      await db.transaction(async (tx) => {
        await tx.insert(entries).values(record(v));
        await tx.insert(workshopCounters).values({ id: `part:${id}`, units: 0 });
      });
      return json({ ok: true, id });
    }

    if (action === 'return') {
      const out = all.find((x) => x.kind === 'workshop_out' && x.id === text('outId'));
      if (!out) return fail('Selecione a saída que teve sobra.');
      const units = thousandths('quantity');
      if (!units) return fail('Informe a quantidade devolvida, positiva e com até três casas decimais.');
      const date = text('date');
      if (!validDate(date, false) || date < out.date) return fail('A data da devolução precisa estar entre a data da saída e hoje.');
      const returnedBy = text('returnedBy');
      if (!returnedBy) return fail('Informe quem devolveu a peça.');
      const returned = all.filter((x) => x.kind === 'workshop_return' && x.outId === out.id).reduce((sum, x) => sum + x.quantityUnits, 0);
      const v = {
        outId: out.id, partId: out.partId, part: out.part, code: out.code, unit: out.unit, quantityUnits: units, date,
        vehicleId: out.vehicleId, vehicle: out.vehicle, plate: out.plate, institution: out.institution,
        returnedBy, note: text('note'), responsible: current.name,
      };
      await db.transaction(async (tx) => {
        // Saldo devolvível da saída: nasce na primeira devolução e só diminui, com baixa condicional atômica.
        await tx.insert(workshopCounters).values({ id: `out:${out.id}`, units: out.quantityUnits - returned }).onConflictDoNothing();
        const left = await tx.update(workshopCounters).set({ units: sql`${workshopCounters.units} - ${units}` })
          .where(sql`${workshopCounters.id} = ${`out:${out.id}`} and ${workshopCounters.units} >= ${units}`).returning();
        if (!left.length) throw new Conflict('A devolução passa do que sobrou desta saída.');
        await tx.update(workshopCounters).set({ units: sql`${workshopCounters.units} + ${units}` }).where(eq(workshopCounters.id, `part:${out.partId}`));
        await tx.insert(entries).values(record(v));
      });
      return json({ ok: true, id });
    }

    const part = all.find((x) => x.kind === 'workshop_part' && x.id === text('partId'));
    const units = thousandths('quantity');
    if (!part || !units) return fail('Selecione uma peça e uma quantidade positiva com até três casas decimais.');
    const date = text('date');
    if (!validDate(date, action === 'plan')) return fail('Informe uma data válida. Entradas e entregas não podem ter data futura.');
    let v: Rec = { partId: part.id, part: part.name, code: part.code, unit: part.unit, quantityUnits: units, date, note: text('note'), responsible: current.name };

    if (action === 'in') {
      const cost = Number(values.cost || 0);
      if (!Number.isFinite(cost) || cost < 0 || cost > 10000000) return fail('Custo unitário inválido.');
      v = { ...v, supplier: text('supplier'), document: text('document'), unitCostCents: Math.round(cost * 100) };
      await db.transaction(async (tx) => {
        await tx.insert(entries).values(record(v));
        await tx.update(workshopCounters).set({ units: sql`${workshopCounters.units} + ${units}` }).where(eq(workshopCounters.id, `part:${part.id}`));
      });
      return json({ ok: true, id });
    }

    const vehicle = all.find((x) => x.kind === 'vehicle' && x.id === text('vehicleId'));
    if (!vehicle) return fail('Selecione o veículo que utilizará a peça.');
    const institution = all.find((x) => x.kind === 'institution' && x.id === vehicle.institutionId);
    v = { ...v, vehicleId: vehicle.id, vehicle: vehicle.name, plate: vehicle.plate, institution: institution?.name || '' };

    if (action === 'plan') {
      // Uso previsto é demanda: não reserva nem baixa estoque.
      await db.transaction(async (tx) => {
        await tx.insert(entries).values(record(v));
        await tx.insert(workshopCounters).values({ id: `plan:${id}`, units });
      });
      return json({ ok: true, id });
    }

    const receiver = text('receiver');
    if (!receiver) return fail('Informe quem recebeu a peça.');
    const planId = text('planId');
    if (planId) {
      const plan = all.find((x) => x.id === planId && x.kind === 'workshop_plan');
      if (!plan || plan.partId !== part.id || plan.vehicleId !== vehicle.id) return fail('O planejamento precisa corresponder à peça e ao veículo.');
    }
    v = { ...v, receiver, planId };
    await db.transaction(async (tx) => {
      const stock = await tx.update(workshopCounters).set({ units: sql`${workshopCounters.units} - ${units}` })
        .where(sql`${workshopCounters.id} = ${`part:${part.id}`} and ${workshopCounters.units} >= ${units}`).returning();
      if (!stock.length) throw new Conflict('Estoque insuficiente para essa saída.');
      if (planId) {
        const pending = await tx.update(workshopCounters).set({ units: sql`${workshopCounters.units} - ${units}` })
          .where(sql`${workshopCounters.id} = ${`plan:${planId}`} and ${workshopCounters.units} >= ${units}`).returning();
        if (!pending.length) throw new Conflict('A quantidade excede o saldo pendente do planejamento.');
      }
      await tx.insert(entries).values(record(v));
    });
    return json({ ok: true, id });
  } catch (e) {
    if (e instanceof Conflict) return fail(e.message, 409);
    let cause: unknown = e;
    for (let i = 0; cause && i < 5; i++, cause = (cause as { cause?: unknown }).cause) {
      if ((cause as { code?: string }).code === '23514') return fail('O saldo mudou durante o envio. Atualize e confira o estoque e o planejamento.', 409);
    }
    return fail('Não foi possível registrar a operação. Confira os dados e tente novamente.', 500);
  }
}
