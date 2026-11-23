import { byText, cleanText, validDate } from '../calendar.ts';
import type { AgendaItem, DocumentRecord, OpenItemKind, TaskRow, TaxRow } from '../types.ts';

const priorityRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function openItems(
  taxes: TaxRow[],
  tasks: TaskRow[],
  companyName?: (clientId: string) => string,
): AgendaItem[] {
  const items: AgendaItem[] = [];
  const groups: [OpenItemKind, (TaxRow | TaskRow)[]][] = [
    ['tax', taxes],
    ['task', tasks],
  ];
  for (const [type, rows] of groups) {
    for (const row of rows) {
      if (row.status === (type === 'tax' ? 'paid' : 'done')) continue;
      const tax = row as TaxRow;
      const task = row as TaskRow;
      items.push({
        type,
        id: row.id ?? '',
        clientId: row.clientId ?? '',
        title: type === 'tax' ? cleanText(tax.kind) || 'Guia' : cleanText(task.title) || 'Tarefa',
        company: companyName ? cleanText(companyName(row.clientId ?? '')) : '',
        competence: row.competence,
        waiting: task.awaitingClient === true,
        due: validDate(row.dueDate) ? row.dueDate : '',
        priority: priorityRank[task.priority ?? ''] ?? 2,
        value: type === 'tax' ? tax.value : null,
      });
    }
  }
  return items.sort(
    (a, b) =>
      (a.due || '9999-99-99').localeCompare(b.due || '9999-99-99') ||
      a.priority - b.priority ||
      byText.compare(a.company, b.company) ||
      byText.compare(a.title, b.title),
  );
}

function matches(
  range: string,
  item: AgendaItem,
  days: number | null,
  doc?: DocumentRecord,
): boolean {
  switch (range) {
    case 'all':
      return true;
    case 'late':
      return days !== null && days < 0;
    case 'today':
      return days === 0;
    case 'soon':
      return days !== null && days >= 1 && days <= 3;
    case 'next':
      return days !== null && days >= 1 && days <= 7;
    case 'waiting':
      return item.type === 'task' && item.waiting;
    case 'missing':
      return item.type === 'tax' && doc?.files === 0;
    case 'unsent':
      return Boolean(
        item.type === 'tax' &&
        doc &&
        doc.status !== 'archived' &&
        (doc.status === 'internal' || doc.privateFiles > 0),
      );
    case 'published':
      return item.type === 'tax' && !!doc && ['active', 'paid'].includes(doc.status);
    case 'archived':
      return item.type === 'tax' && doc?.status === 'archived';
    default:
      return days !== null && days <= 7;
  }
}

function relativeDay(days: number | null): string {
  if (days === null) return 'Sem prazo';
  if (days < 0) return Math.abs(days) + (days === -1 ? ' dia de atraso' : ' dias de atraso');
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Amanhã';
  return 'Em ' + days + ' dias';
}

export { matches, openItems, relativeDay };
