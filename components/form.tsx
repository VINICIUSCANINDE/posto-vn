'use client';

import { useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Check, ChevronDown, ChevronUp, Eye, EyeOff, Search } from 'lucide-react';
import { Select as RadixSelect } from 'radix-ui';

type FieldBase = {
  name: string;
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  full?: boolean;
};

const describedBy = (name: string, error?: string, hint?: ReactNode) =>
  error ? `e-${name}` : hint ? `h-${name}` : undefined;

export function Field({ name, label, error, hint, optional, full, children }: FieldBase & { children: ReactNode }) {
  return (
    <div className={full ? 'field field-full' : 'field'}>
      <label htmlFor={`f-${name}`}>{label}{optional && <span className="optional"> (opcional)</span>}</label>
      {children}
      {error ? <p className="field-error" id={`e-${name}`}>{error}</p> : hint ? <p className="hint" id={`h-${name}`}>{hint}</p> : null}
    </div>
  );
}

type InputProps = FieldBase & Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> & { onValueChange?: (value: string) => void };

export function Input({ name, label, error, hint, optional, full, onValueChange, onChange, required, ...rest }: InputProps) {
  return (
    <Field name={name} label={label} error={error} hint={hint} optional={optional} full={full}>
      <input
        id={`f-${name}`}
        name={name}
        required={required ?? !optional}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        onChange={(e) => { onChange?.(e); onValueChange?.(e.target.value); }}
        {...rest}
      />
    </Field>
  );
}

export function PasswordInput(props: InputProps) {
  const [visible, setVisible] = useState(false);
  const { name, label, error, hint, optional, full, onValueChange, onChange, required, ...rest } = props;
  return (
    <Field name={name} label={label} error={error} hint={hint} optional={optional} full={full}>
      <div className="password-input">
        <input
          id={`f-${name}`}
          name={name}
          type={visible ? 'text' : 'password'}
          required={required ?? !optional}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(name, error, hint)}
          onChange={(e) => { onChange?.(e); onValueChange?.(e.target.value); }}
          {...rest}
        />
        <button type="button" className="icon-btn" onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={visible}>
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
    </Field>
  );
}

export type Option = { value: string; label: string };

type SelectProps = FieldBase & {
  value: string;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
};

const NONE = '__nenhum__';

function SelectBox({ id, name, value, options, placeholder, emptyOption, required, disabled, invalid, describedBy, label, onValueChange }: {
  id?: string;
  name?: string;
  value: string;
  options: Option[];
  placeholder?: string;
  emptyOption?: string;
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  label?: string;
  onValueChange?: (value: string) => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const items = emptyOption !== undefined ? [{ value: NONE, label: emptyOption }, ...options] : options;
  const current = value === '' && emptyOption !== undefined ? NONE : value;
  return (
    <RadixSelect.Root
      name={name}
      value={current}
      required={required}
      disabled={disabled}
      onValueChange={(v) => onValueChange?.(v === NONE ? '' : v)}
      onOpenChange={(open) => { if (open) setContainer(trigger.current?.closest('dialog') ?? null); }}
    >
      <RadixSelect.Trigger ref={trigger} id={id} className="select-trigger" aria-label={label} aria-invalid={invalid || undefined} aria-describedby={describedBy}>
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon className="select-icon"><ChevronDown size={16} aria-hidden="true" /></RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal container={container ?? undefined}>
        <RadixSelect.Content className="select-content" position="popper" sideOffset={4} collisionPadding={8}>
          <RadixSelect.ScrollUpButton className="select-scroll"><ChevronUp size={16} aria-hidden="true" /></RadixSelect.ScrollUpButton>
          <RadixSelect.Viewport className="select-viewport">
            {items.map((o) => (
              <RadixSelect.Item key={o.value} value={o.value} className="select-item">
                <RadixSelect.ItemText>{o.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="select-check"><Check size={16} aria-hidden="true" /></RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
          <RadixSelect.ScrollDownButton className="select-scroll"><ChevronDown size={16} aria-hidden="true" /></RadixSelect.ScrollDownButton>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}

export function Select({ name, label, error, hint, optional, full, options, value, placeholder = 'Selecione…', required, disabled, onValueChange }: SelectProps) {
  const isRequired = required ?? !optional;
  return (
    <Field name={name} label={label} error={error} hint={hint} optional={optional} full={full}>
      <SelectBox
        id={`f-${name}`}
        name={name}
        value={value}
        options={options}
        placeholder={placeholder || undefined}
        emptyOption={!isRequired && placeholder ? placeholder : undefined}
        required={isRequired}
        disabled={disabled}
        invalid={Boolean(error)}
        describedBy={describedBy(name, error, hint)}
        onValueChange={onValueChange}
      />
    </Field>
  );
}

export function OptionCards({ name, label, value, options, error, onValueChange }: {
  name: string;
  label: ReactNode;
  value: string;
  options: (Option & { detail?: ReactNode })[];
  error?: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <fieldset className="field option-group" aria-describedby={error ? `e-${name}` : undefined}>
      <legend>{label}</legend>
      <div className="option-cards">
        {options.map((o) => (
          <label key={o.value} className={value === o.value ? 'option-card is-checked' : 'option-card'}>
            <input type="radio" name={name} value={o.value} required checked={value === o.value} onChange={() => onValueChange(o.value)} />
            <span className="option-name">{o.label}</span>
            {o.detail && <span className="option-detail">{o.detail}</span>}
          </label>
        ))}
      </div>
      {error && <p className="field-error" id={`e-${name}`}>{error}</p>}
    </fieldset>
  );
}

export function SearchInput({ label, value, onValueChange, placeholder }: { label: string; value: string; onValueChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="search">
      <Search size={16} aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <input type="search" placeholder={placeholder ?? label} value={value} onChange={(e) => onValueChange(e.target.value)} />
    </label>
  );
}

export function InlineSelect({ label, value, options, onValueChange }: { label: string; value: string; options: Option[]; onValueChange: (v: string) => void }) {
  const empty = options.find((o) => o.value === '');
  return (
    <div className="select-inline">
      <SelectBox label={label} value={value} options={options.filter((o) => o.value !== '')} emptyOption={empty?.label} onValueChange={onValueChange} />
    </div>
  );
}
