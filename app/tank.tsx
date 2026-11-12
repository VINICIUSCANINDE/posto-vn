'use client';

import { useRef, useState, type FormEvent } from 'react';
import { ArrowDownLeft, CheckCircle2, Cylinder, RefreshCw, TriangleAlert, X } from 'lucide-react';
import { Card } from '../components/brand';
import { Dialog } from '../components/dialog';
import { InlineSelect, Input, Select } from '../components/form';
import { Toolbar } from '../components/toolbar';
import { collectErrors, dateBR, focusField, num, request, today, type Row } from './request';

const liters = (v: number) => `${num(v || 0)} L`;

// Tanque da garagem: saldo por combustível (calculado no servidor) e histórico das chegadas.
export default function Tank({ data, onRefresh }: { data: Row[]; onRefresh: () => Promise<unknown> }) {
  const [fuelFilter, setFuelFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Row>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const lock = useRef(false);

  const fuels = data.filter((x) => x.kind === 'fuel');
  const arrivals = data.filter((x) => x.kind === 'fuel_in' && (!fuelFilter || x.fuelId === fuelFilter)).sort((a, b) => b.date.localeCompare(a.date) || b.created.localeCompare(a.created));
  const negative = fuels.filter((x) => x.tankLiters < 0);
  const fuel = fuels.find((x) => x.id === form.fuelId);

  function start(initial: Row = {}) {
    setForm({ date: today(), ...initial });
    setErrors({});
    setError('');
    setNotice('');
    setOpen(true);
  }
  function change(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setError('');
    if (errors[key]) setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lock.current) return;
    const found = collectErrors(e.currentTarget);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) { focusField(e.currentTarget, first); return; }
    const formEl = e.currentTarget;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const json = await request('/api/tank', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values: form }) }, 15000);
      setNotice(`Chegada registrada: ${num(Number(form.liters))} L de ${fuel?.name ?? 'combustível'}. Saldo do tanque: ${liters(json.tankLiters)}.`);
      formEl.closest('dialog')?.close();
      await onRefresh();
    } catch (err) {
      setError((err as Error).message || 'Não foi possível registrar. Confira o histórico antes de tentar novamente.');
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }

  const field = (key: string) => ({ name: key, value: form[key] ?? '', error: errors[key], onValueChange: (v: string) => change(key, v) });

  return (
    <div className="workshop">
      <Toolbar actions={<button className="btn btn-primary" onClick={() => start()} disabled={!fuels.length}><ArrowDownLeft size={16} aria-hidden="true" /> Registrar chegada</button>}>
        {fuels.length > 1 && <InlineSelect label="Filtrar por combustível" value={fuelFilter} onValueChange={setFuelFilter} options={[{ value: '', label: 'Todos os combustíveis' }, ...fuels.map((x) => ({ value: x.id, label: x.name }))]} />}
      </Toolbar>

      {notice && (
        <p className="notice notice-success" role="status">
          <CheckCircle2 size={18} aria-hidden="true" /> {notice}
          <button className="icon-btn" aria-label="Fechar aviso" onClick={() => setNotice('')}><X size={16} aria-hidden="true" /></button>
        </p>
      )}

      {negative.length > 0 && (
        <p className="notice notice-error" role="alert">
          {negative.length === 1 ? `O tanque de ${negative[0].name} está negativo.` : `Os tanques de ${negative.map((x) => x.name).join(', ')} estão negativos.`}
          {' '}Há abastecimentos acima do que foi registrado como chegada. Confira se alguma chegada ficou sem registro.
        </p>
      )}

      {fuels.length ? (
        <section className="kpis" aria-label="Saldo do tanque por combustível">
          {fuels.map((x) => (
            <Card key={x.id} className={x.tankLiters < 0 ? 'kpi tank-negative' : 'kpi'}>
              <h2>{x.name}</h2>
              <strong>{num(x.tankLiters || 0)}<span className="unit"> L</span></strong>
              <p>{x.tankLiters < 0 ? <><TriangleAlert size={14} aria-hidden="true" /> Abastecido acima do registrado</> : 'Disponível no tanque'}</p>
            </Card>
          ))}
        </section>
      ) : (
        <Card className="panel">
          <div className="empty">
            <Cylinder size={28} aria-hidden="true" />
            <h3>Nenhum combustível cadastrado</h3>
            <p>A administração precisa cadastrar os combustíveis antes de registrar chegadas no tanque.</p>
          </div>
        </Card>
      )}

      <Card className="panel">
        <div className="panel-head">
          <div><h2>Chegadas de combustível</h2><p>Cada chegada soma ao tanque. Cada abastecimento novo desconta do tanque do combustível escolhido.</p></div>
        </div>
        {arrivals.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th scope="col">Data</th><th scope="col">Combustível</th><th scope="col" className="num">Litros</th><th scope="col">Fornecedor</th><th scope="col">Registrado por</th></tr></thead>
              <tbody>
                {arrivals.map((x) => (
                  <tr key={x.id}>
                    <td data-label="Data">{dateBR(x.date)}</td>
                    <td data-label="Combustível" className="strong">{x.fuel}</td>
                    <td data-label="Litros" className="num strong">+{liters(x.liters)}</td>
                    <td data-label="Fornecedor">{x.supplier || 'Não informado'}{x.document && <small>Nota {x.document}</small>}</td>
                    <td data-label="Registrado por">{x.responsible}{x.note && <small>{x.note}</small>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <ArrowDownLeft size={28} aria-hidden="true" />
            <h3>{fuelFilter ? 'Nenhuma chegada deste combustível' : 'Nenhuma chegada registrada'}</h3>
            <p>Registre cada entrega de combustível para formar o saldo do tanque.</p>
            {!fuelFilter && fuels.length > 0 && <button className="btn btn-primary" onClick={() => start()}>Registrar chegada</button>}
          </div>
        )}
      </Card>

      {open && (
        <Dialog title="Registrar chegada de combustível" onClose={() => setOpen(false)} busy={busy}>
          <form onSubmit={save} noValidate>
            <fieldset className="form-grid" disabled={busy}>
              <Select {...field('fuelId')} label="Combustível" placeholder="Selecione o combustível" full
                options={fuels.map((x) => ({ value: x.id, label: x.name }))}
                hint={fuel ? `Saldo atual do tanque: ${liters(fuel.tankLiters)}` : undefined} />
              <Input {...field('liters')} label="Litros recebidos" type="number" min={0.001} max={100000} step={0.001} inputMode="decimal" placeholder="0,000" />
              <Input {...field('date')} label="Data da chegada" type="date" max={today()} />
              <Input {...field('supplier')} label="Fornecedor" maxLength={200} optional />
              <Input {...field('document')} label="Nota fiscal / documento" maxLength={200} optional />
              <Input {...field('note')} label="Observação" maxLength={200} optional full />
              <p className="hint field-full">A chegada soma ao saldo do tanque e fica no histórico. Ela não pode ser editada depois, então confira os litros antes de confirmar.</p>
            </fieldset>
            {error && <p role="alert" className="notice notice-error">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="btn" onClick={(e) => e.currentTarget.closest('dialog')?.close()} disabled={busy}>Cancelar</button>
              <button className="btn btn-primary" disabled={busy}>{busy ? <><RefreshCw className="spin" size={16} aria-hidden="true" /> Salvando…</> : 'Confirmar chegada'}</button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
