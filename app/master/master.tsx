'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Building2, LogOut, Plus, RefreshCw, ShieldCheck, UserPlus, Link2, Pencil, Power } from 'lucide-react';
import { request, RequestError, type Row, collectErrors, focusField } from '../request';
import { Card, Counter } from '../../components/brand';
import { Dialog } from '../../components/dialog';
import { Input, SearchInput, Select } from '../../components/form';
import { InviteLink } from '../../components/invite-link';
import { authClient } from '../../lib/auth-client';

type Modal =
  | { kind: 'createOrganization' }
  | { kind: 'editOrganization'; org: Row }
  | { kind: 'addMember'; org: Row }
  | { kind: 'toggleOrganization'; org: Row };

const TITLES: Record<Modal['kind'], string> = {
  createOrganization: 'Nova empresa', editOrganization: 'Editar empresa', addMember: 'Novo acesso', toggleOrganization: 'Desativar empresa',
};

async function signOut() {
  await authClient.signOut();
  window.location.assign('/entrar');
}

function memberStatus(m: Row) {
  if (!m.active) return <span className="tag tag-muted">Desativado</span>;
  if (m.inviteExpiresAt && new Date(m.inviteExpiresAt) > new Date()) {
    return <span className="tag tag-warn">Convite pendente · até {new Date(m.inviteExpiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>;
  }
  if (!m.hasPassword) return <span className="tag tag-muted">Convite expirado</span>;
  return <span className="tag">Ativo</span>;
}

export default function Master() {
  const [orgs, setOrgs] = useState<Row[]>([]);
  const [user, setUser] = useState<Row | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<Modal | null>(null);
  const [form, setForm] = useState<Row>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState('');
  const [invite, setInvite] = useState<{ name: string; url: string; expiresAt: string } | null>(null);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await request('/api/master', {}, 10000);
      setOrgs(res.organizations);
      setUser(res.user);
      setError('');
    } catch (e) {
      const err = e as RequestError;
      if (err.status === 401) { window.location.assign('/entrar/administrador'); return; }
      setError(err.message);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial dos dados do servidor
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  async function call(action: string, values: Row) {
    const res = await request('/api/master', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, values }),
    }, 15000);
    await load();
    return res;
  }

  function open(next: Modal) {
    setFieldErrors({});
    setFormError('');
    setForm(next.kind === 'editOrganization' ? { name: next.org.name, document: next.org.document ?? '' } : next.kind === 'addMember' ? { role: 'attendant' } : {});
    setModal(next);
  }

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!modal) return;
    const errors = collectErrors(e.currentTarget);
    setFieldErrors(errors);
    const first = Object.keys(errors)[0];
    if (first) { focusField(e.currentTarget, first); return; }
    setBusy('form');
    setFormError('');
    try {
      const values = modal.kind === 'createOrganization' ? form
        : modal.kind === 'addMember' ? { ...form, organizationId: modal.org.id }
        : modal.kind === 'editOrganization' ? { ...form, id: modal.org.id }
        : { id: modal.org.id, active: false };
      const action = modal.kind === 'addMember' || modal.kind === 'createOrganization' ? modal.kind : 'updateOrganization';
      const res = await call(action, values);
      document.querySelector<HTMLDialogElement>('dialog[open]')?.close();
      if (res.invite) setInvite(res.invite);
      else setToast(modal.kind === 'toggleOrganization' ? 'Empresa desativada. Os acessos dela foram encerrados.' : 'Alterações salvas.');
    } catch (err) {
      setFormError((err as RequestError).message);
    } finally {
      setBusy('');
    }
  }

  async function quick(key: string, action: string, values: Row, done: string) {
    setBusy(key);
    try {
      const res = await call(action, values);
      if (res.invite) setInvite(res.invite);
      else setToast(done);
    } catch (err) {
      setToast((err as RequestError).message);
    } finally {
      setBusy('');
    }
  }

  if (!user) {
    return (
      <main className="loading-screen">
        {error ? (
          <div className="loading-card">
            <p role="alert" className="notice notice-error">{error}</p>
            <button className="btn" onClick={() => void load()}><RefreshCw size={16} aria-hidden="true" /> Tentar de novo</button>
          </div>
        ) : <p role="status"><RefreshCw className="spin" size={18} aria-hidden="true" /> Carregando as empresas…</p>}
      </main>
    );
  }

  const q = query.trim().toLowerCase();
  const shown = q ? orgs.filter((o) => `${o.name} ${o.document ?? ''} ${o.members.map((m: Row) => `${m.name} ${m.email}`).join(' ')}`.toLowerCase().includes(q)) : orgs;
  const everyone = orgs.flatMap((o) => o.members);
  const bind = (key: string) => ({ name: key, value: form[key] ?? '', error: fieldErrors[key], onValueChange: (v: string) => set(key, v) });

  return (
    <div className="shell">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <aside className="sidebar master-sidebar" aria-label="Menu principal">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"><ShieldCheck size={18} /></span>
          <span><strong>Controle de Transporte</strong><small>Acesso master</small></span>
        </div>
        <nav aria-label="Seções">
          <ul><li><button className="nav-item" aria-current="page"><Building2 size={18} aria-hidden="true" />Empresas<span className="nav-count">{orgs.length}</span></button></li></ul>
        </nav>
        <div className="sidebar-foot">
          <div className="me">
            <span className="avatar" aria-hidden="true">MA</span>
            <span><strong>{user.name}</strong><small>Master</small></span>
            <button className="icon-btn" onClick={() => void signOut()} aria-label="Sair"><LogOut size={18} aria-hidden="true" /></button>
          </div>
        </div>
      </aside>

      <main id="conteudo" className="content master-content" tabIndex={-1}>
        <header className="page-header">
          <div>
            <h1>Empresas</h1>
            <p>Cada empresa tem seus próprios dados e sua própria equipe. Uma empresa nova começa em branco.</p>
          </div>
          <div className="page-actions master-actions">
            <button className="btn master-signout" onClick={() => void signOut()}><LogOut size={16} aria-hidden="true" /> Sair</button>
            <button className="btn btn-primary" onClick={() => open({ kind: 'createOrganization' })}><Plus size={16} aria-hidden="true" /> Nova empresa</button>
          </div>
        </header>

        <section className="kpis" aria-label="Resumo">
          <Card className="kpi"><h2>Empresas ativas</h2><strong><Counter value={orgs.filter((o) => o.active).length} /></strong><p>de {orgs.length} cadastradas</p></Card>
          <Card className="kpi"><h2>Administradores</h2><strong><Counter value={everyone.filter((m) => m.role === 'admin' && m.active).length} /></strong><p>com acesso ativo</p></Card>
          <Card className="kpi"><h2>Colaboradores</h2><strong><Counter value={everyone.filter((m) => m.role === 'attendant' && m.active).length} /></strong><p>com acesso ativo</p></Card>
          <Card className="kpi"><h2>Convites pendentes</h2><strong><Counter value={everyone.filter((m) => m.inviteExpiresAt && new Date(m.inviteExpiresAt) > new Date()).length} /></strong><p>aguardando a pessoa criar a senha</p></Card>
        </section>

        {orgs.length > 3 && <div className="toolbar"><div className="toolbar-filters"><SearchInput label="Buscar empresa ou pessoa" placeholder="Empresa, nome ou e-mail" value={query} onValueChange={setQuery} /></div></div>}

        {shown.map((org) => (
          <Card className={org.active ? 'panel' : 'panel org-inactive'} key={org.id}>
            <div className="panel-head">
              <div>
                <h2>{org.name} {!org.active && <span className="tag tag-muted">Desativada</span>}</h2>
                <p>{[org.document, `${org.vehicles} ${org.vehicles === 1 ? 'veículo' : 'veículos'}`, `${org.fills} ${org.fills === 1 ? 'abastecimento' : 'abastecimentos'}`, `desde ${new Date(org.created).toLocaleDateString('pt-BR')}`].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="page-actions">
                <button className="btn btn-sm" onClick={() => open({ kind: 'editOrganization', org })}><Pencil size={14} aria-hidden="true" /> Editar</button>
                {org.active
                  ? <button className="btn btn-sm" onClick={() => open({ kind: 'toggleOrganization', org })}><Power size={14} aria-hidden="true" /> Desativar</button>
                  : <button className="btn btn-sm" disabled={busy === org.id} onClick={() => void quick(org.id, 'updateOrganization', { id: org.id, active: true }, 'Empresa reativada.')}><Power size={14} aria-hidden="true" /> Reativar</button>}
                <button className="btn btn-sm btn-primary" onClick={() => open({ kind: 'addMember', org })} disabled={!org.active}><UserPlus size={14} aria-hidden="true" /> Novo acesso</button>
              </div>
            </div>
            {org.members.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Nome</th>
                      <th scope="col">E-mail</th>
                      <th scope="col">Perfil</th>
                      <th scope="col">Situação</th>
                      <th scope="col"><span className="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {org.members.map((m: Row) => (
                      <tr key={m.id}>
                        <td data-label="Nome" className="strong">{m.name}</td>
                        <td data-label="E-mail">{m.email}</td>
                        <td data-label="Perfil"><span className={m.role === 'admin' ? 'tag tag-brand' : 'tag'}>{m.role === 'admin' ? 'Administrador' : 'Colaborador'}</span></td>
                        <td data-label="Situação">{memberStatus(m)}</td>
                        <td className="row-action">
                          <div className="row-actions">
                            {m.active && !m.hasPassword && (
                              <button className="btn btn-sm" disabled={busy === m.id} onClick={() => void quick(m.id, 'invite', { id: m.id }, '')}><Link2 size={14} aria-hidden="true" /> Novo link</button>
                            )}
                            <button className="btn btn-sm" disabled={busy === m.id}
                              onClick={() => void quick(m.id, 'updateMember', { id: m.id, active: !m.active }, m.active ? `Acesso de ${m.name} desativado.` : `Acesso de ${m.name} reativado.`)}>
                              {m.active ? 'Desativar' : 'Reativar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty empty-sm"><p>Nenhum acesso nesta empresa ainda.</p></div>
            )}
          </Card>
        ))}

        {!shown.length && (
          <Card className="panel">
            <div className="empty">
              <Building2 size={28} aria-hidden="true" />
              <h3>{q ? 'Nada encontrado' : 'Nenhuma empresa cadastrada'}</h3>
              <p>{q ? 'Tente outro nome ou e-mail.' : 'Cadastre a primeira empresa e o administrador dela.'}</p>
            </div>
          </Card>
        )}
      </main>

      <div className="toast-region" aria-live="polite">{toast && <div className="toast">{toast}</div>}</div>

      {modal && (
        <Dialog title={modal.kind === 'addMember' ? `Novo acesso · ${modal.org.name}` : modal.kind === 'toggleOrganization' ? `Desativar ${modal.org.name}?` : TITLES[modal.kind]} onClose={() => setModal(null)} busy={busy === 'form'}>
          <form onSubmit={submit} noValidate>
            <fieldset className="form-grid" disabled={busy === 'form'}>
              {modal.kind === 'toggleOrganization' ? (
                <p className="field-full">Os administradores e colaboradores desta empresa saem do sistema na hora e não conseguem entrar até você reativá-la. Nenhum dado é apagado.</p>
              ) : <>
                {(modal.kind === 'createOrganization' || modal.kind === 'editOrganization') && <>
                  <Input {...bind('name')} label="Nome da empresa" maxLength={120} />
                  <Input {...bind('document')} label="CNPJ" optional maxLength={30} />
                </>}
                {modal.kind === 'createOrganization' && <p className="hint field-full">Administrador da empresa: ele recebe um link de convite para criar a senha e depois cadastra a própria equipe.</p>}
                {(modal.kind === 'createOrganization' || modal.kind === 'addMember') && <>
                  <Input {...bind('memberName')} label={modal.kind === 'createOrganization' ? 'Nome do administrador' : 'Nome'} maxLength={120} />
                  <Input {...bind('email')} label="E-mail de acesso" type="email" autoComplete="off" maxLength={200} />
                </>}
                {modal.kind === 'addMember' && (
                  <Select {...bind('role')} label="Perfil de acesso" placeholder="" full
                    options={[{ value: 'attendant', label: 'Colaborador — abastecimentos e Oficina' }, { value: 'admin', label: 'Administrador — acesso completo à empresa' }]} />
                )}
              </>}
            </fieldset>
            {formError && <p role="alert" className="notice notice-error">{formError}</p>}
            <div className="modal-actions">
              <button type="button" className="btn" onClick={(e) => e.currentTarget.closest('dialog')?.close()} disabled={busy === 'form'}>Cancelar</button>
              <button className="btn btn-primary" disabled={busy === 'form'}>
                {busy === 'form' ? <><RefreshCw className="spin" size={16} aria-hidden="true" /> Salvando…</>
                  : modal.kind === 'createOrganization' ? 'Criar empresa e gerar convite'
                  : modal.kind === 'addMember' ? 'Criar acesso e gerar convite'
                  : modal.kind === 'toggleOrganization' ? 'Desativar empresa' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {invite && (
        <Dialog title="Link de acesso gerado" onClose={() => setInvite(null)}>
          <InviteLink invite={invite} />
        </Dialog>
      )}
    </div>
  );
}
