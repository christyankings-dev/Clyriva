import {
  Action,
  Badge,
  DataTable,
  EmptyState,
  InvoiceStatus,
  Metric,
  PageHeader,
  Panel,
  PriorityBadge,
  TaskStatus,
} from '../components/PanelComponents.jsx';
import { client, feeExpected, feePaid, issued, sum } from '../state/selectors.js';
import { demoMode, state } from '../state/filters.js';
import { local, panelWorkspace } from '../state/workspace.js';
import { brl, fmtDate, mon } from '../shared/format.js';
import { priorityVal } from '../clients/priority.js';
import { vaultSession } from '../vault/session.js';
function ClientDetails() {
  const c = client(state.detail);
  if (!c)
    return (
      <PageHeader
        eyebrow="CLIENTE"
        title="Cliente não encontrado"
        description="Volte para a lista de clientes."
        actions={<Action action="go-clients">Ver clientes</Action>}
      />
    );
  const inv = panelWorkspace.data.invoices
    .filter((x) => x.clientId === c.id && x.competence === state.month)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const mov = panelWorkspace.data.cash.filter(
    (x) => x.clientId === c.id && String(x.date || '').slice(0, 7) === state.month,
  );
  const allTasks = panelWorkspace.data.tasks.filter(
    (x) => x.clientId === c.id && x.competence === state.month,
  );
  const ownTaxes = panelWorkspace.data.taxes.filter(
    (x) => x.clientId === c.id && x.competence === state.month,
  );
  const billed = sum(inv.filter(issued), (x) => x.value),
    received = sum(
      mov.filter((x) => x.kind === 'receipt'),
      (x) => x.value,
    ),
    expenses = sum(
      mov.filter((x) => x.kind === 'expense'),
      (x) => x.value,
    );
  return (
    <>
      <PageHeader
        eyebrow="FICHA INDIVIDUAL"
        title={c.name}
        description={
          <>
            {c.regime || 'Regime não informado'} · {c.segment || 'Sem segmento'} ·{' '}
            <PriorityBadge priority={priorityVal(c.priority)} /> ·{' '}
            <Badge tone={c.status === 'active' ? 'good' : 'muted'}>
              {c.status === 'active' ? 'Cliente ativo' : 'Cliente inativo'}
            </Badge>
          </>
        }
        actions={
          <>
            <Action action="go-clients">← Clientes</Action>
            <Action action="copy-client-brief" recordId={c.id}>
              Copiar resumo
            </Action>
            <Action action="resumo-cliente" recordId={c.id}>
              Resumo do mês
            </Action>
            {!local && !demoMode.demoSession && c.status !== 'inactive' ? (
              <a
                href={'/avisos-admin.html#autorizar?empresa=' + encodeURIComponent(c.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn small"
              >
                Criar login do cliente
              </a>
            ) : (
              ''
            )}
            <Action action="edit-client" recordId={c.id} variant="small primary">
              Editar cadastro
            </Action>
          </>
        }
      />
      <section className="kpis">
        <Metric
          title="NFs emitidas"
          value={brl(billed)}
          note={`${inv.filter(issued).length} documento(s) no mês`}
          icon="▧"
        />
        <Metric title="Recebimentos" value={brl(received)} note="Caixa do mês" icon="↙" />
        <Metric title="Despesas" value={brl(expenses)} note="Saídas financeiras do mês" icon="↗" />
        <Metric
          title="Honorários pagos"
          value={brl(feePaid(c.id, state.month))}
          note={`de ${brl(feeExpected(c.id, state.month))} previstos`}
          icon="◈"
        />
      </section>
      <div className="details-grid">
        <Panel title="Informações do cliente" subtitle="Dados de contato e acompanhamento">
          <div className="panel-body">
            <div className="detail-item">
              <span>CPF / CNPJ</span>
              <strong>{c.document || 'Não informado'}</strong>
            </div>
            {c.cnpjLookupAt ? (
              <>
                <div className="detail-item">
                  <span>Nome fantasia</span>
                  <strong>{c.tradeName || '—'}</strong>
                </div>
                <div className="detail-item">
                  <span>Situação cadastral</span>
                  <strong>{c.registryStatus || '—'}</strong>
                </div>
                <div className="detail-item">
                  <span>CNAE principal</span>
                  <strong>
                    {c.activityCode || '—'} · {c.segment || '—'}
                  </strong>
                </div>
                <div className="detail-item">
                  <span>Endereço cadastral</span>
                  <strong>{[c.address, c.city, c.uf].filter(Boolean).join(' · ') || '—'}</strong>
                </div>
                <div className="detail-item">
                  <span>Consulta pública</span>
                  <strong>{new Date(c.cnpjLookupAt).toLocaleDateString('pt-BR')}</strong>
                </div>
              </>
            ) : (
              ''
            )}
            <div className="detail-item">
              <span>Prioridade</span>
              <strong>
                <PriorityBadge priority={priorityVal(c.priority)} />
              </strong>
            </div>
            <div className="detail-item">
              <span>Contato responsável</span>
              <strong>{c.contactName || 'Não informado'}</strong>
            </div>
            <div className="detail-item">
              <span>E-mail financeiro</span>
              <strong>{c.billingEmail || 'Não informado'}</strong>
            </div>
            <div className="detail-item">
              <span>Regime tributário</span>
              <strong>{c.regime || 'Não informado'}</strong>
            </div>
            <div className="detail-item">
              <span>Área / atividade</span>
              <strong>{c.segment || 'Não informada'}</strong>
            </div>
            <div className="detail-item">
              <span>Telefone</span>
              <strong>{c.phone || 'Não informado'}</strong>
            </div>
            <div className="detail-item">
              <span>E-mail</span>
              <strong>{c.email || 'Não informado'}</strong>
            </div>
            <div className="detail-item">
              <span>Início do contrato</span>
              <strong>{fmtDate(c.start)}</strong>
            </div>
            <div className="detail-item">
              <span>Honorários-base</span>
              <strong>{brl(c.monthlyFee)}</strong>
            </div>
          </div>
        </Panel>
        <Panel title="Anotações e alertas" subtitle="Observações internas do seu atendimento">
          <div className="panel-body">
            <p className="message">{c.notes || 'Nenhuma anotação registrada para este cliente.'}</p>
            <div className="mt18">
              <Action action="edit-client" recordId={c.id} variant="small">
                Editar anotações
              </Action>
            </div>
          </div>
        </Panel>
        <Panel
          title="Acessos deste cliente"
          subtitle="Senhas e logins guardados no cofre criptografado"
        >
          <div className="panel-body">
            <p>
              {vaultSession.vaultData
                ? `${vaultSession.vaultData.access.filter((x) => x.clientId === c.id).length} acesso(s) salvo(s).`
                : 'Desbloqueie seu cofre para visualizar ou cadastrar acessos.'}
            </p>
            <Action action="vault-for" recordId={c.id} variant="small primary">
              {vaultSession.vaultData ? 'Gerenciar acessos' : 'Abrir cofre'}
            </Action>
          </div>
        </Panel>
      </div>
      <div className="grid-main">
        <Panel
          title="Notas fiscais"
          subtitle={`Competência ${mon(state.month)}`}
          actions={
            <Action action="new-invoice-for" recordId={c.id}>
              Nova NF
            </Action>
          }
        >
          {inv.length ? (
            <DataTable columns={['NF', 'Emissão', 'Valor', 'Situação']}>
              {inv.map((x) => (
                <tr key={x.id}>
                  <td>
                    <strong>{x.number || 'Sem número'}</strong>
                    <small>{x.description || ''}</small>
                  </td>
                  <td>{fmtDate(x.date)}</td>
                  <td className="money">{brl(x.value)}</td>
                  <td>
                    <InvoiceStatus status={x.status} />
                  </td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <EmptyState
              icon="▧"
              title="Sem NFs"
              description="Nenhuma nota cadastrada no período."
            />
          )}
        </Panel>
        <Panel
          title="Obrigações e pendências"
          subtitle={`${allTasks.length} tarefa(s) cadastrada(s)`}
          actions={
            <Action action="new-task-for" recordId={c.id}>
              Criar tarefa
            </Action>
          }
        >
          {allTasks.length ? (
            <div className="mini-list">
              {allTasks.map((x) => (
                <div key={x.id} className="mini-row">
                  <div>
                    <strong>{x.title}</strong>
                    <small>{fmtDate(x.dueDate)}</small>
                  </div>
                  <TaskStatus status={x.status} />
                  <Action action="docs-task" recordId={x.id} variant="small">
                    Anexos
                  </Action>
                  <Action action="publish-task" recordId={x.id} variant="small">
                    Enviar ao app
                  </Action>
                  {x.status !== 'done' ? (
                    <Action action="complete-task" recordId={x.id}>
                      Concluir
                    </Action>
                  ) : (
                    ''
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="☑"
              title="Nenhuma tarefa"
              description="Não há pendências lançadas no período."
            />
          )}
        </Panel>
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Guias, boletos e tributos</h2>
            <p>Anexe as guias aqui e escolha quais serão disponibilizadas ao cliente.</p>
          </div>
        </div>
        {ownTaxes.length ? (
          <DataTable columns={['Guia', 'Vencimento', 'Valor', 'Situação', 'Ações']}>
            {ownTaxes
              .slice()
              .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))
              .map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.kind}</strong>
                    <small>{t.ref || ''}</small>
                  </td>
                  <td>{fmtDate(t.dueDate)}</td>
                  <td className="money">{brl(t.value)}</td>
                  <td>
                    {t.status === 'paid' ? (
                      <Badge tone="good">Paga</Badge>
                    ) : (
                      <Badge tone="warn">Em aberto</Badge>
                    )}
                  </td>
                  <td>
                    <div className="table-actions">
                      <Action action="docs-tax" recordId={t.id}>
                        📎 Documentos
                      </Action>
                      <Action action="publish-tax" recordId={t.id}>
                        Enviar ao app
                      </Action>
                      <Action action="edit-tax" recordId={t.id}>
                        Editar
                      </Action>
                      {t.status !== 'paid' ? (
                        <Action action="pay-tax" recordId={t.id}>
                          Registrar pagamento
                        </Action>
                      ) : (
                        ''
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </DataTable>
        ) : (
          <EmptyState
            icon="▣"
            title="Nenhuma guia nesta competência"
            description="Cadastre a primeira guia para poder anexar o PDF e compartilhar com o cliente."
          />
        )}
        <div className="panel-body">
          <Action action="new-tax-for" recordId={c.id} variant="small primary">
            Cadastrar guia
          </Action>
        </div>
      </section>
    </>
  );
}
export { ClientDetails };
