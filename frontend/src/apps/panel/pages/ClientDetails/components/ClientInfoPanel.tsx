import { Panel, PriorityBadge } from '../../../components/index.ts';
import { brl, fmtDate } from '../../../lib/format.ts';
import { priorityVal } from '../../../clients/priority.ts';
import type { Client } from '../../../../../shared/domain/types.ts';

interface Props {
  client: Client;
}

export function ClientInfoPanel({ client }: Props) {
  return (
    <Panel title="Informações do cliente" subtitle="Dados de contato e acompanhamento">
      <div className="panel-body">
        <div className="detail-item">
          <span>CPF / CNPJ</span>
          <strong>{client.document || 'Não informado'}</strong>
        </div>
        {client.cnpjLookupAt ? (
          <>
            <div className="detail-item">
              <span>Nome fantasia</span>
              <strong>{client.tradeName || '—'}</strong>
            </div>
            <div className="detail-item">
              <span>Situação cadastral</span>
              <strong>{client.registryStatus || '—'}</strong>
            </div>
            <div className="detail-item">
              <span>CNAE principal</span>
              <strong>
                {client.activityCode || '—'} · {client.segment || '—'}
              </strong>
            </div>
            <div className="detail-item">
              <span>Endereço cadastral</span>
              <strong>
                {[client.address, client.city, client.uf].filter(Boolean).join(' · ') || '—'}
              </strong>
            </div>
            <div className="detail-item">
              <span>Consulta pública</span>
              <strong>{new Date(client.cnpjLookupAt).toLocaleDateString('pt-BR')}</strong>
            </div>
          </>
        ) : (
          ''
        )}
        <div className="detail-item">
          <span>Prioridade</span>
          <strong>
            <PriorityBadge priority={priorityVal(client.priority)} />
          </strong>
        </div>
        <div className="detail-item">
          <span>Contato responsável</span>
          <strong>{client.contactName || 'Não informado'}</strong>
        </div>
        <div className="detail-item">
          <span>E-mail financeiro</span>
          <strong>{client.billingEmail || 'Não informado'}</strong>
        </div>
        <div className="detail-item">
          <span>Regime tributário</span>
          <strong>{client.regime || 'Não informado'}</strong>
        </div>
        <div className="detail-item">
          <span>Área / atividade</span>
          <strong>{client.segment || 'Não informada'}</strong>
        </div>
        <div className="detail-item">
          <span>Telefone</span>
          <strong>{client.phone || 'Não informado'}</strong>
        </div>
        <div className="detail-item">
          <span>E-mail</span>
          <strong>{client.email || 'Não informado'}</strong>
        </div>
        <div className="detail-item">
          <span>Início do contrato</span>
          <strong>{fmtDate(client.start)}</strong>
        </div>
        <div className="detail-item">
          <span>Honorários-base</span>
          <strong>{brl(client.monthlyFee)}</strong>
        </div>
      </div>
    </Panel>
  );
}
