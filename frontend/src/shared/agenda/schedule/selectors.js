import { byText, cleanText, validDate } from '../calendar.js';

function openItems(taxes, tasks, companyName) {
  const items = [];
  for (const [type, rows] of [
    ['tax', taxes],
    ['task', tasks],
  ]) {
    for (const row of rows) {
      if (row.status === (type === 'tax' ? 'paid' : 'done')) continue;
      items.push({
        type,
        id: row.id,
        clientId: row.clientId,
        title: type === 'tax' ? cleanText(row.kind) || 'Guia' : cleanText(row.title) || 'Tarefa',
        company: companyName ? cleanText(companyName(row.clientId)) : '',
        competence: row.competence,
        waiting: row.awaitingClient === true,
        due: validDate(row.dueDate) ? row.dueDate : '',
        priority:
          {
            critical: 0,
            high: 1,
            medium: 2,
            low: 3,
          }[row.priority] ?? 2,
        value: type === 'tax' ? row.value : null,
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

function matches(range, item, days, doc) {
  switch (range) {
    case 'all':
      return true;
    case 'late':
      return days !== null && days < 0;
    case 'today':
      return days === 0;
    case 'soon':
      return days >= 1 && days <= 3;
    case 'next':
      return days >= 1 && days <= 7;
    case 'waiting':
      return item.type === 'task' && item.waiting;
    case 'missing':
      return item.type === 'tax' && doc?.files === 0;
    case 'unsent':
      return (
        item.type === 'tax' &&
        doc &&
        doc.status !== 'archived' &&
        (doc.status === 'internal' || doc.privateFiles > 0)
      );
    case 'published':
      return item.type === 'tax' && ['active', 'paid'].includes(doc?.status);
    case 'archived':
      return item.type === 'tax' && doc?.status === 'archived';
    default:
      return days !== null && days <= 7;
  }
}

function relativeDay(days) {
  if (days === null) return 'Sem prazo';
  if (days < 0) return Math.abs(days) + (days === -1 ? ' dia de atraso' : ' dias de atraso');
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Amanhã';
  return 'Em ' + days + ' dias';
}

export { matches, openItems, relativeDay };
