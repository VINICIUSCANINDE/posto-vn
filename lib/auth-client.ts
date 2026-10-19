import { createAuthClient } from 'better-auth/react';
import { adminClient, inferAdditionalFields } from 'better-auth/client/plugins';
import type { auth } from './auth';
import { ac, roles } from './permissions';

export const authClient = createAuthClient({
  plugins: [adminClient({ ac, roles }), inferAdditionalFields<typeof auth>()],
});

export function authErrorMessage(error: { code?: string; status?: number; message?: string } | null | undefined) {
  switch (error?.code) {
    case 'INVALID_EMAIL_OR_PASSWORD': return 'E-mail ou senha incorretos.';
    case 'BANNED_USER': return 'Esta conta foi desativada. Fale com o administrador do posto.';
    case 'INVALID_TOKEN': return 'Este link expirou ou já foi usado. Peça um novo link.';
    case 'PASSWORD_TOO_SHORT': return 'A senha precisa ter pelo menos 8 caracteres.';
    case 'INVALID_PASSWORD': return 'Senha atual incorreta.';
  }
  if (error?.status === 429) return 'Muitas tentativas. Aguarde um minuto e tente de novo.';
  return error ? 'Não foi possível concluir. Verifique a conexão e tente de novo.' : '';
}
