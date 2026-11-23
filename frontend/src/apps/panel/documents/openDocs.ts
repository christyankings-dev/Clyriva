import { showModal } from '../components/ModalHost/index.tsx';
import { toast } from '../lib/feedback.ts';
import { local, panelWorkspace } from '../state/workspace.ts';

/** Abre a janela de anexos privados de uma tarefa ou guia (somente na versão online). */
async function openInternalDocs(
  type: string,
  recordId: string,
  initialFile: File | null = null,
): Promise<void> {
  if (local) {
    toast('Anexos privados disponíveis somente na versão online autenticada.', true);
    return;
  }
  if (type !== 'task' && type !== 'tax') return;
  const rows = type === 'task' ? panelWorkspace.data.tasks : panelWorkspace.data.taxes;
  if (!rows.some((x) => x.id === recordId)) return toast('Registro não encontrado.', true);
  showModal({ kind: 'docs', type, recordId, initialFile });
}

export { openInternalDocs };
