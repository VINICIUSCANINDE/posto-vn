// Tanque da garagem: um saldo por combustível, calculado na leitura a partir dos lançamentos.
// Entra o que chegou ('fuel_in'); sai o que foi abastecido com tank: true e não foi cancelado.
// Abastecimentos antigos (sem fuelId nem tank) ficam fora da conta.

type TankRow = { kind?: string; fuelId?: string; liters?: unknown; tank?: boolean; canceled?: boolean };

export const MAX_ARRIVAL_LITERS = 100000;

// Litros em milésimos inteiros, para a soma não acumular erro de ponto flutuante.
const thousandths = (liters: unknown) => {
  const n = Number(liters);
  return Number.isFinite(n) ? Math.round(n * 1000) : 0;
};

function movement(r: TankRow) {
  if (!r.fuelId) return 0;
  if (r.kind === 'fuel_in') return thousandths(r.liters);
  if (r.kind === 'fill' && r.tank === true && !r.canceled) return -thousandths(r.liters);
  return 0;
}

export function tankBalances(rows: TankRow[]): Record<string, number> {
  const sums: Record<string, number> = {};
  for (const r of rows) {
    const m = movement(r);
    if (m) sums[r.fuelId!] = (sums[r.fuelId!] ?? 0) + m;
  }
  return Object.fromEntries(Object.entries(sums).map(([id, units]) => [id, units / 1000]));
}

export const tankBalance = (rows: TankRow[], fuelId: string) => tankBalances(rows)[fuelId] ?? 0;

// Quantidade de uma chegada: acima de zero, até 100.000 L e no máximo três casas decimais.
export function arrivalLiters(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_ARRIVAL_LITERS || Math.abs(n * 1000 - Math.round(n * 1000)) > 1e-6) return null;
  return Math.round(n * 1000) / 1000;
}
