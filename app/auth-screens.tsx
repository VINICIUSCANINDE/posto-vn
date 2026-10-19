'use client';

import Link from 'next/link';
import { useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, Check, ChevronLeft, Fuel, MailCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import { Input, PasswordInput } from '../components/form';
import { Card, Headline } from '../components/brand';
import { authClient, authErrorMessage } from '../lib/auth-client';
import { collectErrors, request, focusField } from './request';

export type Perfil = 'administrador' | 'colaborador';

const COPY: Record<Perfil, { title: string; lead: string; can: string[] }> = {
  administrador: {
    title: 'Entrar como administrador',
    lead: 'Acesse a gestão do posto com a sua conta.',
    can: ['Acompanhar os abastecimentos em tempo real', 'Cadastrar instituições, veículos, preços e equipe', 'Fechar o mês e exportar a cobrança de cada instituição'],
  },
  colaborador: {
    title: 'Entrar como colaborador',
    lead: 'Lance os abastecimentos da pista direto para a gestão.',
    can: ['Registrar placa, combustível, litros e odômetro', 'Acompanhar os seus lançamentos do dia e do mês', 'Controlar peças e entregas da Oficina'],
  },
};

function AuthShell({ children, back }: { children: ReactNode; back?: { href: string; label: string } }) {
  return (
    <main className="auth" id="conteudo">
      <div className="auth-inner">
        <p className="auth-brand"><span className="brand-mark" aria-hidden="true"><Fuel size={18} /></span>Controle de Transporte</p>
        <Card className="auth-card">
          {back && <Link className="back-link" href={back.href}><ChevronLeft size={16} aria-hidden="true" /> {back.label}</Link>}
          {children}
        </Card>
      </div>
    </main>
  );
}

function useForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  function validate(form: HTMLFormElement, extra: Record<string, string> = {}) {
    const found = { ...collectErrors(form), ...extra };
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) focusField(form, first);
    return !first;
  }
  return { errors, setErrors, error, setError, busy, setBusy, validate };
}

const Submit = ({ busy, children }: { busy: boolean; children: ReactNode }) => (
  <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
    {busy ? <><RefreshCw className="spin" size={18} aria-hidden="true" /> Aguarde…</> : <>{children} <ArrowRight size={18} aria-hidden="true" /></>}
  </button>
);

const passwordMismatch = (form: HTMLFormElement): Record<string, string> => {
  const pass = (form.elements.namedItem('password') as HTMLInputElement).value;
  const confirm = (form.elements.namedItem('confirm') as HTMLInputElement).value;
  return confirm && pass !== confirm ? { confirm: 'As senhas não conferem.' } : {};
};

export function RoleChooser() {
  return (
    <AuthShell>
      <Headline text="Como você acessa o sistema?" />
      <p className="auth-lead">Escolha o seu perfil para entrar.</p>
      <div className="role-options">
        <Link className="role-option" href="/entrar/administrador">
          <ShieldCheck size={22} aria-hidden="true" />
          <span><strong>Sou administrador</strong><small>Gestão completa do posto</small></span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <Link className="role-option" href="/entrar/colaborador">
          <Fuel size={22} aria-hidden="true" />
          <span><strong>Sou colaborador</strong><small>Lançar abastecimentos na pista</small></span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </AuthShell>
  );
}

