import { Action, Panel } from '../../../components/index.ts';
import type { Client } from '../../../../../shared/domain/types.ts';

interface Props {
  client: Client;
}

export function ClientNotesPanel({ client }: Props) {
  return (
    <Panel title="Anotações e alertas" subtitle="Observações internas do seu atendimento">
      <div className="panel-body">
        <p className="message">
          {client.notes || 'Nenhuma anotação registrada para este cliente.'}
        </p>
        <div className="mt18">
          <Action action="edit-client" recordId={client.id} variant="small">
            Editar anotações
          </Action>
        </div>
      </div>
    </Panel>
  );
}
