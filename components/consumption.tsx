import { Gauge } from 'lucide-react';
import { consumption, CONSUMPTION_LABEL, TOLERANCE, type Consumption } from '../lib/consumption';

const fmt = (v: number, digits = 2) => v.toLocaleString('pt-BR', { maximumFractionDigits: digits });
const TONE: Record<Consumption['status'], string> = { ok: 'tag-brand', low: 'tag-danger', high: 'tag-warn', unknown: 'tag-muted' };

export function OdometerBadge({ km }: { km?: number }) {
  if (km == null) return <span className="odo-badge odo-badge-empty">Primeiro abastecimento deste veículo</span>;
  return <span className="odo-badge"><Gauge size={14} aria-hidden="true" />Último odômetro <strong>{fmt(km, 0)} km</strong></span>;
}

export function ConsumptionTag({ fill }: { fill: { kmPerLiter?: number; consumption?: Consumption['status']; divergencePct?: number } }) {
  if (fill.kmPerLiter == null) return <>—</>;
  const status = fill.consumption ?? 'unknown';
  const title = fill.divergencePct != null ? `${CONSUMPTION_LABEL[status]} (${fill.divergencePct > 0 ? '+' : ''}${fmt(fill.divergencePct, 1)}%)` : CONSUMPTION_LABEL[status];
  return <span className={`tag ${TONE[status]}`} title={title}>{fmt(fill.kmPerLiter)} km/L</span>;
}

// Prévia da média enquanto o formulário é preenchido; o servidor recalcula ao salvar.
export function ConsumptionPreview({ vehicle, km, liters }: { vehicle?: { lastKm?: number; kmPerLiter?: number }; km: number; liters: number }) {
  if (!vehicle || vehicle.lastKm == null || !km || !liters) return null;
  const c = consumption(vehicle.lastKm, km, liters, vehicle.kmPerLiter);
  if (!c) return null;
  return (
    <div className={`consumption consumption-${c.status} field-full`} aria-live="polite">
      <div>
        <small>Média deste abastecimento</small>
        <strong>{fmt(c.kmPerLiter)} km/L</strong>
        <span>{fmt(c.distanceKm, 0)} km rodados ÷ {fmt(liters, 3)} L</span>
      </div>
      <div className="consumption-ref">
        <span className={`tag ${TONE[c.status]}`}>{CONSUMPTION_LABEL[c.status]}</span>
        {c.expectedKmPerLiter != null && (
          <span>Esperado {fmt(c.expectedKmPerLiter)} km/L · {c.divergencePct! > 0 ? '+' : ''}{fmt(c.divergencePct!, 1)}%</span>
        )}
        {c.status === 'low' && <span>Diferença acima de {TOLERANCE * 100}%: confira litros e odômetro.</span>}
        {c.status === 'high' && <span>Confira o odômetro: a média passou de {TOLERANCE * 100}% acima do esperado.</span>}
      </div>
    </div>
  );
}
