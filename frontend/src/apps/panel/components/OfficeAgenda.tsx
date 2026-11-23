import { useLayoutEffect, useRef } from 'react';
import { mountAgenda } from '../../../shared/agenda/index.ts';
import type { DocumentRecord } from '../../../shared/agenda/types.ts';
import { validMonth } from '../../../shared/domain/workspace.ts';
import { internalDocsApi } from '../documents/api.ts';
import { handleAction } from '../navigation/actions.ts';
import { agendaState, demoMode, state } from '../state/filters.ts';
import { client, clientName, scope } from '../state/selectors.ts';
import { local, panelWorkspace } from '../state/workspace.ts';

export function OfficeAgenda() {
  const host = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const element = host.current;
    if (!element) return;
    const active = (row: { clientId: string }) =>
      scope(row) && client(row.clientId)?.status !== 'inactive' && Boolean(client(row.clientId));
    return mountAgenda(
      element,
      {
        taxes: panelWorkspace.data.taxes.filter(active),
        tasks: panelWorkspace.data.tasks.filter(active),
        companyName: clientName,
        loadDocuments:
          local || demoMode.demoSession
            ? null
            : async () => {
                const reply = await internalDocsApi('overview', {
                  clientId: state.client === 'all' ? '' : state.client,
                });
                // A agenda valida o formato; a ausência de `records` vira "Resposta incompleta".
                return { records: reply.records as DocumentRecord[] };
              },
        onAction(action, id, competence) {
          if (action === 'view-client' && validMonth(competence)) state.month = competence;
          handleAction(action, { dataset: { id } });
        },
      },
      agendaState.agendaView,
    );
  });
  return <section id="agenda-vencimentos" ref={host} />;
}
