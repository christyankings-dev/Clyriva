export function VaultHelp() {
  return (
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
  );
}
