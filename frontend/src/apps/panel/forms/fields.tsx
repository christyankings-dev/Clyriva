import type { ReactNode } from 'react';
import { brl, mon } from '../lib/format.ts';
import { issued } from '../state/selectors.ts';
import { panelWorkspace } from '../state/workspace.ts';

export type Option = [string, string];

export interface FieldProps {
  label: string;
  name: string;
  value?: string | number;
  wide?: boolean;
  required?: boolean;
  area?: boolean;
  options?: Option[];
  type?: string;
  placeholder?: string;
  max?: number;
  help?: ReactNode;
}

/** Campo de formulário não controlado (o valor é lido no envio, via FormData). */
export function Field({
  label,
  name,
  value = '',
  wide,
  required,
  area,
  options,
  type,
  placeholder,
  max,
  help,
}: FieldProps) {
  const id = 'f-' + name;
  const initial = String(value);
  let control: ReactNode;
  if (area)
    control = (
      <textarea
        id={id}
        name={name}
        rows={3}
        placeholder={placeholder || ''}
        required={required}
        defaultValue={initial}
      />
    );
  else if (options)
    control = (
      <select id={id} name={name} required={required} defaultValue={initial}>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    );
  else
    control = (
      <input
        type={type || 'text'}
        id={id}
        name={name}
        defaultValue={initial}
        required={required}
        {...(type === 'number' ? { step: '0.01', min: 0 } : {})}
        placeholder={placeholder || undefined}
        maxLength={max}
      />
    );
  return (
    <div className={wide ? 'field wide' : 'field'}>
      <label htmlFor={id}>
        {label}
        {required && (
          <>
            {' '}
            <em>*</em>
          </>
        )}
      </label>
      {control}
      {help && <small className="help">{help}</small>}
    </div>
  );
}

const clientOpts = (): Option[] => panelWorkspace.data.clients.map((c) => [c.id, c.name]);

const invoiceOpts = (cid: string): Option[] => [
  ['', 'Sem nota vinculada'],
  ...panelWorkspace.data.invoices
    .filter((i) => i.clientId === cid && issued(i))
    .map((i): Option => [i.id, `NF ${i.number || 's/n'} · ${brl(i.value)} · ${mon(i.competence)}`]),
];

/** Troca as opções de um <select> já existente (sem HTML em texto). */
function setOptions(select: HTMLSelectElement, options: Option[], selected: string): void {
  select.replaceChildren(
    ...options.map(([value, text]) => {
      const node = document.createElement('option');
      node.value = value;
      node.textContent = text;
      node.selected = value === selected;
      return node;
    }),
  );
}

export { clientOpts, invoiceOpts, setOptions };
