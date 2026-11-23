import { PageHeader, Panel } from '../components/PanelComponents.jsx';
import { panelWorkspace } from '../state/workspace.js';
function backupReminder() {
  let last = null;
  try {
    last = localStorage.getItem('clyriva-last-backup');
  } catch {}
  const days = last ? (Date.now() - Date.parse(last)) / 86400000 : Infinity;
  return days > 7 ? (
    <div className="notice warn">
      <strong>Backup recomendado.</strong> Não há exportação recente registrada neste navegador.
      Acesse Dados e backup e salve uma cópia em local seguro.
    </div>
  ) : (
    ''
  );
}
function Settings() {
  return (
    <>
      <PageHeader
        eyebrow="CONTROLE DOS SEUS DADOS"
        title="Dados e backup"
        description="Gerencie os cadastros, lançamentos e o cofre da sua carteira."
      />
      <section className="panel pad tw:mb-[18px]">
        <h3>Aplicativo no celular e notificações</h3>
        <p className="tw:mt-[9px] tw:mb-[14px]">
          Instale o Clyriva na tela inicial do celular e receba alertas de obrigações próximas do
          vencimento. As notificações não mostram dados sigilosos.
        </p>
        <button
          type="button"
          id="pwa-settings-open"
          onClick={() => window.parent.ClyrivaPwa?.open()}
          className="button secondary"
        >
          Instalar app e configurar alertas
        </button>
      </section>
      {backupReminder()}
      <div className="notice danger">
        <strong>Sincronização online:</strong> após autenticar no Clyriva, os dados são enviados
        para seu banco Supabase. A proteção depende das políticas RLS e da configuração segura do
        provedor. O cofre usa criptografia própria, mas dados comuns não são criptografados no
        navegador antes do envio. Faça backup regularmente e confira o indicador de sincronização.
      </div>
      <div className="settings-grid">
        <Panel title="Backup e restauração" subtitle="Leve seus dados a outro computador">
          <div className="settings-block">
            <p>
              O JSON guarda a carteira e o cofre cifrado. Os PDFs, imagens, avisos publicados e
              autorizações do aplicativo ficam no servidor e exigem uma cópia separada.
            </p>
            <button data-action="backup" className="btn primary">
              ↧ Fazer backup JSON
            </button>
            <button data-action="import" className="btn">
              ↥ Importar backup
            </button>
            <p className="caption mt18">
              A importação substitui todos os dados da sua carteira atual. Backup inclui o cofre
              criptografado, sem senhas em texto aberto. Os demais dados do cadastro e do financeiro
              permanecem legíveis no arquivo. Guarde-o em local seguro.
            </p>
          </div>
        </Panel>
        <Panel title="Proteção da carteira" subtitle="Operações destrutivas bloqueadas">
          <div className="settings-block">
            <p>
              O Clyriva não substitui a carteira por demonstrações nem permite apagar tudo com um
              único clique.
            </p>
            <p>
              Os dados de demonstração e a exclusão integral foram desativados na versão online para
              proteger sua carteira.
            </p>
            <p className="caption mt18">Antes de substituir seus dados, exporte um backup.</p>
          </div>
        </Panel>
        <Panel title="Registros armazenados" subtitle="Quantidades nesta instalação">
          <div className="settings-block">
            <ul>
              <li>{panelWorkspace.data.clients.length} cliente(s)</li>
              <li>{panelWorkspace.data.invoices.length} nota(s) fiscal(is)</li>
              <li>{panelWorkspace.data.cash.length} movimentação(ões) financeira(s)</li>
              <li>{panelWorkspace.data.tasks.length} tarefa(s)</li>
              <li>{panelWorkspace.data.fees.length} competência(s) de honorários</li>
              <li>{panelWorkspace.data.taxes.length} guia(s) ou tributo(s)</li>
            </ul>
            <button data-action="export-csv" className="btn">
              ↧ Relatório mensal CSV
            </button>
          </div>
        </Panel>
        <Panel title="Escopo desta versão" subtitle="O que está e o que não está integrado">
          <div className="settings-block">
            <p>
              Já funciona: clientes, prioridade, e-mails de contato, notas fiscais manuais,
              faturamento fiscal, caixa, honorários, guias, obrigações, relatórios, backup e cofre
              criptografado de acessos.
            </p>
            <p>
              Consulta CNPJ: o cadastro pode ser preenchido por meio da BrasilAPI, com CNPJ.ws como
              segunda fonte (requer internet; disponibilidade sujeita aos provedores). Não está
              integrado: emissão de NFS-e, consulta de DAS e tributos, consulta bancária, automação
              bancária e emissão fiscal direta.
            </p>
            <p className="caption">
              Versão para organização pessoal. A configuração fiscal deve ser validada para cada
              cliente.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}
export { Settings };
