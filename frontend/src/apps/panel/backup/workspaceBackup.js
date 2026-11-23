import { download } from '../lib/download.js';
import { localToday } from '../lib/format.js';
import { core, panelWorkspace, readVaultBlob } from '../state/workspace.js';
import { toast } from '../lib/feedback.js';
import { mutate } from '../state/transactions.js';
import { state } from '../state/filters.js';

function backup() {
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

async function replaceAll(next, blob, msg) {
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

async function importJson(file) {
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text()),
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
    toast('Importação interrompida. ' + e.message, true);
  }
}

export { backup, importJson };
