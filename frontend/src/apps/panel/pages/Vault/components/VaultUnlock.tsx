export function VaultUnlock() {
  return (
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
        Sem recuperação de senha-mestra. Não coloque credenciais no campo de anotações públicas do
        cliente.
      </p>
    </div>
  );
}
