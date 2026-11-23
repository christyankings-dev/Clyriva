import { Panel } from '../../../components/index.ts';
import { brl, mon } from '../../../lib/format.ts';
import { state } from '../../../state/filters.ts';
import type { MonthTotals } from '../types.ts';

export function FinanceIndicators({ totals }: { totals: MonthTotals }) {
  return (
    <Panel title="Indicadores financeiros" subtitle={`Movimentação em ${mon(state.month)}`}>
      <div className="panel-body">
        <div className="detail-item">
          <span>NFs emitidas</span>
          <strong>{brl(totals.faturamento)}</strong>
        </div>
        <div className="detail-item">
          <span>Valor das NFs ainda em aberto*</span>
          <strong>{brl(totals.open)}</strong>
        </div>
        <div className="detail-item">
          <span>Entradas registradas</span>
          <strong>{brl(totals.received)}</strong>
        </div>
        <div className="detail-item">
          <span>Saídas registradas</span>
          <strong>{brl(totals.spent)}</strong>
        </div>
        <div className="detail-item">
          <span>Saldo de caixa do mês</span>
          <strong>{brl(totals.received - totals.spent)}</strong>
        </div>
        <p className="caption mt18">
          * Valores em aberto consideram todos os recebimentos vinculados a cada NF, mesmo os
          ocorridos em outros meses.
        </p>
      </div>
    </Panel>
  );
}
