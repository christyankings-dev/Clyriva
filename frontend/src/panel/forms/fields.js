import { brl, esc, mon } from '../shared/format.js';
import { panelWorkspace } from '../state/workspace.js';
import { issued } from '../state/selectors.js';

const opt = (arr, val) =>
  arr
    .map(
      ([v, label]) =>
        `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(label)}</option>`,
    )
    .join('');

const field = (label, name, value = '', o = {}) =>
  `<div class="field ${o.wide ? 'wide' : ''}"><label for="f-${name}">${label}${o.required ? ' <em>*</em>' : ''}</label>${o.area ? `<textarea id="f-${name}" name="${name}" rows="3" placeholder="${esc(o.placeholder || '')}" ${o.required ? 'required' : ''}>${esc(value)}</textarea>` : o.options ? `<select id="f-${name}" name="${name}" ${o.required ? 'required' : ''}>${opt(o.options, value)}</select>` : `<input type="${o.type || 'text'}" id="f-${name}" name="${name}" value="${esc(value)}" ${o.required ? 'required' : ''} ${o.type === 'number' ? 'step="0.01" min="0"' : ''} ${o.placeholder ? `placeholder="${esc(o.placeholder)}"` : ''} ${o.max ? `maxlength="${o.max}"` : ''}>`}${o.help ? `<small class="help">${o.help}</small>` : ''}</div>`;

const clientOpts = () => panelWorkspace.data.clients.map((c) => [c.id, c.name]);

const invoiceOpts = (cid) => [
  ['', 'Sem nota vinculada'],
  ...panelWorkspace.data.invoices
    .filter((i) => i.clientId === cid && issued(i))
    .map((i) => [i.id, `NF ${i.number || 's/n'} · ${brl(i.value)} · ${mon(i.competence)}`]),
];

export { clientOpts, field, invoiceOpts, opt };
