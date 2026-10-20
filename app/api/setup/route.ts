import { count, eq } from 'drizzle-orm';
import { db } from '../../../db';
import { user } from '../../../db/schema';
import { auth } from '../../../lib/auth';
import { json, sameOrigin } from '../../../lib/session';

async function needsSetup() {
  const [{ total }] = await db.select({ total: count() }).from(user);
  return total === 0;
}

export async function GET() {
  return json({ needsSetup: await needsSetup() });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Origem inválida.' }, 403);
  if (!(await needsSetup())) return json({ error: 'O acesso master já foi configurado.' }, 403);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? '').trim().slice(0, 120);
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  if (!name) return json({ error: 'Informe seu nome.' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Informe um e-mail válido.' }, 400);
  if (password.length < 8) return json({ error: 'A senha precisa ter pelo menos 8 caracteres.' }, 400);
  // Num banco vazio, a primeira conta é o acesso master da plataforma, sem empresa.
  const created = await auth.api.createUser({ body: { name, email, password, role: 'master' } });
  await db.update(user).set({ organizationId: null }).where(eq(user.id, created.user.id));
  return json({ ok: true });
}
