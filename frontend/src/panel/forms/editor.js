import { recordForms, findRecord } from './records.js';
import { cancelCnpjLookup, filledRegistry, registryKeys } from '../clients/cnpj.js';
import { panelWorkspace } from '../state/workspace.js';
import { toast } from '../shared/feedback.js';
import { $, cleanDocument, esc } from '../shared/format.js';
import { state } from '../state/filters.js';
function openModal(type, editId = null, preset = {}) {
  cancelCnpjLookup();
  if (type !== 'client' && !panelWorkspace.data.clients.length) {
    toast('Cadastre um cliente antes de adicionar outros dados.', true);
    type = 'client';
  }
  const root = $('#modal-root');
  if (!Object.hasOwn(recordForms, type)) return;
  const item = findRecord(type, editId);
  const clientId =
    preset.clientId ||
    item?.clientId ||
    (state.client === 'all' ? panelWorkspace.data.clients[0]?.id : state.client) ||
    '';
  const schema = recordForms[type].describe({
    item,
    preset,
    clientId,
  });
  const { title, description } = schema;
  let { fields } = schema;
  if (type === 'task')
    fields += `<label class="wide"><input type="checkbox" name="awaitingClient" ${item?.awaitingClient === true ? 'checked' : ''}> Aguardando retorno do cliente</label>`;
  if (type === 'tax' || type === 'task') {
    fields += `<div class="field wide"><label for="f-internal-doc">📎 Anexar guia ou documento (opcional)</label><input id="f-internal-doc" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"><small class="help">Até 5 MB. Arquivo privado, somente para sua gestão. Para o cliente ver e baixar, use “Disponibilizar no app do cliente” após salvar.</small></div>`;
  }
  root.innerHTML = `<div class="modal-backdrop" id="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><h2 id="modal-title">${title}</h2><p>${description}</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Fechar">×</button></div><form id="edit-form" data-type="${type}" data-edit="${esc(editId || '')}"><div class="modal-fields">${fields}</div><div class="modal-foot"><button type="button" class="btn" data-action="close-modal">Cancelar</button><button class="btn primary" type="submit">${item ? 'Salvar alterações' : 'Salvar registro'}</button></div></form></div></div>`;
  if (type === 'client') {
    const form = $('#edit-form');
    form.dataset.lookupDoc = cleanDocument(item?.document || '');
    if (item?.cnpjLookupSource) {
      const snapshot = item.cnpjLookupValues || {};
      for (const key of [...registryKeys, 'regime'])
        if (snapshot[key] && snapshot[key] === form.elements[key].value)
          filledRegistry.set(key, snapshot[key]);
    }
  }
  if (type === 'cash')
    $('#edit-form').elements.invoiceId.disabled = $('#edit-form').elements.kind.value === 'expense';
  const first = $('#modal-root input:not([type=hidden]),#modal-root select');
  if (first) first.focus();
}
export { openModal };
