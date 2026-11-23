import { findRecord, isRecordType, saveRecordForm } from './records.ts';
import { client } from '../state/selectors.ts';
import { toast } from '../lib/feedback.ts';

export async function formSubmit(form: HTMLFormElement): Promise<void> {
  const { type, edit } = form.dataset;
  if (!isRecordType(type)) return;
  const values = Object.fromEntries(
    [...new FormData(form)].filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
  if (type !== 'client' && !client(values.clientId))
    return toast('Selecione um cliente válido.', true);
  return saveRecordForm(type, { form, values, item: findRecord(type, edit) });
}
