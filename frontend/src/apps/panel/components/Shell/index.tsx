import { Sidebar } from '../Sidebar/index.tsx';
import { Topbar } from '../Topbar/index.tsx';

/** Casca do painel. O conteúdo da página é montado em `#page` por navigation/router.ts. */
export function Shell() {
  return (
    <div className="shell">
      <Sidebar />
      <div className="body-area">
        <Topbar />
        <main id="page" tabIndex={-1}></main>
        <footer>
          CLYRIVA V2.6 · Painel para gestão administrativa. Não substitui sistemas fiscais oficiais.{' '}
          <span>Faça backups regularmente.</span>
        </footer>
      </div>
    </div>
  );
}
