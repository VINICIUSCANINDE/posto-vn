import { and, eq } from 'drizzle-orm';
import { db } from '../../../db';
import { entries } from '../../../db/schema';
import { getCurrentUser, json, sameOrigin } from '../../../lib/session';
import { arrivalLiters, tankBalance } from '../../../lib/tank';

export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

const fail = (error: string, status = 400) => json({ error }, status);
const today = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);

// Chegada de combustível no tanque da garagem. Administrador e colaborador registram; a chegada não é editada, só cancelada.
export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return fail('Origem inválida.', 403);
    const current = await getCurrentUser();
    if (!current) return fail('Entre na sua conta.', 401);
    const organizationId = current.organizationId;
    if (!organizationId) return fail('O acesso master usa o painel de empresas.', 403);

    const body = (await req.json().catch(() => ({}))) as { action?: string; id?: unknown; reason?: unknown; values?: Rec };
    if (body.action === 'cancel') return await cancelArrival(current, organizationId, String(body.id ?? '').trim(), String(body.reason ?? '').trim().slice(0, 200));
    const { values } = body;
    if (!values || typeof values !== 'object') return fail('Operação inválida.');
    const text = (key: string) => String(values[key] ?? '').trim().slice(0, 200);

    const fuelId = text('fuelId');
    const [fuelRow] = fuelId ? await db.select().from(entries).where(and(eq(entries.id, fuelId), eq(entries.kind, 'fuel'), eq(entries.organizationId, organizationId))) : [];
    if (!fuelRow) return fail('Selecione um combustível cadastrado.');
    const liters = arrivalLiters(values.liters);
    if (liters === null) return fail('Informe os litros recebidos, acima de zero, até 100.000 e com até três casas decimais.');
    const date = text('date');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + 'T12:00:00Z')) || new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) !== date || date > today()) return fail('Informe uma data válida, até hoje.');

    const v = {
      fuelId, fuel: JSON.parse(fuelRow.data).name, liters, date,
      supplier: text('supplier'), document: text('document'), note: text('note'),
      responsible: current.name, actorId: current.id,
    };
    const record = { id: crypto.randomUUID(), kind: 'fuel_in', data: JSON.stringify(v), created: new Date().toISOString(), actor: current.id, organizationId };
    await db.insert(entries).values(record);

    const all = (await db.select().from(entries).where(eq(entries.organizationId, organizationId))).map((x) => ({ ...JSON.parse(x.data), kind: x.kind }) as Rec);
    return json({ ok: true, id: record.id, tankLiters: tankBalance(all, fuelId) });
  } catch {
    return fail('Não foi possível registrar a chegada. Confira o histórico antes de tentar novamente.', 500);
  }
}

// Cancelamento lógico, como no abastecimento: a chegada fica no histórico e sai do saldo.
// O administrador cancela qualquer chegada da empresa; o colaborador, só as que ele registrou.
async function cancelArrival(current: { id: string; name: string; role?: string | null }, organizationId: string, id: string, reason: string) {
  if (!id) return fail('Chegada inválida.');
  const [row] = await db.select().from(entries).where(and(eq(entries.id, id), eq(entries.kind, 'fuel_in'), eq(entries.organizationId, organizationId)));
  if (!row) return fail('Chegada não encontrada.', 404);
  const before = JSON.parse(row.data) as Rec;
  if (current.role !== 'admin' && before.actorId !== current.id) return fail('Você só pode cancelar as chegadas que registrou.', 403);
  if (before.canceled) return fail('Esta chegada já foi cancelada.');
  if (!reason) return fail('Informe o motivo do cancelamento.');
  const now = new Date().toISOString();
  const after = { ...before, canceled: true, canceledAt: now, canceledBy: current.name, canceledById: current.id, cancelReason: reason };
  await db.transaction(async (tx) => {
    await tx.update(entries).set({ data: JSON.stringify(after) })
      .where(and(eq(entries.id, id), eq(entries.kind, 'fuel_in'), eq(entries.organizationId, organizationId)));
    await tx.insert(entries).values({ id: crypto.randomUUID(), kind: 'audit', data: JSON.stringify({ recordId: id, before, after }), created: now, actor: current.id, organizationId });
  });
  const all = (await db.select().from(entries).where(eq(entries.organizationId, organizationId))).map((x) => ({ ...JSON.parse(x.data), kind: x.kind }) as Rec);
  return json({ ok: true, id, tankLiters: tankBalance(all, before.fuelId) });
}
