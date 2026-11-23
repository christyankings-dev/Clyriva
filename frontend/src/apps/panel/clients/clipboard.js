import { panelWorkspace } from '../state/workspace.js';
import { toast } from '../lib/feedback.js';
import { client, clientName, feeExpected, feePaid } from '../state/selectors.js';
import { brl, fmtDate, mon } from '../lib/format.js';
import { state } from '../state/filters.js';

async function copyService(id) {
  const t = panelWorkspace.data.tasks.find((x) => x.id === id && x.category === 'Atendimento');
  if (!t) return toast('Solicitação não localizada.', true);
  const text = `Clyriva · Registro de atendimento\nCliente: ${clientName(t.clientId)}\nAssunto: ${t.title}\nPrazo: ${fmtDate(t.dueDate)}\nSituação: ${t.status === 'done' ? 'Concluído' : t.status === 'progress' ? 'Em andamento' : 'Pendente'}${t.notes ? '\nObservações: ' + t.notes : ''}`;
  try {
    await navigator.clipboard.writeText(text);
    toast('Resumo copiado. Revise antes de enviar ao cliente.');
  } catch {
    toast('Não foi possível copiar. Verifique a permissão da área de transferência.', true);
  }
}

async function copyClientBrief(id) {
  const c = client(id);
  if (!c) return toast('Cliente não encontrado.', true);
  const pending = panelWorkspace.data.tasks.filter((t) => t.clientId === id && t.status !== 'done');
  const tax = panelWorkspace.data.taxes.filter((t) => t.clientId === id && t.status !== 'paid');
  const text = `Resumo gerencial · ${c.name}\nCompetência: ${mon(state.month)}\nRegime: ${c.regime || 'Não informado'}\nHonorários recebidos: ${brl(feePaid(id, state.month))}\nHonorários previstos: ${brl(feeExpected(id, state.month))}\nPendências abertas: ${pending.length}\nGuias em aberto: ${tax.length}\n\nInformações de controle interno, sujeitas à conferência antes do envio.`;
  try {
    await navigator.clipboard.writeText(text);
    toast('Resumo copiado. Confira os dados antes de compartilhar.');
  } catch {
    toast('Não foi possível copiar o resumo.', true);
  }
}

export { copyClientBrief, copyService };
