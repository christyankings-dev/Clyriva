import { Action, DataTable, EmptyState } from '../../../components/index.ts';
import { clientName } from '../../../state/selectors.ts';
import type { VaultAccess } from '../../../../../shared/domain/types.ts';

export function VaultRecords({ matches }: { matches: VaultAccess[] }) {
  return (
    <section className="panel vault-records">
      {matches.length ? (
        <DataTable columns={['Cliente / Serviço', 'E-mail ou login', 'Endereço', 'Ações']}>
          {matches.map((a) => (
            <tr key={a.id}>
              <td>
                <strong>{clientName(a.clientId)}</strong>
                <small>{a.label}</small>
              </td>
              <td>{a.username || '—'}</td>
              <td>{a.site ? <span className="muted-link">{a.site}</span> : '—'}</td>
              <td className="vault-action-cell">
                <Action action="vault-edit" recordId={a.id} variant="small">
                  Ver / editar
                </Action>
                <Action action="vault-delete" recordId={a.id} variant="small danger">
                  Excluir
                </Action>
              </td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState
          icon="♙"
          title="Nenhum acesso cadastrado"
          description="Cadastre o primeiro login e senha para um dos seus clientes."
          actions={
            <Action action="vault-new" recordId="" variant="small primary">
              Adicionar acesso
            </Action>
          }
        />
      )}
    </section>
  );
}
