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

// Chegada de combustível no tanque da garagem. Administrador e colaborador registram; não há edição nem cancelamento.
export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return fail('Origem inválida.', 403);
    const current = await getCurrentUser();
    if (!current) return fail('Entre na sua conta.', 401);
    const organizationId = current.organizationId;
    if (!organizationId) return fail('O acesso master usa o painel de empresas.', 403);

    const { values } = (await req.json().catch(() => ({}))) as { values?: Rec };
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
