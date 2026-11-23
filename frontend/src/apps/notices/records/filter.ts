import type { AdminNotice } from '../types.ts';

/** Hoje no fuso de Brasília, como AAAA-MM-DD. */
function todayIso(): string {
  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => dateParts.find((x) => x.type === type)?.value;
  return part('year') + '-' + part('month') + '-' + part('day');
}

/** Dias até o vencimento (NaN quando não há data, o que deixa todas as comparações falsas). */
function dueDays(iso: string | null): number {
  if (!iso) return NaN;
  return Math.round(
    (Date.parse(iso + 'T00:00:00Z') - Date.parse(todayIso() + 'T00:00:00Z')) / 86400000,
  );
}

/** Cobranças em aberto, com a contagem que alimenta o resumo. */
function billingCounts(scoped: AdminNotice[]): [string, number][] {
  const activeBills = scoped.filter((x) => x.reminder_enabled && x.status === 'active');
  const late = activeBills.filter((x) => dueDays(x.due_date) < 0);
  const soon = activeBills.filter((x) => {
    const d = dueDays(x.due_date);
    return d >= 0 && d <= 3;
  });
  return [
    ['Em aberto', activeBills.length],
    ['Vencem em até 3 dias', soon.length],
    ['Atrasadas', late.length],
    ['Pagas', scoped.filter((n) => n.status === 'paid').length],
  ];
}

function filterNotices(scoped: AdminNotice[], filter: string): AdminNotice[] {
  return scoped
    .filter((n) => {
      if (filter === 'pending') return n.status === 'active' && n.reminder_enabled;
      if (filter === 'soon')
        return (
          n.status === 'active' &&
          n.reminder_enabled &&
          dueDays(n.due_date) >= 0 &&
          dueDays(n.due_date) <= 3
        );
      if (filter === 'late')
        return n.status === 'active' && n.reminder_enabled && dueDays(n.due_date) < 0;
      if (filter === 'paid') return n.status === 'paid';
      if (filter === 'messages') return !n.reminder_enabled;
      return true;
    })
    .sort((a, b) =>
      a.status === 'active' && b.status !== 'active'
        ? -1
        : a.status !== 'active' && b.status === 'active'
          ? 1
          : String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')),
    );
}

export { billingCounts, filterNotices };
