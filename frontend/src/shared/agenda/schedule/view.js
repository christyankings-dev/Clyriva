import { matches, openItems, relativeDay } from './selectors.js';
import { button, element } from '../elements.js';
import {
  brl,
  dateLabel,
  dayMs,
  documentRanges,
  localDate,
  monthLabel,
  pageSize,
  ranges,
} from '../calendar.js';

function documentLabel(doc) {
  if (!doc) return '';
  if (doc.status === 'archived') return 'Arquivada no app';
  if (doc.status === 'internal')
    return doc.files ? 'Com anexo · ainda não publicada' : 'Sem anexo · uso interno';
  if (doc.privateFiles) return 'Publicada · há anexo interno para revisar';
  return doc.files ? 'Publicada com anexo' : 'Publicada · sem anexo na ficha';
}

function mountAgenda(host, { taxes, tasks, companyName, onAction, loadDocuments }, view) {
  const items = openItems(taxes, tasks, companyName);
  const key = (item) => JSON.stringify([item.clientId, item.type, item.id]);
  let documents,
    loading = false,
    failed = false,
    refreshPending = false;
  host.className = 'routine-agenda';
  host.setAttribute('aria-labelledby', 'agenda-heading');
  const title = element('h2', '', 'Meu dia / Minha semana');
  title.id = 'agenda-heading';
  const heading = element('div');
  heading.append(
    title,
    element(
      'p',
      '',
      'Guias e pendências em aberto de todas as competências. Prazos no horário de Brasília.',
    ),
  );
  const head = element('div', 'routine-agenda-head');
  const label = element('label', 'routine-filter', 'Mostrar');
  const select = document.createElement('select');
  select.id = 'agenda-periodo';
  const options = ranges.filter(([id]) => loadDocuments || !documentRanges.has(id));
  options.forEach(([id, text]) => select.add(new Option(text, id)));
  if (!options.some(([id]) => id === view.range)) view.range = 'attention';
  select.value = view.range;
  label.append(select);
  head.append(heading, label);
  const cards = element('div', 'routine-cards');
  const counters = new Map();
  for (const [id, text] of options.filter(
    ([id]) => !['attention', 'all', 'archived'].includes(id),
  )) {
    const card = button('', 'routine-counter');
    const number = element('strong');
    card.dataset.range = id;
    card.append(number, element('span', '', text));
    card.onclick = () => choose(id);
    counters.set(id, {
      card,
      number,
    });
    cards.append(card);
  }
  const feedback = element('div', 'routine-agenda-foot');
  const message = element('span', 'routine-count');
  message.setAttribute('role', 'status');
  const retry = button('Atualizar documentos', 'routine-link');
  retry.onclick = () => refresh();
  feedback.append(message, retry);
  const list = element('ul', 'routine-dates');
  const foot = element('div', 'routine-agenda-foot');
  const count = element('span', 'routine-count');
  count.setAttribute('role', 'status');
  const more = button('Mostrar mais', 'routine-link');
  more.id = 'agenda-mais';
  foot.append(count, more);
  host.replaceChildren(head, cards, feedback, list, foot);
  function choose(range) {
    view.range = range;
    view.limit = pageSize;
    select.value = range;
    draw();
  }
  function rowFor({ item, days, doc }) {
    const row = element('li', 'routine-date');
    const due = element('div', 'routine-due');
    const color = days === null ? '' : days < 0 ? ' is-late' : days === 0 ? ' is-today' : '';
    due.append(element('strong', 'routine-tag' + color, relativeDay(days)));
    if (item.due) {
      const time = element('time', '', dateLabel(item.due));
      time.dateTime = item.due;
      due.append(time);
    }
    const details = element('div', 'routine-item');
    details.append(element('strong', '', item.title));
    const fields = [item.company, item.type === 'tax' ? brl(item.value) : 'Pendência'];
    if (item.competence) fields.push('Competência ' + monthLabel(item.competence));
    details.append(element('small', '', fields.filter(Boolean).join(' · ')));
    if (doc && item.type === 'tax')
      details.append(element('small', 'routine-doc-status', documentLabel(doc)));
    if (item.waiting) details.append(element('small', '', 'Aguardando cliente'));
    row.append(due, details);
    if (onAction) {
      const acts = element('div', 'routine-actions');
      function action(label, verb, id) {
        const act = button(label, 'routine-link');
        act.setAttribute('aria-label', label + ' — ' + item.title + ' — ' + item.company);
        act.onclick = () => onAction(verb, id, item.competence);
        acts.append(act);
      }
      action('Abrir ficha', 'view-client', item.clientId);
      if (doc) {
        action(doc.files ? 'Documentos' : 'Anexar', 'docs-' + item.type, item.id);
        if (doc.status === 'internal' || doc.privateFiles > 0 || doc.status === 'archived')
          action(
            doc.status === 'archived' ? 'Revisar publicação' : 'Publicar',
            'publish-' + item.type,
            item.id,
          );
      }
      if (item.type === 'tax') action('Registrar pagamento', 'pay-tax', item.id);
      else action('Concluir tarefa', 'complete-task', item.id);
      row.append(acts);
    }
    return row;
  }
  function draw() {
    const today = Date.parse(localDate() + 'T00:00:00Z');
    const rows = items.map((item) => ({
      item,
      days: item.due ? (Date.parse(item.due + 'T00:00:00Z') - today) / dayMs : null,
      doc: documents?.get(key(item)),
    }));
    for (const [id, { card, number }] of counters) {
      const unknown = documentRanges.has(id) && !documents;
      number.textContent = unknown
        ? '—'
        : String(rows.filter((r) => matches(id, r.item, r.days, r.doc)).length);
      card.disabled = unknown;
      card.setAttribute('aria-pressed', String(id === view.range));
    }
    feedback.hidden = !loadDocuments;
    retry.disabled = loading;
    message.textContent = failed
      ? 'Não foi possível conferir os anexos e as publicações.'
      : loading
        ? 'Conferindo anexos e publicações…'
        : '';
    const unknown = documentRanges.has(view.range) && !documents;
    const visible = unknown ? [] : rows.filter((r) => matches(view.range, r.item, r.days, r.doc));
    const shown = visible.slice(0, view.limit);
    list.replaceChildren(...shown.map(rowFor));
    list.hidden = !shown.length;
    count.textContent = unknown
      ? 'Aguardando a consulta de documentos.'
      : visible.length
        ? shown.length + ' de ' + visible.length + (visible.length === 1 ? ' item' : ' itens')
        : 'Nenhum item em aberto neste filtro.';
    more.hidden = shown.length >= visible.length;
  }
  let mounted = true;
  async function refresh() {
    if (!loadDocuments) return;
    if (loading) {
      refreshPending = true;
      return;
    }
    documents = undefined;
    loading = true;
    failed = false;
    draw();
    try {
      const result = await loadDocuments();
      if (!Array.isArray(result.records)) throw Error('Resposta incompleta.');
      documents = new Map(result.records.map((r) => [key(r), r]));
    } catch {
      failed = true;
    } finally {
      loading = false;
      if (mounted && host.isConnected) {
        if (refreshPending) {
          refreshPending = false;
          refresh();
        } else draw();
      }
    }
  }
  select.onchange = () => choose(select.value);
  more.onclick = () => {
    view.limit += pageSize;
    draw();
    if (more.hidden)
      select.focus({
        preventScroll: true,
      });
  };
  host.addEventListener('routine-day-change', draw);
  host.addEventListener('routine-doc-change', refresh);
  if (loadDocuments) refresh();
  else draw();
  return () => {
    mounted = false;
    host.removeEventListener('routine-day-change', draw);
    host.removeEventListener('routine-doc-change', refresh);
  };
}

export { mountAgenda };
