import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cancelNote, isValidFill, recalcAfterCancel } from '../../lib/fills.ts';

const fill = (id: string, date: string, km: number, extra: Record<string, unknown> = {}) =>
  ({ id, kind: 'fill', vehicleId: 'v1', date, created: `${date}T10:00:00.000Z`, km, liters: 50, ...extra });

test('abastecimento cancelado não é válido', () => {
  assert.equal(isValidFill(fill('a', '2026-01-01', 1000)), true);
  assert.equal(isValidFill(fill('a', '2026-01-01', 1000, { canceled: true })), false);
  assert.equal(isValidFill({ kind: 'workshop_out' }), false);
});

test('recalcula o seguinte a partir do anterior válido ao cancelado', () => {
  const fills = [
    fill('a', '2026-01-01', 1000),
    fill('b', '2026-01-05', 1500, { previousKm: 1000, distanceKm: 500, kmPerLiter: 10, expectedKmPerLiter: 10, divergencePct: 0, consumption: 'ok' }),
    fill('c', '2026-01-10', 2000, { previousKm: 1500, distanceKm: 500, kmPerLiter: 10, expectedKmPerLiter: 10, divergencePct: 0, consumption: 'ok' }),
  ];
  const result = recalcAfterCancel(fills, 'b', 10);
  assert.equal(result?.id, 'c');
  assert.equal(result?.after.previousKm, 1000);
  assert.equal(result?.after.distanceKm, 1000);
  assert.equal(result?.after.kmPerLiter, 20);
  assert.equal(result?.after.consumption, 'high');
  assert.equal(result?.before.previousKm, 1500);
});

test('o seguinte fica sem trecho quando não há anterior válido', () => {
  const fills = [
    fill('a', '2026-01-01', 1000),
    fill('b', '2026-01-05', 1500, { previousKm: 1000, distanceKm: 500, kmPerLiter: 10, consumption: 'unknown' }),
  ];
  const result = recalcAfterCancel(fills, 'a', undefined);
  assert.equal(result?.id, 'b');
  for (const key of ['previousKm', 'distanceKm', 'kmPerLiter', 'expectedKmPerLiter', 'divergencePct', 'consumption']) {
    assert.equal(key in result!.after, false, key);
  }
  assert.equal(result?.after.km, 1500);
});

test('ignora cancelados ao escolher anterior e seguinte, na ordem de data e envio', () => {
  const fills = [
    fill('d', '2026-01-20', 3000),
    fill('a', '2026-01-01', 1000),
    fill('x', '2026-01-03', 1200, { canceled: true }),
    fill('b', '2026-01-05', 1500),
    fill('y', '2026-01-07', 1700, { canceled: true }),
    { ...fill('c', '2026-01-05', 1600), created: '2026-01-05T11:00:00.000Z' },
  ];
  const result = recalcAfterCancel(fills, 'b', 10);
  assert.equal(result?.id, 'c');
  assert.equal(result?.after.previousKm, 1000);
});

test('usa o consumo esperado gravado no seguinte antes do cadastro atual do veículo', () => {
  const fills = [
    fill('a', '2026-01-01', 1000),
    fill('b', '2026-01-05', 1500),
    fill('c', '2026-01-10', 2000, { previousKm: 1500, distanceKm: 500, kmPerLiter: 10, expectedKmPerLiter: 20, divergencePct: -50, consumption: 'low' }),
  ];
  const result = recalcAfterCancel(fills, 'b', 10);
  assert.equal(result?.after.expectedKmPerLiter, 20);
  assert.equal(result?.after.consumption, 'ok');
});

test('não há o que recalcular sem abastecimento seguinte', () => {
  const fills = [fill('a', '2026-01-01', 1000), fill('b', '2026-01-05', 1500)];
  assert.equal(recalcAfterCancel(fills, 'b', 10), null);
});

test('não há o que recalcular quando a média do seguinte não muda', () => {
  const fills = [
    fill('a', '2026-01-01', 1000),
    fill('b', '2026-01-05', 1000),
    fill('c', '2026-01-10', 1500, { previousKm: 1000, distanceKm: 500, kmPerLiter: 10, expectedKmPerLiter: 10, divergencePct: 0, consumption: 'ok' }),
  ];
  assert.equal(recalcAfterCancel(fills, 'b', 10), null);
});

test('considera apenas abastecimentos do mesmo veículo', () => {
  const fills = [
    fill('a', '2026-01-01', 1000),
    fill('b', '2026-01-05', 1500),
    fill('o', '2026-01-07', 1800, { vehicleId: 'v2' }),
  ];
  assert.equal(recalcAfterCancel(fills, 'b', 10), null);
});

test('descreve quem cancelou, quando (horário de Brasília) e o motivo', () => {
  const text = cancelNote({ canceledBy: 'Ana Souza', canceledAt: '2026-11-12T17:30:00.000Z', cancelReason: 'Litros digitados errado' });
  assert.equal(text, 'Cancelado por Ana Souza em 12/11/2026 às 14:30. Motivo: Litros digitados errado');
});

test('pula o seguinte que já estava cancelado e recalcula o próximo válido', () => {
  const fills = [
    fill('a', '2026-01-01', 1000),
    fill('b', '2026-01-05', 1500, { previousKm: 1000, distanceKm: 500, kmPerLiter: 10, consumption: 'ok' }),
    fill('c', '2026-01-08', 1800, { canceled: true }),
    fill('d', '2026-01-10', 2000, { previousKm: 1500, distanceKm: 500, kmPerLiter: 10, expectedKmPerLiter: 10, divergencePct: 0, consumption: 'ok' }),
  ];
  const result = recalcAfterCancel(fills, 'b', 10);
  assert.equal(result?.id, 'd');
  assert.equal(result?.after.previousKm, 1000);
  assert.equal(result?.after.distanceKm, 1000);
});
