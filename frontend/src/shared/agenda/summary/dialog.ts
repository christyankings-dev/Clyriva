import { summaryContent } from './content.ts';
import { button, element } from '../elements.ts';
import { printSummary, summaryArticle } from './print.ts';
import type { SummaryInfo, SummaryOptions } from '../types.ts';

function closeSummary(): void {
  const current = document.querySelector<HTMLDialogElement>('#resumo-mensal');
  if (!current) return;
  if (current.open) current.close();
  current.remove();
}

function showSummary(info: SummaryInfo, month: string, options?: SummaryOptions): void {
  closeSummary();
  const model = summaryContent(info, month, options);
  const dialog = element('dialog', 'routine-dialog');
  dialog.id = 'resumo-mensal';
  dialog.setAttribute('aria-label', model.header + ' — ' + model.name);
  const article = summaryArticle(model);
  const tools = element('div', 'routine-summary-tools');
  const copy = button('Copiar texto', 'routine-primary');
  const print = button('Imprimir / salvar PDF', 'routine-secondary');
  const close = button('Fechar', 'routine-secondary');
  const status = element('p', 'routine-feedback');
  status.setAttribute('role', 'status');
  const manual = element('textarea', 'routine-manual-copy');
  manual.setAttribute('aria-label', 'Texto do resumo para copiar');
  manual.readOnly = true;
  manual.hidden = true;
  tools.append(copy, print, close);
  dialog.append(article, tools, status, manual);
  close.onclick = closeSummary;
  dialog.addEventListener('close', () => dialog.remove(), {
    once: true,
  });
  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(model.plain);
      manual.hidden = true;
      status.textContent = 'Resumo copiado.';
    } catch {
      if (!dialog.isConnected) return;
      manual.value = model.plain;
      manual.hidden = false;
      manual.focus();
      manual.select();
      status.textContent = 'Use a opção Copiar do seu dispositivo ou pressione Ctrl+C.';
    }
  };
  print.onclick = () => printSummary(dialog, model, article);
  document.body.append(dialog);
  dialog.showModal();
  copy.focus({
    preventScroll: true,
  });
}

export { closeSummary, showSummary };