export function LoginForm({ perfil, needsSetup }: { perfil: Perfil; needsSetup: boolean }) {
  const f = useForm();
  const c = COPY[perfil];

  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!f.validate(form)) return;
    const data = new FormData(form);
    f.setBusy(true);
    f.setError('');
    const res = await authClient.signIn.email({ email: String(data.get('email')).trim(), password: String(data.get('password')) });
    if (res.error) { f.setError(authErrorMessage(res.error)); f.setBusy(false); return; }
    window.location.assign(perfil === 'colaborador' ? '/frentista' : '/');
  }

  async function setup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!f.validate(form, passwordMismatch(form))) return;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    f.setBusy(true);
    f.setError('');
    try {
      await request('/api/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }, 15000);
      const res = await authClient.signIn.email({ email: data.email.trim(), password: data.password });
      if (res.error) throw new Error(authErrorMessage(res.error));
      window.location.assign('/');
    } catch (err) {
      f.setError((err as Error).message);
      f.setBusy(false);
    }
  }

  if (needsSetup && perfil === 'administrador') {
    return (
      <AuthShell back={{ href: '/entrar', label: 'Trocar perfil' }}>
        <Headline text="Configure o administrador principal" />
        <p className="auth-lead">Este é o primeiro acesso ao sistema. Crie a conta de quem administra o posto; as demais contas são criadas depois, em Equipe e acessos.</p>
        <form className="auth-form" onSubmit={setup} noValidate>
          <Input name="name" label="Seu nome" autoComplete="name" error={f.errors.name} />
          <Input name="email" label="E-mail" type="email" autoComplete="email" error={f.errors.email} />
          <PasswordInput name="password" label="Senha" autoComplete="new-password" error={f.errors.password} minLength={8} hint="Pelo menos 8 caracteres." />
          <PasswordInput name="confirm" label="Confirme a senha" autoComplete="new-password" error={f.errors.confirm} minLength={8} />
          {f.error && <p className="notice notice-error" role="alert">{f.error}</p>}
          <Submit busy={f.busy}>Criar conta e entrar</Submit>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell back={{ href: '/entrar', label: 'Trocar perfil' }}>
      <Headline text={c.title} />
      <p className="auth-lead">{c.lead}</p>
      <ul className="login-can">{c.can.map((item) => <li key={item}><Check size={16} aria-hidden="true" />{item}</li>)}</ul>
      <form className="auth-form" onSubmit={login} noValidate>
        <Input name="email" label="E-mail" type="email" autoComplete="username email" error={f.errors.email} />
        <PasswordInput name="password" label="Senha" autoComplete="current-password" error={f.errors.password} />
        <Link className="link-btn forgot" href="/esqueci-senha">Esqueci minha senha</Link>
        {f.error && <p className="notice notice-error" role="alert">{f.error}</p>}
        <Submit busy={f.busy}>Entrar</Submit>
      </form>
      <p className="login-note">{perfil === 'administrador' ? 'Somente contas de administrador acessam a gestão.' : 'Sua conta é criada pelo administrador do posto, que envia um link de convite para você criar a senha.'}</p>
    </AuthShell>
  );
}

export function ForgotForm() {
  const f = useForm();
  const [sent, setSent] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!f.validate(form)) return;
    const email = String(new FormData(form).get('email')).trim();
    f.setBusy(true);
    f.setError('');
    const res = await authClient.requestPasswordReset({ email, redirectTo: '/redefinir-senha' });
    f.setBusy(false);
    if (res.error && res.error.status === 429) { f.setError(authErrorMessage(res.error)); return; }
    setSent(email);
  }

  return (
    <AuthShell back={{ href: '/entrar', label: 'Voltar ao login' }}>
      {sent ? (
        <div className="auth-done" role="status">
          <MailCheck size={36} aria-hidden="true" />
          <h1>Confira seu e-mail</h1>
          <p className="auth-lead">Se houver uma conta com <strong>{sent}</strong>, enviamos um link para criar uma nova senha. O link vale por 1 hora.</p>
          <p className="login-note">Não chegou? Confira a caixa de spam ou peça ao administrador do posto para redefinir sua senha.</p>
        </div>
      ) : (
        <>
          <Headline text="Esqueci minha senha" />
          <p className="auth-lead">Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.</p>
          <form className="auth-form" onSubmit={submit} noValidate>
            <Input name="email" label="E-mail" type="email" autoComplete="email" error={f.errors.email} />
            {f.error && <p className="notice notice-error" role="alert">{f.error}</p>}
            <Submit busy={f.busy}>Enviar link</Submit>
          </form>
        </>
      )}
    </AuthShell>
  );
}

