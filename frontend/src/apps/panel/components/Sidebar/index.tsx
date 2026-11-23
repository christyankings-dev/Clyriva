import { mainNav, preferenceNav, type NavItem } from './navItems.tsx';

/** O destaque (`on`) da página atual é aplicado por `navigation/router.ts`. */
function NavButton({ page, label, icon }: NavItem) {
  return (
    <button type="button" data-page={page} className="nav">
      <span className="nav-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {icon}
        </svg>
      </span>
      {label}
    </button>
  );
}

export function Sidebar() {
  return (
    <aside className="side" id="side">
      <div className="brand">
        <div className="brandmark">
          <span>c</span>
          <i></i>
        </div>
        <div>
          <strong>
            clyriva<span>.</span>
          </strong>
          <small>GESTÃO DE CLIENTES</small>
        </div>
      </div>
      <div className="side-label">GESTÃO</div>
      <nav id="nav" aria-label="Menu principal">
        {mainNav.map((item) => (
          <NavButton key={item.page} {...item} />
        ))}
      </nav>
      <div className="side-label second">PREFERÊNCIAS</div>
      <nav>
        {preferenceNav.map((item) => (
          <NavButton key={item.page} {...item} />
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="local-dot"></div>
        <div>
          <strong>Espaço particular</strong>
          <span>Sincronização pelo portal</span>
        </div>
      </div>
    </aside>
  );
}
