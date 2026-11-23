import {
  Action,
  Badge,
  DataTable,
  EmptyState,
  PageHeader,
  TaskStatus,
} from '../../components/index.ts';
import { panelWorkspace } from '../../state/workspace.ts';
import { clientName, matchQuery, scope } from '../../state/selectors.ts';
import { state } from '../../state/filters.ts';
import { fmtDate, mon, today } from '../../lib/format.ts';
function Service() {
  const list = panelWorkspace.data.tasks
    .filter(
      (t) =>
        scope(t) &&
        t.category === 'Atendimento' &&
        matchQuery([t.title, t.notes, clientName(t.clientId), t.competence].join(' ')) &&
        (state.status === 'all' || t.status === state.status),
    )
    .sort(
      (a, b) =>
        (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0) ||
        String(b.dueDate || '').localeCompare(String(a.dueDate || '')),
    );
  const total = panelWorkspace.data.tasks.filter((t) => scope(t) && t.category === 'Atendimento');
  const unfinished = total.filter((t) => t.status !== 'done');
  const overdue = unfinished.filter((t) => t.dueDate < today);
  const done = total.filter((t) => t.status === 'done');
  return (
    <>
      <PageHeader
        eyebrow="RELACIONAMENTO COM CLIENTES"
        title="Atendimentos"
        description="Registre o que cada cliente pediu, organize retornos e mantenha um histórico das entregas."
        actions={
          <button data-action="new-service" className="btn primary">
            + Nova solicitação
          </button>
        }
      />
      <div className="attention-inline">
        <strong>Atendimento direto:</strong> registre as solicitações nesta carteira. Os clientes
        consultam no aplicativo apenas os avisos e documentos que você disponibilizar.
      </div>
      <div className="service-board">
        <article className="service-card">
          <div className="service-label">Solicitações em aberto</div>
          <div className="service-number">{unfinished.length}</div>
          <Badge tone={unfinished.length ? 'warn' : 'good'}>Aguardando acompanhamento</Badge>
        </article>
        <article className="service-card">
          <div className="service-label">Retornos atrasados</div>
          <div className="service-number">{overdue.length}</div>
          <Badge tone={overdue.length ? 'bad' : 'good'}>Com prazo vencido</Badge>
        </article>
        <article className="service-card">
          <div className="service-label">Atendimentos concluídos</div>
          <div className="service-number">{done.length}</div>
          <Badge tone="good">Histórico preservado</Badge>
        </article>
      </div>
      <div className="toolbar">
        <div className="toolbar-group">
          <label className="search">
            <span>⌕</span>
            <input
              id="search"
              placeholder="Pesquisar cliente ou solicitação..."
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
            <option value="all">Todas as situações</option>
            <option value="pending">Pendente</option>
            <option value="progress">Em andamento</option>
            <option value="done">Concluído</option>
          </select>
        </div>
        <span className="caption">{list.length} registro(s) encontrado(s), em qualquer mês</span>
      </div>
      <section className="panel">
        {list.length ? (
          <DataTable columns={['Cliente', 'Solicitação / resposta', 'Prazo', 'Situação', 'Ações']}>
            {list.map((t) => (
              <tr key={t.id}>
                <td>
                  <strong>{clientName(t.clientId)}</strong>
                  <small>{mon(t.competence)}</small>
                </td>
                <td>
                  <strong>{t.title}</strong>
                  <small>{t.notes || 'Sem observações'}</small>
                </td>
                <td className="nobr">
                  {fmtDate(t.dueDate)}
                  {t.dueDate < today && t.status !== 'done' ? (
                    <small className="tw:text-[#b3394b]">Atrasado</small>
                  ) : (
                    ''
                  )}
                </td>
                <td>
                  <TaskStatus status={t.status} />
                </td>
                <td>
                  <div className="table-actions">
                    <Action action="copy-service" recordId={t.id}>
                      Copiar resumo
                    </Action>
                    {t.status !== 'done' ? (
                      <Action action="complete-task" recordId={t.id}>
                        Concluir
                      </Action>
                    ) : (
                      ''
                    )}
                    <Action action="docs-task" recordId={t.id}>
                      📎 Anexos
                    </Action>
                    <Action action="publish-task" recordId={t.id}>
                      Enviar ao app
                    </Action>
                    <Action action="edit-task" recordId={t.id}>
                      Editar
                    </Action>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState
            icon="✓"
            title="Nenhum atendimento encontrado"
            description="Registre uma solicitação do cliente e acompanhe o retorno."
            actions={
              <button data-action="new-service" className="btn primary">
                Criar atendimento
              </button>
            }
          />
        )}
      </section>
    </>
  );
}
export { Service };
