import { requests } from '../state.ts';
import { company } from '../selectors.ts';
import { fmtDate, moneyForInput, status } from '../ui.ts';

function exportCharges() {
  const columns = [
    'Empresa',
    'Tipo',
    'Descrição',
    'Valor (R$)',
    'Vencimento',
    'Situação',
    'Pago em',
    'Observações',
    'Último lembrete',
  ];
  const safe = (value: unknown): string => {
    let str = String(value ?? '').replace(/\r?\n/g, ' ');
    if (/^[=+@\-\t]/.test(str)) str = "'" + str;
    return '"' + str.replace(/"/g, '""') + '"';
  };
  const rows = requests.state.notices
    .filter((x) => x.reminder_enabled)
    .map((x) => [
      company(x.client_id),
      x.notice_type,
      x.title,
      moneyForInput(x.amount_cents),
      fmtDate(x.due_date),
      x.status,
      x.paid_at ? new Date(x.paid_at).toLocaleDateString('pt-BR') : '',
      x.body,
      x.last_delivery?.date || '',
    ]);
  const csv = '\ufeff' + [columns, ...rows].map((row) => row.map(safe).join(';')).join('\r\n');
  const url = URL.createObjectURL(
    new Blob([csv], {
      type: 'text/csv;charset=utf-8',
    }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = 'clyriva-cobrancas-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  status('#admin-feedback', 'Relatório CSV de cobranças gerado. Guarde o arquivo em local seguro.');
}

export { exportCharges };
