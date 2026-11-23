import { showModal } from '../components/ModalHost/index.tsx';
import { cancelCnpjLookup } from '../clients/cnpj/lookup.ts';
import { toast } from '../lib/feedback.ts';
import { state } from '../state/filters.ts';
import { panelWorkspace } from '../state/workspace.ts';
import type { RecordPreset, RecordType } from '../types.ts';
import { isRecordType } from './records.ts';

function openModal(type: string, editId: string | null = null, preset: RecordPreset = {}): void {
  cancelCnpjLookup();
  let kind = type;
  if (kind !== 'client' && !panelWorkspace.data.clients.length) {
    toast('Cadastre um cliente antes de adicionar outros dados.', true);
    kind = 'client';
  }
  if (!isRecordType(kind)) return;
  const recordType: RecordType = kind;
  const item = editId
    ? panelWorkspace.data[collectionOf(recordType)].find((r) => r.id === editId)
    : undefined;
  const clientId =
    preset.clientId ||
    (item && 'clientId' in item ? item.clientId : '') ||
    (state.client === 'all' ? panelWorkspace.data.clients[0]?.id : state.client) ||
    '';
  showModal({ kind: 'record', type: recordType, editId, preset, clientId });
}

function collectionOf(type: RecordType) {
  return (
    {
      client: 'clients',
      invoice: 'invoices',
      cash: 'cash',
      task: 'tasks',
      tax: 'taxes',
      fee: 'fees',
    } as const
  )[type];
}

export { openModal };
