import { local, panelWorkspace } from '../state/workspace.js';
import { toast } from '../shared/feedback.js';
import { $, brl, esc } from '../shared/format.js';
import { clientName } from '../state/selectors.js';
import { docIssue, internalDocsApi } from './api.js';
import { publishInternalDoc, refreshAgendaDocuments } from './publish.js';
import { uploadInternalDoc } from './upload.js';

async function openInternalDocs(type, recordId, initialFile = null) {
  if (local) {
    toast('Anexos privados disponíveis somente na versão online autenticada.', true);
    return;
  }
  const coll =
    type === 'task' ? panelWorkspace.data.tasks : type === 'tax' ? panelWorkspace.data.taxes : [];
  const record = coll.find((x) => x.id === recordId);
  if (!record) return toast('Registro não encontrado.', true);
  const label =
    type === 'tax' ? record.kind + ' · ' + brl(record.value) : record.title || 'Pendência';
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-backdrop" id="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><h2 id="modal-title">📎 Documentos do registro</h2><p>${esc(clientName(record.clientId))} · ${esc(label)}</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Fechar">×</button></div><div class="modal-fields"><div class="field wide"><p class="notice blue">Arquivos desta área são <strong>privados para sua gestão</strong>. Para compartilhar, toque em <strong>Disponibilizar no app do cliente</strong> abaixo. Cada arquivo novo fica privado até você confirmar a publicação, inclusive em guias já publicadas.</p><label for="internal-file">Adicionar documento (PDF, JPG ou PNG, até 5 MB)</label><input type="file" id="internal-file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"><button id="internal-upload" type="button" class="btn primary">Enviar arquivo</button><button type="button" class="btn" id="internal-publish">Disponibilizar no app do cliente</button><div id="internal-file-status" role="status" style="margin-top:10px"></div><div id="internal-file-list" style="margin-top:18px">Carregando anexos…</div></div></div><div class="modal-foot"><button class="btn" type="button" data-action="close-modal">Fechar</button></div></div></div>`;
  const statusEl = root.querySelector('#internal-file-status'),
    listEl = root.querySelector('#internal-file-list'),
    picker = root.querySelector('#internal-file'),
    button = root.querySelector('#internal-upload');
  const notify = (s, bad = false) => {
    if (statusEl.isConnected) {
      statusEl.textContent = s;
      statusEl.style.color = bad ? '#b54746' : '';
    }
  };
  const refresh = async () => {
    const result = await internalDocsApi('list', {
      entityType: type,
      entityId: recordId,
    });
    if (!listEl.isConnected) return;
    listEl.replaceChildren();
    const files = (result.attachments || []).filter(
      (x) => x.entity_type === type && x.entity_id === recordId,
    );
    if (!files.length) {
      listEl.textContent = 'Nenhum anexo neste registro.';
      return;
    }
    for (const doc of files) {
      const row = document.createElement('div');
      row.style.cssText =
        'display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px 0;border-bottom:1px solid #ddd';
      const label = document.createElement('span');
      label.textContent = '📎 ' + doc.original_name;
      label.style.flex = '1';
      row.append(label);
      for (const [title, action] of [
        ['Visualizar', 'link'],
        ['Baixar', 'link'],
        ['Remover', 'remove'],
      ]) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn';
        b.textContent = title;
        b.onclick = async () => {
          b.disabled = true;
          try {
            if (action === 'remove') {
              if (!confirm('Remover permanentemente ' + doc.original_name + '?')) return;
              await internalDocsApi('remove', {
                attachmentId: doc.id,
              });
              refreshAgendaDocuments();
              await refresh();
              notify('Documento removido da ficha e das cópias vinculadas no app.');
              return;
            }
            const tab = window.open('about:blank', '_blank');
            try {
              const r = await internalDocsApi('link', {
                attachmentId: doc.id,
                download: title === 'Baixar',
              });
              if (tab) {
                tab.opener = null;
                tab.location.replace(r.url);
              } else window.location.href = r.url;
            } catch (err) {
              tab?.close();
              throw err;
            }
          } catch (err) {
            notify(err.message, true);
          } finally {
            b.disabled = false;
          }
        };
        row.append(b);
      }
      listEl.append(row);
    }
  };
  let attempt = null;
  const publish = root.querySelector('#internal-publish');
  async function send(file) {
    const issue = docIssue(file);
    if (issue) return notify(issue, true);
    if (attempt?.file !== file)
      attempt = {
        file,
        ticket: null,
        uploaded: false,
      };
    button.disabled = true;
    publish.disabled = true;
    picker.disabled = true;
    notify('Enviando ' + file.name + '…');
    try {
      await uploadInternalDoc(type, recordId, attempt);
      attempt = null;
      picker.value = '';
      button.textContent = 'Enviar arquivo';
      notify('Documento salvo na ficha. Use “Disponibilizar no app do cliente” para compartilhar.');
      refreshAgendaDocuments();
      try {
        await refresh();
      } catch {
        notify('Documento salvo. Reabra os documentos para atualizar a lista.', true);
      }
    } catch (err) {
      button.textContent = 'Tentar novamente';
      notify('O lançamento continua salvo. ' + err.message, true);
    } finally {
      button.disabled = false;
      publish.disabled = false;
      picker.disabled = false;
    }
  }
  button.onclick = () => send(picker.files?.[0] || attempt?.file);
  picker.onchange = () => {
    attempt = null;
    button.textContent = 'Enviar arquivo';
  };
  publish.onclick = async () => {
    publish.disabled = true;
    try {
      await publishInternalDoc(type, recordId);
    } finally {
      publish.disabled = false;
    }
  };
  try {
    await refresh();
  } catch (err) {
    notify(err.message, true);
  }
  if (initialFile && picker.isConnected) await send(initialFile);
}

export { openInternalDocs };
