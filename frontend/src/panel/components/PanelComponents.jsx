import { feeExpected, feePaid } from '../state/selectors.js';
import { priorityName, priorityVal } from '../clients/priority.js';
import { panelWorkspace } from '../state/workspace.js';

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  );
}

export function Panel({ title, subtitle, actions, children }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ icon, title, description, actions }) {
  return (
    <div className="empty">
      <div aria-hidden="true" className="empty-icon">
        {icon}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {actions}
    </div>
  );
}

export function Metric({ title, value, note, icon }) {
  return (
    <article className="kpi">
      <div className="kpi-head">
        <span className="kpi-title">{title}</span>
        <span aria-hidden="true" className="kpi-icon">
          {icon}
        </span>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-foot">{note}</div>
    </article>
  );
}

export function DataTable({ columns, children }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Action({ action, recordId = '', variant = 'small', children }) {
  return (
    <button type="button" className={'btn ' + variant} data-action={action} data-id={recordId}>
      {children}
    </button>
  );
}

export function NewRecord({ entity, children }) {
  return (
    <Action action={'new-' + entity} variant="primary">
      + {children}
    </Action>
  );
}

export function Badge({ children, tone = 'muted' }) {
  return <span className={'mini-badge ' + tone}>{children}</span>;
}

export function InvoiceStatus({ status }) {
  if (status === 'issued') return <Badge tone="good">Emitida</Badge>;
  if (status === 'canceled') return <Badge tone="bad">Cancelada</Badge>;
  return <Badge tone="warn">A emitir</Badge>;
}

export function TaskStatus({ status }) {
  if (status === 'done') return <Badge tone="good">Concluída</Badge>;
  if (status === 'progress') return <Badge tone="info">Em andamento</Badge>;
  return <Badge tone="warn">Pendente</Badge>;
}

export function FeeStatus({ clientId, month }) {
  const expected = feeExpected(clientId, month);
  const paid = feePaid(clientId, month);
  if (expected <= 0) return <Badge>Sem cobrança</Badge>;
  if (paid >= expected - 0.005) return <Badge tone="good">Recebido</Badge>;
  if (paid > 0) return <Badge tone="warn">Parcial</Badge>;
  return <Badge tone="bad">A receber</Badge>;
}

export function PriorityBadge({ priority }) {
  const value = priorityVal(priority);
  return <span className={'priority-pill p-' + value}>● {priorityName(value)}</span>;
}

export function CompanyOptions() {
  return (
    <>
      <option value="all">Todos os clientes</option>
      {panelWorkspace.data.clients.map((client) => (
        <option key={client.id} value={client.id}>
          {client.name}
        </option>
      ))}
    </>
  );
}
