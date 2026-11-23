import {
  Action,
  Badge,
  EmptyState,
  FeeStatus,
  NewRecord,
  PageHeader,
  PriorityBadge,
} from '../../components/PanelComponents.jsx';
import { clients, feeExpected, feePaid, issued, matchQuery, sum } from '../../state/selectors.js';
import { state } from '../../state/filters.js';
import { priorityOrder, priorityVal } from '../../clients/priority.js';
import { brl, mon } from '../../lib/format.js';
import { panelWorkspace } from '../../state/workspace.js';
function Clients() {
  const filtered = clients()
    .filter(
      (c) =>
        matchQuery([c.name, c.document, c.regime, c.segment, c.email, c.contactName].join(' ')) &&
        (state.status === 'all' || c.status === state.status) &&
        (state.priority === 'all' || priorityVal(c.priority) === state.priority),
    )
    .sort(
      (a, b) =>
        priorityOrder[priorityVal(a.priority)] - priorityOrder[priorityVal(b.priority)] ||
        a.name.localeCompare(b.name, 'pt-BR'),
    );
  return (
    <>
      <PageHeader
        eyebrow="CARTEIRA DE CLIENTES"
        title="Meus clientes"
        description="Cadastros, perfis, faturamento fiscal, honorários e situação de cada cliente."
        actions={<NewRecord entity="client">Adicionar cliente</NewRecord>}
      />
      <div className="toolbar">
        <div className="toolbar-group">
          <label className="search">
            <span>⌕</span>
            <input
              id="search"
              placeholder="Buscar nome, CNPJ, setor..."
              key={state.query}
              defaultValue={state.query}
            />
          </label>
          <select
            key={state.status}
            defaultValue={state.status}
            id="status-filter"
            className="select"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
          <select
            key={state.priority}
            defaultValue={state.priority}
            id="priority-filter"
            className="select"
          >
            <option value="all">Todas as prioridades</option>
            {[
              ['critical', 'Crítica'],
              ['high', 'Alta'],
              ['medium', 'Média'],
              ['low', 'Baixa'],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <span className="caption">{filtered.length} cliente(s) encontrado(s)</span>
      </div>
      {filtered.length ? (
        <div className="client-grid">
          {filtered.map((c) => {
            const billed = sum(
              panelWorkspace.data.invoices.filter(
                (x) => x.clientId === c.id && x.competence === state.month && issued(x),
              ),
              (x) => x.value,
            );
            const p = feePaid(c.id, state.month);
            const ex = feeExpected(c.id, state.month);
            return (
              <article key={c.id} className="client-card">
                <div className="client-row">
                  <div className="client-avatar">
                    {c.name
                      .trim()
                      .split(/\s+/)
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div className="priority-badges">
                    <PriorityBadge priority={priorityVal(c.priority)} />
                    <Badge tone={c.status === 'active' ? 'good' : 'muted'}>
                      {c.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
                <h3 title={c.name}>{c.name}</h3>
                <p>
                  {c.regime || 'Regime não informado'} · {c.segment || 'Segmento não informado'}
                </p>
                <div className="facts">
                  <div>
                    <span>Faturamento fiscal · {mon(state.month)}</span>
                    <strong>{brl(billed)}</strong>
                  </div>
                  <div>
                    <span>Honorários mensais</span>
                    <strong>{brl(ex)}</strong>
                  </div>
                </div>
                <div className="tw:flex tw:justify-between tw:mt-3 tw:gap-2.5">
                  <span className="caption">Honorários recebidos: {brl(p)}</span>
                  <FeeStatus clientId={c.id} month={state.month} />
                </div>
                <div className="card-actions">
                  <Action action="view-client" recordId={c.id} variant="small primary">
                    Ver ficha
                  </Action>
                  <Action action="edit-client" recordId={c.id} variant="small">
                    Editar
                  </Action>
                  <Action action="delete-client" recordId={c.id} variant="small danger">
                    Excluir
                  </Action>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="♧"
          title="Nenhum cliente encontrado"
          description="Cadastre um novo cliente ou limpe os filtros."
          actions={<NewRecord entity="client">Novo cliente</NewRecord>}
        />
      )}
    </>
  );
}
export { Clients };
