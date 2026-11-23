import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { must } from '../../../shared/lib/dom.ts';
import { TemporaryAccess } from '../components/TemporaryAccess/index.tsx';
import type { TemporaryAccessProps } from '../components/TemporaryAccess/types.ts';

let current: Root | undefined;

/** Mostra o acesso gerado em #invite-result (que também recebe mensagens de status em texto). */
export function showTemporaryAccess(props: TemporaryAccessProps): void {
  const box = must('#invite-result');
  current?.unmount();
  box.replaceChildren();
  const mount = document.createElement('div');
  box.append(mount);
  const root = (current = createRoot(mount));
  flushSync(() => root.render(<TemporaryAccess {...props} />));
}
