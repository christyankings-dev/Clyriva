import { download } from '../lib/download.ts';
import { localToday } from '../lib/format.ts';
import { core, panelWorkspace, readVaultBlob } from '../state/workspace.ts';
import { toast } from '../lib/feedback.ts';
import { mutate } from '../state/transactions.ts';
import { state } from '../state/filters.ts';
import { errorInfo } from '../../../shared/lib/errors.ts';
import type { VaultBlob, Workspace } from '../../../shared/domain/types.ts';

function backup(): void {
  download(
    `clyriva-backup-${localToday()}.json`,
    JSON.stringify(
      {
        ...panelWorkspace.data,
        cofreCriptografado: readVaultBlob(),
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    'application/json;charset=utf-8',
  );
  try {
    localStorage.setItem('clyriva-last-backup', new Date().toISOString());
  } catch {}
  toast(
    'Backup exportado. Guarde o arquivo em local seguro; os dados da carteira não são criptografados neste formato.',
  );
}

async function replaceAll(next: Workspace, blob: VaultBlob | null, msg: string): Promise<void> {
  await mutate(
    () => {
      panelWorkspace.data = next;
      state.client = 'all';
      state.detail = null;
      state.page = 'dashboard';
    },
    msg,
    {
      vault: blob,
    },
  );
}

async function importJson(file: File | null | undefined): Promise<void> {
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text()) as { cofreCriptografado?: unknown },
      next = core.workspace(raw),
      blob =
        raw.cofreCriptografado == null
          ? panelWorkspace.encrypted
          : core.vault(raw.cofreCriptografado);
    core.checkLinks(next);
    if (
      !confirm(
        'Substituir todos os registros desta carteira pelo backup? ' +
          (blob
            ? 'O cofre do arquivo será restaurado.'
            : 'Este backup não contém cofre. Seu cofre atual será preservado.'),
      )
    )
      return;
    await replaceAll(next, blob, 'Backup restaurado.');
  } catch (e) {
    toast('Importação interrompida. ' + errorInfo(e).message, true);
  }
}

export { backup, importJson };
