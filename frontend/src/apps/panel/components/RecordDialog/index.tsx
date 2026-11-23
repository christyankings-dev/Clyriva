import { useLayoutEffect, useRef } from 'react';
import { filledRegistry } from '../../clients/cnpj/lookup.ts';
import { registryKeys } from '../../clients/cnpj/normalize.ts';
import { describeRecord, findRecord } from '../../forms/records.ts';
import { cleanDocument } from '../../lib/format.ts';
import { Modal, ModalFoot } from '../Modal/index.tsx';
import type { RecordDialogProps } from './types.ts';

const DOC_ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';

export function RecordDialog({ type, editId, preset, clientId }: RecordDialogProps) {
  const form = useRef<HTMLFormElement>(null);
  const item = findRecord(type, editId);
  const { title, description, fields } = describeRecord(type, { item, preset, clientId });

  // Ajustes que dependem dos campos já no DOM (consulta de CNPJ, vínculo de NF e foco inicial).
  useLayoutEffect(() => {
    const el = form.current;
    if (!el) return;
    if (type === 'client') {
      filledRegistry.clear();
      el.dataset.lookupDoc = cleanDocument(findRecord('client', editId)?.document || '');
      const client = findRecord('client', editId);
      if (client?.cnpjLookupSource) {
        const snapshot = client.cnpjLookupValues || {};
        for (const key of [...registryKeys, 'regime']) {
          const input = el.elements.namedItem(key);
          if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement)
            if (snapshot[key] && snapshot[key] === input.value)
              filledRegistry.set(key, snapshot[key]);
        }
      }
    }
    if (type === 'cash') {
      const invoice = el.elements.namedItem('invoiceId');
      const kind = el.elements.namedItem('kind');
      if (invoice instanceof HTMLSelectElement && kind instanceof HTMLSelectElement)
        invoice.disabled = kind.value === 'expense';
    }
    document
      .querySelector<HTMLElement>('#modal-root input:not([type=hidden]),#modal-root select')
      ?.focus();
  }, [type, editId]);

  return (
    <Modal title={title} description={description}>
      <form ref={form} id="edit-form" data-type={type} data-edit={editId || ''}>
        <div className="modal-fields">
          {fields}
          {(type === 'tax' || type === 'task') && (
            <div className="field wide">
              <label htmlFor="f-internal-doc">📎 Anexar guia ou documento (opcional)</label>
              <input id="f-internal-doc" type="file" accept={DOC_ACCEPT} />
              <small className="help">
                Até 5 MB. Arquivo privado, somente para sua gestão. Para o cliente ver e baixar, use
                “Disponibilizar no app do cliente” após salvar.
              </small>
            </div>
          )}
        </div>
        <ModalFoot submit={item ? 'Salvar alterações' : 'Salvar registro'} />
      </form>
    </Modal>
  );
}
