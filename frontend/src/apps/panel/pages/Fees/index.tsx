import {
  Action,
  DataTable,
  EmptyState,
  FeeStatus,
  Metric,
  NewRecord,
  PageHeader,
} from '../../components/index.ts';
import { clients, feeExpected, feePaid, feeRecord, sum } from '../../state/selectors.ts';
import { state } from '../../state/filters.ts';
import { brl, mon } from '../../lib/format.ts';
function Fees() {
  const rows = clients().filter((c) => c.status === 'active' || feeRecord(c.id, state.month));
  const expected = sum(rows, (c) => feeExpected(c.id, state.month)),
    paid = sum(rows, (c) => feePaid(c.id, state.month));
  return (
    <>
      <PageHeader
        eyebrow="GESTÃO FINANCEIRA"
        title="Meus honorários"
        description="Acompanhe quanto você deve cobrar e quanto cada cliente já pagou."
        actions={<NewRecord entity="fee">Lançar honorários</NewRecord>}
      />
      <section className="kpis">
        <Metric
          title="Honorários previstos"
          value={brl(expected)}
          note="Cobranças desta competência"
          icon="◈"
        />
        <Metric
          title="Honorários recebidos"
          value={brl(paid)}
          note="Pagamentos informados"
          icon="↙"
        />
        <Metric
          title="Total a receber"
          value={brl(Math.max(0, expected - paid))}
          note="Saldo de honorários pendente"
          icon="◷"
        />
        <Metric
          title="Clientes em atraso / aberto"
          value={
            rows.filter((c) => feeExpected(c.id, state.month) > feePaid(c.id, state.month) + 0.005)
              .length
          }
          note="Ainda sem quitação integral"
          icon="♧"
        />
      </section>
      <div className="notice blue">
        Este painel controla <strong>seus honorários</strong>, que são separados do faturamento e
        das contas bancárias dos clientes. A situação é baseada nos valores lançados manualmente.
      </div>
      <section className="panel">
        {rows.length ? (
          <DataTable
            columns={[
              'Cliente',
              'Honorários previstos',
              'Recebido',
              'Saldo',
              'Competência',
              'Situação',
              'Ações',
            ]}
          >
            {rows.map((c) => {
              const a = feeExpected(c.id, state.month),
                p = feePaid(c.id, state.month);
              return (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                    <small>{c.regime || 'Regime não informado'}</small>
                  </td>
                  <td className="money">{brl(a)}</td>
                  <td className="money good">{brl(p)}</td>
                  <td className={'money ' + (a > p ? 'bad' : '')}>{brl(Math.max(0, a - p))}</td>
                  <td>{mon(state.month)}</td>
                  <td>
                    <FeeStatus clientId={c.id} month={state.month} />
                  </td>
                  <td>
                    <Action action="fee-for" recordId={c.id}>
                      Registrar
                    </Action>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        ) : (
          <EmptyState
            icon="◈"
            title="Nenhuma cobrança cadastrada"
            description="Cadastre clientes e informe o valor mensal dos seus honorários."
            actions={<NewRecord entity="client">Cadastrar cliente</NewRecord>}
          />
        )}
      </section>
      <p className="caption mt18">
        O valor previsto usa os honorários atuais do cadastro, salvo quando você registra um valor
        específico para a competência. Para conservar o histórico, registre cada competência
        mensalmente.
      </p>
    </>
  );
}
export { Fees };
