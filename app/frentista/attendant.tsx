'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Fuel, LogOut, CheckCircle2, Plus, ClipboardList, RefreshCw, WifiOff, Home, ArrowUpRight, Wrench } from 'lucide-react';
import { request, RequestError, type Row, money, num, today, dateBR, timeBR, collectErrors, focusField } from '../request';
import { Card, Counter, Reveal } from '../../components/brand';
import { Dialog } from '../../components/dialog';
import { Input, OptionCards, SearchInput, Select } from '../../components/form';
import { Toolbar } from '../../components/toolbar';
import { authClient } from '../../lib/auth-client';
import Workshop from '../workshop';

const DRAFT_KEY = 'controle-transporte:rascunho';
const PAGE_SIZE = 20;
const fresh = () => ({ vehicleId: '', fuelId: '', date: today(), liters: '', km: '', driver: '', note: '' });
type Draft = ReturnType<typeof fresh>;
type View = 'home' | 'history' | 'workshop';

async function signOut() {
  await authClient.signOut();
  window.location.assign('/entrar');
}

export default function Attendant() {
  const [data, setData] = useState<Row[]>([]);
  const [user, setUser] = useState<Row | null>(null);
  const [connection, setConnection] = useState('');
  const [form, setForm] = useState<Draft>(fresh);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ message: string; network: boolean } | null>(null);
  const [receipt, setReceipt] = useState<Row | null>(null);
  const [fillOpen, setFillOpen] = useState(false);
  const [view, setView] = useState<View>('home');
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE_SIZE);
  const locked = useRef(false);
  const inFlight = useRef(false);
  const latest = useRef(0);
  const failures = useRef(0);
  const restored = useRef(false);
  const receiptTitle = useRef<HTMLHeadingElement>(null);

  const load = useCallback(async (force = false) => {
    if (inFlight.current && !force) return true;
    const call = ++latest.current;
    inFlight.current = true;
    try {
      const json = await request('/api/data?view=attendant', {}, 8000);
      if (call !== latest.current) return true;
      failures.current = 0;
      setData(json.data);
      setUser(json.user);
      setConnection('');
      return true;
    } catch (e) {
      const err = e as RequestError;
      if (err.status === 401) { window.location.assign('/entrar/colaborador'); return false; }
      failures.current += 1;
      setConnection(err.message);
      return false;
    } finally {
      if (call === latest.current) inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      if (stopped) return;
      timer = setTimeout(async () => {
        if (document.visibilityState === 'visible') await load();
        schedule();
      }, Math.min(30000, 5000 * 2 ** Math.min(failures.current, 3)));
    };
    void load().then(schedule);
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      stopped = true;
      clearTimeout(timer);
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [load]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restored after hydration to match the server render
      if (saved && typeof saved === 'object') setForm({ ...fresh(), ...saved, date: saved.date && saved.date <= today() ? saved.date : today() });
    } catch { /* rascunho indisponível */ }
    restored.current = true;
  }, []);

  useEffect(() => {
    if (!restored.current) return;
    try {
      const filled = form.vehicleId || form.fuelId || form.liters || form.km || form.driver || form.note;
      if (filled) localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      else localStorage.removeItem(DRAFT_KEY);
    } catch { /* armazenamento indisponível */ }
  }, [form]);

  useEffect(() => { if (receipt) receiptTitle.current?.focus(); }, [receipt]);

  const vehicles = data.filter((x) => x.kind === 'vehicle');
  const fuels = data.filter((x) => x.kind === 'fuel');
  const institutions = data.filter((x) => x.kind === 'institution');
  const vehicle = vehicles.find((x) => x.id === form.vehicleId);
  const fuel = fuels.find((x) => x.id === form.fuelId);
  const institution = institutions.find((x) => x.id === vehicle?.institutionId);
  const instName = (x: Row) => institutions.find((i) => i.id === x.institutionId)?.name || x.institution;
  const recent = data.filter((x) => x.kind === 'fill').sort((a, b) => b.created.localeCompare(a.created));
  const q = query.trim().toLowerCase();
  const filtered = q ? recent.filter((x) => `${x.plate} ${x.vehicle} ${instName(x)}`.toLowerCase().includes(q)) : recent;
  const day = recent.filter((x) => x.date === today());
  const monthFills = recent.filter((x) => x.date.startsWith(today().slice(0, 7)));
  const sum = (list: Row[], key: string) => list.reduce((a, b) => a + (b[key] || 0), 0);
  const total = Math.round(Number(form.liters || 0) * (fuel?.priceCents || 0));
  const hasDraft = Boolean(form.vehicleId || form.liters || form.km);

  function go(v: View) {
    setView(v);
    window.scrollTo({ top: 0 });
  }
  function openFill() {
    setReceipt(null);
    setError(null);
    setFieldErrors({});
    setFillOpen(true);
  }
  function field(key: keyof Draft, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
    if (fieldErrors[key]) setFieldErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }
  const kmDigits = form.km.replace(/\D/g, '');
  const bind = (key: keyof Draft) => ({ name: key, value: form[key], error: fieldErrors[key], onValueChange: (v: string) => field(key, v) });

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (locked.current) return;
    const errors = collectErrors(e.currentTarget);
    setFieldErrors(errors);
    const first = Object.keys(errors)[0];
    if (first) {
      focusField(e.currentTarget, first);
      return;
    }
    locked.current = true;
    setSaving(true);
    setError(null);
    try {
      const json = await request('/api/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'fill', values: { ...form, km: kmDigits } }),
      }, 15000);
      setReceipt(json.record);
      setForm(fresh());
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ok */ }
      void load(true);
    } catch (err) {
      const re = err as RequestError;
      setError({
        network: re.network,
        message: re.network ? `${re.message} Antes de enviar de novo, confira em Meus lançamentos se este abastecimento já aparece.` : re.message,
      });
    } finally {
      setSaving(false);
      locked.current = false;
    }
  }

  const fillItem = (x: Row) => (
    <li key={x.id}>
      <div>
        <p className="record-main"><span className="plate">{x.plate}</span> {x.vehicle}</p>
        <p>{instName(x)}</p>
        <p className="record-meta">{dateBR(x.date)} · {timeBR(x.created)} · {x.fuel} · {num(x.liters)} L · {num(x.km, 0)} km</p>
      </div>
      <strong>{money(x.totalCents)}</strong>
    </li>
  );

  if (!user) {
    return (
      <main className="loading-screen">
        {connection ? (
          <div className="loading-card">
            <p role="alert" className="notice notice-error">{connection}</p>
            <button className="btn" onClick={() => void load()}><RefreshCw size={16} aria-hidden="true" /> Tentar de novo</button>
          </div>
        ) : (
          <p role="status"><RefreshCw className="spin" size={18} aria-hidden="true" /> Conectando ao sistema…</p>
        )}
      </main>
    );
  }

  const firstName = String(user.name).split(' ')[0];
  const newFillButton = (
    <button className="btn btn-primary" onClick={openFill}><Plus size={18} aria-hidden="true" /> {hasDraft ? 'Continuar lançamento' : 'Novo abastecimento'}</button>
  );

  return (
    <div className="shell colab">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>

      <header className="colab-top">
        <span className="brand-mark" aria-hidden="true"><Fuel size={18} /></span>
        <span className="colab-top-title"><strong>Controle de Transporte</strong><small>{user.name}</small></span>
        <span className={connection ? 'sync-dot is-error' : 'sync-dot'} role="img" aria-label={connection ? 'Sem conexão com a gestão' : 'Conectado à gestão'} />
        <button className="icon-btn" onClick={() => void signOut()} aria-label="Sair"><LogOut size={20} aria-hidden="true" /></button>
      </header>

      <aside className="sidebar colab-sidebar" aria-label="Menu do colaborador">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"><Fuel size={18} /></span>
          <span><strong>Controle de Transporte</strong><small>Área do colaborador</small></span>
        </div>
        <nav aria-label="Seções">
          <ul>
            <li><button className="nav-item" aria-current={view === 'home' ? 'page' : undefined} onClick={() => go('home')}><Home size={18} aria-hidden="true" />Início</button></li>
            <li><button className="nav-item" aria-current={view === 'history' ? 'page' : undefined} onClick={() => go('history')}><ClipboardList size={18} aria-hidden="true" />Meus lançamentos<span className="nav-count">{recent.length}</span></button></li>
            <li><button className="nav-item" aria-current={view === 'workshop' ? 'page' : undefined} onClick={() => go('workshop')}><Wrench size={18} aria-hidden="true" />Oficina</button></li>
          </ul>
        </nav>
        <div className="sidebar-foot">
          {user.role === 'admin' && <Link className="nav-item" href="/"><ArrowUpRight size={18} aria-hidden="true" />Painel administrativo</Link>}
          <p className={connection ? 'sync is-error' : 'sync'} role="status">
            <span className="sync-dot" aria-hidden="true" />
            {connection ? <>{connection} <button className="link-btn" onClick={() => void load()}>Tentar de novo</button></> : 'Conectado à gestão'}
          </p>
          <div className="me">
            <span className="avatar" aria-hidden="true">{String(user.name).split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}</span>
            <span><strong>{user.name}</strong><small>{user.role === 'admin' ? 'Administrador' : 'Colaborador'}</small></span>
            <button className="icon-btn" onClick={() => void signOut()} aria-label="Sair"><LogOut size={18} aria-hidden="true" /></button>
          </div>
        </div>
      </aside>

      <main id="conteudo" className="content colab-content" tabIndex={-1}>
        {connection && <p className="notice notice-warn colab-offline" role="alert"><WifiOff size={16} aria-hidden="true" /> {connection} Os dados podem estar desatualizados.</p>}

        {view === 'home' && (
          <>
            <header className="page-header">
              <div>
                <h1>Olá, {firstName}</h1>
                <p>{new Date(today() + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              </div>
            </header>
            <Toolbar actions={newFillButton} />
            <Reveal>
              <section className="kpis" aria-label="Seu movimento">
                <Card className="kpi"><h2>Abastecimentos hoje</h2><strong><Counter value={day.length} /></strong><p>{new Set(day.map((x) => x.plate)).size} veículos atendidos</p></Card>
                <Card className="kpi"><h2>Litros hoje</h2><strong><Counter value={Math.round(sum(day, 'liters') * 100) / 100} decimals={2} /><span className="unit"> L</span></strong><p>{money(sum(day, 'totalCents'))} lançados</p></Card>
                <Card className="kpi"><h2>Abastecimentos no mês</h2><strong><Counter value={monthFills.length} /></strong><p>{num(sum(monthFills, 'liters'), 2)} L no total</p></Card>
                <Card className="kpi"><h2>Valor no mês</h2><strong><Counter value={sum(monthFills, 'totalCents') / 100} decimals={2} prefix="R$ " /></strong><p>{new Set(monthFills.map((x) => x.plate)).size} veículos diferentes</p></Card>
              </section>
            </Reveal>
            <Card className="panel">
              <div className="panel-head">
                <div><h2>Últimos lançamentos</h2><p>Os mais recentes enviados por você</p></div>
                <button className="link-btn" onClick={() => go('history')}>Ver todos</button>
              </div>
              {recent.length ? <ul className="records">{recent.slice(0, 6).map(fillItem)}</ul> : (
                <div className="empty empty-sm"><p>Você ainda não lançou nenhum abastecimento.</p></div>
              )}
            </Card>
          </>
        )}

        {view === 'history' && (
          <>
            <header className="page-header">
              <div>
                <h1>Meus lançamentos</h1>
                <p>Hoje: {day.length} {day.length === 1 ? 'abastecimento' : 'abastecimentos'} · no mês: {monthFills.length}</p>
              </div>
            </header>
            <Toolbar actions={<><button className="btn" onClick={() => void load()}><RefreshCw size={16} aria-hidden="true" /> Atualizar</button>{newFillButton}</>}>
              <SearchInput label="Buscar meus lançamentos" placeholder="Placa ou instituição" value={query} onValueChange={(v) => { setQuery(v); setShown(PAGE_SIZE); }} />
            </Toolbar>
            <Card className="panel">
              {filtered.length ? (
                <>
                  <ul className="records">{filtered.slice(0, shown).map(fillItem)}</ul>
                  {filtered.length > shown && <div className="more"><button className="btn btn-block" onClick={() => setShown((s) => s + PAGE_SIZE)}>Mostrar mais ({filtered.length - shown})</button></div>}
                </>
              ) : (
                <div className="empty">
                  <ClipboardList size={28} aria-hidden="true" />
                  <h2>{q ? 'Nenhum resultado' : 'Nenhum lançamento ainda'}</h2>
                  <p>{q ? 'Confira a placa ou o nome da instituição.' : 'Depois de salvar um abastecimento, ele aparece aqui com a hora do envio.'}</p>
                </div>
              )}
            </Card>
          </>
        )}

        {view === 'workshop' && (
          <>
            <header className="page-header">
              <div><h1>Oficina</h1><p>Estoque de peças, entradas, uso previsto e entregas por veículo</p></div>
            </header>
            <Workshop data={data} onRefresh={() => load(true)} />
          </>
        )}
      </main>

      <nav className="tabbar" aria-label="Seções">
        <button aria-current={view === 'home' ? 'page' : undefined} onClick={() => go('home')}><Home size={22} aria-hidden="true" /><span>Início</span></button>
        <button onClick={openFill}><Plus size={22} aria-hidden="true" /><span>Lançar</span></button>
        <button aria-current={view === 'history' ? 'page' : undefined} onClick={() => go('history')}><ClipboardList size={22} aria-hidden="true" /><span>Lançamentos</span></button>
        <button aria-current={view === 'workshop' ? 'page' : undefined} onClick={() => go('workshop')}><Wrench size={22} aria-hidden="true" /><span>Oficina</span></button>
      </nav>

      {fillOpen && (
        <Dialog title={receipt ? 'Comprovante' : 'Novo abastecimento'} onClose={() => setFillOpen(false)} busy={saving} className="fill-modal">
          {receipt ? (
            <div className="receipt">
              <CheckCircle2 className="receipt-icon" size={44} aria-hidden="true" />
              <h3 ref={receiptTitle} tabIndex={-1}>Abastecimento enviado</h3>
              <p>A gestão recebeu este lançamento às {timeBR(receipt.created)}.</p>
              <p className="receipt-plate">{receipt.plate}</p>
              <dl className="receipt-facts">
                <div><dt>Veículo</dt><dd>{receipt.vehicle}</dd></div>
                <div><dt>Instituição</dt><dd>{instName(receipt)}</dd></div>
                <div><dt>Combustível</dt><dd>{receipt.fuel}</dd></div>
                <div><dt>Litros</dt><dd>{num(receipt.liters)} L</dd></div>
                <div><dt>Odômetro</dt><dd>{num(receipt.km, 0)} km</dd></div>
                <div className="receipt-total"><dt>Valor</dt><dd>{money(receipt.totalCents)}</dd></div>
              </dl>
              <div className="receipt-actions">
                <button className="btn btn-primary btn-lg" onClick={() => setReceipt(null)}><Plus size={18} aria-hidden="true" /> Novo abastecimento</button>
                <button className="btn btn-lg" onClick={(e) => e.currentTarget.closest('dialog')?.close()}>Fechar</button>
              </div>
            </div>
          ) : (
            <form className="colab-form" onSubmit={save} noValidate>
              <fieldset className="form-stack" disabled={saving}>
                {(!vehicles.length || !fuels.length) && <p className="notice notice-warn">A administração precisa cadastrar veículos e combustíveis antes do primeiro lançamento.</p>}
                <Select {...bind('vehicleId')} label="Veículo" placeholder="Selecione a placa"
                  options={vehicles.map((x) => ({ value: x.id, label: `${x.plate} · ${x.name}` }))}
                  hint={vehicle ? institution?.name ?? 'Sem instituição vinculada' : undefined} />
                <OptionCards name="fuelId" label="Combustível" value={form.fuelId} error={fieldErrors.fuelId} onValueChange={(v) => field('fuelId', v)}
                  options={fuels.map((x) => ({ value: x.id, label: x.name, detail: `${money(x.priceCents)}/L` }))} />
                <div className="field-row">
                  <Input {...bind('liters')} label="Litros" type="number" inputMode="decimal" step={0.001} min={0.001} max={10000} placeholder="0,000" />
                  <Input {...bind('km')} label="Odômetro (km)" type="text" inputMode="numeric" autoComplete="off"
                    value={kmDigits ? num(Number(kmDigits), 0) : ''} onValueChange={(v) => field('km', v.replace(/\D/g, '').slice(0, 7))}
                    placeholder={vehicle?.lastKm != null ? num(vehicle.lastKm, 0) : 'Ex.: 42.500'}
                    hint={vehicle?.lastKm != null ? `Último: ${num(vehicle.lastKm, 0)} km` : undefined} />
                </div>
                <Input {...bind('date')} label="Data" type="date" max={today()} />
                <details className="extras" open={Boolean(form.driver || form.note) || undefined}>
                  <summary>Motorista e observação <span className="optional">(opcional)</span></summary>
                  <div className="form-stack">
                    <Input {...bind('driver')} label="Motorista" maxLength={200} autoComplete="off" optional />
                    <Input {...bind('note')} label="Observação" maxLength={200} optional />
                  </div>
                </details>
              </fieldset>
              {error && (
                <div className="notice notice-error form-notice" role="alert">
                  <p>{error.message}</p>
                  {error.network && <button type="button" className="btn btn-sm" onClick={(e) => { e.currentTarget.closest('dialog')?.close(); go('history'); }}>Abrir Meus lançamentos</button>}
                </div>
              )}
              <div className="colab-submit">
                <div className="colab-total" aria-live="polite">
                  <small>Valor do abastecimento</small>
                  <strong>{money(total)}</strong>
                  <span>{fuel ? `${money(fuel.priceCents)} por litro` : 'Preço definido pela gestão'}</span>
                </div>
                <button className="btn btn-primary btn-lg" disabled={saving || !vehicles.length || !fuels.length}>
                  {saving ? <><RefreshCw className="spin" size={18} aria-hidden="true" /> Enviando…</> : <><CheckCircle2 size={18} aria-hidden="true" /> Salvar e enviar</>}
                </button>
              </div>
            </form>
          )}
        </Dialog>
      )}
    </div>
  );
}
