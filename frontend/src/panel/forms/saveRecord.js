import { recordForms, findRecord } from './records.js';
import { client } from '../state/selectors.js';
import { toast } from '../shared/feedback.js';

export async function formSubmit(form) {
  const { type, edit } = form.dataset;
  if (!Object.hasOwn(recordForms, type)) return;
  const values = Object.fromEntries(new FormData(form));
  if (type !== 'client' && !client(values.clientId))
    return toast('Selecione um cliente válido.', true);
  return recordForms[type].save({ form, values, item: findRecord(type, edit) });
}
