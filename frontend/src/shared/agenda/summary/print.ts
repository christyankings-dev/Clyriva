import { element } from '../elements.ts';
import type { SummaryModel } from '../types.ts';

const printStyle = `@page {size:A4;margin:17mm}
    body{font:11pt/1.55 Arial,sans-serif;margin:0;color:#183641}
    h1,h2,p{margin:0}h1{font-size:22pt;line-height:1.25}
    header{padding-bottom:12pt;border-bottom:2pt solid #178476}
    header p,footer,.routine-summary-note{color:#455e65}
    section{margin:15pt 0}h2{font-size:13pt;color:#13695f;break-after:avoid}
    ul{list-style:none;margin:5pt 0;padding:0}li{border-bottom:1px solid #dbe8e5;padding:3pt 0;break-inside:avoid}
    .routine-summary-note,footer{font-size:9pt}article{overflow-wrap:anywhere}footer{margin-top:15pt}`;

function summaryArticle(model: SummaryModel): HTMLElement {
  const article = element('article', 'routine-summary-sheet');
  const header = element('header');
  header.append(element('h1', '', model.name), element('p', '', model.header));
  article.append(header);
  for (const group of model.sections) {
    const section = element('section');
    const list = element('ul');
    group.lines.forEach((text) => list.append(element('li', '', text)));
    section.append(element('h2', '', group.title), list);
    if (group.note) section.append(element('p', 'routine-summary-note', group.note));
    article.append(section);
  }
  article.append(element('footer', '', model.footer));
  return article;
}

function printSummary(dialog: HTMLDialogElement, model: SummaryModel, article: HTMLElement): void {
  let frame = dialog.querySelector('iframe');
  if (!frame) {
    frame = element('iframe', 'routine-print-frame');
    frame.title = 'Impressão do resumo';
    frame.tabIndex = -1;
    frame.setAttribute('aria-hidden', 'true');
    dialog.append(frame);
    const doc = frame.contentDocument;
    if (!doc) return;
    doc.documentElement.lang = 'pt-BR';
    doc.title = model.header + ' — ' + model.name;
    doc.head.append(element('style', '', printStyle));
    doc.body.append(doc.importNode(article, true));
  }
  const view = frame.contentWindow;
  if (!view) return;
  view.focus();
  view.print();
}

export { printSummary, summaryArticle };
