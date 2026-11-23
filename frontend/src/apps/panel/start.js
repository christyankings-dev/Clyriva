import { observeViewChanges } from './state/viewChanges.js';
import { core, local, panelConnection, panelWorkspace, unpackLocal } from './state/workspace.js';
import { demoMode } from './state/filters.js';
import { $ } from './lib/format.js';
import { render } from './navigation/router.js';
import { showStorageError } from './state/transactions.js';
import './navigation/events.js';

function start() {
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
    $('#panel-status').hidden = true;
    observeViewChanges(render);
    render();
  } catch (e) {
    showStorageError(e);
  }
}

start();
