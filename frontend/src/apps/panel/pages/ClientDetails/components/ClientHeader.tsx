import { Action, Badge, PageHeader, PriorityBadge } from '../../../components/index.ts';
import { priorityVal } from '../../../clients/priority.ts';
import { local } from '../../../state/workspace.ts';
import { demoMode } from '../../../state/filters.ts';
import type { Client } from '../../../../../shared/domain/types.ts';

interface Props {
  client: Client;
}

export function ClientHeader({ client }: Props) {
  return (
    <PageHeader
      eyebrow="FICHA INDIVIDUAL"
      title={client.name}
      description={
        <>
          {client.regime || 'Regime não informado'} · {client.segment || 'Sem segmento'} ·{' '}
          <PriorityBadge priority={priorityVal(client.priority)} /> ·{' '}
          <Badge tone={client.status === 'active' ? 'good' : 'muted'}>
            {client.status === 'active' ? 'Cliente ativo' : 'Cliente inativo'}
          </Badge>
        </>
      }
      actions={
        <>
          <Action action="go-clients">← Clientes</Action>
          <Action action="copy-client-brief" recordId={client.id}>
            Copiar resumo
          </Action>
          <Action action="resumo-cliente" recordId={client.id}>
            Resumo do mês
          </Action>
          {!local && !demoMode.demoSession && client.status !== 'inactive' ? (
            <a
              href={'/avisos-admin.html#autorizar?empresa=' + encodeURIComponent(client.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn small"
            >
              Criar login do cliente
            </a>
          ) : (
            ''
          )}
          <Action action="edit-client" recordId={client.id} variant="small primary">
            Editar cadastro
          </Action>
        </>
      }
    />
  );
}
