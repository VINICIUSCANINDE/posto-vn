'use client';

import { useRef, useState, type FormEvent } from 'react';
import { ArrowDownLeft, ArrowUpRight, Car, CheckCircle2, ClipboardList, Download, Package, Plus, RefreshCw, Trash2, Undo2, X } from 'lucide-react';
import { Card, Counter } from '../components/brand';
import { Dialog } from '../components/dialog';
import { InlineSelect, Input, Select, SearchInput } from '../components/form';
import { Toolbar } from '../components/toolbar';
import { collectErrors, dateBR, request, today, type Row, focusField } from './request';

type Action = 'part' | 'in' | 'plan' | 'out' | 'return';
type Tab = 'stock' | 'movements' | 'plans' | 'received';

const qty = (units: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format((units || 0) / 1000);
const ACTION_TITLES: Record<Action, string> = { part: 'Cadastrar peça', in: 'Registrar entrada de peças', plan: 'Planejar uso no veículo', out: 'Registrar entrega / saída', return: 'Devolver sobra ao estoque' };
const TABS: { id: Tab; label: string; title: string; description: string }[] = [
  { id: 'stock', label: 'Estoque', title: 'Estoque de peças', description: 'Saldos atualizados a cada entrada e saída registrada.' },
  { id: 'movements', label: 'Entradas e saídas', title: 'Entradas e saídas', description: 'Entradas, saídas e devoluções de sobra ao estoque.' },
  { id: 'plans', label: 'Uso previsto', title: 'Peças previstas por veículo', description: 'O planejamento não retira nem reserva peças. A baixa acontece na entrega.' },
  { id: 'received', label: 'Veículos atendidos', title: 'Peças recebidas pelos veículos', description: 'O que cada veículo recebeu, o que voltou como sobra e o que foi realmente usado.' },
];
const UNITS = ['un', 'jogo', 'kit', 'L', 'kg', 'm'];

export default function Workshop({ data, onRefresh, canDelete = false }: { data: Row[]; onRefresh: () => Promise<unknown>; canDelete?: boolean }) {
  const [tab, setTab] = useState<Tab>('stock');
  const [query, setQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [action, setAction] = useState<Action | null>(null);
  const [form, setForm] = useState<Row>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleting, setDeleting] = useState<Row | null>(null);
  const lock = useRef(false);

  const rows = (kind: string) => data.filter((x) => x.kind === `workshop_${kind}`);
  // Peças excluídas saem do estoque e das seleções; o histórico continua com os dados gravados em cada movimento.
  const parts = rows('part').filter((x) => !x.deleted), plans = rows('plan'), ins = rows('in'), outs = rows('out'), returns = rows('return');
  // Quanto de cada saída já voltou ao estoque; o que sobra pode ser devolvido.
  const returnedOf = (outId: string) => returns.filter((x) => x.outId === outId).reduce((sum, x) => sum + x.quantityUnits, 0);
  const returnable = (o: Row) => o.quantityUnits - returnedOf(o.id);
  const openOuts = outs.filter((o) => returnable(o) > 0 && parts.some((p) => p.id === o.partId)).sort((a, b) => b.created.localeCompare(a.created));
  const returningOut = outs.find((x) => x.id === form.outId);
  const vehicles = data.filter((x) => x.kind === 'vehicle');
  const part = parts.find((x) => x.id === form.partId);
  const destination = vehicles.find((x) => x.id === form.vehicleId);
  const movements: Row[] = [...ins.map((x): Row => ({ ...x, direction: 'in' })), ...outs.map((x): Row => ({ ...x, direction: 'out' })), ...returns.map((x): Row => ({ ...x, direction: 'return' }))].sort((a, b) => b.created.localeCompare(a.created));
  const q = query.trim().toLowerCase();
  const matches = (x: Row) => `${x.name || x.part || ''} ${x.code || ''} ${x.plate || ''} ${x.vehicle || ''} ${x.institution || ''} ${x.receiver || ''} ${x.returnedBy || ''}`.toLowerCase().includes(q) && (!vehicleFilter || x.vehicleId === vehicleFilter);
  const openPlans = plans.filter((x) => x.remainingUnits > 0);
  const pendingPlates = (partId: string) => Array.from(new Set(plans.filter((p) => p.partId === partId && p.remainingUnits > 0).map((p) => p.plate)));
  const partPlans = plans.filter((x) => x.partId === form.partId && x.vehicleId === form.vehicleId && x.remainingUnits > 0);
  const current = TABS.find((t) => t.id === tab)!;

  function open(kind: Action, initial: Row = {}) {
    setForm({ date: today(), unit: 'un', minimum: '0', ...initial });
    setErrors({});
    setError('');
    setNotice('');
    setAction(kind);
  }
  function change(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value, ...(key === 'partId' || key === 'vehicleId' ? { planId: '' } : {}) }));
    setError('');
    if (errors[key]) setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lock.current || !action) return;
    const found = collectErrors(e.currentTarget);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) { focusField(e.currentTarget, first); return; }
    const formEl = e.currentTarget;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await request('/api/workshop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, values: form }) }, 15000);
      setNotice(action === 'return' ? `Devolução registrada: ${form.quantity} ${returningOut?.unit ?? ''} de ${returningOut?.part ?? 'peça'} voltaram ao estoque.`
        : action === 'out' ? `Saída registrada para a placa ${destination?.plate}. Estoque e recebimento atualizados.`
        : action === 'in' ? 'Entrada registrada. Estoque atualizado.'
        : action === 'plan' ? `Uso previsto registrado para a placa ${destination?.plate}. Nenhuma peça saiu do estoque.`
        : 'Peça cadastrada. Registre uma entrada para formar o estoque.');
      formEl.closest('dialog')?.close();
      await onRefresh();
    } catch (err) {
      setError((err as Error).message || 'Não foi possível salvar. Confira o histórico antes de tentar novamente.');
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }

  async function removePart(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!deleting || lock.current) return;
    const formEl = e.currentTarget;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await request('/api/workshop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deletePart', values: { partId: deleting.id } }) }, 15000);
      setNotice(`Peça ${deleting.name} excluída do estoque. O histórico de movimentações foi mantido.`);
      formEl.closest('dialog')?.close();
      await onRefresh();
    } catch (err) {
      setError((err as Error).message || 'Não foi possível excluir. Tente novamente.');
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }

  function download() {
    const list = tab === 'stock' ? parts.filter(matches) : tab === 'plans' ? plans.filter(matches) : tab === 'received' ? outs.filter(matches) : movements.filter(matches);
    const header = tab === 'stock' ? ['Código', 'Peça', 'Unidade', 'Saldo', 'Mínimo', 'Placas com uso previsto']
      : tab === 'plans' ? ['Placa de destino', 'Veículo', 'Peça', 'Previsto', 'Entregue', 'Pendente', 'Data prevista']
      : tab === 'received' ? ['Data', 'Placa de destino', 'Veículo', 'Peça', 'Entregue', 'Devolvido', 'Usado', 'Recebedor', 'Instituição']
      : ['Data', 'Movimento', 'Peça', 'Quantidade', 'Placa de destino', 'Veículo de destino', 'Fornecedor / recebedor / quem devolveu', 'Documento'];
    const body = list.map((x) => tab === 'stock' ? [x.code, x.name, x.unit, qty(x.balanceUnits), qty(x.minimumUnits), pendingPlates(x.id).join(', ')]
      : tab === 'plans' ? [x.plate, x.vehicle, x.part, qty(x.quantityUnits), qty(x.quantityUnits - x.remainingUnits), qty(x.remainingUnits), x.date]
      : tab === 'received' ? [x.date, x.plate, x.vehicle, x.part, `${qty(x.quantityUnits)} ${x.unit}`, `${qty(returnedOf(x.id))} ${x.unit}`, `${qty(returnable(x))} ${x.unit}`, x.receiver, x.institution]
      : [x.date, x.direction === 'in' ? 'Entrada' : x.direction === 'return' ? 'Devolução' : 'Saída', x.part, `${x.direction === 'out' ? '-' : ''}${qty(x.quantityUnits)} ${x.unit}`, x.plate || '', x.vehicle || '', x.supplier || x.receiver || x.returnedBy || '', x.document || '']);
    const esc = (v: unknown) => { const s = String(v ?? ''); return `"${/^[=+\-@\t\r]/.test(s) ? "'" : ''}${s.replace(/"/g, '""')}"`; };
    const url = URL.createObjectURL(new Blob(['﻿' + [header, ...body].map((r) => r.map(esc).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `controle-de-transporte-oficina-${tab}-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const partOptions = parts.map((x) => ({ value: x.id, label: `${x.code} · ${x.name}` }));
  const vehicleOptions = vehicles.map((x) => ({ value: x.id, label: `${x.plate} · ${x.name}` }));
  const field = (key: string) => ({ name: key, value: form[key] ?? '', error: errors[key], onValueChange: (v: string) => change(key, v) });
  const emptyState = (icon: typeof Package, title: string, text: string, cta?: { label: string; action: Action }) => {
    const Icon = icon;
    return (
      <div className="empty">
        <Icon size={28} aria-hidden="true" />
        <h3>{title}</h3>
        <p>{text}</p>
        {cta && <button className="btn btn-primary" onClick={() => open(cta.action)}>{cta.label}</button>}
      </div>
    );
  };

  return (
    <div className="workshop">
      <Toolbar actions={<>
        <button className="btn" onClick={() => open('part')}><Plus size={16} aria-hidden="true" /> Cadastrar peça</button>
        <button className="btn" onClick={() => open('in')}><ArrowDownLeft size={16} aria-hidden="true" /> Entrada</button>
        <button className="btn" onClick={() => open('plan')}><ClipboardList size={16} aria-hidden="true" /> Planejar uso</button>
        <button className="btn" onClick={() => open('return', { fromToolbar: true })} disabled={!openOuts.length}><Undo2 size={16} aria-hidden="true" /> Devolver sobra</button>
        <button className="btn btn-primary" onClick={() => open('out')}><ArrowUpRight size={16} aria-hidden="true" /> Registrar saída</button>
      </>}>
        <SearchInput label="Buscar na oficina" placeholder="Peça, código, placa ou recebedor" value={query} onValueChange={setQuery} />
        {tab !== 'stock' && <InlineSelect label="Filtrar por veículo" value={vehicleFilter} onValueChange={setVehicleFilter} options={[{ value: '', label: 'Todos os veículos' }, ...vehicleOptions]} />}
      </Toolbar>

      {notice && (
        <p className="notice notice-success" role="status">
          <CheckCircle2 size={18} aria-hidden="true" /> {notice}
          <button className="icon-btn" aria-label="Fechar aviso" onClick={() => setNotice('')}><X size={16} aria-hidden="true" /></button>
        </p>
      )}

      <section className="kpis" aria-label="Resumo da oficina">
        <Card className="kpi"><h2>Peças cadastradas</h2><strong><Counter value={parts.length} /></strong><p>Tipos de peças e materiais</p></Card>
        <Card className="kpi"><h2>Atenção ao estoque</h2><strong><Counter value={parts.filter((x) => x.balanceUnits <= x.minimumUnits).length} /></strong><p>No mínimo ou abaixo dele</p></Card>
        <Card className="kpi"><h2>Usos pendentes</h2><strong><Counter value={openPlans.length} /></strong><p>Planejamentos não concluídos</p></Card>
        <Card className="kpi"><h2>Veículos que receberam</h2><strong><Counter value={new Set(outs.map((x) => x.vehicleId)).size} /></strong><p>Com saídas registradas</p></Card>
      </section>

      <div className="tabs" role="tablist" aria-label="Seções da oficina">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => { setTab(t.id); setQuery(''); setVehicleFilter(''); }}>{t.label}</button>
        ))}
      </div>

      <Card className="panel" role="tabpanel" aria-label={current.title}>
        <div className="panel-head">
          <div><h2>{current.title}</h2><p>{current.description}</p></div>
          <button className="btn btn-sm" onClick={download}><Download size={14} aria-hidden="true" /> Exportar</button>
        </div>

        {tab === 'stock' && (parts.filter(matches).length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th scope="col">Peça</th><th scope="col" className="num">Estoque</th><th scope="col" className="num">Uso pendente</th><th scope="col">Placas com uso previsto</th><th scope="col" className="num">Mínimo</th><th scope="col">Situação</th><th scope="col"><span className="sr-only">Ações</span></th></tr></thead>
              <tbody>
                {parts.filter(matches).map((p) => (
                  <tr key={p.id}>
                    <td data-label="Peça" className="strong">{p.name}<small>{p.code}</small></td>
                    <td data-label="Estoque" className="num strong">{qty(p.balanceUnits)} {p.unit}</td>
                    <td data-label="Uso pendente" className="num">{qty(plans.filter((x) => x.partId === p.id).reduce((s, x) => s + x.remainingUnits, 0))} {p.unit}</td>
                    <td data-label="Placas"><span className="plate">{pendingPlates(p.id).join(', ') || '—'}</span></td>
                    <td data-label="Mínimo" className="num">{qty(p.minimumUnits)} {p.unit}</td>
                    <td data-label="Situação"><span className={p.balanceUnits <= p.minimumUnits ? 'tag tag-warn' : 'tag'}>{p.balanceUnits === 0 ? 'Sem estoque' : p.balanceUnits <= p.minimumUnits ? 'Repor estoque' : 'Disponível'}</span></td>
                    <td className="row-action">
                      <button className="btn btn-sm" onClick={() => open('in', { partId: p.id })}>Entrada</button>{' '}
                      <button className="btn btn-sm" onClick={() => open('out', { partId: p.id })} disabled={!p.balanceUnits}>Saída</button>
                      {canDelete && <>{' '}<button className="btn btn-sm btn-danger-ghost" onClick={() => { setError(''); setDeleting(p); }} aria-label={`Excluir ${p.name}`}><Trash2 size={14} aria-hidden="true" /> Excluir</button></>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : emptyState(Package, q ? 'Nenhuma peça encontrada' : 'Comece cadastrando as peças', 'Depois registre as entradas para formar o estoque inicial.', q ? undefined : { label: 'Cadastrar peça', action: 'part' }))}

        {tab === 'plans' && (plans.filter(matches).length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th scope="col">Placa de destino</th><th scope="col">Peça</th><th scope="col" className="num">Previsto</th><th scope="col" className="num">Entregue</th><th scope="col" className="num">Pendente</th><th scope="col">Data prevista</th><th scope="col">Situação</th><th scope="col"><span className="sr-only">Ações</span></th></tr></thead>
              <tbody>
                {plans.filter(matches).sort((a, b) => b.created.localeCompare(a.created)).map((p) => (
                  <tr key={p.id}>
                    <td data-label="Placa"><span className="plate">{p.plate}</span><small>{p.vehicle} · {p.institution}</small></td>
                    <td data-label="Peça">{p.part}<small>{p.code}</small></td>
                    <td data-label="Previsto" className="num">{qty(p.quantityUnits)} {p.unit}</td>
                    <td data-label="Entregue" className="num">{qty(p.quantityUnits - p.remainingUnits)} {p.unit}</td>
                    <td data-label="Pendente" className="num strong">{qty(p.remainingUnits)} {p.unit}</td>
                    <td data-label="Data prevista">{dateBR(p.date)}</td>
                    <td data-label="Situação"><span className={p.remainingUnits ? 'tag tag-warn' : 'tag'}>{p.remainingUnits === 0 ? 'Entregue' : p.remainingUnits === p.quantityUnits ? 'Previsto' : 'Entrega parcial'}</span></td>
                    <td className="row-action">{p.remainingUnits > 0 && <button className="btn btn-sm" onClick={() => open('out', { partId: p.partId, vehicleId: p.vehicleId, planId: p.id, quantity: String(p.remainingUnits / 1000) })}>Registrar entrega</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : emptyState(ClipboardList, 'Nenhum uso previsto encontrado', 'Informe qual veículo utilizará cada peça e acompanhe a entrega.', q || vehicleFilter ? undefined : { label: 'Planejar uso', action: 'plan' }))}

        {tab === 'received' && (outs.filter(matches).length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th scope="col">Placa de destino</th><th scope="col">Peça recebida</th><th scope="col" className="num">Entregue</th><th scope="col" className="num">Devolvido</th><th scope="col" className="num">Usado</th><th scope="col">Entrega</th><th scope="col">Quem recebeu</th><th scope="col"><span className="sr-only">Ações</span></th></tr></thead>
              <tbody>
                {outs.filter(matches).sort((a, b) => b.created.localeCompare(a.created)).map((p) => (
                  <tr key={p.id}>
                    <td data-label="Placa"><span className="plate">{p.plate}</span><small>{p.vehicle} · {p.institution}</small></td>
                    <td data-label="Peça">{p.part}<small>{p.code}</small></td>
                    <td data-label="Entregue" className="num">{qty(p.quantityUnits)} {p.unit}</td>
                    <td data-label="Devolvido" className="num">{returnedOf(p.id) ? `${qty(returnedOf(p.id))} ${p.unit}` : '—'}</td>
                    <td data-label="Usado" className="num strong">{qty(returnable(p))} {p.unit}</td>
                    <td data-label="Entrega">{dateBR(p.date)}<small>{p.responsible}</small></td>
                    <td data-label="Quem recebeu">{p.receiver}{p.note && <small>{p.note}</small>}</td>
                    <td className="row-action">{returnable(p) > 0 && <button className="btn btn-sm" onClick={() => open('return', { outId: p.id })}><Undo2 size={14} aria-hidden="true" /> Devolver sobra</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : emptyState(Car, 'Nenhum recebimento encontrado', 'O veículo aparece aqui depois de uma saída registrada.'))}

        {tab === 'movements' && (movements.filter(matches).length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th scope="col">Movimento</th><th scope="col">Peça</th><th scope="col" className="num">Quantidade</th><th scope="col">Data</th><th scope="col">Placa de destino</th><th scope="col">Origem / destino</th><th scope="col">Registrado por</th></tr></thead>
              <tbody>
                {movements.filter(matches).map((p) => (
                  <tr key={p.id}>
                    <td data-label="Movimento"><span className={p.direction === 'out' ? 'tag tag-warn' : 'tag tag-brand'}>{p.direction === 'in' ? 'Entrada' : p.direction === 'return' ? 'Devolução' : 'Saída'}</span></td>
                    <td data-label="Peça">{p.part}<small>{p.code}</small></td>
                    <td data-label="Quantidade" className="num strong">{p.direction === 'out' ? '−' : '+'}{qty(p.quantityUnits)} {p.unit}</td>
                    <td data-label="Data">{dateBR(p.date)}</td>
                    <td data-label="Placa">{p.direction !== 'in' ? <><span className="plate">{p.plate}</span><small>{p.vehicle}</small></> : '—'}</td>
                    <td data-label="Origem / destino">{p.direction === 'in' ? (p.supplier || 'Fornecedor não informado') : p.direction === 'return' ? `Sobra devolvida por ${p.returnedBy}` : `Recebeu: ${p.receiver}`}{p.direction === 'in' && p.document && <small>{p.document}</small>}</td>
                    <td data-label="Registrado por">{p.responsible}{p.note && <small>{p.note}</small>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : emptyState(ArrowDownLeft, 'Nenhuma movimentação encontrada', 'Registre entradas e entregas para acompanhar o histórico do estoque.'))}
      </Card>

      {deleting && (
        <Dialog title={`Excluir ${deleting.name}?`} onClose={() => setDeleting(null)} busy={busy}>
          <form onSubmit={removePart}>
            <div className="form-grid">
              <p className="field-full">A peça <strong>{deleting.name}</strong> ({deleting.code}) sai do estoque e não poderá mais receber entradas, saídas ou devoluções.</p>
              {deleting.balanceUnits > 0 && <p className="notice notice-warn field-full">Ainda há {qty(deleting.balanceUnits)} {deleting.unit} em estoque. Esse saldo deixa de ser contado.</p>}
              <p className="hint field-full">As entradas, saídas e devoluções já registradas continuam no histórico.</p>
            </div>
            {error && <p role="alert" className="notice notice-error">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="btn" onClick={(e) => e.currentTarget.closest('dialog')?.close()} disabled={busy}>Cancelar</button>
              <button className="btn btn-danger" disabled={busy}>{busy ? <><RefreshCw className="spin" size={16} aria-hidden="true" /> Excluindo…</> : <><Trash2 size={16} aria-hidden="true" /> Excluir peça</>}</button>
            </div>
          </form>
        </Dialog>
      )}

      {action && (
        <Dialog title={ACTION_TITLES[action]} onClose={() => setAction(null)} busy={busy}>
          <form onSubmit={save} noValidate>
            <fieldset className="form-grid" disabled={busy}>
              {action === 'return' ? (
                <>
                  {form.fromToolbar ? (
                    <Select {...field('outId')} label="Saída que teve sobra" placeholder="Selecione a saída" full
                      options={openOuts.map((o) => ({ value: o.id, label: `${dateBR(o.date)} · ${o.plate} · ${o.part} · pode devolver ${qty(returnable(o))} ${o.unit}` }))} />
                  ) : null}
                  {returningOut && (
                    <div className="form-summary field-full">
                      <span>{returningOut.part} · <span className="plate">{returningOut.plate}</span><br />
                        <small>Saiu {qty(returningOut.quantityUnits)} {returningOut.unit} em {dateBR(returningOut.date)}{returnedOf(returningOut.id) ? ` · já voltaram ${qty(returnedOf(returningOut.id))} ${returningOut.unit}` : ''}</small></span>
                      <strong>até {qty(returnable(returningOut))} {returningOut.unit}</strong>
                    </div>
                  )}
                  <Input {...field('quantity')} label={`Quantidade que sobrou${returningOut ? ` (${returningOut.unit})` : ''}`} type="number" min={0.001}
                    max={returningOut ? returnable(returningOut) / 1000 : undefined} step={0.001} inputMode="decimal" />
                  <Input {...field('date')} label="Data da devolução" type="date" min={returningOut?.date} max={today()} />
                  <Input {...field('returnedBy')} label="Quem devolveu" maxLength={200} full />
                  <Input {...field('note')} label="Observação" maxLength={200} optional full />
                  <p className="hint field-full">A sobra volta para o estoque da peça. A saída original continua no histórico, com o que foi devolvido e o que foi realmente usado.</p>
                </>
              ) : action === 'part' ? (
                <>
                  <Input {...field('name')} label="Nome da peça" maxLength={200} full />
                  <Input {...field('code')} label="Código / referência" maxLength={60} />
                  <Select {...field('unit')} label="Unidade" placeholder="" options={UNITS.map((u) => ({ value: u, label: u }))} />
                  <Input {...field('minimum')} label="Estoque mínimo" type="number" min={0} max={1000000} step={0.001} inputMode="decimal" optional />
                  <Input {...field('note')} label="Observação" maxLength={200} optional />
                </>
              ) : (
                <>
                  <Select {...field('partId')} label="Peça" options={partOptions} placeholder="Selecione a peça" full
                    hint={part ? `Estoque disponível: ${qty(part.balanceUnits)} ${part.unit}` : undefined} />
                  <Input {...field('quantity')} label={`Quantidade${part ? ` (${part.unit})` : ''}`} type="number" min={0.001} max={1000000} step={0.001} inputMode="decimal" />
                  <Input {...field('date')} label={action === 'plan' ? 'Data prevista de uso' : 'Data da movimentação'} type="date" {...(action !== 'plan' ? { max: today() } : {})} />
                  {action !== 'in' && (
                    <Select {...field('vehicleId')} label="Placa do veículo de destino" options={vehicleOptions} placeholder="Selecione a placa" full />
                  )}
                  {action !== 'in' && destination && (
                    <div className="form-summary field-full">
                      <span>Peça destinada ao veículo<br /><small>{destination.name}</small></span>
                      <strong className="plate">{destination.plate}</strong>
                    </div>
                  )}
                  {action === 'in' && (
                    <>
                      <Input {...field('supplier')} label="Fornecedor / origem" maxLength={200} optional />
                      <Input {...field('document')} label="Nota fiscal / documento" maxLength={200} optional />
                      <Input {...field('cost')} label="Custo unitário (R$)" type="number" min={0} step={0.01} inputMode="decimal" optional />
                    </>
                  )}
                  {action === 'out' && (
                    <>
                      <Input {...field('receiver')} label="Nome de quem recebeu" maxLength={200} />
                      <Select {...field('planId')} label="Vincular a um uso previsto" required={false} placeholder="Saída direta, sem planejamento"
                        options={partPlans.map((p) => ({ value: p.id, label: `${dateBR(p.date)} · pendente ${qty(p.remainingUnits)} ${p.unit}` }))} />
                    </>
                  )}
                  <Input {...field('note')} label="Observação / serviço realizado" maxLength={200} optional full />
                  <p className="hint field-full">
                    {action === 'plan' ? 'Este é um uso previsto: o estoque só baixa quando a entrega for registrada.'
                      : action === 'out' ? 'A saída baixa o estoque e registra o recebimento pelo veículo. O registro fica no histórico.'
                      : 'A entrada soma ao estoque da peça.'}
                  </p>
                </>
              )}
            </fieldset>
            {error && <p role="alert" className="notice notice-error">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="btn" onClick={(e) => e.currentTarget.closest('dialog')?.close()} disabled={busy}>Cancelar</button>
              <button className="btn btn-primary" disabled={busy}>{busy ? <><RefreshCw className="spin" size={16} aria-hidden="true" /> Salvando…</> : 'Confirmar registro'}</button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
