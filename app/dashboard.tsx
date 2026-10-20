'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  Fuel, LayoutDashboard, Building2, Car, Users, FileText, Settings, Plus, ArrowUpRight, Download, X,
  LogOut, ShieldCheck, CheckCircle2, Menu, ClipboardList, RefreshCw, Printer, Pencil, ChevronLeft, Wrench, Link2,
} from 'lucide-react';
import { request, RequestError, type Row, money, num, today, dateBR, monthLabel, recentMonths, collectErrors, focusField } from './request';
import { Card, Counter, Reveal } from '../components/brand';
import { Dialog } from '../components/dialog';
import { InlineSelect, Input, OptionCards, SearchInput, Select } from '../components/form';
import { Toolbar } from '../components/toolbar';
import { InviteLink } from '../components/invite-link';
import { authClient } from '../lib/auth-client';
import Workshop from './workshop';
import { ConsumptionPreview, ConsumptionTag, OdometerBadge } from '../components/consumption';

async function signOut() {
  await authClient.signOut();
  window.location.assign('/entrar');
}

type Page = 'overview' | 'fill' | 'institution' | 'vehicle' | 'person' | 'contract' | 'report' | 'fuel' | 'member' | 'workshop';
type Kind = Exclude<Page, 'overview' | 'report' | 'workshop'>;

const TITLES: Record<Page, string> = {
  overview: 'Visão geral', fill: 'Abastecimentos', institution: 'Instituições', vehicle: 'Veículos', person: 'Pessoas',
  contract: 'Contratos', report: 'Fechamento mensal', fuel: 'Combustíveis e preços', member: 'Equipe e acessos', workshop: 'Oficina',
};
const SINGULAR: Record<Kind, string> = {
  fill: 'abastecimento', institution: 'instituição', vehicle: 'veículo', person: 'pessoa', contract: 'contrato',
  fuel: 'combustível', member: 'membro da equipe',
};
const ICONS = {
  overview: LayoutDashboard, fill: Fuel, institution: Building2, vehicle: Car, person: Users, contract: FileText,
  report: ClipboardList, fuel: Settings, member: ShieldCheck, workshop: Wrench,
};
const NAV: { label?: string; items: Page[] }[] = [
  { items: ['overview', 'fill', 'workshop'] },
  { label: 'Cadastros', items: ['institution', 'vehicle', 'person', 'contract'] },
  { label: 'Gestão', items: ['report', 'fuel', 'member'] },
];
const MONTHS = recentMonths();

function niceScale(max: number) {
  if (max <= 0) return { top: 100, step: 50 };
  const raw = max / 3;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
  return { top: Math.ceil(max / step) * step, step };
}

function groupByInstitution(list: Row[], name: (x: Row) => string) {
  const map = new Map<string, Row[]>();
  for (const x of list) map.set(x.institutionId, [...(map.get(x.institutionId) ?? []), x]);
  return Array.from(map, ([id, rs]) => ({
    id, name: name(rs[0]), rows: rs,
    total: rs.reduce((a, b) => a + b.totalCents, 0),
    liters: rs.reduce((a, b) => a + b.liters, 0),
    cars: new Set(rs.map((x) => x.plate)).size,
    count: rs.length,
  })).sort((a, b) => b.total - a.total);
}

