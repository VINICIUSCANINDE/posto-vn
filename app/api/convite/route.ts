import { acceptInvite } from '../../../lib/invites';
import { json, sameOrigin } from '../../../lib/session';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Origem inválida.' }, 403);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const token = String(body.token ?? '');
  const password = String(body.password ?? '');
  if (password.length < 8 || password.length > 128) return json({ error: 'A senha precisa ter entre 8 e 128 caracteres.' }, 400);
  try {
    const result = await acceptInvite(token, password);
    return result.ok ? json({ ok: true, email: result.email }) : json({ error: result.error }, 410);
  } catch {
    return json({ error: 'Não foi possível criar a senha agora. Tente de novo em instantes.' }, 500);
  }
}
