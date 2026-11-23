import {
  Action,
  CompanyOptions,
  DataTable,
  EmptyState,
  PageHeader,
} from '../components/PanelComponents.jsx';
import { vaultAvailable } from '../vault/crypto.js';
import { vaultExists, vaultSession } from '../vault/session.js';
import { clientName } from '../state/selectors.js';
function Vault() {
  const head = (
    <PageHeader
      eyebrow="ACESSOS PARTICULARES"
      title="Cofre de acessos"
      description="Logins, senhas e dados de portais vinculados a cada cliente. Protegidos pela sua senha-mestra."
    />
  );
  if (!vaultAvailable())
    return (
      <>
        {head}
        <div className="notice danger">
          Criptografia não disponível neste contexto. Utilize um navegador atualizado em ambiente
          seguro. Não digite senhas aqui.
        </div>
      </>
    );
  if (!vaultExists())
    return (
      <>
        {head}
        <div className="vault-hero">
          <div className="vault-illustration">♙</div>
          <h2>Configure seu cofre privado</h2>
          <p>
            Crie uma senha-mestra de 12 caracteres ou mais. Ela protege os acessos de seus clientes
            e não é armazenada pelo sistema.
          </p>
          <form id="vault-setup-form" className="vault-unlock-form">
            <label>
              Senha-mestra
              <input
                type="password"
                name="master"
                autoComplete="new-password"
                minLength="12"
                required
                placeholder="Crie sua senha-mestra"
              />
            </label>
            <label>
              Confirmar senha-mestra
              <input
                type="password"
                name="confirm"
                autoComplete="new-password"
                minLength="12"
                required
                placeholder="Repita a senha-mestra"
              />
            </label>
            <button type="submit" className="btn primary">
              Criar cofre protegido
            </button>
          </form>
          <p className="caption">
            Atenção: se esquecer a senha-mestra, não há recuperação dos acessos. Faça backup JSON e
            guarde-o em local seguro.
          </p>
        </div>
      </>
    );
  if (!vaultSession.vaultData)
    return (
      <>
        {head}
        <div className="vault-hero">
          <div className="vault-illustration">♙</div>
          <h2>Cofre bloqueado</h2>
          <p>
            Somente a senha-mestra permite descriptografar os acessos. Ela não é transmitida para
            servidores.
          </p>
          <form id="vault-unlock-form" className="vault-unlock-form">
            <label>
              Senha-mestra
              <input
                type="password"
                name="master"
                autoComplete="current-password"
                required
                autoFocus
                placeholder="Digite sua senha-mestra"
              />
            </label>
            <button type="submit" className="btn primary">
              Desbloquear cofre
            </button>
          </form>
          <p className="caption">
            Sem recuperação de senha-mestra. Não coloque credenciais no campo de anotações públicas
            do cliente.
          </p>
        </div>
      </>
    );
  const matches = vaultSession.vaultData.access
    .filter(
      (a) =>
        vaultSession.vaultSelectedClient === 'all' ||
        a.clientId === vaultSession.vaultSelectedClient,
    )
    .sort(
      (a, b) =>
        clientName(a.clientId).localeCompare(clientName(b.clientId)) ||
        a.label.localeCompare(b.label),
    );
  return (
    <>
      {head}
      <div className="vault-toolbar">
        <span className="vault-ok">
          ● Cofre desbloqueado · {vaultSession.vaultData.access.length} acesso(s) criptografado(s)
        </span>
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
      <section className="panel vault-help">
        <div className="panel-body">
          <strong>Proteção dos acessos</strong>
          <p>
            As senhas são criptografadas com AES-GCM antes de serem salvas. A edição local guarda o
            cofre neste navegador. No painel online, somente o conteúdo cifrado é sincronizado. A
            senha-mestra permanece apenas na memória enquanto o cofre está desbloqueado. Ele é
            bloqueado ao fechar ou recarregar a página ou após 10 minutos de inatividade.
          </p>
          <p>
            O backup JSON inclui o cofre criptografado; seus outros dados (nome, e-mails de contato,
            faturamento, observações) não são criptografados. Guarde o backup em local protegido.
          </p>
          <button data-action="vault-change" className="btn">
            Alterar senha-mestra
          </button>
        </div>
      </section>
    </>
  );
}
export { Vault };
