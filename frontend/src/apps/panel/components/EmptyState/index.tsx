import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function EmptyState({ icon, title, description, actions }: EmptyStateProps) {
  return (
    <div className="empty">
      <div aria-hidden="true" className="empty-icon">
        {icon}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {actions}
    </div>
  );
}
