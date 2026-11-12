import { consumption } from './consumption.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

// Cancelamento é lógico: o registro continua no banco, mas não conta em totais, odômetro nem média.
export const isValidFill = (r: Rec) => r.kind === 'fill' && !r.canceled;

const SEGMENT = ['previousKm', 'distanceKm', 'kmPerLiter', 'expectedKmPerLiter', 'divergencePct', 'consumption'];

/**
 * Ao cancelar um abastecimento, o seguinte válido do mesmo veículo perde o trecho que começava nele.
 * Devolve o seguinte com a média refeita a partir do anterior válido (ou sem trecho), ou null se nada muda.
 */
export function recalcAfterCancel(fills: Rec[], canceledId: string, vehicleKmPerLiter?: number) {
  const canceled = fills.find((r) => r.id === canceledId);
  if (!canceled) return null;
  const order = fills.filter((r) => r.kind === 'fill' && r.vehicleId === canceled.vehicleId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.created.localeCompare(b.created));
  const at = order.findIndex((r) => r.id === canceledId);
  const next = order.slice(at + 1).find(isValidFill);
  if (!next) return null;
  const previous = order.slice(0, at).reverse().find(isValidFill);

  const after: Rec = Object.fromEntries(Object.entries(next).filter(([k]) => !SEGMENT.includes(k)));
  const avg = consumption(previous?.km, next.km, next.liters, next.expectedKmPerLiter ?? vehicleKmPerLiter);
  if (avg) {
    const { status, ...figures } = avg;
    Object.assign(after, { previousKm: previous!.km, ...figures, consumption: status });
  }
  if (SEGMENT.every((k) => after[k] === next[k])) return null;
  return { id: next.id as string, before: next, after };
}

// Frase exibida nas listas para o lançamento cancelado, no horário de Brasília.
export function cancelNote(fill: Rec) {
  const at = new Date(fill.canceledAt);
  const zone = { timeZone: 'America/Sao_Paulo' } as const;
  const when = Number.isNaN(at.getTime()) ? ''
    : ` em ${at.toLocaleDateString('pt-BR', zone)} às ${at.toLocaleTimeString('pt-BR', { ...zone, hour: '2-digit', minute: '2-digit' })}`;
  return `Cancelado${fill.canceledBy ? ` por ${fill.canceledBy}` : ''}${when}. Motivo: ${fill.cancelReason || 'não informado'}`;
}
