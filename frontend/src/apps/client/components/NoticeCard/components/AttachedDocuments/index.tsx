import { openDocument } from '../../../../billing/openDocument.ts';
import type { NoticeAttachment } from '../../../../types.ts';

interface AttachedDocumentsProps {
  attachments: NoticeAttachment[];
}

export function AttachedDocuments({ attachments }: AttachedDocumentsProps) {
  if (!attachments.length) return null;
  return (
    <div className="document-list">
      <strong className="document-title">
        {attachments.length === 1 ? 'Guia ou documento anexo' : 'Documentos anexados'}
      </strong>
      {attachments.map((file) => (
        <div key={file.id} className="document-row">
          <span className="document-name">📎 {file.original_name}</span>
          <button type="button" className="btn" onClick={() => openDocument(file.id)}>
            Visualizar
          </button>
          <button type="button" className="btn" onClick={() => openDocument(file.id, true)}>
            Baixar
          </button>
        </div>
      ))}
    </div>
  );
}
