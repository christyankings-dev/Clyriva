import {
  Action,
  Badge,
  DataTable,
  EmptyState,
  Metric,
  NewRecord,
  PageHeader,
  TaskStatus,
} from '../../components/index.ts';
import { clientName, matchQuery, tasks } from '../../state/selectors.ts';
import { state } from '../../state/filters.ts';
import { fmtDate, today } from '../../lib/format.ts';
function Tasks() {
  const all = tasks().filter(
    (x) =>
      matchQuery([x.title, clientName(x.clientId), x.notes, x.category].join(' ')) &&
      (state.status === 'all' || x.status === state.status),
  );
  const open = tasks().filter((t) => t.status !== 'done');
  const late = open.filter((t) => t.dueDate < today);
  return (
    <>
      <PageHeader
        eyebrow="AGENDA DE CONTROLE"
        title="Obrigações e pendências"
        description="Controle guias, documentos, entregas, retornos e tarefas de cada cliente."
        actions={<NewRecord entity="task">Criar tarefa</NewRecord>}
      />
      <section className="kpis">
        <Metric
          title="Tarefas cadastradas"
          value={tasks().length}
          note="Nesta competência"
          icon="☑"
        />
        <Metric
          title="Concluídas"
          value={tasks().filter((t) => t.status === 'done').length}
          note="Atividades finalizadas"
          icon="✓"
        />
        <Metric title="Em aberto" value={open.length} note="Aguardando conclusão" icon="◷" />
        <Metric
          title="Atrasadas"
          value={late.length}
          note="Prazo anterior à data de hoje"
          icon="!"
        />
      </section>
      <div className="toolbar">
        <div className="toolbar-group">
          <label className="search">
            <span>⌕</span>
            <input
              id="search"
              placeholder="Buscar tarefa ou cliente..."
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
            <option value="pending">Pendente</option>
            <option value="progress">Em andamento</option>
            <option value="done">Concluída</option>
          </select>
        </div>
        <Action action="copy-tasks" recordId="" variant="small">
          Repetir mês anterior
        </Action>
      </div>
      <section className="panel">
        {all.length ? (
          <DataTable
            columns={[
              'Cliente',
              'Atividade',
              'Categoria',
              'Prazo',
              'Prioridade',
              'Situação',
              'Ações',
            ]}
          >
            {all
              .slice()
              .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))
              .map((x) => (
                <tr key={x.id}>
                  <td>
                    <strong>{clientName(x.clientId)}</strong>
                  </td>
                  <td>
                    <strong>{x.title}</strong>
                    <small>{x.notes || ''}</small>
                  </td>
                  <td>{x.category || 'Outro'}</td>
                  <td className="nobr">
                    {fmtDate(x.dueDate)}
                    {x.dueDate < today && x.status !== 'done' ? (
                      <small className="tw:text-[#c15b67]">Em atraso</small>
                    ) : (
                      ''
                    )}
                  </td>
                  <td>
                    {x.priority === 'high' ? (
                      <Badge tone="bad">Alta</Badge>
                    ) : x.priority === 'medium' ? (
                      <Badge tone="warn">Média</Badge>
                    ) : (
                      <Badge tone="muted">Baixa</Badge>
                    )}
                  </td>
                  <td>
                    <TaskStatus status={x.status} />
                  </td>
                  <td>
                    <div className="table-actions">
                      {x.status !== 'done' ? (
                        <Action action="complete-task" recordId={x.id}>
                          Concluir
                        </Action>
                      ) : (
                        ''
                      )}
                      <Action action="docs-task" recordId={x.id}>
                        📎 Anexos
                      </Action>
                      <Action action="publish-task" recordId={x.id}>
                        Enviar ao app
                      </Action>
                      <Action action="edit-task" recordId={x.id}>
                        Editar
                      </Action>
                      <Action action="delete-task" recordId={x.id} variant="small danger">
                        Excluir
                      </Action>
                    </div>
                  </td>
                </tr>
              ))}
          </DataTable>
        ) : (
          <EmptyState
            icon="☑"
            title="Sem tarefas nesta competência"
            description="Cadastre guias, entregas, documentos e outras obrigações."
            actions={<NewRecord entity="task">Criar tarefa</NewRecord>}
          />
        )}
      </section>
      <p className="caption mt18">
        O botão “Repetir mês anterior” copia as tarefas do mês anterior para a competência atual,
        preservando o dia do vencimento quando possível. Confira prazos legais antes de utilizá-los.
      </p>
    </>
  );
}
export { Tasks };
