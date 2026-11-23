import { useRef, useState } from 'react';
import { errorInfo } from '../../../../../../shared/lib/errors.ts';
import { api } from '../../../../api.ts';
import { openAttachment, uploadAttachment } from '../../../../documents/attachments.ts';
import { refresh } from '../../../../records/refresh.ts';
import { attachmentsFor } from '../../../../selectors.ts';
import { status } from '../../../../ui.ts';
import type { AdminNotice } from '../../../../types.ts';
import { ActionButton } from '../../../ActionButton/index.tsx';

function AddDocument({ noticeId }: { noticeId: string }) {
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload() {
    const input = picker.current;
    const file = input?.files?.[0];
    if (!input || !file) return;
    setBusy(true);
    status('#admin-feedback', 'Enviando ' + file.name + '…');
    try {
      await uploadAttachment(noticeId, file);
      await refresh();
      status('#admin-feedback', 'Anexo privado disponível para o cliente.');
    } catch (e) {
      status('#admin-feedback', errorInfo(e).message, true);
    } finally {
      setBusy(false);
      input.value = '';
    }
  }

  return (
    <>
      <button type="button" className="btn" disabled={busy} onClick={() => picker.current?.click()}>
        + Adicionar documento
      </button>
      <input
        ref={picker}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={upload}
      />
    </>
  );
}

export function AttachmentBlock({ notice }: { notice: AdminNotice }) {
  const files = attachmentsFor(notice.id);
  return (
    <div className="document-list">
      <strong className="document-title">
        {files.length ? 'Documentos anexados (' + files.length + ')' : 'Sem documento anexado'}
      </strong>
      {files.map((file) => (
        <div key={file.id} className="document-row">
          <span className="document-name">
            {'📎 ' + file.original_name + ' · ' + (file.size_bytes / 1024).toFixed(0) + ' KB'}
          </span>
          <ActionButton label="Visualizar" onRun={() => openAttachment(file.id)} />
          <ActionButton label="Baixar" onRun={() => openAttachment(file.id, true)} />
          <ActionButton
            label="Remover"
            confirmText={'Remover permanentemente o anexo ' + file.original_name + '?'}
            onRun={async () => {
              await api('attachment-remove', { attachmentId: file.id });
              await refresh();
              status('#admin-feedback', 'Anexo removido.');
            }}
          />
        </div>
      ))}
      {notice.status !== 'archived' && <AddDocument noticeId={notice.id} />}
    </div>
  );
}
