// Verificações de abastecimentos, login e permissões contra o servidor em execução (pnpm dev).
// Uso: pnpm test:integracao  (lê .env.local; BASE_URL, TEST_ADMIN_* e TEST_COLAB_* são opcionais)
import assert from 'node:assert/strict';
import pg from 'pg';

const origin = process.env.BASE_URL || 'http://127.0.0.1:3000';
const admin = { email: process.env.TEST_ADMIN_EMAIL || 'admin@controle.local', password: process.env.TEST_ADMIN_PASSWORD || 'Admin@2026' };
const colab = { email: process.env.TEST_COLAB_EMAIL || 'colaborador@controle.local', password: process.env.TEST_COLAB_PASSWORD || 'Colab@2026' };

const db = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL });
await db.connect();
const before = (await db.query('select id, data, actor from entries')).rows;
const ids = new Set(before.map((x) => x.id));

let checks = 0;
function check(ok, msg) { assert.ok(ok, msg); checks++; console.log('OK ' + msg); }

const auth = (path, body) => fetch(origin + '/api/auth/' + path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: origin },
  body: JSON.stringify(body),
});
async function signIn(account) {
  const r = await auth('sign-in/email', account);
  assert.equal(r.status, 200, `login de ${account.email} falhou (${r.status})`);
  return r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
}

let cookie = '';
async function request(body, customOrigin = origin) {
  const r = await fetch(origin + '/api/data', {
    method: body ? 'POST' : 'GET',
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json', Origin: customOrigin } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { error: text }; }
  return { status: r.status, data };
}
async function put(kind, values, id) {
  const r = await request({ kind, values, id });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return (await request()).data.data.find((x) => x.id === r.data.record.id);
}

const date = new Date(Date.now() - 10800000).toISOString().slice(0, 10);

try {
  check((await request()).status === 401, 'Visitante sem login é bloqueado');
  check((await auth('sign-in/email', { ...admin, password: 'senha-errada' })).status === 401, 'Senha errada não entra');
  check((await auth('sign-up/email', { name: 'Intruso', email: 'intruso@example.com', password: 'Intruso#2026' })).status !== 200, 'Cadastro público de contas está desligado');

  cookie = await signIn(admin);
  let r = await request();
  check(r.status === 200 && r.data.user.role === 'admin', 'Administrador é reconhecido no servidor');

  const inst = await put('institution', { name: 'TESTE Instituição', document: '', contact: '' });
  const vehicle = await put('vehicle', { name: 'TESTE Veículo', plate: 'TST1A23', institutionId: inst.id });
  const fuel = await put('fuel', { name: 'TESTE Gasolina', price: 6.25 });
  check((await request({ kind: 'vehicle', values: { name: 'Duplicado', plate: 'TST1A23', institutionId: inst.id } })).status === 400, 'Placa duplicada é rejeitada');

  const fill = await put('fill', { vehicleId: vehicle.id, fuelId: fuel.id, date, liters: 40, km: 1000, driver: 'TESTE Motorista' });
  check(fill.totalCents === 25000 && fill.institution === inst.name, '40 litros a R$ 6,25 geram R$ 250,00 na instituição correta');
  await put('fuel', { name: fuel.name, price: 7 }, fuel.id);
  r = await request();
  check(r.data.data.find((x) => x.id === fill.id).totalCents === 25000, 'Alterar preço preserva o abastecimento anterior');
  check((await request({ kind: 'fill', id: fill.id, values: {} })).status === 400, 'Abastecimento anterior não pode ser sobrescrito');
  check((await request({ kind: 'fill', values: { vehicleId: vehicle.id, fuelId: fuel.id, date, liters: -10, km: 1000 } })).status === 400, 'Litros negativos são rejeitados');
  check((await request({ kind: 'fill', values: { vehicleId: vehicle.id, fuelId: fuel.id, date, liters: 10, km: 900 } })).status === 400, 'Odômetro regressivo é rejeitado');
  check((await request({ kind: 'fill', values: { vehicleId: vehicle.id, fuelId: fuel.id, date: '2000-01-01', liters: 10, km: 5000 } })).status === 400, 'Lançamento retroativo com odômetro maior que um posterior é rejeitado');
  check((await request({ kind: 'institution', values: { name: 'Origem inválida' } }, 'https://outro.example')).status === 403, 'Requisição de outra origem é bloqueada');

  cookie = await signIn(colab);
  r = await request();
  check(r.status === 200 && r.data.user.role === 'attendant', 'Perfil de colaborador reconhecido no servidor');
  check(!r.data.data.some((x) => ['audit', 'member', 'contract', 'person'].includes(x.kind)), 'Colaborador não recebe cadastros administrativos, equipe ou auditoria');
  check((await request({ kind: 'fuel', id: fuel.id, values: { name: fuel.name, price: 1 } })).status === 403, 'Colaborador não altera preços');
  check((await request({ kind: 'institution', values: { name: 'Não permitido' } })).status === 403, 'Colaborador não cadastra instituição');
  check((await request({ kind: 'fill', values: { vehicleId: vehicle.id, fuelId: fuel.id, date, liters: 10, km: 1100, driver: 'TESTE Colaborador' } })).status === 200, 'Colaborador consegue lançar abastecimento');
  const ownFill = (await request()).data.data.find((x) => x.driver === 'TESTE Colaborador');
  check(!!ownFill && ownFill.totalCents === 7000, 'Lançamento do colaborador usa o preço vigente');
  check(!(await request()).data.data.some((x) => x.id === fill.id), 'Colaborador não recebe lançamentos de outra conta');

  cookie = await signIn(admin);
  const management = (await request()).data;
  check(management.data.some((x) => x.driver === 'TESTE Colaborador' && x.totalCents === 7000), 'Gestão recebe o abastecimento salvo pelo colaborador no mesmo banco');
  const staffView = (await fetch(origin + '/api/data?view=attendant', { headers: { Cookie: cookie } }).then((x) => x.json())).data;
  check(!staffView.some((x) => ['member', 'audit', 'contract', 'person'].includes(x.kind)), 'Área do colaborador limita dados mesmo quando aberta pelo administrador');
  check(!staffView.some((x) => x.id === ownFill.id), 'Área do colaborador filtra o histórico por conta no servidor');

  console.log(`PASSOU: ${checks} verificações de integração.`);
} finally {
  const now = (await db.query('select id from entries')).rows;
  for (const x of now) if (!ids.has(x.id)) await db.query('delete from entries where id = $1', [x.id]);
  for (const x of before) await db.query('update entries set data = $1, actor = $2 where id = $3', [x.data, x.actor, x.id]);
  await db.end();
  console.log('Dados de teste removidos.');
}
