import type { ReactNode } from 'react';

interface ActionProps {
  /** Valor de `data-action`, tratado por `navigation/actions.ts`. */
  action: string;
  recordId?: string;
  variant?: string;
  children?: ReactNode;
}

export function Action({ action, recordId = '', variant = 'small', children }: ActionProps) {
  return (
    <button type="button" className={'btn ' + variant} data-action={action} data-id={recordId}>
      {children}
    </button>
  );
}

export function NewRecord({ entity, children }: { entity: string; children?: ReactNode }) {
  return (
    <Action action={'new-' + entity} variant="primary">
      + {children}
    </Action>
  );
}
