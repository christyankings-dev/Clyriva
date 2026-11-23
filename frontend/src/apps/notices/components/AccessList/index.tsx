import { api } from '../../api.ts';
import { company } from '../../selectors.ts';
import { showTemporaryAccess } from '../../access/temporaryAccess.tsx';
import { refresh } from '../../records/refresh.ts';
import { status } from '../../ui.ts';
import type { AccessGrant, InviteReply } from '../../types.ts';
import { ActionButton } from '../ActionButton/index.tsx';

function deviceLine(grant: AccessGrant): string {
  if (!grant.enabled) return 'Acesso desativado.';
  return grant.active_devices > 0
    ? 'Notificações ativas em ' + grant.active_devices + ' dispositivo(s)'
    : 'Nenhum celular com notificações inscritas ainda.';
}

function GrantCard({ grant }: { grant: AccessGrant }) {
  const identity = { clientId: grant.client_id, email: grant.email };
  return (
    <article className="notice-card">
      <div className="between">
        <strong>{company(grant.client_id)}</strong>
        <span className={grant.enabled ? 'pill' : 'meta'}>
          {grant.enabled ? 'Ativo' : 'Revogado'}
        </span>
      </div>
      <p className="small">{grant.email}</p>
      <p className="meta">{deviceLine(grant)}</p>
      {grant.enabled && (
        <>
          <ActionButton
            label="Revogar acesso"
            confirmText={
              'Revogar o acesso de ' + grant.email + ' à empresa ' + company(grant.client_id) + '?'
            }
            onRun={async () => {
              await api('revoke', identity);
              status('#admin-feedback', 'Acesso revogado.');
              await refresh();
            }}
          />
          <ActionButton
            label="Redefinir senha do cliente"
            style={{ margin: '8px' }}
            confirmText={
              'Gerar nova senha provisória para ' +
              grant.email +
              '? A senha atual deixará de funcionar, inclusive se este e-mail acessar outras empresas.'
            }
            onRun={async () => {
              const result = await api<InviteReply>('reset-access', identity);
              showTemporaryAccess({
                email: result.email,
                secret: result.temporaryPassword,
                url: result.loginUrl,
              });
              status('#admin-feedback', 'Senha renovada. Envie o acesso de forma privada.');
            }}
          />
        </>
      )}
    </article>
  );
}

export function AccessList({ grants }: { grants: AccessGrant[] }) {
  if (!grants.length) return <div className="empty">Nenhum cliente autorizado até agora.</div>;
  return grants.map((grant) => (
    <GrantCard key={grant.client_id + '|' + grant.email} grant={grant} />
  ));
}
