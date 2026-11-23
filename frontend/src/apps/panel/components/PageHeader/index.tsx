import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  );
}
