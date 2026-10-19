type Email = { to: string; subject: string; text: string; html: string };

export async function sendEmail(email: Email) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') throw new Error('RESEND_API_KEY não configurada.');
    console.info(`[email de desenvolvimento] Para: ${email.to}\nAssunto: ${email.subject}\n${email.text}`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'Controle de Transporte <onboarding@resend.dev>',
      to: [email.to],
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
  });
  if (!res.ok) throw new Error(`Falha ao enviar e-mail (${res.status}): ${await res.text()}`);
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function resetPasswordEmail(name: string, url: string): Omit<Email, 'to'> {
  return {
    subject: 'Redefinir sua senha · Controle de Transporte',
    text: `Olá, ${name}.\n\nRecebemos um pedido para redefinir sua senha do Controle de Transporte. Abra o link abaixo para criar uma nova senha (válido por 1 hora):\n\n${url}\n\nSe você não pediu, ignore este e-mail; sua senha continua a mesma.`,
    html: `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#14231c;max-width:480px">
<p>Olá, ${escape(name)}.</p>
<p>Recebemos um pedido para redefinir sua senha do <strong>Controle de Transporte</strong>. O link vale por 1 hora.</p>
<p><a href="${escape(url)}" style="display:inline-block;background:#157255;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Criar nova senha</a></p>
<p style="color:#56655c;font-size:13px">Se você não pediu, ignore este e-mail; sua senha continua a mesma.</p>
</div>`,
  };
}
