// Média pelo método de tanque cheio: km rodados desde o abastecimento anterior ÷ litros deste abastecimento.
export const TOLERANCE = 0.15;

export type Consumption = {
  distanceKm: number;
  kmPerLiter: number;
  expectedKmPerLiter?: number;
  divergencePct?: number;
  status: 'ok' | 'low' | 'high' | 'unknown';
};

export function consumption(previousKm: number | undefined, km: number, liters: number, expected?: number): Consumption | null {
  if (previousKm == null || !Number.isFinite(km) || !Number.isFinite(liters) || liters <= 0 || km <= previousKm) return null;
  const distanceKm = km - previousKm;
  const kmPerLiter = Math.round((distanceKm / liters) * 100) / 100;
  if (!expected || expected <= 0) return { distanceKm, kmPerLiter, status: 'unknown' };
  const divergencePct = Math.round(((kmPerLiter - expected) / expected) * 1000) / 10;
  const status = divergencePct < -TOLERANCE * 100 ? 'low' : divergencePct > TOLERANCE * 100 ? 'high' : 'ok';
  return { distanceKm, kmPerLiter, expectedKmPerLiter: expected, divergencePct, status };
}

export const CONSUMPTION_LABEL: Record<Consumption['status'], string> = {
  ok: 'Dentro do esperado',
  low: 'Abaixo do esperado',
  high: 'Acima do esperado',
  unknown: 'Sem consumo de referência',
};
