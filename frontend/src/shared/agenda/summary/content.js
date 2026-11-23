import { brl, cents, cleanText, dateLabel, localDate, monthLabel } from '../calendar.js';
import { openItems } from '../schedule/selectors.js';

function summaryContent({ client, invoices, taxes, tasks }, month, { demo, publishedAt } = {}) {
  const issued = invoices.filter((x) => x.competence === month && x.status === 'issued');
  const guides = taxes.filter((x) => x.competence === month);
  const work = tasks.filter((x) => x.competence === month);
  let billed = 0,
    received = 0,
    remaining = 0;
  for (const invoice of issued) {
    const value = cents(invoice.value),
      paid = cents(invoice.paid);
    billed += value;
    received += paid;
    remaining += Math.max(0, value - paid);
  }
  const guideTotal = guides
    .filter((x) => x.status !== 'paid')
    .reduce((total, g) => total + cents(g.value), 0);
  const sections = [
    {
      title: 'Notas fiscais',
      lines: [
        'Notas emitidas (' + issued.length + ') — ' + brl(billed / 100),
        'Recebido nessas notas — ' + brl(received / 100),
        'Saldo atual a receber — ' + brl(remaining / 100),
      ],
      note: 'Os recebimentos incluem as baixas vinculadas a essas notas até a atualização dos dados.',
    },
  ];
  const open = openItems(guides, work);
  const deadline = (item, word) =>
    item.due ? word + ' ' + dateLabel(item.due) : 'sem prazo registrado';
  const openGuides = open.filter((x) => x.type === 'tax');
  const openTasks = open.filter((x) => x.type === 'task');
  sections.push({
    title: 'Guias em aberto',
    lines: openGuides.length
      ? [
          'Total em aberto — ' + brl(guideTotal / 100),
          ...openGuides.map(
            (g) => g.title + ' · ' + brl(g.value) + ' · ' + deadline(g, 'vencimento'),
          ),
        ]
      : [
          guides.length
            ? 'Todas as guias registradas nesta competência estão pagas.'
            : 'Nenhuma guia registrada nesta competência.',
        ],
  });
  sections.push({
    title: 'Tarefas em aberto',
    lines: openTasks.length
      ? openTasks.map((t) => t.title + ' · ' + deadline(t, 'prazo'))
      : [
          work.length
            ? 'Todas as tarefas registradas nesta competência foram concluídas.'
            : 'Nenhuma tarefa registrada nesta competência.',
        ],
  });
  const name = cleanText(client.name) || cleanText(client.tradeName) || 'Empresa';
  const header = 'Resumo da competência ' + monthLabel(month);
  const stamp =
    publishedAt && Number.isFinite(Date.parse(publishedAt))
      ? 'Publicado em ' + new Date(publishedAt).toLocaleString('pt-BR')
      : 'Gerado em ' + dateLabel(localDate());
  const footer = [demo && 'Demonstração com dados fictícios', stamp].filter(Boolean).join(' · ');
  const plain = [
    name,
    header,
    '',
    ...sections.flatMap((s) => [s.title, ...s.lines, ...(s.note ? [s.note] : []), '']),
    footer,
  ].join('\n');
  return {
    name,
    header,
    sections,
    footer,
    plain,
  };
}

export { summaryContent };
