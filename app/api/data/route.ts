import { getChatGPTUser } from '../../chatgpt-auth';
import { getDb } from '../../../db';
import { entries } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';
export const dynamic='force-dynamic';
const read=(r:any)=>({...JSON.parse(r.data),id:r.id,kind:r.kind,created:r.created});
const fail=(message:string,status=400)=>Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
async function context(){
 const user=await getChatGPTUser(); if(!user)return null;
 const db=getDb();
 // The Site remains owner-private until the owner configures staff access.
 await db.insert(entries).values({id:'owner',kind:'member',data:JSON.stringify({email:user.email.toLowerCase(),userId:user.userId,role:'admin',name:'Administrador'}),actor:user.userId,created:new Date().toISOString()}).onConflictDoNothing();
 const members=(await db.select().from(entries).where(eq(entries.kind,'member'))).map(read);
 const member=members.find((m:any)=>m.userId===user.userId||m.email===user.email.toLowerCase());
 return {db,user,member};
}
export async function GET(req:Request){
 try{const c=await context();if(!c)return fail('Entre na sua conta para continuar.',401);if(!c.member)return fail('Sua conta ainda não foi autorizada pelo administrador.',403);
 const all=(await c.db.select().from(entries)).map(read); const admin=c.member.role==='admin'&&new URL(req.url).searchParams.get('view')!=='attendant';
 const data=all.filter((r:any)=>admin||['institution','vehicle','fuel'].includes(r.kind)||r.kind==='fill'&&r.actorId===c.user.userId).map((r:any)=>!admin&&r.kind==='institution'?{id:r.id,kind:r.kind,name:r.name}:!admin&&r.kind==='vehicle'?{id:r.id,kind:r.kind,name:r.name,plate:r.plate,institutionId:r.institutionId}:r);
 return Response.json({data,user:{name:c.member.name||c.user.email,role:c.member.role,email:c.user.email}},{headers:{'Cache-Control':'no-store'}});
 }catch{return fail('Não foi possível carregar os dados. Tente novamente.',500)}
}
export async function POST(req:Request){
 try{if(req.headers.get('origin')!==new URL(req.url).origin)return fail('Origem inválida.',403);
 const c=await context();if(!c)return fail('Entre na sua conta.',401);if(!c.member)return fail('Acesso não autorizado.',403);
 const {kind,values,id}=await req.json() as {kind:string,values:Record<string,unknown>,id?:string};const admin=c.member.role==='admin';
 if(!['institution','vehicle','person','contract','fuel','fill','member'].includes(kind))return fail('Cadastro inválido.');
 if(!admin&&kind!=='fill')return fail('Somente administradores podem alterar cadastros.',403);
 const all=(await c.db.select().from(entries)).map(read);let v:any={};const str=(key:string)=>String(values[key]||'').trim().slice(0,200);
 if(kind==='fill'){
  if(id)return fail('Abastecimentos não podem ser sobrescritos.');
  const vehicle=all.find((r:any)=>r.id===str('vehicleId')&&r.kind==='vehicle');const fuel=all.find((r:any)=>r.id===str('fuelId')&&r.kind==='fuel');
  const institution=all.find((r:any)=>r.id===vehicle?.institutionId&&r.kind==='institution');
  const liters=Number(values.liters), km=Number(values.km);const date=str('date');
  if(!vehicle||!fuel||!institution)return fail('Selecione um veículo vinculado a uma instituição e um combustível cadastrado.');
  if(!Number.isFinite(liters)||liters<=0||liters>10000||!Number.isInteger(km)||km<0||km>9999999)return fail('Confira a quantidade de litros e o odômetro.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date||date>new Date(Date.now()-3*3600000).toISOString().slice(0,10))return fail('Informe uma data válida, até hoje.');
  const previous=all.filter((r:any)=>r.kind==='fill'&&r.vehicleId===vehicle.id).sort((a:any,b:any)=>b.date.localeCompare(a.date)||b.created.localeCompare(a.created))[0];
  if(previous&&date>=previous.date&&km<previous.km)return fail('O odômetro não pode ser menor que o último registro.');
  v={vehicleId:vehicle.id,institutionId:institution.id,plate:vehicle.plate,vehicle:vehicle.name,institution:institution.name,fuel:fuel.name,priceCents:fuel.priceCents,liters,km,date,driver:str('driver'),note:str('note'),totalCents:Math.round(liters*fuel.priceCents),actorId:c.user.userId,attendant:c.member.name||c.user.email};
 }else if(kind==='member'){
  v={name:str('name'),email:str('email').toLowerCase(),role:str('role')};
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)||!['admin','attendant'].includes(v.role))return fail('Informe um e-mail e perfil válidos.');
  if(id==='owner')return fail('O administrador principal não pode ser alterado.');
  if(all.some((r:any)=>r.kind==='member'&&r.email===v.email&&r.id!==id))return fail('Este e-mail já está cadastrado.');
 }else{
  v={name:str('name')};if(!v.name)return fail('Informe o nome.');
  if(kind==='institution'||kind==='person')v={...v,document:str('document'),contact:str('contact')};
  if(kind==='vehicle'){
   v={...v,plate:str('plate').toUpperCase().replace(/[^A-Z0-9]/g,''),institutionId:str('institutionId')};
   if(!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(v.plate)||!all.some((r:any)=>r.kind==='institution'&&r.id===v.institutionId))return fail('Informe uma placa válida e a instituição.');
   if(all.some((r:any)=>r.kind==='vehicle'&&r.plate===v.plate&&r.id!==id))return fail('Esta placa já está cadastrada.');
  }
  if(kind==='fuel'){v.priceCents=Math.round(Number(values.price)*100);if(!Number.isFinite(v.priceCents)||v.priceCents<=0||v.priceCents>10000)return fail('Informe um preço entre R$ 0,01 e R$ 100,00.');}
  if(kind==='contract'){
   v={...v,institutionId:str('institutionId'),personId:str('personId'),vehicleId:str('vehicleId'),start:str('start'),end:str('end'),note:str('note')};
   if(!all.some((r:any)=>r.kind==='institution'&&r.id===v.institutionId))return fail('Selecione uma instituição.');
   if(v.vehicleId&&!all.some((r:any)=>r.kind==='vehicle'&&r.id===v.vehicleId&&r.institutionId===v.institutionId))return fail('O veículo deve pertencer à instituição do contrato.');
   if(v.personId&&!all.some((r:any)=>r.kind==='person'&&r.id===v.personId))return fail('Pessoa inválida.');
   if(!/^\d{4}-\d{2}-\d{2}$/.test(v.start)||!/^\d{4}-\d{2}-\d{2}$/.test(v.end)||v.end<v.start)return fail('Confira as datas de vigência.');
  }
 }
 const now=new Date().toISOString();const record={id:id||crypto.randomUUID(),kind,data:JSON.stringify(v),created:now,actor:c.user.userId};
 if(id){const old=all.find((r:any)=>r.id===id&&r.kind===kind);if(!old)return fail('Registro não encontrado.',404);await c.db.batch([c.db.update(entries).set({data:record.data,actor:record.actor}).where(and(eq(entries.id,id),eq(entries.kind,kind))),c.db.insert(entries).values({id:crypto.randomUUID(),kind:'audit',data:JSON.stringify({recordId:id,before:old,after:v}),created:now,actor:c.user.userId})]);}
 else await c.db.insert(entries).values(record);
 return Response.json({ok:true,record:read(record)});
 }catch{return fail('Não foi possível salvar. Confira os dados e tente novamente.',500)}
}
