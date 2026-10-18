import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync} from 'node:fs';
import path from 'node:path';
const origin='http://localhost:5173';const files=readdirSync('.wrangler/state',{recursive:true}).filter(p=>p.includes('d1')&&p.endsWith('.sqlite')&&!p.endsWith('metadata.sqlite'));assert.equal(files.length,1);
const db=new DatabaseSync(path.join('.wrangler/state',files[0]));const before=db.prepare('SELECT * FROM entries').all(),beforeCounters=db.prepare('SELECT * FROM workshop_counters').all();const ids=new Set(before.map(x=>x.id)),counterIds=new Set(beforeCounters.map(x=>x.id));let checks=0;
async function call(url,body,auth=true){const r=await fetch(origin+url,{method:body?'POST':'GET',headers:{...(auth?{Cookie:'__sites_local_auth=1'}:{}),...(body?{'Content-Type':'application/json',Origin:origin}:{})},...(body?{body:JSON.stringify(body)}:{})});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={error:text}}return{status:r.status,data}}
const state=async()=>{const r=await call('/api/data');assert.equal(r.status,200,JSON.stringify(r.data));return r.data.data};
const op=(action,values,auth=true)=>call('/api/workshop',{action,values},auth);
async function create(action,values){const r=await op(action,values);assert.equal(r.status,200,JSON.stringify(r.data));return r.data.id}
function check(t,msg){assert.ok(t,msg);checks++;console.log('OK '+msg)}
const date=new Date(Date.now()-10800000).toISOString().slice(0,10);
try{
 check((await op('part',{name:'X'},false)).status===401,'Oficina exige login');
 await state();const owner=db.prepare("SELECT * FROM entries WHERE id='owner'").get();const ownerData=JSON.parse(owner.data);
 const institution=await call('/api/data',{kind:'institution',values:{name:'OFICINA TESTE'}});assert.equal(institution.status,200);
 const inst=(await state()).find(x=>x.name==='OFICINA TESTE');
 await call('/api/data',{kind:'vehicle',values:{name:'CARRO OFICINA A',plate:'OFC1A11',institutionId:inst.id}});
 await call('/api/data',{kind:'vehicle',values:{name:'CARRO OFICINA B',plate:'OFC1B22',institutionId:inst.id}});
 const vehicle=(await state()).find(x=>x.name==='CARRO OFICINA A'),other=(await state()).find(x=>x.name==='CARRO OFICINA B');
 const partId=await create('part',{name:'Filtro de óleo TESTE',code:'TESTE-FO',unit:'un',minimum:2});
 check((await state()).find(x=>x.id===partId).balanceUnits===0,'Cadastro começa com saldo zero');
 check((await op('part',{name:'Duplicada',code:'teste-fo',unit:'un'})).status===400,'Código duplicado é rejeitado');
 const common={partId,vehicleId:vehicle.id,date};
 check((await op('in',{...common,quantity:-1})).status===400,'Entrada negativa é rejeitada');
 check((await op('in',{...common,quantity:0.0001})).status===400,'Precisão superior a três casas decimais é rejeitada');
 await create('in',{...common,quantity:10,supplier:'Fornecedor TESTE',document:'NF-TESTE',cost:25.5});
 check((await state()).find(x=>x.id===partId).balanceUnits===10000,'Entrada adiciona dez unidades ao estoque');
 const planId=await create('plan',{...common,quantity:6});
 let rows=await state();check(rows.find(x=>x.id===partId).balanceUnits===10000&&rows.find(x=>x.id===planId).remainingUnits===6000,'Planejamento vincula carro e peça sem baixar estoque');
 await create('out',{...common,planId,quantity:4,receiver:'Mecânico TESTE'});
 rows=await state();check(rows.find(x=>x.id===partId).balanceUnits===6000&&rows.find(x=>x.id===planId).remainingUnits===2000,'Entrega parcial baixa estoque e pendência corretamente');
 const receipt=rows.find(x=>x.kind==='workshop_out'&&x.planId===planId);
 check(receipt.plate===vehicle.plate&&receipt.receiver==='Mecânico TESTE'&&receipt.institution===inst.name,'Histórico identifica peça, carro, instituição e recebedor');
 check((await op('out',{...common,planId,vehicleId:other.id,quantity:1,receiver:'TESTE'})).status===400,'Planejamento não pode ser entregue ao veículo errado');
 check((await op('out',{...common,quantity:1})).status===400,'Saída exige nome de quem recebeu');
 const previous=rows.filter(x=>x.kind==='workshop_out').length;
 check((await op('out',{...common,quantity:100,receiver:'TESTE'})).status===409,'Saída acima do estoque é bloqueada');
 check((await state()).filter(x=>x.kind==='workshop_out').length===previous,'Saída recusada não gera movimento');
 check((await op('out',{...common,planId,quantity:3,receiver:'TESTE'})).status===409,'Entrega acima da pendência é bloqueada');
 await create('out',{...common,planId,quantity:2,receiver:'TESTE'});
 rows=await state();check(rows.find(x=>x.id===planId).remainingUnits===0&&rows.find(x=>x.id===partId).balanceUnits===4000,'Entrega final conclui planejamento');
 await create('out',{...common,vehicleId:other.id,quantity:1,receiver:'TESTE SAÍDA DIRETA'});
 check((await state()).some(x=>x.kind==='workshop_out'&&x.vehicleId===other.id&&!x.planId),'Saída direta também registra recebimento do veículo');
 const concurrent=await Promise.all([op('out',{...common,quantity:2,receiver:'TESTE CORRIDA 1'}),op('out',{...common,quantity:2,receiver:'TESTE CORRIDA 2'})]);
 check(concurrent.filter(x=>x.status===200).length===1&&concurrent.filter(x=>x.status===409).length===1,'Duas saídas simultâneas não podem ultrapassar o estoque');
 rows=await state();check(rows.find(x=>x.id===partId).balanceUnits===1000&&rows.filter(x=>String(x.receiver||'').startsWith('TESTE CORRIDA')).length===1,'Transação recusada reverte registro e saldo');
 const oil=await create('part',{name:'Óleo TESTE',code:'TESTE-OLEO',unit:'L',minimum:0});
 await create('in',{partId:oil,date,quantity:0.3});await create('out',{partId:oil,vehicleId:vehicle.id,date,quantity:0.1,receiver:'TESTE'});await create('out',{partId:oil,vehicleId:vehicle.id,date,quantity:0.2,receiver:'TESTE'});
 check((await state()).find(x=>x.id===oil).balanceUnits===0,'Quantidades fracionárias não deixam resíduo de arredondamento');
 db.prepare("UPDATE entries SET data=? WHERE id='owner'").run(JSON.stringify({...ownerData,role:'attendant'}));
 check((await op('in',{...common,quantity:1})).status===403,'Frentista não pode movimentar estoque');
 check(!(await state()).some(x=>x.kind.startsWith('workshop_')),'Frentista não recebe dados da Oficina');
 db.prepare("UPDATE entries SET data=? WHERE id='owner'").run(JSON.stringify(ownerData));
 console.log(`PASSOU: ${checks} verificações da Oficina.`);
}finally{
 for(const r of db.prepare('SELECT id FROM workshop_counters').all())if(!counterIds.has(r.id))db.prepare('DELETE FROM workshop_counters WHERE id=?').run(r.id);
 for(const r of beforeCounters)db.prepare('UPDATE workshop_counters SET units=? WHERE id=?').run(r.units,r.id);
 for(const r of db.prepare('SELECT id FROM entries').all())if(!ids.has(r.id))db.prepare('DELETE FROM entries WHERE id=?').run(r.id);
 for(const r of before)db.prepare('UPDATE entries SET data=?,actor=? WHERE id=?').run(r.data,r.actor,r.id);
 db.close();console.log('Dados de teste removidos.');
}
