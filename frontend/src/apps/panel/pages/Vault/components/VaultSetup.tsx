export function VaultSetup() {
  return (
    <div className="vault-hero">
      <div className="vault-illustration">♙</div>
      <h2>Configure seu cofre privado</h2>
      <p>
        Crie uma senha-mestra de 12 caracteres ou mais. Ela protege os acessos de seus clientes e
        não é armazenada pelo sistema.
      </p>
      <form id="vault-setup-form" className="vault-unlock-form">
        <label>
          Senha-mestra
          <input
            type="password"
            name="master"
            autoComplete="new-password"
            minLength={12}
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
            minLength={12}
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
  );
}
