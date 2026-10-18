import {getChatGPTUser} from '../../chatgpt-auth';
import {getDb} from '../../../db';
import {entries,workshopCounters} from '../../../db/schema';
import {eq,sql} from 'drizzle-orm';
export const dynamic='force-dynamic';
const fail=(error:string,status=400)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
export async function POST(req:Request){
 try{
  if(req.headers.get('origin')!==new URL(req.url).origin)return fail('Origem inválida.',403);
  const user=await getChatGPTUser();if(!user)return fail('Entre na sua conta.',401);
  const db=getDb();const members=await db.select().from(entries).where(eq(entries.kind,'member'));
  const member=members.map(x=>JSON.parse(x.data)).find(x=>x.userId===user.userId||x.email===user.email.toLowerCase());
  if(member?.role!=='admin')return fail('A Oficina é exclusiva da administração.',403);
  const body=await req.json() as {action:string,values:Record<string,unknown>};const {action,values}=body;
  if(!['part','in','plan','out'].includes(action)||!values||typeof values!=='object')return fail('Operação inválida.');
  const text=(key:string)=>String(values[key]??'').trim().slice(0,200);
  const quantity=(key:string)=>{const n=Number(values[key]);return Number.isFinite(n)&&n>0&&n<=1000000&&Math.abs(n*1000-Math.round(n*1000))<0.000001?Math.round(n*1000):0};
  const validDate=(date:string,future=false)=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date+'T12:00:00Z'))&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date&&(future||date<=new Date(Date.now()-10800000).toISOString().slice(0,10));
  const all=(await db.select().from(entries)).map(x=>({...JSON.parse(x.data),id:x.id,kind:x.kind}));
  const id=crypto.randomUUID(),created=new Date().toISOString();let v:Record<string,any>;
  const record=(data:Record<string,any>)=>({id,kind:'workshop_'+action,data:JSON.stringify(data),created,actor:user.userId});
  if(action==='part'){
   const name=text('name'),code=text('code').toUpperCase(),unit=text('unit');const minimum=Number(values.minimum||0);
   if(!name||!code||!['un','jogo','kit','L','kg','m'].includes(unit))return fail('Informe nome, código e unidade da peça.');
   if(!Number.isFinite(minimum)||minimum<0||minimum>1000000||Math.abs(minimum*1000-Math.round(minimum*1000))>0.000001)return fail('Estoque mínimo inválido.');
   if(all.some(x=>x.kind==='workshop_part'&&x.code===code))return fail('Já existe uma peça com esse código.');
   v={name,code,unit,minimumUnits:Math.round(minimum*1000),note:text('note')};
   await db.batch([db.insert(entries).values(record(v)),db.insert(workshopCounters).values({id:'part:'+id,units:0})]);
  }else{
   const part=all.find(x=>x.kind==='workshop_part'&&x.id===text('partId'));const units=quantity('quantity');
   if(!part||!units)return fail('Selecione uma peça e uma quantidade positiva com até três casas decimais.');
   const date=text('date');if(!validDate(date,action==='plan'))return fail('Informe uma data válida. Entradas e entregas não podem ter data futura.');
   v={partId:part.id,part:part.name,code:part.code,unit:part.unit,quantityUnits:units,date,note:text('note'),responsible:member.name||user.email};
   if(action==='in'){
    const cost=Number(values.cost||0);if(!Number.isFinite(cost)||cost<0||cost>10000000)return fail('Custo unitário inválido.');
    v={...v,supplier:text('supplier'),document:text('document'),unitCostCents:Math.round(cost*100)};
    await db.batch([db.insert(entries).values(record(v)),db.update(workshopCounters).set({units:sql`${workshopCounters.units} + ${units}`}).where(eq(workshopCounters.id,'part:'+part.id))]);
   }else{
    const vehicle=all.find(x=>x.kind==='vehicle'&&x.id===text('vehicleId'));
    if(!vehicle)return fail('Selecione o veículo que utilizará a peça.');
    const institution=all.find(x=>x.kind==='institution'&&x.id===vehicle.institutionId);
    v={...v,vehicleId:vehicle.id,vehicle:vehicle.name,plate:vehicle.plate,institution:institution?.name||''};
    if(action==='plan'){
     // A planned use is demand, not a reservation or physical stock movement.
     await db.batch([db.insert(entries).values(record(v)),db.insert(workshopCounters).values({id:'plan:'+id,units})]);
    }else{
     const receiver=text('receiver');if(!receiver)return fail('Informe quem recebeu a peça.');
     const planId=text('planId');let plan;
     if(planId){plan=all.find(x=>x.id===planId&&x.kind==='workshop_plan');if(!plan||plan.partId!==part.id||plan.vehicleId!==vehicle.id)return fail('O planejamento precisa corresponder à peça e ao veículo.');}
     const counters=await db.select().from(workshopCounters);
     if((counters.find(x=>x.id==='part:'+part.id)?.units??0)<units)return fail('Estoque insuficiente para essa saída.',409);
     if(plan&&(counters.find(x=>x.id==='plan:'+planId)?.units??0)<units)return fail('A quantidade excede o saldo pendente do planejamento.',409);
     v={...v,receiver,planId};
     const movement=db.insert(entries).values(record(v));
     const stock=db.update(workshopCounters).set({units:sql`${workshopCounters.units} - ${units}`}).where(eq(workshopCounters.id,'part:'+part.id));
     if(plan)await db.batch([movement,stock,db.update(workshopCounters).set({units:sql`${workshopCounters.units} - ${units}`}).where(eq(workshopCounters.id,'plan:'+planId))]);
     else await db.batch([movement,stock]);
    }
   }
  }
  return Response.json({ok:true,id},{headers:{'Cache-Control':'no-store'}});
 }catch(e){let cause:any=e;let message='';for(let i=0;cause&&i<5;i++,cause=cause.cause)message+=' '+String(cause);if(message.includes('CHECK constraint')||message.includes('workshop_nonnegative'))return fail('O saldo mudou durante o envio. Atualize e confira o estoque e o planejamento.',409);return fail('Não foi possível registrar a operação. Confira os dados e tente novamente.',500)}
}
