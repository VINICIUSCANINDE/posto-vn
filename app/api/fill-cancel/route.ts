import { and, eq } from 'drizzle-orm';
import { db } from '../../../db';
import { entries } from '../../../db/schema';
import { recalcAfterCancel } from '../../../lib/fills';
import { getCurrentUser, json, sameOrigin } from '../../../lib/session';

export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

const fail = (error: string, status = 400) => json({ error }, status);
const ROW = ['id', 'kind', 'created'];
// Remove os campos da linha do banco para gravar só o conteúdo de entries.data.
const content = (r: Rec) => Object.fromEntries(Object.entries(r).filter(([k]) => !ROW.includes(k)));

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return fail('Origem inválida.', 403);
    const current = await getCurrentUser();
    if (!current) return fail('Entre na sua conta para continuar.', 401);
    const organizationId = current.organizationId;
    if (!organizationId) return fail('O acesso master usa o painel de empresas.', 403);

    const body = (await req.json().catch(() => ({}))) as { id?: unknown; reason?: unknown };
    const id = String(body.id ?? '').trim();
    const reason = String(body.reason ?? '').trim().slice(0, 200);
    if (!id) return fail('Abastecimento inválido.');

    const all = (await db.select().from(entries).where(eq(entries.organizationId, organizationId)))
      .map((x) => ({ ...JSON.parse(x.data), id: x.id, kind: x.kind, created: x.created }) as Rec);
    const fill = all.find((x) => x.kind === 'fill' && x.id === id);
    if (!fill) return fail('Abastecimento não encontrado.', 404);
    // O colaborador só cancela o que ele mesmo lançou; o administrador cancela qualquer lançamento da empresa.
    if (current.role !== 'admin' && fill.actorId !== current.id) return fail('Você só pode cancelar os seus próprios lançamentos.', 403);
    if (fill.canceled) return fail('Este abastecimento já foi cancelado.');
    if (!reason) return fail('Informe o motivo do cancelamento.');

    const now = new Date().toISOString();
    const before = content(fill);
    const after = { ...before, canceled: true, canceledAt: now, canceledBy: current.name, canceledById: current.id, cancelReason: reason };
    // O seguinte válido do mesmo veículo passa a medir o trecho desde o anterior válido ao cancelado.
    const vehicle = all.find((x) => x.kind === 'vehicle' && x.id === fill.vehicleId);
    const next = recalcAfterCancel(all.filter((x) => x.kind === 'fill'), id, vehicle?.kmPerLiter);

    await db.transaction(async (tx) => {
      await tx.update(entries).set({ data: JSON.stringify(after), actor: current.id })
        .where(and(eq(entries.id, id), eq(entries.kind, 'fill'), eq(entries.organizationId, organizationId)));
      await tx.insert(entries).values({ id: crypto.randomUUID(), kind: 'audit', data: JSON.stringify({ recordId: id, before, after }), created: now, actor: current.id, organizationId });
      if (next) {
        const nextBefore = content(next.before), nextAfter = content(next.after);
        await tx.update(entries).set({ data: JSON.stringify(nextAfter) })
          .where(and(eq(entries.id, next.id), eq(entries.kind, 'fill'), eq(entries.organizationId, organizationId)));
        await tx.insert(entries).values({ id: crypto.randomUUID(), kind: 'audit', data: JSON.stringify({ recordId: next.id, before: nextBefore, after: nextAfter }), created: now, actor: current.id, organizationId });
      }
    });
    return json({ ok: true, id, recalculated: next?.id ?? null });
  } catch {
    return fail('Não foi possível cancelar o abastecimento. Tente novamente.', 500);
  }
}
