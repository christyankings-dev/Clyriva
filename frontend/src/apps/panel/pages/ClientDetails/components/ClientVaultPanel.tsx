import { Action, Panel } from '../../../components/index.ts';
import { vaultSession } from '../../../vault/session.ts';
import type { Client } from '../../../../../shared/domain/types.ts';

interface Props {
  client: Client;
}

export function ClientVaultPanel({ client }: Props) {
  return (
    <Panel
      title="Acessos deste cliente"
      subtitle="Senhas e logins guardados no cofre criptografado"
    >
      <div className="panel-body">
        <p>
          {vaultSession.vaultData
            ? `${vaultSession.vaultData.access.filter((x) => x.clientId === client.id).length} acesso(s) salvo(s).`
            : 'Desbloqueie seu cofre para visualizar ou cadastrar acessos.'}
        </p>
        <Action action="vault-for" recordId={client.id} variant="small primary">
          {vaultSession.vaultData ? 'Gerenciar acessos' : 'Abrir cofre'}
        </Action>
      </div>
    </Panel>
  );
}
