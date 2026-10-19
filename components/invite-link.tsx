'use client';

import { useState } from 'react';
import { Check, Copy, MessageCircle } from 'lucide-react';

export function InviteLink({ invite }: { invite: { name: string; url: string; expiresAt: string } }) {
  const [copied, setCopied] = useState(false);
  const until = new Date(invite.expiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const message = `Olá, ${invite.name.split(' ')[0]}! Este é o seu acesso ao Controle de Transporte. Crie sua senha por este link (válido até ${until}, uso único): ${invite.url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(invite.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      (document.getElementById('invite-url') as HTMLInputElement | null)?.select();
    }
  }

  return (
    <div className="invite-link">
      <p>Envie este link para <strong>{invite.name}</strong> criar a própria senha.</p>
      <div className="invite-url">
        <label htmlFor="invite-url" className="sr-only">Link de convite</label>
        <input id="invite-url" readOnly value={invite.url} onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn btn-primary" onClick={() => void copy()}>
          {copied ? <><Check size={16} aria-hidden="true" /> Copiado</> : <><Copy size={16} aria-hidden="true" /> Copiar link</>}
        </button>
      </div>
      <p className="hint" role="status">Válido até {until} (3 horas) e só funciona uma vez: depois que a pessoa criar a senha, o link deixa de funcionar. Gerar um novo link cancela o anterior.</p>
      <div className="modal-actions">
        <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} aria-hidden="true" /> Enviar pelo WhatsApp</a>
        <button type="button" className="btn btn-primary" onClick={(e) => e.currentTarget.closest('dialog')?.close()}>Concluir</button>
      </div>
    </div>
  );
}
