export type Row = Record<string, any>;

export class RequestError extends Error {
  constructor(message: string, readonly status: number, readonly network = false) {
    super(message);
  }
}

export async function request(url: string, init: RequestInit = {}, timeoutMs = 10000): Promise<Row> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store', ...init, signal: controller.signal });
  } catch {
    throw new RequestError(
      controller.signal.aborted ? 'O sistema demorou demais para responder.' : 'Sem conexão com o sistema.',
      0,
      true,
    );
  } finally {
    clearTimeout(timer);
  }
  let body: Row = {};
  try {
    body = (await res.json()) as Row;
  } catch {
    if (!res.ok) throw new RequestError('O sistema respondeu com um erro. Tente novamente em instantes.', res.status);
  }
  if (!res.ok) throw new RequestError(body.error || 'Não foi possível concluir a operação.', res.status);
  return body;
}

export const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
export const num = (v: number, digits = 3) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(v);
export const today = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);
export const dateBR = (iso: string) => iso.split('-').reverse().join('/');
export const timeBR = (created?: string) =>
  created ? new Date(created).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '';

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const monthLabel = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} de ${ym.slice(0, 4)}`;
export function recentMonths(count = 13) {
  const [y, m] = today().split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    return d.toISOString().slice(0, 7);
  });
}

export function validationMessage(el: HTMLInputElement | HTMLSelectElement): string {
  const v = el.validity;
  if (v.valueMissing) return el instanceof HTMLSelectElement || el.type === 'radio' ? 'Selecione uma opção.' : 'Preencha este campo.';
  if (v.typeMismatch) return 'Informe um e-mail válido.';
  if (v.tooShort) return `Use pelo menos ${(el as HTMLInputElement).minLength} caracteres.`;
  if (v.rangeUnderflow) return el.type === 'date' ? 'Data inválida.' : `Use um valor a partir de ${num(Number((el as HTMLInputElement).min) || 0)}.`;
  if (v.rangeOverflow) return el.type === 'date' ? 'A data não pode ser futura.' : 'Valor acima do permitido.';
  if (v.stepMismatch) return (el as HTMLInputElement).step === '1' ? 'Use um número inteiro.' : 'Use no máximo três casas decimais.';
  if (v.badInput) return 'Use apenas números.';
  return el.validationMessage ? 'Valor inválido.' : '';
}

export function collectErrors(form: HTMLFormElement): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const el of Array.from(form.elements)) {
    if ((el instanceof HTMLInputElement || el instanceof HTMLSelectElement) && el.name && !el.validity.valid) {
      errors[el.name] = validationMessage(el);
    }
  }
  return errors;
}

export function focusField(form: HTMLFormElement, name: string) {
  const el = document.getElementById(`f-${name}`) ?? form.elements.namedItem(name);
  ((el instanceof RadioNodeList ? el[0] : el) as HTMLElement | null)?.focus();
}
