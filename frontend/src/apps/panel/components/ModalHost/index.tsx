import { slot } from '../../../../shared/lib/slot.ts';
import { InternalDocsDialog } from '../InternalDocsDialog/index.tsx';
import type { InternalDocsDialogProps } from '../InternalDocsDialog/types.ts';
import { RecordDialog } from '../RecordDialog/index.tsx';
import type { RecordDialogProps } from '../RecordDialog/types.ts';
import { VaultChangeDialog } from '../VaultChangeDialog/index.tsx';
import { VaultEntryDialog } from '../VaultEntryDialog/index.tsx';

export type ModalSpec =
  | ({ kind: 'record' } & RecordDialogProps)
  | { kind: 'vault-entry'; editId: string; clientId: string }
  | { kind: 'vault-change' }
  | ({ kind: 'docs' } & InternalDocsDialogProps);

const host = slot('#modal-root');

function ModalView({ spec }: { spec: ModalSpec }) {
  switch (spec.kind) {
    case 'record':
      return <RecordDialog key={spec.type + ':' + spec.editId} {...spec} />;
    case 'vault-entry':
      return <VaultEntryDialog {...spec} />;
    case 'vault-change':
      return <VaultChangeDialog />;
    case 'docs':
      return <InternalDocsDialog key={spec.type + ':' + spec.recordId} {...spec} />;
  }
}

/** Mostra um diálogo em #modal-root (substitui o que estiver aberto). */
export function showModal(spec: ModalSpec): void {
  host.render(<ModalView spec={spec} />);
}

export function hideModal(): void {
  host.render(null);
}
