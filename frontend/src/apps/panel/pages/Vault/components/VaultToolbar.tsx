import { Action, CompanyOptions } from '../../../components/index.ts';
import { vaultSession } from '../../../vault/session.ts';

export function VaultToolbar({ count }: { count: number }) {
  return (
    <div className="vault-toolbar">
      <span className="vault-ok">● Cofre desbloqueado · {count} acesso(s) criptografado(s)</span>
      <div className="toolbar-group">
        <select
          key={vaultSession.vaultSelectedClient}
          defaultValue={vaultSession.vaultSelectedClient}
          id="vault-client-filter"
          className="select"
        >
          <CompanyOptions />
        </select>
        <Action action="vault-new" recordId="" variant="small primary">
          Adicionar acesso
        </Action>
        <Action action="vault-lock" recordId="" variant="small">
          Bloquear
        </Action>
      </div>
    </div>
  );
}