export default function Dashboard() {
  const [data, setData] = useState<Row[]>([]);
  const [user, setUser] = useState<Row | null>(null);
  const [error, setError] = useState('');
  const [syncError, setSyncError] = useState('');
  const [lastSync, setLastSync] = useState('');
  const [page, setPage] = useState<Page>('overview');
  const [month, setMonth] = useState(today().slice(0, 7));
  const [institution, setInstitution] = useState('');
  const [query, setQuery] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [modal, setModal] = useState<{ kind: Kind; id?: string } | null>(null);
  const [form, setForm] = useState<Row>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [inviteResult, setInviteResult] = useState<{ name: string; url: string; expiresAt: string } | null>(null);
  const [linkBusy, setLinkBusy] = useState('');
  const inFlight = useRef(false);
  const latest = useRef(0);
  const failures = useRef(0);

  const load = useCallback(async (quiet = false, force = false) => {
    if (inFlight.current && !force) return;
    const call = ++latest.current;
    inFlight.current = true;
    try {
      const result = await request('/api/data', {}, 8000);
      if (call !== latest.current) return;
      failures.current = 0;
      setData(result.data);
      setUser(result.user);
      if (result.user.role !== 'admin') { window.location.replace('/frentista'); return; }
      setSyncError('');
      setLastSync(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      if (!quiet) setError('');
    } catch (e) {
      const err = e as RequestError;
      if (err.status === 401) { window.location.assign('/entrar/administrador'); return; }
      failures.current += 1;
      setSyncError(err.message);
      if (!quiet) setError(err.message);
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
        if (document.visibilityState === 'visible') await load(true);
        schedule();
      }, Math.min(30000, 5000 * 2 ** Math.min(failures.current, 3)));
    };
    void load().then(schedule);
    const refresh = () => { if (document.visibilityState === 'visible') void load(true); };
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      stopped = true;
      clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const byKind = useMemo(() => {
    const m: Record<string, Row[]> = {};
    for (const r of data) (m[r.kind] ??= []).push(r);
    return m;
  }, [data]);
  const rows = (k: string) => byKind[k] ?? [];
  const inst = rows('institution'), vehicles = rows('vehicle'), fuels = rows('fuel');
  const instById = useMemo(() => new Map((byKind.institution ?? []).map((i) => [i.id, i])), [byKind]);
  const instName = (x: Row) => instById.get(x.institutionId)?.name || x.institution;

  const monthFills = useMemo(
    () => (byKind.fill ?? []).filter((x) => x.date?.startsWith(month))
      .sort((a, b) => b.date.localeCompare(a.date) || b.created.localeCompare(a.created)),
    [byKind, month],
  );
  const fills = institution ? monthFills.filter((x) => x.institutionId === institution) : monthFills;
  const total = fills.reduce((a, b) => a + b.totalCents, 0);
  const liters = fills.reduce((a, b) => a + b.liters, 0);
  const groups = groupByInstitution(fills, instName);
  const monthGroups = groupByInstitution(monthFills, instName);
  const q = query.trim().toLowerCase();
  const searchedFills = q ? fills.filter((x) => `${x.plate} ${x.vehicle} ${instName(x)} ${x.driver ?? ''} ${x.attendant ?? ''}`.toLowerCase().includes(q)) : fills;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNavOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function go(p: Page) {
    setPage(p);
    setQuery('');
    setNavOpen(false);
    document.getElementById('conteudo')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }

  function open(kind: Kind, row?: Row) {
    setFieldErrors({});
    setFormError('');
    setForm(row ? { ...row, price: row.priceCents != null ? row.priceCents / 100 : undefined, ...(kind === 'member' ? { password: '', active: row.active ? 'true' : 'false' } : {}) }
      : kind === 'fill' ? { date: today() }
      : kind === 'member' ? { role: 'attendant', active: 'true' }
      : kind === 'contract' ? { start: today(), end: `${today().slice(0, 4)}-12-31` }
      : {});
    setModal({ kind, id: row?.id });
  }

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value, ...(key === 'institutionId' && modal?.kind === 'contract' ? { vehicleId: '' } : {}) }));
    if (fieldErrors[key]) setFieldErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!modal) return;
    const errors = collectErrors(e.currentTarget);
    setFieldErrors(errors);
    const first = Object.keys(errors)[0];
    if (first) { focusField(e.currentTarget, first); return; }
    setBusy(true);
    setFormError('');
    try {
      const res = await request('/api/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: modal.kind, id: modal.id, values: form }),
      }, 15000);
      document.querySelector<HTMLDialogElement>('dialog[open]')?.close();
      await load(false, true);
      if (res.invite) setInviteResult({ name: String(form.name), ...res.invite });
      else setToast(modal.id ? 'Alterações salvas.' : modal.kind === 'fill' ? 'Abastecimento lançado.' : `${SINGULAR[modal.kind][0].toUpperCase()}${SINGULAR[modal.kind].slice(1)} cadastrado.`);
    } catch (err) {
      setFormError((err as RequestError).message);
    } finally {
      setBusy(false);
    }
  }

  async function generateLink(member: Row) {
    setLinkBusy(member.id);
    try {
      const res = await request('/api/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'member', id: member.id, values: { name: member.name, email: member.email, role: member.role, active: member.active, newInvite: true } }),
      }, 15000);
      await load(false, true);
      if (res.invite) setInviteResult({ name: member.name, ...res.invite });
    } catch (err) {
      setToast((err as RequestError).message);
    } finally {
      setLinkBusy('');
    }
  }

  function exportCsv() {
    const list = institution ? fills : monthFills;
    const esc = (x: unknown) => `"${String(x ?? '').replace(/"/g, '""')}"`;
    const dec = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
    const header = ['Data', 'Instituição', 'Placa', 'Veículo', 'Motorista', 'Combustível', 'Litros', 'Preço por litro (R$)', 'Total (R$)', 'Odômetro', 'Km rodados', 'Média (km/L)', 'Esperado (km/L)', 'Colaborador'];
    const body = [...list].reverse().map((x) => [x.date, instName(x), x.plate, x.vehicle, x.driver, x.fuel, String(x.liters).replace('.', ','), dec(x.priceCents / 100), dec(x.totalCents / 100), x.km, x.distanceKm ?? '', x.kmPerLiter != null ? dec(x.kmPerLiter) : '', x.expectedKmPerLiter != null ? dec(x.expectedKmPerLiter) : '', x.attendant]);
    body.push(['TOTAL', '', '', '', '', '', '', '', dec(list.reduce((a, b) => a + b.totalCents, 0) / 100), '', '', '', '', '']);
    const url = URL.createObjectURL(new Blob(['﻿' + [header, ...body].map((r) => r.map(esc).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `controle-de-transporte-fechamento-${month}${institution ? '-' + (instById.get(institution)?.name ?? '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!user) {
    return (
      <main className="loading-screen">
        {error ? (
          <div className="loading-card">
            <p role="alert" className="notice notice-error">{error}</p>
            <button className="btn" onClick={() => void load()}><RefreshCw size={16} aria-hidden="true" /> Tentar de novo</button>
          </div>
        ) : (
          <p role="status"><RefreshCw className="spin" size={18} aria-hidden="true" /> Carregando o painel…</p>
        )}
      </main>
    );
  }

  const initials = String(user.name || 'AD').split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const pageIsKind = !['overview', 'report', 'workshop'].includes(page);
  const listKind = page as Kind;

  const monthSelect = <InlineSelect label="Mês" value={month} onValueChange={setMonth} options={MONTHS.map((m) => ({ value: m, label: monthLabel(m) }))} />;
  const institutionSelect = <InlineSelect label="Instituição" value={institution} onValueChange={setInstitution} options={[{ value: '', label: 'Todas as instituições' }, ...inst.map((x) => ({ value: x.id, label: x.name }))]} />;

  const fuelTag = (name: string) => <span className="tag">{name}</span>;

  const fillsTable = (list: Row[], compact = false) => list.length ? (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Data</th>
            <th scope="col">Placa</th>
            <th scope="col">Veículo</th>
            <th scope="col">Instituição</th>
            <th scope="col">Combustível</th>
            {!compact && <th scope="col" className="num">Preço/L</th>}
            <th scope="col" className="num">Litros</th>
            {!compact && <th scope="col" className="num">Odômetro</th>}
            {!compact && <th scope="col" className="num">Média</th>}
            {!compact && <th scope="col">Lançado por</th>}
            <th scope="col" className="num total-cell">Total</th>
          </tr>
        </thead>
        <tbody>
          {list.map((x) => (
            <tr key={x.id}>
              <td data-label="Data">{dateBR(x.date).slice(0, 5)}</td>
              <td data-label="Placa"><span className="plate">{x.plate}</span></td>
              <td data-label="Veículo" className="strong clip" title={x.vehicle}>{x.vehicle}{x.driver ? <small>{x.driver}</small> : null}</td>
              <td data-label="Instituição" className="clip" title={instName(x)}>{instName(x)}</td>
              <td data-label="Combustível">{fuelTag(x.fuel)}</td>
              {!compact && <td data-label="Preço/L" className="num">{money(x.priceCents)}</td>}
              <td data-label="Litros" className="num">{num(x.liters)} L</td>
              {!compact && <td data-label="Odômetro" className="num">{num(x.km, 0)} km</td>}
              {!compact && <td data-label="Média" className="num"><ConsumptionTag fill={x} /></td>}
              {!compact && <td data-label="Lançado por" title={x.attendant}>{String(x.attendant || '').split(' ')[0]}</td>}
              <td data-label="Total" className="num strong total-cell">{money(x.totalCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="empty">
      <Fuel size={28} aria-hidden="true" />
      <h3>{q ? 'Nenhum abastecimento encontrado' : `Nenhum abastecimento em ${monthLabel(month)}`}</h3>
      <p>{q ? 'Confira a placa ou o nome buscado.' : 'Os lançamentos dos colaboradores aparecem aqui automaticamente.'}</p>
      {!q && <button className="btn btn-primary" onClick={() => open('fill')}><Plus size={16} aria-hidden="true" /> Novo abastecimento</button>}
    </div>
  );

  const fillsPerVehicle: Record<string, number> = {};
  for (const f of monthFills) fillsPerVehicle[f.vehicleId] = (fillsPerVehicle[f.vehicleId] ?? 0) + 1;

  const listColumns: Record<Kind, { label: string; cell: (x: Row) => ReactNode; num?: boolean }[]> = {
    fill: [],
    institution: [
      { label: 'Nome', cell: (x) => <span className="strong">{x.name}</span> },
      { label: 'CPF / CNPJ', cell: (x) => x.document || '—' },
      { label: 'Contato', cell: (x) => x.contact || '—' },
      { label: 'Veículos', num: true, cell: (x) => vehicles.filter((v) => v.institutionId === x.id).length },
      { label: `Total em ${monthLabel(month).split(' ')[0]}`, num: true, cell: (x) => money(monthFills.filter((f) => f.institutionId === x.id).reduce((a, b) => a + b.totalCents, 0)) },
    ],
    vehicle: [
      { label: 'Placa', cell: (x) => <span className="plate">{x.plate}</span> },
      { label: 'Modelo', cell: (x) => <span className="strong">{x.name}</span> },
      { label: 'Instituição', cell: (x) => instById.get(x.institutionId)?.name ?? '—' },
      { label: 'Consumo esperado', num: true, cell: (x) => (x.kmPerLiter ? `${num(x.kmPerLiter, 2)} km/L` : <span className="tag tag-warn">Informar</span>) },
      { label: 'Último km', num: true, cell: (x) => (x.lastKm != null ? `${num(x.lastKm, 0)} km` : '—') },
      { label: 'Abastecimentos no mês', num: true, cell: (x) => fillsPerVehicle[x.id] ?? 0 },
    ],
    person: [
      { label: 'Nome', cell: (x) => <span className="strong">{x.name}</span> },
      { label: 'CPF / documento', cell: (x) => x.document || '—' },
      { label: 'Contato', cell: (x) => x.contact || '—' },
    ],
    contract: [
      { label: 'Contrato', cell: (x) => <span className="strong">{x.name}</span> },
      { label: 'Instituição', cell: (x) => instById.get(x.institutionId)?.name ?? '—' },
      { label: 'Responsável', cell: (x) => rows('person').find((p) => p.id === x.personId)?.name ?? '—' },
      { label: 'Veículo', cell: (x) => vehicles.find((v) => v.id === x.vehicleId)?.plate ?? 'Todos' },
      { label: 'Vigência', cell: (x) => `${dateBR(x.start)} a ${dateBR(x.end)}` },
    ],
    fuel: [
      { label: 'Combustível', cell: (x) => <span className="strong">{x.name}</span> },
      { label: 'Preço por litro', num: true, cell: (x) => money(x.priceCents) },
    ],
    member: [
      { label: 'Nome', cell: (x) => <span className="strong">{x.name || '—'}</span> },
      { label: 'E-mail', cell: (x) => x.email },
      { label: 'Perfil', cell: (x) => <span className={x.role === 'admin' ? 'tag tag-brand' : 'tag'}>{x.role === 'admin' ? 'Administrador' : 'Colaborador'}</span> },
      { label: 'Situação', cell: (x) => !x.active ? <span className="tag tag-muted">Desativado</span>
        : x.inviteExpiresAt && new Date(x.inviteExpiresAt) > new Date() ? <span className="tag tag-warn">Convite pendente · até {new Date(x.inviteExpiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        : !x.hasPassword ? <span className="tag tag-muted">Convite expirado</span>
        : <span className="tag">Ativo</span> },
    ],
  };

  const list = pageIsKind && page !== 'fill' ? rows(page).filter((x) => !q || JSON.stringify(x).toLowerCase().includes(q)) : [];

  const bind = (key: string) => ({ name: key, value: form[key] ?? '', error: fieldErrors[key], onValueChange: (v: string) => set(key, v) });
  const toOptions = (list: Row[], label: (x: Row) => string = (x) => x.name) => list.map((x) => ({ value: x.id, label: label(x) }));

  const formVehicle = vehicles.find((v) => v.id === form.vehicleId);
  const formFuel = fuels.find((f) => f.id === form.fuelId);
  const formTotal = Math.round(Number(form.liters || 0) * (formFuel?.priceCents || 0));

  const modalBody = modal && (modal.kind === 'fill' ? (
    <>
      <Select {...bind('vehicleId')} label="Veículo" placeholder="Selecione o veículo" full
        options={toOptions(vehicles, (x) => `${x.plate} · ${x.name}`)}
        hint={formVehicle ? `${instById.get(formVehicle.institutionId)?.name ?? 'Sem instituição'}${formVehicle.kmPerLiter ? ` · consumo esperado ${num(formVehicle.kmPerLiter, 2)} km/L` : ''}` : undefined} />
      <div className="field-full">
        <OptionCards name="fuelId" label="Combustível" value={form.fuelId ?? ''} error={fieldErrors.fuelId} onValueChange={(v) => set('fuelId', v)}
          options={fuels.map((f) => ({ value: f.id, label: f.name, detail: `${money(f.priceCents)}/L` }))} />
      </div>
      <Input {...bind('liters')} label="Litros" type="number" min={0.001} max={10000} step={0.001} inputMode="decimal" />
      <Input {...bind('km')} label="Odômetro (km)" type="number" min={0} max={9999999} step={1} inputMode="numeric"
        placeholder={formVehicle?.lastKm != null ? String(formVehicle.lastKm) : undefined}
        hint={formVehicle ? <OdometerBadge km={formVehicle.lastKm} /> : undefined} />
      <ConsumptionPreview vehicle={formVehicle} km={Number(form.km)} liters={Number(form.liters)} />
      <Input {...bind('date')} label="Data" type="date" max={today()} />
      <Input {...bind('driver')} label="Motorista" optional maxLength={200} autoComplete="off" />
      <Input {...bind('note')} label="Observação" optional full maxLength={200} />
      <div className="form-summary field-full" aria-live="polite">
        <span>{formFuel ? `${num(Number(form.liters || 0))} L × ${money(formFuel.priceCents)}` : 'O valor é calculado com o preço vigente.'}</span>
        <strong>{money(formTotal)}</strong>
      </div>
      {(!vehicles.length || !fuels.length) && <p className="notice notice-warn field-full">Cadastre ao menos um veículo e um combustível antes de lançar.</p>}
    </>
  ) : (
    <>
      <Input {...bind('name')} label={modal.kind === 'vehicle' ? 'Modelo / descrição' : modal.kind === 'contract' ? 'Identificação do contrato' : modal.kind === 'fuel' ? 'Combustível' : 'Nome'}
        maxLength={200} full={modal.kind !== 'vehicle' && modal.kind !== 'member'} />
      {modal.kind === 'vehicle' && <>
        <Input {...bind('plate')} label="Placa" maxLength={8} autoCapitalize="characters" hint="Ex.: ABC1D23 ou ABC1234" />
        <Select {...bind('institutionId')} label="Instituição" options={toOptions(inst)} />
        <Input {...bind('kmPerLiter')} label="Consumo esperado (km/L)" type="number" min={0.5} max={100} step={0.01} inputMode="decimal" placeholder="Ex.: 10,5" />
        <p className="hint field-full">O consumo esperado é a referência para conferir a média de cada abastecimento deste veículo.</p>
      </>}
      {(modal.kind === 'institution' || modal.kind === 'person') && <>
        <Input {...bind('document')} label={modal.kind === 'institution' ? 'CNPJ / CPF' : 'CPF / documento'} optional />
        <Input {...bind('contact')} label="Contato" optional />
      </>}
      {modal.kind === 'fuel' && (
        <Input {...bind('price')} label="Preço por litro (R$)" type="number" min={0.01} max={100} step={0.01} inputMode="decimal"
          hint="Vale para os próximos lançamentos; o histórico mantém o preço original." />
      )}
      {modal.kind === 'member' && <>
        <Input {...bind('email')} label="E-mail de acesso" type="email" autoComplete="off" />
        <Select {...bind('role')} label="Perfil de acesso" placeholder="" full
          options={[{ value: 'attendant', label: 'Colaborador — abastecimentos e Oficina' }, { value: 'admin', label: 'Administrador — acesso completo' }]} />
        {!modal.id && <p className="hint field-full">Ao salvar, o sistema gera um link de convite válido por 3 horas. Envie o link para a pessoa criar a própria senha.</p>}
        {modal.id && (
          <Select {...bind('active')} label="Acesso" placeholder=""
            options={[{ value: 'true', label: 'Ativo — pode entrar no sistema' }, { value: 'false', label: 'Desativado — não consegue entrar' }]} />
        )}
      </>}
      {modal.kind === 'contract' && <>
        <Select {...bind('institutionId')} label="Instituição" options={toOptions(inst)} full />
        <Select {...bind('personId')} label="Pessoa responsável" options={toOptions(rows('person'))} optional />
        <Select {...bind('vehicleId')} label="Veículo" optional placeholder={form.institutionId ? 'Todos os veículos' : 'Escolha a instituição antes'}
          options={toOptions(vehicles.filter((x) => x.institutionId === form.institutionId), (x) => `${x.plate} · ${x.name}`)} />
        <Input {...bind('start')} label="Início da vigência" type="date" />
        <Input {...bind('end')} label="Fim da vigência" type="date" />
        <Input {...bind('note')} label="Condições / observações" optional full />
      </>}
    </>
  ));

  const days = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const isCurrentMonth = month === today().slice(0, 7);
  const todayDay = Number(today().slice(8, 10));
  const perDay = Array.from({ length: days }, (_, i) => fills.filter((x) => Number(x.date.slice(8, 10)) === i + 1).reduce((a, b) => a + b.liters, 0));
  const scale = niceScale(Math.max(0, ...perDay));
  const ticks = Array.from({ length: Math.round(scale.top / scale.step) + 1 }, (_, i) => scale.top - i * scale.step);

  const statementInst = institution ? instById.get(institution) : null;

  const header = (
    <header className="page-header">
      <div>
        <h1>{page === 'report' && statementInst ? statementInst.name : TITLES[page]}</h1>
        <p>
          {page === 'overview' && `Abastecimentos de ${monthLabel(month)}${institution ? ` · ${instById.get(institution)?.name}` : ''}`}
          {page === 'fill' && `${searchedFills.length} de ${fills.length} lançamentos em ${monthLabel(month)}`}
          {page === 'report' && (statementInst ? `Extrato de ${monthLabel(month)}${statementInst.document ? ` · ${statementInst.document}` : ''}` : `Totais a faturar por instituição em ${monthLabel(month)}`)}
          {pageIsKind && page !== 'fill' && `${rows(page).length} ${rows(page).length === 1 ? 'cadastro' : 'cadastros'}`}
          {page === 'workshop' && 'Estoque de peças, entradas, uso previsto e entregas por veículo'}
        </p>
      </div>
    </header>
  );

  const toolbar = page === 'workshop' ? null : (
    <Toolbar
      actions={page === 'report' ? <>
        <button className="btn" onClick={() => window.print()} disabled={!fills.length}><Printer size={16} aria-hidden="true" /> Imprimir / PDF</button>
        <button className="btn btn-primary" onClick={exportCsv} disabled={!fills.length}><Download size={16} aria-hidden="true" /> Exportar planilha</button>
      </> : page === 'overview' || page === 'fill' ? (
        <button className="btn btn-primary" onClick={() => open('fill')}><Plus size={16} aria-hidden="true" /> Novo abastecimento</button>
      ) : pageIsKind ? (
        <button className="btn btn-primary" onClick={() => open(listKind)}><Plus size={16} aria-hidden="true" /> Cadastrar {SINGULAR[listKind]}</button>
      ) : undefined}
    >
      {page === 'fill' && <SearchInput label="Buscar abastecimentos" placeholder="Placa, veículo, instituição ou motorista" value={query} onValueChange={setQuery} />}
      {pageIsKind && page !== 'fill' && <SearchInput label={`Buscar em ${TITLES[page].toLowerCase()}`} value={query} onValueChange={setQuery} />}
      {(page === 'overview' || page === 'fill' || page === 'report') && <>{monthSelect}{institutionSelect}</>}
    </Toolbar>
  );

  const kpis = (
    <section className="kpis" aria-label="Indicadores do mês">
      <Card className="kpi"><h2>Valor total</h2><strong><Counter value={total / 100} decimals={2} prefix="R$ " /></strong><p>{liters ? `Preço médio ${money(Math.round(total / liters))} por litro` : 'Sem lançamentos no período'}</p></Card>
      <Card className="kpi"><h2>Abastecimentos</h2><strong><Counter value={fills.length} /></strong><p>{fills.length ? `Média de ${num(liters / fills.length, 1)} L por abastecimento` : '—'}</p></Card>
      <Card className="kpi"><h2>Litros abastecidos</h2><strong><Counter value={Math.round(liters * 100) / 100} decimals={2} /><span className="unit"> L</span></strong><p>{Array.from(new Set(fills.map((x) => x.fuel))).join(', ') || '—'}</p></Card>
      <Card className="kpi"><h2>Veículos atendidos</h2><strong><Counter value={new Set(fills.map((x) => x.plate)).size} /></strong><p>em {groups.length} {groups.length === 1 ? 'instituição' : 'instituições'}</p></Card>
    </section>
  );

  return (
    <div className="shell">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <div className="mobile-bar">
        <button className="icon-btn" aria-label="Abrir menu" aria-expanded={navOpen} aria-controls="menu-lateral" onClick={() => setNavOpen(true)}><Menu size={20} aria-hidden="true" /></button>
        <strong>{TITLES[page]}</strong>
        <span className={syncError ? 'sync-dot is-error' : 'sync-dot'} role="img" aria-label={syncError ? 'Sincronização interrompida' : 'Sincronizado'} />
      </div>
      {navOpen && <button className="nav-backdrop" aria-label="Fechar menu" onClick={() => setNavOpen(false)} />}
      <aside id="menu-lateral" className={navOpen ? 'sidebar is-open' : 'sidebar'} aria-label="Menu principal">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"><Fuel size={18} /></span>
          <span><strong>Controle de Transporte</strong><small>{user.organization || 'Gestão de abastecimentos'}</small></span>
          <button className="icon-btn nav-close" aria-label="Fechar menu" onClick={() => setNavOpen(false)}><X size={18} aria-hidden="true" /></button>
        </div>
        <nav aria-label="Seções">
          {NAV.map((group, gi) => (
            <div className="nav-group" key={gi}>
              {group.label && <p className="nav-label" id={`nav-${gi}`}>{group.label}</p>}
              <ul aria-labelledby={group.label ? `nav-${gi}` : undefined}>
                {group.items.map((p) => {
                  const I = ICONS[p];
                  return (
                    <li key={p}>
                      <button className="nav-item" aria-current={page === p ? 'page' : undefined} onClick={() => go(p)}>
                        <I size={18} aria-hidden="true" />{TITLES[p]}
                        {p === 'fill' && <span className="nav-count" aria-label={`${monthFills.length} no mês`}>{monthFills.length}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <a className="nav-item" href="/frentista"><ArrowUpRight size={18} aria-hidden="true" />Área do colaborador</a>
          <p className={syncError ? 'sync is-error' : 'sync'} role="status">
            <span className="sync-dot" aria-hidden="true" />
            {syncError ? <>{syncError} <button className="link-btn" onClick={() => void load()}>Tentar de novo</button></> : `Atualizado às ${lastSync}`}
          </p>
          <div className="me">
            <span className="avatar" aria-hidden="true">{initials}</span>
            <span><strong>{user.name}</strong><small>Administrador</small></span>
            <button className="icon-btn" onClick={() => void signOut()} aria-label="Sair"><LogOut size={18} aria-hidden="true" /></button>
          </div>
        </div>
      </aside>

      <main id="conteudo" className="content" tabIndex={-1}>
        {page === 'report' && statementInst && (
          <button className="back-link" onClick={() => setInstitution('')}><ChevronLeft size={16} aria-hidden="true" /> Todas as instituições</button>
        )}
        {header}
        {toolbar}

        {page === 'workshop' && <Workshop data={data} onRefresh={() => load(true, true)} canDelete />}

        {page === 'overview' && <>
          <Reveal>{kpis}</Reveal>
          <div className="overview-grid">
            <Card className="panel">
              <div className="panel-head">
                <div><h2>Litros por dia</h2><p>{monthLabel(month)} · {num(liters, 2)} L no mês</p></div>
                <button className="link-btn" onClick={() => go('fill')}>Ver abastecimentos</button>
              </div>
              <div className="chart" role="img" aria-label={`Litros por dia em ${monthLabel(month)}. Maior dia: ${num(Math.max(0, ...perDay))} litros. Total: ${num(liters, 2)} litros.`}>
                <div className="chart-axis" aria-hidden="true">{ticks.map((t) => <span key={t}>{num(t, 0)}</span>)}</div>
                <div className="chart-plot" aria-hidden="true">
                  {ticks.map((t) => <i key={t} className="gridline" style={{ bottom: `${(t / scale.top) * 100}%` }} />)}
                  {perDay.map((v, i) => {
                    const future = isCurrentMonth && i + 1 > todayDay;
                    return (
                      <div className="bar-col" key={i} title={`Dia ${i + 1}: ${num(v)} L`}>
                        {!future && <div className={v ? 'bar' : 'bar bar-empty'} style={v ? { height: `${(v / scale.top) * 100}%` } : undefined} />}
                        {(i === 0 || (i + 1) % 5 === 0) && <small>{i + 1}</small>}
                      </div>
                    );
                  })}
                </div>
                {!fills.length && <p className="chart-empty">Sem abastecimentos neste período.</p>}
              </div>
            </Card>
            <Card className="panel">
              <div className="panel-head">
                <div><h2>Por instituição</h2><p>Valor acumulado no mês</p></div>
                <button className="link-btn" onClick={() => go('report')}>Fechamento mensal</button>
              </div>
              {groups.length ? (
                <ul className="shares">
                  {groups.slice(0, 5).map((g) => (
                    <li key={g.id}>
                      <div><span>{g.name}</span><strong>{money(g.total)}</strong></div>
                      <div className="meter" aria-hidden="true"><i style={{ width: `${total ? (g.total / total) * 100 : 0}%` }} /></div>
                      <small>{num(total ? (g.total / total) * 100 : 0, 1)}% do total · {g.count} {g.count === 1 ? 'abastecimento' : 'abastecimentos'}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty empty-sm">
                  <p>{inst.length ? 'Os totais por instituição aparecem com o primeiro lançamento.' : 'Cadastre as instituições atendidas para separar a cobrança.'}</p>
                  {!inst.length && <button className="btn" onClick={() => open('institution')}>Cadastrar instituição</button>}
                </div>
              )}
            </Card>
          </div>
          <Card className="panel">
            <div className="panel-head">
              <div><h2>Últimos abastecimentos</h2><p>Os lançamentos mais recentes do período</p></div>
              <button className="link-btn" onClick={() => go('fill')}>Ver todos</button>
            </div>
            {fillsTable(fills.slice(0, 6), true)}
          </Card>
        </>}

        {page === 'fill' && (
          <Card className="panel">
            {fillsTable(searchedFills)}
          </Card>
        )}

        {page === 'report' && !statementInst && (
          <Card className="panel">
            {monthGroups.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Instituição</th>
                      <th scope="col" className="num">Veículos</th>
                      <th scope="col" className="num">Abastecimentos</th>
                      <th scope="col" className="num">Litros</th>
                      <th scope="col" className="num total-cell">Total a faturar</th>
                      <th scope="col"><span className="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthGroups.map((g) => (
                      <tr key={g.id}>
                        <td data-label="Instituição" className="strong">{g.name}</td>
                        <td data-label="Veículos" className="num">{g.cars}</td>
                        <td data-label="Abastecimentos" className="num">{g.count}</td>
                        <td data-label="Litros" className="num">{num(g.liters, 2)} L</td>
                        <td data-label="Total a faturar" className="num strong total-cell">{money(g.total)}</td>
                        <td className="row-action"><button className="btn btn-sm" onClick={() => setInstitution(g.id)}>Ver extrato</button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row">Total do mês</th>
                      <td className="num">{new Set(monthFills.map((x) => x.plate)).size}</td>
                      <td className="num">{monthFills.length}</td>
                      <td className="num">{num(monthFills.reduce((a, b) => a + b.liters, 0), 2)} L</td>
                      <td className="num total-cell">{money(monthFills.reduce((a, b) => a + b.totalCents, 0))}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="empty">
                <ClipboardList size={28} aria-hidden="true" />
                <h3>Nada para faturar em {monthLabel(month)}</h3>
                <p>Escolha outro mês ou aguarde os lançamentos dos colaboradores.</p>
              </div>
            )}
          </Card>
        )}

        {page === 'report' && statementInst && (
          <Card className="panel statement">
            <dl className="statement-meta">
              <div><dt>Instituição</dt><dd>{statementInst.name}</dd></div>
              <div><dt>CNPJ / CPF</dt><dd>{statementInst.document || '—'}</dd></div>
              <div><dt>Contato</dt><dd>{statementInst.contact || '—'}</dd></div>
              <div><dt>Período</dt><dd>{monthLabel(month)}</dd></div>
              <div><dt>Abastecimentos</dt><dd>{fills.length} · {num(liters, 2)} L</dd></div>
              <div className="statement-total"><dt>Total a faturar</dt><dd>{money(total)}</dd></div>
            </dl>
            {fillsTable([...fills].reverse())}
          </Card>
        )}

        {pageIsKind && page !== 'fill' && (
          <Card className="panel">
            {page === 'member' && <p className="note">Cada pessoa entra com o próprio e-mail e senha. Ao cadastrar alguém, o sistema gera um link de convite (válido por 3 horas e de uso único) para a pessoa criar a senha. Use “Gerar link” para reenviar um convite expirado ou para quem esqueceu a senha.</p>}
            {page === 'fuel' && <p className="note">Um novo preço vale para os próximos lançamentos. Os abastecimentos já registrados mantêm o preço original.</p>}
            {list.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      {listColumns[listKind].map((c) => <th key={c.label} scope="col" className={c.num ? 'num' : undefined}>{c.label}</th>)}
                      <th scope="col"><span className="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((x) => (
                      <tr key={x.id}>
                        {listColumns[listKind].map((c) => <td key={c.label} data-label={c.label} className={c.num ? 'num' : undefined}>{c.cell(x)}</td>)}
                        <td className="row-action">
                          {page === 'member' && x.active && (
                            <button className="btn btn-sm" onClick={() => void generateLink(x)} disabled={linkBusy === x.id} aria-label={`Gerar link de acesso para ${x.name}`}>
                              {linkBusy === x.id ? <RefreshCw className="spin" size={14} aria-hidden="true" /> : <Link2 size={14} aria-hidden="true" />} Gerar link
                            </button>
                          )}{' '}
                          <button className="btn btn-sm" onClick={() => open(listKind, x)} aria-label={`Editar ${x.plate || x.name || x.email}`}><Pencil size={14} aria-hidden="true" /> Editar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">
                <Plus size={28} aria-hidden="true" />
                <h3>{q ? 'Nada encontrado' : `Nenhum ${SINGULAR[listKind]} cadastrado`}</h3>
                <p>{q ? 'Tente outro termo de busca.' : page === 'vehicle' && !inst.length ? 'Cadastre uma instituição antes de vincular veículos.' : `Cadastre ${page === 'person' || page === 'institution' ? 'a primeira' : 'o primeiro'} para organizar a operação.`}</p>
                {!q && (page === 'vehicle' && !inst.length
                  ? <button className="btn btn-primary" onClick={() => open('institution')}>Cadastrar instituição</button>
                  : <button className="btn btn-primary" onClick={() => open(listKind)}>Cadastrar {SINGULAR[listKind]}</button>)}
              </div>
            )}
          </Card>
        )}
      </main>

      <div className="toast-region" aria-live="polite">
        {toast && <div className="toast"><CheckCircle2 size={18} aria-hidden="true" />{toast}</div>}
      </div>

      {inviteResult && (
        <Dialog title="Link de acesso gerado" onClose={() => setInviteResult(null)}>
          <InviteLink invite={inviteResult} />
        </Dialog>
      )}

      {modal && (
        <Dialog title={modal.id ? `Editar ${SINGULAR[modal.kind]}` : modal.kind === 'fill' ? 'Novo abastecimento' : `Cadastrar ${SINGULAR[modal.kind]}`} onClose={() => setModal(null)} busy={busy}>
          <form onSubmit={save} noValidate>
            <fieldset className="form-grid" disabled={busy}>{modalBody}</fieldset>
            {formError && <p role="alert" className="notice notice-error">{formError}</p>}
            <div className="modal-actions">
              <button type="button" className="btn" onClick={(e) => e.currentTarget.closest('dialog')?.close()} disabled={busy}>Cancelar</button>
              <button className="btn btn-primary" disabled={busy}>{busy ? <><RefreshCw className="spin" size={16} aria-hidden="true" /> Salvando…</> : modal.id ? 'Salvar alterações' : modal.kind === 'fill' ? 'Lançar abastecimento' : `Salvar ${SINGULAR[modal.kind]}`}</button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
