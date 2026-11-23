import { $, brl, fmtDate, mon } from '../shared/format.js';
import { local } from '../state/workspace.js';
import { demoMode } from '../state/filters.js';
import { internalDocsApi } from './api.js';
import { toast } from '../shared/feedback.js';

function refreshAgendaDocuments() {
  $('#agenda-vencimentos')?.dispatchEvent(new Event('routine-doc-change'));
}

async function publishInternalDoc(type, recordId, quiet = false) {
  if (local || demoMode.demoSession) return;
  const payload = {
    entityType: type,
    entityId: recordId,
  };
  try {
    if (!quiet) {
      const preview = await internalDocsApi('list', {
        ...payload,
        preview: true,
      });
      const { source, audience, attachments } = preview;
      if (!source || !audience || !Array.isArray(attachments))
        throw Error('Prévia indisponível. Atualize a página.');
      const recipients = audience.count
        ? audience.emails.join(', ') +
          (audience.count > audience.emails.length
            ? ' e mais ' + (audience.count - audience.emails.length)
            : '')
        : 'Nenhum acesso ativo. A empresa poderá consultar após receber autorização.';
      const lines = [
        'Disponibilizar este lançamento no app do cliente?',
        source.companyName,
        [source.label, source.reference, source.competence && mon(source.competence)]
          .filter(Boolean)
          .join(' · '),
        source.dueDate && 'Prazo: ' + fmtDate(source.dueDate),
        type === 'tax' && 'Valor: ' + brl(source.amount),
        'Arquivos da ficha: ' + (attachments.map((a) => a.original_name).join(', ') || 'nenhum'),
        'Acessos atuais: ' + recipients,
      ];
      if (type === 'tax' && source.status !== 'paid')
        lines.push('Lembretes de vencimento para os aparelhos autorizados.');
      if (type === 'task' && source.status === 'done')
        lines.push('A tarefa está concluída. O aviso ficará arquivado.');
      if (!confirm(lines.filter(Boolean).join('\n'))) return;
      payload.attachmentIds = attachments.map((a) => a.id);
      payload.expectedSource = source;
    }
    const result = await internalDocsApi(quiet ? 'sync' : 'publish', payload);
    if (!quiet) {
      if (result.attachmentErrors)
        toast(
          'Aviso salvo. ' +
            result.attachmentErrors +
            ' arquivo(s) pendente(s). Confira o limite de cinco anexos e tente publicar novamente.',
          true,
        );
      else
        toast(
          result.status === 'archived'
            ? 'Aviso arquivado no aplicativo.'
            : 'Publicado no app. Novos anexos compartilhados: ' +
                (result.attachmentsAdded || 0) +
                '.',
        );
    }
    if (!result.skipped) refreshAgendaDocuments();
    return result;
  } catch (e) {
    toast(
      (quiet ? 'Registro salvo. Falha ao sincronizar o app: ' : 'Publicação não confirmada: ') +
        e.message,
      true,
    );
    return null;
  }
}

export { publishInternalDoc, refreshAgendaDocuments };
