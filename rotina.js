/* Agenda e resumo individual compartilhados entre a administração e o portal. */
(() => {
  'use strict';
  const {brl, cents, validDate, monthLabel, dateLabel} = window.ClyrivaCore;
  const byText = new Intl.Collator('pt-BR', {numeric: true});
  const ranges = [
    ['attention', 'Atrasados e próximos 7 dias'], ['late', 'Atrasados'],
    ['today', 'Hoje'], ['soon', 'Próximos 3 dias'], ['next', 'Próximos 7 dias'],
    ['waiting', 'Aguardando cliente'], ['missing', 'Guias sem anexo'],
    ['unsent', 'Guias com envio pendente'], ['published', 'Guias publicadas'],
    ['archived', 'Guias arquivadas no app'], ['all', 'Todos em aberto']
  ];
  const documentRanges = new Set(['missing', 'unsent', 'published', 'archived']);
  const dayMs = 86400000;
  const pageSize = 5;
  const brazilCalendar = new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit'});
  function localDate() { return brazilCalendar.format(new Date()); }
  function element(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function button(text, className) {
    const el = element('button', className, text);
    el.type = 'button';
    return el;
  }
  function cleanText(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }
  function openItems(taxes, tasks, companyName) {
    const items = [];
    for (const [type, rows] of [['tax', taxes], ['task', tasks]]) {
      for (const row of rows) {
        if (row.status === (type === 'tax' ? 'paid' : 'done')) continue;
        items.push({
          type, id: row.id, clientId: row.clientId,
          title: type === 'tax' ? cleanText(row.kind) || 'Guia' : cleanText(row.title) || 'Tarefa',
          company: companyName ? cleanText(companyName(row.clientId)) : '',
          competence: row.competence, waiting: row.awaitingClient === true,
          due: validDate(row.dueDate) ? row.dueDate : '',
          priority: ({critical:0,high:1,medium:2,low:3})[row.priority] ?? 2,
          value: type === 'tax' ? row.value : null
        });
      }
    }
    return items.sort((a, b) => (a.due || '9999-99-99').localeCompare(b.due || '9999-99-99')
      || a.priority-b.priority || byText.compare(a.company, b.company) || byText.compare(a.title, b.title));
  }
  function matches(range, item, days, doc) {
    switch (range) {
      case 'all': return true;
      case 'late': return days !== null && days < 0;
      case 'today': return days === 0;
      case 'soon': return days >= 1 && days <= 3;
      case 'next': return days >= 1 && days <= 7;
      case 'waiting': return item.type === 'task' && item.waiting;
      case 'missing': return item.type === 'tax' && doc?.files === 0;
      case 'unsent': return item.type === 'tax' && doc && doc.status !== 'archived' &&
        (doc.status === 'internal' || doc.privateFiles > 0);
      case 'published': return item.type === 'tax' && ['active','paid'].includes(doc?.status);
      case 'archived': return item.type === 'tax' && doc?.status === 'archived';
      default: return days !== null && days <= 7;
    }
  }
  function relativeDay(days) {
    if (days === null) return 'Sem prazo';
    if (days < 0) return Math.abs(days)+(days === -1 ? ' dia de atraso' : ' dias de atraso');
    if (days === 0) return 'Hoje';
    if (days === 1) return 'Amanhã';
    return 'Em '+days+' dias';
  }
  function documentLabel(doc) {
    if (!doc) return '';
    if (doc.status === 'archived') return 'Arquivada no app';
    if (doc.status === 'internal') return doc.files ? 'Com anexo · ainda não publicada' : 'Sem anexo · uso interno';
    if (doc.privateFiles) return 'Publicada · há anexo interno para revisar';
    return doc.files ? 'Publicada com anexo' : 'Publicada · sem anexo na ficha';
  }
  function mountAgenda(host, {taxes, tasks, companyName, onAction, loadDocuments}, view) {
    const items = openItems(taxes, tasks, companyName);
    const key = item => JSON.stringify([item.clientId, item.type, item.id]);
    let documents, loading = false, failed = false, refreshPending = false;
    host.className = 'routine-agenda';
    host.setAttribute('aria-labelledby', 'agenda-heading');
    const title = element('h2', '', 'Meu dia / Minha semana');
    title.id = 'agenda-heading';
    const heading = element('div');
    heading.append(title, element('p', '', 'Guias e pendências em aberto de todas as competências. Prazos no horário de Brasília.'));
    const head = element('div', 'routine-agenda-head');
    const label = element('label', 'routine-filter', 'Mostrar');
    const select = document.createElement('select');
    select.id = 'agenda-periodo';
    const options = ranges.filter(([id]) => loadDocuments || !documentRanges.has(id));
    options.forEach(([id, text]) => select.add(new Option(text, id)));
    if (!options.some(([id]) => id === view.range)) view.range = 'attention';
    select.value = view.range;
    label.append(select); head.append(heading, label);
    const cards = element('div', 'routine-cards');
    const counters = new Map();
    for (const [id, text] of options.filter(([id]) => !['attention','all','archived'].includes(id))) {
      const card = button('', 'routine-counter');
      const number = element('strong');
      card.dataset.range = id;
      card.append(number, element('span','',text));
      card.onclick = () => choose(id);
      counters.set(id, {card, number});
      cards.append(card);
    }
    const feedback = element('div', 'routine-agenda-foot');
    const message = element('span', 'routine-count');
    message.setAttribute('role','status');
    const retry = button('Atualizar documentos', 'routine-link');
    retry.onclick = () => refresh();
    feedback.append(message, retry);
    const list = element('ul', 'routine-dates');
    const foot = element('div', 'routine-agenda-foot');
    const count = element('span', 'routine-count');
    count.setAttribute('role','status');
    const more = button('Mostrar mais', 'routine-link');
    more.id = 'agenda-mais';
    foot.append(count, more);
    host.replaceChildren(head, cards, feedback, list, foot);

    function choose(range) {
      view.range = range; view.limit = pageSize; select.value = range;
      draw();
    }
    function rowFor({item, days, doc}) {
      const row = element('li', 'routine-date');
      const due = element('div', 'routine-due');
      const color = days === null ? '' : days < 0 ? ' is-late' : days === 0 ? ' is-today' : '';
      due.append(element('strong', 'routine-tag'+color, relativeDay(days)));
      if (item.due) {
        const time = element('time', '', dateLabel(item.due));
        time.dateTime = item.due; due.append(time);
      }
      const details = element('div', 'routine-item');
      details.append(element('strong', '', item.title));
      const fields = [item.company, item.type === 'tax' ? brl(item.value) : 'Pendência'];
      if (item.competence) fields.push('Competência '+monthLabel(item.competence));
      details.append(element('small', '', fields.filter(Boolean).join(' · ')));
      if (doc && item.type === 'tax') details.append(element('small', 'routine-doc-status', documentLabel(doc)));
      if (item.waiting) details.append(element('small', '', 'Aguardando cliente'));
      row.append(due, details);
      if (onAction) {
        const acts = element('div', 'routine-actions');
        function action(label, verb, id) {
          const act = button(label,'routine-link');
          act.setAttribute('aria-label', label+' — '+item.title+' — '+item.company);
          act.onclick = () => onAction(verb,id,item.competence);
          acts.append(act);
        }
        action('Abrir ficha','view-client',item.clientId);
        if (doc) {
          action(doc.files ? 'Documentos' : 'Anexar','docs-'+item.type,item.id);
          if (doc.status === 'internal' || doc.privateFiles > 0 || doc.status === 'archived')
            action(doc.status === 'archived' ? 'Revisar publicação' : 'Publicar','publish-'+item.type,item.id);
        }
        if (item.type === 'tax') action('Registrar pagamento','pay-tax',item.id);
        else action('Concluir tarefa','complete-task',item.id);
        row.append(acts);
      }
      return row;
    }
    function draw() {
      const today = Date.parse(localDate()+'T00:00:00Z');
      const rows = items.map(item => ({item, days:item.due ? (Date.parse(item.due+'T00:00:00Z')-today)/dayMs : null, doc:documents?.get(key(item))}));
      for (const [id, {card,number}] of counters) {
        const unknown = documentRanges.has(id) && !documents;
        number.textContent = unknown ? '—' : String(rows.filter(r => matches(id,r.item,r.days,r.doc)).length);
        card.disabled = unknown;
        card.setAttribute('aria-pressed', String(id === view.range));
      }
      feedback.hidden = !loadDocuments;
      retry.disabled = loading;
      message.textContent = failed ? 'Não foi possível conferir os anexos e as publicações.' : loading ? 'Conferindo anexos e publicações…' : '';
      const unknown = documentRanges.has(view.range) && !documents;
      const visible = unknown ? [] : rows.filter(r => matches(view.range,r.item,r.days,r.doc));
      const shown = visible.slice(0,view.limit);
      list.replaceChildren(...shown.map(rowFor));
      list.hidden = !shown.length;
      count.textContent = unknown ? 'Aguardando a consulta de documentos.' : visible.length ? shown.length+' de '+visible.length+(visible.length===1?' item':' itens') : 'Nenhum item em aberto neste filtro.';
      more.hidden = shown.length >= visible.length;
    }
    async function refresh() {
      if (!loadDocuments) return;
      if (loading) {refreshPending = true; return;}
      documents = undefined; loading = true; failed = false; draw();
      try {
        const result = await loadDocuments();
        if (!Array.isArray(result.records)) throw Error('Resposta incompleta.');
        documents = new Map(result.records.map(r => [key(r),r]));
      } catch { failed = true; }
      finally {
        loading = false;
        if (host.isConnected) {
          if (refreshPending) {refreshPending = false; refresh();} else draw();
        }
      }
    }
    select.onchange = () => choose(select.value);
    more.onclick = () => { view.limit += pageSize; draw(); if (more.hidden) select.focus({preventScroll:true}); };
    host.addEventListener('routine-day-change',draw);
    host.addEventListener('routine-doc-change',refresh);
    if (loadDocuments) refresh(); else draw();
  }

  let dateTimer, lastDay = localDate();
  function refreshDate() {
    clearTimeout(dateTimer);
    if (document.hidden) return;
    const day = localDate();
    if (day !== lastDay) document.querySelector('.routine-agenda')?.dispatchEvent(new Event('routine-day-change'));
    lastDay = day;
    dateTimer = setTimeout(refreshDate,60000);
  }
  document.addEventListener('visibilitychange', refreshDate);
  window.addEventListener('pageshow', refreshDate);
  window.addEventListener('pagehide', () => {clearTimeout(dateTimer); closeSummary();});

  function summaryContent({client, invoices, taxes, tasks}, month, {demo, publishedAt} = {}) {
    const issued = invoices.filter(x => x.competence === month && x.status === 'issued');
    const guides = taxes.filter(x => x.competence === month);
    const work = tasks.filter(x => x.competence === month);
    let billed = 0, received = 0, remaining = 0;
    for (const invoice of issued) {
      const value = cents(invoice.value), paid = cents(invoice.paid);
      billed += value; received += paid; remaining += Math.max(0, value-paid);
    }
    const guideTotal = guides.filter(x => x.status !== 'paid').reduce((total, g) => total+cents(g.value), 0);
    const sections = [{
      title: 'Notas fiscais',
      lines: [
        'Notas emitidas ('+issued.length+') — '+brl(billed/100),
        'Recebido nessas notas — '+brl(received/100),
        'Saldo atual a receber — '+brl(remaining/100)
      ],
      note: 'Os recebimentos incluem as baixas vinculadas a essas notas até a atualização dos dados.'
    }];
    const open = openItems(guides, work);
    const deadline = (item, word) => item.due ? word+' '+dateLabel(item.due) : 'sem prazo registrado';
    const openGuides = open.filter(x => x.type === 'tax');
    const openTasks = open.filter(x => x.type === 'task');
    sections.push({
      title: 'Guias em aberto',
      lines: openGuides.length ? ['Total em aberto — '+brl(guideTotal/100),
        ...openGuides.map(g => g.title+' · '+brl(g.value)+' · '+deadline(g,'vencimento'))]
        : [guides.length ? 'Todas as guias registradas nesta competência estão pagas.' : 'Nenhuma guia registrada nesta competência.']
    });
    sections.push({
      title: 'Tarefas em aberto',
      lines: openTasks.length ? openTasks.map(t => t.title+' · '+deadline(t,'prazo'))
        : [work.length ? 'Todas as tarefas registradas nesta competência foram concluídas.' : 'Nenhuma tarefa registrada nesta competência.']
    });
    const name = cleanText(client.name) || cleanText(client.tradeName) || 'Empresa';
    const header = 'Resumo da competência '+monthLabel(month);
    const stamp = publishedAt && Number.isFinite(Date.parse(publishedAt)) ? 'Publicado em '+new Date(publishedAt).toLocaleString('pt-BR') : 'Gerado em '+dateLabel(localDate());
    const footer = [demo && 'Demonstração com dados fictícios', stamp].filter(Boolean).join(' · ');
    const plain = [name, header, '', ...sections.flatMap(s => [s.title, ...s.lines, ...(s.note ? [s.note] : []), '']), footer].join('\n');
    return {name, header, sections, footer, plain};
  }

  const printStyle = `@page {size:A4;margin:17mm}
    body{font:11pt/1.55 Arial,sans-serif;margin:0;color:#183641}
    h1,h2,p{margin:0}h1{font-size:22pt;line-height:1.25}
    header{padding-bottom:12pt;border-bottom:2pt solid #178476}
    header p,footer,.routine-summary-note{color:#455e65}
    section{margin:15pt 0}h2{font-size:13pt;color:#13695f;break-after:avoid}
    ul{list-style:none;margin:5pt 0;padding:0}li{border-bottom:1px solid #dbe8e5;padding:3pt 0;break-inside:avoid}
    .routine-summary-note,footer{font-size:9pt}article{overflow-wrap:anywhere}footer{margin-top:15pt}`;
  function summaryArticle(model) {
    const article = element('article', 'routine-summary-sheet');
    const header = element('header');
    header.append(element('h1', '', model.name), element('p', '', model.header));
    article.append(header);
    for (const group of model.sections) {
      const section = element('section');
      const list = element('ul');
      group.lines.forEach(text => list.append(element('li', '', text)));
      section.append(element('h2', '', group.title), list);
      if (group.note) section.append(element('p', 'routine-summary-note', group.note));
      article.append(section);
    }
    article.append(element('footer', '', model.footer));
    return article;
  }
  function printSummary(dialog, model, article) {
    let frame = dialog.querySelector('iframe');
    if (!frame) {
      frame = element('iframe', 'routine-print-frame');
      frame.title = 'Impressão do resumo';
      frame.tabIndex = -1;
      frame.setAttribute('aria-hidden', 'true');
      dialog.append(frame);
      const doc = frame.contentDocument;
      doc.documentElement.lang = 'pt-BR';
      doc.title = model.header+' — '+model.name;
      doc.head.append(element('style', '', printStyle));
      doc.body.append(doc.importNode(article, true));
    }
    frame.contentWindow.focus();
    frame.contentWindow.print();
  }
  function closeSummary() {
    const current = document.querySelector('#resumo-mensal');
    if (!current) return;
    if (current.open) current.close();
    current.remove();
  }
  function showSummary(info, month, options) {
    closeSummary();
    const model = summaryContent(info, month, options);
    const dialog = element('dialog', 'routine-dialog');
    dialog.id = 'resumo-mensal';
    dialog.setAttribute('aria-label', model.header+' — '+model.name);
    const article = summaryArticle(model);
    const tools = element('div', 'routine-summary-tools');
    const copy = button('Copiar texto', 'routine-primary');
    const print = button('Imprimir / salvar PDF', 'routine-secondary');
    const close = button('Fechar', 'routine-secondary');
    const status = element('p', 'routine-feedback');
    status.setAttribute('role', 'status');
    const manual = element('textarea', 'routine-manual-copy');
    manual.setAttribute('aria-label', 'Texto do resumo para copiar');
    manual.readOnly = true;
    manual.hidden = true;
    tools.append(copy, print, close);
    dialog.append(article, tools, status, manual);
    close.onclick = closeSummary;
    dialog.addEventListener('close', () => dialog.remove(), {once: true});
    copy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(model.plain);
        manual.hidden = true;
        status.textContent = 'Resumo copiado.';
      } catch {
        if (!dialog.isConnected) return;
        manual.value = model.plain; manual.hidden = false; manual.focus(); manual.select();
        status.textContent = 'Use a opção Copiar do seu dispositivo ou pressione Ctrl+C.';
      }
    };
    print.onclick = () => printSummary(dialog, model, article);
    document.body.append(dialog);
    dialog.showModal();
    copy.focus({preventScroll: true});
  }

  window.ClyrivaRotina = Object.freeze({
    agendaView: () => ({range: 'attention', limit: pageSize}), mountAgenda, showSummary, closeSummary
  });
})();
