import { PageHeader } from '../../components/index.ts';
import { clientName } from '../../state/selectors.ts';
import { vaultAvailable } from '../../vault/crypto.ts';
import { vaultExists, vaultSession } from '../../vault/session.ts';
import { VaultHelp } from './components/VaultHelp.tsx';
import { VaultRecords } from './components/VaultRecords.tsx';
import { VaultSetup } from './components/VaultSetup.tsx';
import { VaultToolbar } from './components/VaultToolbar.tsx';
import { VaultUnlock } from './components/VaultUnlock.tsx';

function VaultHead() {
  return (
    <PageHeader
      eyebrow="ACESSOS PARTICULARES"
      title="Cofre de acessos"
      description="Logins, senhas e dados de portais vinculados a cada cliente. Protegidos pela sua senha-mestra."
    />
  );
}

export function Vault() {
  if (!vaultAvailable())
    return (
      <>
        <VaultHead />
        <div className="notice danger">
          Criptografia não disponível neste contexto. Utilize um navegador atualizado em ambiente
          seguro. Não digite senhas aqui.
        </div>
      </>
    );
  if (!vaultExists())
    return (
      <>
        <VaultHead />
        <VaultSetup />
      </>
    );
  const data = vaultSession.vaultData;
  if (!data)
    return (
      <>
        <VaultHead />
        <VaultUnlock />
      </>
    );
  const matches = data.access
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
      <VaultHead />
      <VaultToolbar count={data.access.length} />
      <VaultRecords matches={matches} />
      <VaultHelp />
    </>
  );
}
