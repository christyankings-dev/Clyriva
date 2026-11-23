import { reportRows } from './rows.js';
import { download } from '../lib/download.js';
import { state } from '../state/filters.js';
import { toast } from '../lib/feedback.js';

function csvCell(v) {
  const str = String(v ?? '');
  const safe = /^[\s]*[=+@-]/.test(str) ? "'" + str : str;
  return '"' + safe.replace(/"/g, '""') + '"';
}

function exportCsv() {
  const arr = reportRows().map((r) => [
    r.c.name,
    r.c.document,
    r.c.regime,
    r.issued,
    r.billed,
    r.received,
    r.expenses,
    r.open,
    r.fee,
    r.paid,
    r.taxOpen,
    r.tasks,
  ]);
  const head = [
    'Cliente',
    'CPF/CNPJ',
    'Regime',
    'Notas emitidas',
    'Faturamento de NFs',
    'Entradas',
    'Despesas',
    'NF em aberto',
    'Honorários previstos',
    'Honorários recebidos',
    'Tributos em aberto',
    'Tarefas abertas',
  ];
  const csv = '\uFEFF' + [head, ...arr].map((row) => row.map(csvCell).join(';')).join('\r\n');
  download(`clyriva-relatorio-${state.month}.csv`, csv, 'text/csv;charset=utf-8');
  toast('Relatório CSV exportado.');
}

export { exportCsv };
