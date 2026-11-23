import { documentChanged } from '../../clients/cnpj/lookup.ts';
import { invoiceOpts, setOptions } from '../../forms/fields.tsx';
import { n } from '../../lib/format.ts';
import { client, feeRecord } from '../../state/selectors.ts';
import { state } from '../../state/filters.ts';
import { formField, targetOf } from './target.ts';

/** Preenche os campos do honorário com o registro existente (ou o valor padrão do cliente). */
function loadFee(form: HTMLFormElement, clientId: string, month: string): void {
  const r = feeRecord(clientId, month);
  const set = (name: string, value: string | number) => {
    const el = formField(form, name);
    if (el) el.value = String(value);
  };
  set('expected', r?.expected ?? n(client(clientId)?.monthlyFee));
  set('paid', r?.paid ?? 0);
  set('paidAt', r?.paidAt || '');
  set('notes', r?.notes || '');
}

/** Comportamentos ligados entre si nos formulários de registro (lançamento, honorário, cliente). */
export function bindRecordForms(): void {
  document.addEventListener('input', (e) => {
    const target = targetOf(e);
    if (target instanceof HTMLInputElement && target.id === 'f-document') documentChanged(target);
  });

  document.addEventListener('change', (e) => {
    const target = targetOf(e);
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    const form = target.form;
    const type = form?.dataset.type;
    if (!form) return;
    if (target.id === 'f-kind' && type === 'cash') {
      const sel = formField(form, 'invoiceId');
      if (sel instanceof HTMLSelectElement) {
        sel.disabled = target.value === 'expense';
        if (sel.disabled) sel.value = '';
      }
    }
    if (target.id === 'f-clientId' && type === 'cash') {
      const sel = formField(form, 'invoiceId');
      if (sel instanceof HTMLSelectElement) setOptions(sel, invoiceOpts(target.value), '');
    }
    if (target.id === 'f-clientId' && type === 'fee')
      loadFee(form, target.value, formField(form, 'competence')?.value || state.month);
    if (target.id === 'f-competence' && type === 'fee')
      loadFee(form, formField(form, 'clientId')?.value ?? '', target.value);
  });
}
