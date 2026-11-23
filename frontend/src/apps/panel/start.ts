import { observeViewChanges } from './state/viewChanges.ts';
import { core, local, panelConnection, panelWorkspace, unpackLocal } from './state/workspace.ts';
import { demoMode } from './state/filters.ts';
import { must } from './lib/format.ts';
import { render } from './navigation/router.tsx';
import { showStorageError } from './state/transactions.ts';
import { bindEvents } from './navigation/events/index.ts';

export function start(): void {
  bindEvents();
  try {
    if (local) {
      if (window !== window.top) throw Error('Abra a edição local em sua própria aba.');
      unpackLocal();
    } else {
      if (window === window.parent)
        throw Error('O painel administrativo deve ser aberto pelo login.');
      panelConnection.bridge = window.parent.ClyrivaPanelHost;
      const initial = panelConnection.bridge?.open(window);
      if (!initial) throw Error('Sessão administrativa indisponível.');
      panelWorkspace.data = core.workspace(initial.data);
      panelWorkspace.encrypted = core.vault(initial.vault);
      demoMode.demoSession = initial.demo === true;
    }
    panelWorkspace.initialized = true;
    document.body.classList.add('clyriva-initialized');
    must('#panel-status').hidden = true;
    observeViewChanges(render);
    render();
  } catch (e) {
    showStorageError(e);
  }
}
