/* Agenda e resumo individual compartilhados entre a administração e o portal. */
(() => {
  'use strict';
  const {brl, cents, validDate, monthLabel, dateLabel} = window.ClyrivaCore;
  const byText = new Intl.Collator('pt-BR', {numeric: true});
  const ranges = [
    ['attention', 'Atrasados e próximos 7 dias'],
    ['late', 'Somente atrasados'],
    ['today', 'Vencem hoje'],
    ['next', 'Próximos 7 dias'],
    ['all', 'Todos em aberto']
  ];
  const dayMs = 86400000;
  const pageSize = 5;
  function localDate() {
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  }
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
          type, id: row.id,
          title: type === 'tax' ? cleanText(row.kind) || 'Guia' : cleanText(row.title) || 'Tarefa',
          company: companyName ? cleanText(companyName(row.clientId)) : '',
          competence: row.competence,
          due: validDate(row.dueDate) ? row.dueDate : '',
          value: type === 'tax' ? row.value : null
        });
      }
    }
    return items.sort((a, b) => (a.due || '9999-99-99').localeCompare(b.due || '9999-99-99')
      || byText.compare(a.company, b.company) || byText.compare(a.title, b.title));
  }
  function inRange(days, range) {
    if (range === 'all') return true;
    if (days === null) return false;
    switch (range) {
      case 'late': return days < 0;
      case 'today': return days === 0;
      case 'next': return days >= 1 && days <= 7;
      default: return days <= 7;
    }
  }
  function relativeDay(days) {
    if (days === null) return 'Sem prazo';
    if (days < 0) return 'Em atraso';
    if (days === 0) return 'Hoje';
    if (days === 1) return 'Amanhã';
    return 'Em '+days+' dias';
  }
  function mountAgenda(host, {taxes, tasks, companyName, onAction}, view) {
    const items = openItems(taxes, tasks, companyName);
    host.className = 'routine-agenda';
    host.setAttribute('aria-labelledby', 'agenda-heading');
    const head = element('div', 'routine-agenda-head');
    const title = element('h2', '', 'Agenda de vencimentos');
    title.id = 'agenda-heading';
    const caption = element('p', '', 'Guias e tarefas em aberto de todas as competências.');
    const heading = element('div');
    heading.append(title, caption);
    const label = element('label', 'routine-filter', 'Prazo');
    const select = document.createElement('select');
    select.id = 'agenda-periodo';
    ranges.forEach(([id, text]) => select.add(new Option(text, id)));
    select.value = view.range;
    label.append(select);
    head.append(heading, label);
    const list = element('ul', 'routine-dates');
    const foot = element('div', 'routine-agenda-foot');
    const count = element('span', 'routine-count');
    count.setAttribute('role', 'status');
    const more = button('Mostrar mais', 'routine-link');
    more.id = 'agenda-mais';
    foot.append(count, more);
    host.replaceChildren(head, list, foot);

    function draw() {
      const today = Date.parse(localDate()+'T00:00:00Z');
      const visible = [];
      for (const item of items) {
        const days = item.due ? (Date.parse(item.due+'T00:00:00Z')-today)/dayMs : null;
        if (inRange(days, view.range)) visible.push({item, days});
      }
      const shown = visible.slice(0, view.limit);
      const fragment = document.createDocumentFragment();
      for (const {item, days} of shown) {
        const row = element('li', 'routine-date');
        const due = element('div', 'routine-due');
        const color = days === null ? '' : days < 0 ? ' is-late' : days === 0 ? ' is-today' : '';
        due.append(element('strong', 'routine-tag'+color, relativeDay(days)));
        if (item.due) {
          const time = element('time', '', dateLabel(item.due));
          time.dateTime = item.due;
          due.append(time);
        }
        const details = element('div', 'routine-item');
        details.append(element('strong', '', item.title));
        const fields = [item.company, item.type === 'tax' ? 'Guia' : 'Tarefa'];
        if (item.type === 'tax') fields.push(brl(item.value));
        if (item.competence) fields.push('Competência '+monthLabel(item.competence));
        details.append(element('small', '', fields.filter(Boolean).join(' · ')));
        row.append(due, details);
        if (onAction) {
          const act = button(item.type === 'tax' ? 'Registrar pagamento' : 'Concluir tarefa', 'routine-link');
          act.setAttribute('aria-label', act.textContent+' — '+item.title+' — '+item.company);
          act.onclick = () => onAction(item.type, item.id);
          row.append(act);
        }
        fragment.append(row);
      }
      list.replaceChildren(fragment);
      list.hidden = !shown.length;
      count.textContent = visible.length ? shown.length+' de '+visible.length+(visible.length === 1 ? ' item' : ' itens')
        : 'Nenhuma guia ou tarefa em aberto neste filtro.';
      more.hidden = shown.length >= visible.length;
    }
    select.onchange = () => {view.range = select.value; view.limit = pageSize; draw();};
    more.onclick = () => {
      view.limit += pageSize;
      draw();
      if (more.hidden) select.focus({preventScroll: true});
    };
    host.addEventListener('routine-day-change', draw);
    draw();
  }

  // Atualiza a data local ao virar o dia e ao retornar a uma aba suspensa.
  // O temporizador não mantém referências a empresas de uma sessão encerrada.
  let dateTimer;
  function refreshDate() {
    clearTimeout(dateTimer);
    if (document.hidden) return;
    document.querySelector('.routine-agenda')?.dispatchEvent(new Event('routine-day-change'));
    const now = new Date();
    const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1);
    dateTimer = setTimeout(refreshDate, nextDay-now+100);
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
