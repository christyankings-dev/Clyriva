import type { ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { must } from './dom.ts';

/** Ponto de montagem React dentro de um elemento que já existe no HTML da página. */
export interface Slot {
  /** Renderiza de forma síncrona (a página e os testes leem o DOM logo em seguida). */
  render(node: ReactNode): void;
  unmount(): void;
}

export function slot(selector: string): Slot {
  let root: Root | undefined;
  return {
    render(node) {
      const current = (root ??= createRoot(must(selector)));
      flushSync(() => current.render(node));
    },
    unmount() {
      root?.unmount();
      root = undefined;
    },
  };
}
