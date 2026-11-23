import type { ReactNode } from 'react';

export type BadgeTone = 'muted' | 'good' | 'warn' | 'bad' | 'info';

export function Badge({ children, tone = 'muted' }: { children?: ReactNode; tone?: BadgeTone }) {
  return <span className={'mini-badge ' + tone}>{children}</span>;
}
