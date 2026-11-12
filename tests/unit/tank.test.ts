import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arrivalLiters, tankBalance, tankBalances } from '../../lib/tank.ts';

test('saldo soma as chegadas do combustível e desconta os abastecimentos do tanque', () => {
  const rows = [
    { kind: 'fuel_in', fuelId: 'diesel', liters: 1000 },
    { kind: 'fuel_in', fuelId: 'diesel', liters: 500.5 },
    { kind: 'fill', fuelId: 'diesel', tank: true, liters: 120.25 },
  ];
  assert.equal(tankBalance(rows, 'diesel'), 1380.25);
});

test('abastecimentos antigos, sem tanque ou sem combustível vinculado, não contam', () => {
  const rows = [
    { kind: 'fuel_in', fuelId: 'diesel', liters: 100 },
    { kind: 'fill', fuel: 'Diesel', liters: 40 },
    { kind: 'fill', fuelId: 'diesel', liters: 30 },
  ];
  assert.equal(tankBalance(rows, 'diesel'), 100);
});

test('abastecimento cancelado devolve os litros ao tanque', () => {
  const rows = [
    { kind: 'fuel_in', fuelId: 'diesel', liters: 100 },
    { kind: 'fill', fuelId: 'diesel', tank: true, liters: 60, canceled: true },
    { kind: 'fill', fuelId: 'diesel', tank: true, liters: 10 },
  ];
  assert.equal(tankBalance(rows, 'diesel'), 90);
});

test('cada combustível tem o próprio tanque', () => {
  const rows = [
    { kind: 'fuel_in', fuelId: 'diesel', liters: 100 },
    { kind: 'fuel_in', fuelId: 'gasolina', liters: 50 },
    { kind: 'fill', fuelId: 'gasolina', tank: true, liters: 20 },
  ];
  assert.deepEqual(tankBalances(rows), { diesel: 100, gasolina: 30 });
});

test('saldo pode ficar negativo quando os abastecimentos passam das chegadas', () => {
  const rows = [
    { kind: 'fuel_in', fuelId: 'diesel', liters: 10 },
    { kind: 'fill', fuelId: 'diesel', tank: true, liters: 25.5 },
  ];
  assert.equal(tankBalance(rows, 'diesel'), -15.5);
});

test('combustível sem movimento tem saldo zero', () => {
  assert.equal(tankBalance([], 'diesel'), 0);
});

test('soma em milésimos não acumula erro de ponto flutuante', () => {
  const rows = [
    ...Array.from({ length: 10 }, () => ({ kind: 'fuel_in', fuelId: 'diesel', liters: 0.1 })),
    { kind: 'fill', fuelId: 'diesel', tank: true, liters: 0.3 },
  ];
  assert.equal(tankBalance(rows, 'diesel'), 0.7);
});

test('litros de chegada aceitam até três casas, acima de zero e até 100.000', () => {
  assert.equal(arrivalLiters('1500.125'), 1500.125);
  assert.equal(arrivalLiters(100000), 100000);
  assert.equal(arrivalLiters(0.001), 0.001);
});

test('litros de chegada inválidos são recusados', () => {
  for (const v of [0, -1, 100000.001, 1.0005, 'abc', '', null, undefined, Infinity]) assert.equal(arrivalLiters(v), null, String(v));
});
