import type { ReactNode } from 'react';

interface MetricProps {
  title: string;
  value: ReactNode;
  note: ReactNode;
  icon: string;
}

export function Metric({ title, value, note, icon }: MetricProps) {
  return (
    <article className="kpi">
      <div className="kpi-head">
        <span className="kpi-title">{title}</span>
        <span aria-hidden="true" className="kpi-icon">
          {icon}
        </span>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-foot">{note}</div>
    </article>
  );
}
