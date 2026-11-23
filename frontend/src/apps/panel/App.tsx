import { Shell } from './components/Shell/index.tsx';

/** Estrutura fixa do painel; páginas, diálogos e avisos entram pelos pontos de montagem (#page, #modal-root, #toast-root). */
export function App() {
  return (
    <>
      <div id="panel-status" role="status">
        Abrindo painel…
      </div>
      <Shell />
      <div id="modal-root"></div>
      <div id="toast-root" aria-live="polite"></div>
      <input id="import-file" type="file" accept="application/json,.json" hidden />
    </>
  );
}
