import { Action, Badge, DataTable, EmptyState } from '../../../components/index.ts';
import { brl, fmtDate } from '../../../lib/format.ts';
import type { Client, Tax } from '../../../../../shared/domain/types.ts';

interface Props {
  client: Client;
  taxes: Tax[];
}

export function ClientTaxesPanel({ client, taxes }: Props) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Guias, boletos e tributos</h2>
          <p>Anexe as guias aqui e escolha quais serão disponibilizadas ao cliente.</p>
        </div>
      </div>
      {taxes.length ? (
        <DataTable columns={['Guia', 'Vencimento', 'Valor', 'Situação', 'Ações']}>
          {taxes
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
        <Action action="new-tax-for" recordId={client.id} variant="small primary">
          Cadastrar guia
        </Action>
      </div>
    </section>
  );
}
