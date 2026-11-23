interface BillingSummaryProps {
  counts: [string, number][];
}

export function BillingSummary({ counts }: BillingSummaryProps) {
  return counts.map(([name, value]) => (
    <div key={name} className="summary-item">
      <strong>{value}</strong>
      <span>{name}</span>
    </div>
  ));
}