export function ResetForm({ token, invalid }: { token: string; invalid: boolean }) {
  const f = useForm();
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!f.validate(form, passwordMismatch(form))) return;
    f.setBusy(true);
    f.setError('');
    const res = await authClient.resetPassword({ newPassword: String(new FormData(form).get('password')), token });
    f.setBusy(false);
    if (res.error) { f.setError(authErrorMessage(res.error)); return; }
    setDone(true);
  }

  if (invalid || !token) {
    return (
      <AuthShell back={{ href: '/entrar', label: 'Voltar ao login' }}>
        <h1>Link inválido ou expirado</h1>
        <p className="auth-lead">Os links de redefinição valem por 1 hora e só podem ser usados uma vez.</p>
        <Link className="btn btn-primary btn-lg btn-block" href="/esqueci-senha">Pedir um novo link</Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell back={{ href: '/entrar', label: 'Voltar ao login' }}>
      {done ? (
        <div className="auth-done" role="status">
          <Check size={36} aria-hidden="true" />
          <h1>Senha alterada</h1>
          <p className="auth-lead">Por segurança, encerramos as sessões abertas. Entre com a nova senha.</p>
          <Link className="btn btn-primary btn-lg btn-block" href="/entrar">Ir para o login</Link>
        </div>
      ) : (
        <>
          <Headline text="Crie uma nova senha" />
          <form className="auth-form" onSubmit={submit} noValidate>
            <PasswordInput name="password" label="Nova senha" autoComplete="new-password" error={f.errors.password} minLength={8} hint="Pelo menos 8 caracteres." />
            <PasswordInput name="confirm" label="Confirme a nova senha" autoComplete="new-password" error={f.errors.confirm} minLength={8} />
            {f.error && <p className="notice notice-error" role="alert">{f.error}</p>}
            <Submit busy={f.busy}>Salvar nova senha</Submit>
          </form>
        </>
      )}
    </AuthShell>
  );
}

export function InviteForm({ token, person }: { token: string; person: { name: string; email: string; expiresAt: string } | null }) {
  const f = useForm();
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!f.validate(form, passwordMismatch(form))) return;
    f.setBusy(true);
    f.setError('');
    try {
      await request('/api/convite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: String(new FormData(form).get('password')) }),
      }, 15000);
      setDone(true);
    } catch (err) {
      f.setError((err as Error).message);
    } finally {
      f.setBusy(false);
    }
  }

  if (!person) {
    return (
      <AuthShell>
        <h1>Convite inválido ou expirado</h1>
        <p className="auth-lead">Os convites valem por 3 horas e só podem ser usados uma vez. Peça ao administrador do posto um novo link de acesso.</p>
        <Link className="btn btn-lg btn-block" href="/entrar">Ir para o login</Link>
      </AuthShell>
    );
  }
  if (done) {
    return (
      <AuthShell>
        <div className="auth-done" role="status">
          <Check size={36} aria-hidden="true" />
          <h1>Senha criada</h1>
          <p className="auth-lead">Pronto, {person.name.split(' ')[0]}. Agora entre com <strong>{person.email}</strong> e a senha que você acabou de criar.</p>
          <Link className="btn btn-primary btn-lg btn-block" href="/entrar">Entrar</Link>
        </div>
      </AuthShell>
    );
  }
  return (
    <AuthShell>
      <Headline text={`Olá, ${person.name.split(' ')[0]}`} />
      <p className="auth-lead">Você foi convidado para o Controle de Transporte. Crie sua senha para acessar com <strong>{person.email}</strong>.</p>
      <form className="auth-form" onSubmit={submit} noValidate>
        <PasswordInput name="password" label="Crie sua senha" autoComplete="new-password" error={f.errors.password} minLength={8} hint="Pelo menos 8 caracteres." />
        <PasswordInput name="confirm" label="Confirme a senha" autoComplete="new-password" error={f.errors.confirm} minLength={8} />
        {f.error && <p className="notice notice-error" role="alert">{f.error}</p>}
        <Submit busy={f.busy}>Criar senha</Submit>
      </form>
      <p className="login-note">Este convite vale até {new Date(person.expiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} e só pode ser usado uma vez.</p>
    </AuthShell>
  );
}
