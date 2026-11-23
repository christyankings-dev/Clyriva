import { brl, isoMonth, ymOffset } from '../../../lib/format.ts';
import { state } from '../../../state/filters.ts';
import { issued, scope, sum } from '../../../state/selectors.ts';
import { panelWorkspace } from '../../../state/workspace.ts';

/** Barras com o valor das NFs emitidas nos últimos seis meses. */
export function BillingChart() {
  const months = Array.from(
    {
      length: 6,
    },
    (_, i) => ymOffset(state.month, i - 5),
  );
  const vals = months.map((m) =>
    sum(
      panelWorkspace.data.invoices.filter((x) => scope(x) && x.competence === m && issued(x)),
      (x) => x.value,
    ),
  );
  const mx = Math.max(1, ...vals);
  return (
    <>
      <div className="chart">
        <div className="chart-grid">
          <span />
          <span />
          <span />
          <span />
        </div>
        {months.map((m, i) => (
          <div key={m} className="chart-col">
            <div
              style={{
                height: Math.max(1, (vals[i] / mx) * 100) + '%',
              }}
              className="chart-bar"
            >
              <span className="bar-tip">{brl(vals[i])}</span>
            </div>
            <label>{isoMonth(m)}</label>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <span className="legend-dot" /> Valor das NFs emitidas, por competência
      </div>
    </>
  );
}
