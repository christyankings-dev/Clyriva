import * as workspaceRules from '../domain/workspace.ts';

const { brl, cents, validDate, monthLabel, dateLabel } = workspaceRules;

const byText = new Intl.Collator('pt-BR', {
  numeric: true,
});

const ranges: [string, string][] = [
  ['attention', 'Atrasados e próximos 7 dias'],
  ['late', 'Atrasados'],
  ['today', 'Hoje'],
  ['soon', 'Próximos 3 dias'],
  ['next', 'Próximos 7 dias'],
  ['waiting', 'Aguardando cliente'],
  ['missing', 'Guias sem anexo'],
  ['unsent', 'Guias com envio pendente'],
  ['published', 'Guias publicadas'],
  ['archived', 'Guias arquivadas no app'],
  ['all', 'Todos em aberto'],
];

const documentRanges = new Set(['missing', 'unsent', 'published', 'archived']);

const dayMs = 86400000;

const pageSize = 5;

const brazilCalendar = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function localDate(): string {
  return brazilCalendar.format(new Date());
}

function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

export {
  brl,
  byText,
  cents,
  cleanText,
  dateLabel,
  dayMs,
  documentRanges,
  localDate,
  monthLabel,
  pageSize,
  ranges,
  validDate,
};
