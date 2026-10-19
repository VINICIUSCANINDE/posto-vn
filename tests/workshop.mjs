// Verificações da Oficina contra o servidor em execução (pnpm dev).
// Uso: pnpm test:oficina  (lê .env.local; BASE_URL, TEST_ADMIN_* e TEST_COLAB_* são opcionais)
import assert from 'node:assert/strict';
import pg from 'pg';

const origin = process.env.BASE_URL || 'http://127.0.0.1:3000';
const admin = { email: process.env.TEST_ADMIN_EMAIL || 'admin@controle.local', password: process.env.TEST_ADMIN_PASSWORD || 'Admin@2026' };
const colab = { email: process.env.TEST_COLAB_EMAIL || 'colaborador@controle.local', password: process.env.TEST_COLAB_PASSWORD || 'Colab@2026' };

const db = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL });
await db.connect();
const before = (await db.query('select id, data, actor from entries')).rows;
const beforeCounters = (await db.query('select id, units from workshop_counters')).rows;
const ids = new Set(before.map((x) => x.id));
const counterIds = new Set(beforeCounters.map((x) => x.id));

let checks = 0;
function check(ok, msg) { assert.ok(ok, msg); checks++; console.log('OK ' + msg); }

async function signIn({ email, password }) {
  const r = await fetch(origin + '/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(r.status, 200, `login de ${email} falhou (${r.status})`);
  return r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
}

async function call(url, body, cookie) {
  const r = await fetch(origin + url, {
    method: body ? 'POST' : 'GET',
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json', Origin: origin } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { error: text }; }
  return { status: r.status, data };
}

const date = new Date(Date.now() - 10800000).toISOString().slice(0, 10);

try {
  check((await call('/api/workshop', { action: 'part', values: { name: 'X' } })).status === 401, 'Oficina exige login');

  let cookie = await signIn(admin);
  const state = async () => {
    const r = await call('/api/data', undefined, cookie);
    assert.equal(r.status, 200, JSON.stringify(r.data));
    return r.data.data;
  };
  const op = (action, values) => call('/api/workshop', { action, values }, cookie);
  const save = async (kind, values) => {
    const r = await call('/api/data', { kind, values }, cookie);
    assert.equal(r.status, 200, JSON.stringify(r.data));
    return r.data.record.id;
  };
  const create = async (action, values) => {
    const r = await op(action, values);
    assert.equal(r.status, 200, JSON.stringify(r.data));
    return r.data.id;
  };

  const instId = await save('institution', { name: 'OFICINA TESTE' });
  const vehicleId = await save('vehicle', { name: 'CARRO OFICINA A', plate: 'OFC1A11', institutionId: instId });
  const otherId = await save('vehicle', { name: 'CARRO OFICINA B', plate: 'OFC1B22', institutionId: instId });

  const partId = await create('part', { name: 'Filtro de óleo TESTE', code: 'TESTE-FO', unit: 'un', minimum: 2 });
  check((await state()).find((x) => x.id === partId).balanceUnits === 0, 'Cadastro começa com saldo zero');
  check((await op('part', { name: 'Duplicada', code: 'teste-fo', unit: 'un' })).status === 400, 'Código duplicado é rejeitado');

  const common = { partId, vehicleId, date };
  check((await op('in', { ...common, quantity: -1 })).status === 400, 'Entrada negativa é rejeitada');
  check((await op('in', { ...common, quantity: 0.0001 })).status === 400, 'Precisão superior a três casas decimais é rejeitada');
  check((await op('in', { ...common, date: '2999-01-01', quantity: 1 })).status === 400, 'Entrada com data futura é rejeitada');
  await create('in', { ...common, quantity: 10, supplier: 'Fornecedor TESTE', document: 'NF-TESTE', cost: 25.5 });
  check((await state()).find((x) => x.id === partId).balanceUnits === 10000, 'Entrada adiciona dez unidades ao estoque');

  const planId = await create('plan', { ...common, quantity: 6 });
  let rows = await state();
  check(rows.find((x) => x.id === partId).balanceUnits === 10000 && rows.find((x) => x.id === planId).remainingUnits === 6000, 'Planejamento vincula carro e peça sem baixar estoque');

  await create('out', { ...common, planId, quantity: 4, receiver: 'Mecânico TESTE' });
  rows = await state();
  check(rows.find((x) => x.id === partId).balanceUnits === 6000 && rows.find((x) => x.id === planId).remainingUnits === 2000, 'Entrega parcial baixa estoque e pendência corretamente');
  const receipt = rows.find((x) => x.kind === 'workshop_out' && x.planId === planId);
  check(receipt.plate === 'OFC1A11' && receipt.receiver === 'Mecânico TESTE' && receipt.institution === 'OFICINA TESTE', 'Histórico identifica peça, carro, instituição e recebedor');

  check((await op('out', { ...common, planId, vehicleId: otherId, quantity: 1, receiver: 'TESTE' })).status === 400, 'Planejamento não pode ser entregue ao veículo errado');
  check((await op('out', { ...common, quantity: 1 })).status === 400, 'Saída exige nome de quem recebeu');
  const previous = rows.filter((x) => x.kind === 'workshop_out').length;
  check((await op('out', { ...common, quantity: 100, receiver: 'TESTE' })).status === 409, 'Saída acima do estoque é bloqueada');
  check((await state()).filter((x) => x.kind === 'workshop_out').length === previous, 'Saída recusada não gera movimento');
  check((await op('out', { ...common, planId, quantity: 3, receiver: 'TESTE' })).status === 409, 'Entrega acima da pendência é bloqueada');

  await create('out', { ...common, planId, quantity: 2, receiver: 'TESTE' });
  rows = await state();
  check(rows.find((x) => x.id === planId).remainingUnits === 0 && rows.find((x) => x.id === partId).balanceUnits === 4000, 'Entrega final conclui planejamento');

  await create('out', { ...common, vehicleId: otherId, quantity: 1, receiver: 'TESTE SAÍDA DIRETA' });
  check((await state()).some((x) => x.kind === 'workshop_out' && x.vehicleId === otherId && !x.planId), 'Saída direta também registra recebimento do veículo');

  const concurrent = await Promise.all([
    op('out', { ...common, quantity: 2, receiver: 'TESTE CORRIDA 1' }),
    op('out', { ...common, quantity: 2, receiver: 'TESTE CORRIDA 2' }),
  ]);
  check(concurrent.filter((x) => x.status === 200).length === 1 && concurrent.filter((x) => x.status === 409).length === 1, 'Duas saídas simultâneas não podem ultrapassar o estoque');
  rows = await state();
  check(rows.find((x) => x.id === partId).balanceUnits === 1000 && rows.filter((x) => String(x.receiver || '').startsWith('TESTE CORRIDA')).length === 1, 'Transação recusada reverte registro e saldo');

  const oil = await create('part', { name: 'Óleo TESTE', code: 'TESTE-OLEO', unit: 'L', minimum: 0 });
  await create('in', { partId: oil, date, quantity: 0.3 });
  await create('out', { partId: oil, vehicleId, date, quantity: 0.1, receiver: 'TESTE' });
  await create('out', { partId: oil, vehicleId, date, quantity: 0.2, receiver: 'TESTE' });
  check((await state()).find((x) => x.id === oil).balanceUnits === 0, 'Quantidades fracionárias não deixam resíduo de arredondamento');

  cookie = await signIn(colab);
  check((await op('in', { ...common, quantity: 1 })).status === 200, 'Colaborador também pode registrar entrada de peças');
  const view = await call('/api/data', undefined, cookie);
  check(view.data.data.some((x) => x.kind === 'workshop_part' && typeof x.balanceUnits === 'number'), 'Área do colaborador recebe saldo atualizado da Oficina');
  check(!view.data.data.some((x) => ['member', 'audit', 'contract', 'person'].includes(x.kind)), 'Acesso à Oficina não libera cadastros administrativos');
  check((await create('part', { name: 'Peça do colaborador TESTE', code: 'COLAB-TESTE', unit: 'un' })).length > 0, 'Colaborador pode cadastrar peças');
  check((await op('out', { ...common, quantity: 1, receiver: 'RECEBEDOR COLABORADOR' })).status === 200, 'Colaborador pode registrar entrega de peças ao veículo');
  check((await call('/api/data', { kind: 'fuel', values: { name: 'Não permitido', price: 1 } }, cookie)).status === 403, 'Colaborador continua sem permissão para alterar preços de combustível');
  check((await call('/api/data', { kind: 'member', values: { name: 'Não permitido', email: 'teste@example.com', role: 'admin' } }, cookie)).status === 403, 'Colaborador não pode conceder acesso administrativo');

  const foreign = await fetch(origin + '/api/workshop', {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', Origin: 'https://exemplo-malicioso.com' },
    body: JSON.stringify({ action: 'in', values: { ...common, quantity: 1 } }),
  });
  check(foreign.status === 403, 'Requisição de outra origem é recusada');

  console.log(`PASSOU: ${checks} verificações da Oficina.`);
} finally {
  const after = (await db.query('select id from workshop_counters')).rows;
  for (const r of after) if (!counterIds.has(r.id)) await db.query('delete from workshop_counters where id = $1', [r.id]);
  for (const r of beforeCounters) await db.query('update workshop_counters set units = $1 where id = $2', [r.units, r.id]);
  const now = (await db.query('select id from entries')).rows;
  for (const r of now) if (!ids.has(r.id)) await db.query('delete from entries where id = $1', [r.id]);
  for (const r of before) await db.query('update entries set data = $1, actor = $2 where id = $3', [r.data, r.actor, r.id]);
  await db.end();
  console.log('Dados de teste removidos.');
}
