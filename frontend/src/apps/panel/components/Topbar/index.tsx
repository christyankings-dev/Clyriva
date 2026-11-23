export function Topbar() {
  return (
    <header className="topbar">
      <button type="button" className="hamb" id="hamb" aria-label="Abrir navegação">
        ☰
      </button>
      <div className="breadcrumb">
        MINHA GESTÃO <span>/</span> <b id="breadcrumb">Visão geral</b>
      </div>
      <label className="top-search" aria-label="Busca rápida de clientes">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m16 16 5 5" />
        </svg>
        <input
          id="global-search"
          type="search"
          autoComplete="off"
          placeholder="Buscar cliente ou CNPJ"
          aria-label="Buscar cliente ou CNPJ"
        />
      </label>
      <div className="top-filters">
        <label className="top-field">
          Competência <input id="month" type="month" aria-label="Competência" />
        </label>
        <label className="top-field">
          Cliente
          {/* As opções são montadas por navigation/router.ts (lista muda com os dados). */}
          <select id="client-filter" aria-label="Filtrar cliente"></select>
        </label>
      </div>
    </header>
  );
}
