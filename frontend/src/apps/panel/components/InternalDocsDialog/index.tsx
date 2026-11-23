import { useCallback, useEffect, useRef, useState } from 'react';
import { errorInfo } from '../../../../shared/lib/errors.ts';
import { docIssue, internalDocsApi, type InternalAttachment } from '../../documents/api.ts';
import { publishInternalDoc, refreshAgendaDocuments } from '../../documents/publish.ts';
import { uploadInternalDoc, type UploadAttempt } from '../../documents/upload.ts';
import { brl } from '../../lib/format.ts';
import { clientName } from '../../state/selectors.ts';
import { panelWorkspace } from '../../state/workspace.ts';
import { Modal, ModalFoot } from '../Modal/index.tsx';
import type { InternalDocsDialogProps, Notice } from './types.ts';

const ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';

const rowStyle = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  flexWrap: 'wrap',
  padding: '10px 0',
  borderBottom: '1px solid #ddd',
} as const;

/** Abre (ou baixa) o arquivo por link assinado de curta duração. */
async function openFile(id: string, download: boolean): Promise<void> {
  const tab = window.open('about:blank', '_blank');
  try {
    const r = await internalDocsApi('link', { attachmentId: id, download });
    if (tab) {
      tab.opener = null;
      tab.location.replace(r.url ?? '');
    } else window.location.href = r.url ?? '';
  } catch (err) {
    tab?.close();
    throw err;
  }
}

function recordLabel(type: string, recordId: string): { client: string; label: string } | null {
  if (type === 'task') {
    const task = panelWorkspace.data.tasks.find((x) => x.id === recordId);
    return task ? { client: clientName(task.clientId), label: task.title || 'Pendência' } : null;
  }
  const tax = panelWorkspace.data.taxes.find((x) => x.id === recordId);
  return tax
    ? { client: clientName(tax.clientId), label: tax.kind + ' · ' + brl(tax.value) }
    : null;
}

interface FileRowProps {
  doc: InternalAttachment;
  onRemoved: () => Promise<void>;
  notify: (notice: Notice) => void;
}

function FileRow({ doc, onRemoved, notify }: FileRowProps) {
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      notify({ text: errorInfo(err).message, bad: true });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div style={rowStyle}>
      <span style={{ flex: 1 }}>{'📎 ' + doc.original_name}</span>
      <button
        type="button"
        className="btn"
        disabled={busy}
        onClick={() => void run(() => openFile(doc.id, false))}
      >
        Visualizar
      </button>
      <button
        type="button"
        className="btn"
        disabled={busy}
        onClick={() => void run(() => openFile(doc.id, true))}
      >
        Baixar
      </button>
      <button
        type="button"
        className="btn"
        disabled={busy}
        onClick={() =>
          void run(async () => {
            if (!confirm('Remover permanentemente ' + doc.original_name + '?')) return;
            await internalDocsApi('remove', { attachmentId: doc.id });
            refreshAgendaDocuments();
            await onRemoved();
            notify({ text: 'Documento removido da ficha e das cópias vinculadas no app.' });
          })
        }
      >
        Remover
      </button>
    </div>
  );
}

export function InternalDocsDialog({ type, recordId, initialFile }: InternalDocsDialogProps) {
  const info = recordLabel(type, recordId);
  const picker = useRef<HTMLInputElement>(null);
  const attempt = useRef<UploadAttempt | null>(null);
  const alive = useRef(true);
  const [files, setFiles] = useState<InternalAttachment[] | null>(null);
  const [notice, setNotice] = useState<Notice>({ text: '' });
  const [sending, setSending] = useState(false);
  const [retry, setRetry] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const notify = useCallback((next: Notice) => {
    if (alive.current) setNotice(next);
  }, []);

  const refresh = useCallback(async () => {
    const result = await internalDocsApi('list', { entityType: type, entityId: recordId });
    if (!alive.current) return;
    setFiles(
      (result.attachments || []).filter((x) => x.entity_type === type && x.entity_id === recordId),
    );
  }, [type, recordId]);

  const send = useCallback(
    async (file: File | null | undefined) => {
      const issue = docIssue(file);
      if (issue || !file) return notify({ text: issue, bad: true });
      if (attempt.current?.file !== file) attempt.current = { file, ticket: null, uploaded: false };
      setSending(true);
      notify({ text: 'Enviando ' + file.name + '…' });
      try {
        await uploadInternalDoc(type, recordId, attempt.current);
        attempt.current = null;
        if (picker.current) picker.current.value = '';
        if (alive.current) setRetry(false);
        notify({
          text: 'Documento salvo na ficha. Use “Disponibilizar no app do cliente” para compartilhar.',
        });
        refreshAgendaDocuments();
        try {
          await refresh();
        } catch {
          notify({
            text: 'Documento salvo. Reabra os documentos para atualizar a lista.',
            bad: true,
          });
        }
      } catch (err) {
        if (alive.current) setRetry(true);
        notify({ text: 'O lançamento continua salvo. ' + errorInfo(err).message, bad: true });
      } finally {
        if (alive.current) setSending(false);
      }
    },
    [type, recordId, notify, refresh],
  );

  useEffect(() => {
    alive.current = true;
    void (async () => {
      try {
        await refresh();
      } catch (err) {
        notify({ text: errorInfo(err).message, bad: true });
      }
      if (initialFile && alive.current) await send(initialFile);
    })();
    return () => {
      alive.current = false;
    };
    // O envio inicial acontece uma única vez, na abertura do diálogo.
  }, []);

  return (
    <Modal
      title="📎 Documentos do registro"
      description={info ? info.client + ' · ' + info.label : ''}
    >
      <div className="modal-fields">
        <div className="field wide">
          <p className="notice blue">
            Arquivos desta área são <strong>privados para sua gestão</strong>. Para compartilhar,
            toque em <strong>Disponibilizar no app do cliente</strong> abaixo. Cada arquivo novo
            fica privado até você confirmar a publicação, inclusive em guias já publicadas.
          </p>
          <label htmlFor="internal-file">Adicionar documento (PDF, JPG ou PNG, até 5 MB)</label>
          <input
            ref={picker}
            type="file"
            id="internal-file"
            accept={ACCEPT}
            disabled={sending}
            onChange={() => {
              attempt.current = null;
              setRetry(false);
            }}
          />
          <button
            id="internal-upload"
            type="button"
            className="btn primary"
            disabled={sending}
            onClick={() => void send(picker.current?.files?.[0] || attempt.current?.file)}
          >
            {retry ? 'Tentar novamente' : 'Enviar arquivo'}
          </button>
          <button
            type="button"
            className="btn"
            id="internal-publish"
            disabled={sending || publishing}
            onClick={async () => {
              setPublishing(true);
              try {
                await publishInternalDoc(type, recordId);
              } finally {
                if (alive.current) setPublishing(false);
              }
            }}
          >
            Disponibilizar no app do cliente
          </button>
          <div
            id="internal-file-status"
            role="status"
            style={{ marginTop: '10px', color: notice.bad ? '#b54746' : undefined }}
          >
            {notice.text}
          </div>
          <div id="internal-file-list" style={{ marginTop: '18px' }}>
            {files === null && 'Carregando anexos…'}
            {files?.length === 0 && 'Nenhum anexo neste registro.'}
            {files?.map((doc) => (
              <FileRow key={doc.id} doc={doc} onRemoved={refresh} notify={notify} />
            ))}
          </div>
        </div>
      </div>
      <ModalFoot cancel="Fechar" />
    </Modal>
  );
}
