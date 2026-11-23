import { useLayoutEffect, useRef } from 'react';
import { mountAgenda } from '../../../shared/agenda/index.js';
import { validMonth } from '../../../shared/domain/workspace.js';
import { internalDocsApi } from '../documents/api.js';
import { handleAction } from '../navigation/actions.js';
import { agendaState, demoMode, state } from '../state/filters.js';
import { client, clientName, scope } from '../state/selectors.js';
import { local, panelWorkspace } from '../state/workspace.js';

export function OfficeAgenda() {
  const host = useRef(null);
  useLayoutEffect(() => {
    const active = (row) =>
      scope(row) && client(row.clientId) && client(row.clientId).status !== 'inactive';
    return mountAgenda(
      host.current,
      {
        taxes: panelWorkspace.data.taxes.filter(active),
        tasks: panelWorkspace.data.tasks.filter(active),
        companyName: clientName,
        loadDocuments:
          local || demoMode.demoSession
            ? null
            : () =>
                internalDocsApi('overview', {
                  clientId: state.client === 'all' ? '' : state.client,
                }),
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
