import type { totals } from '../../billing/totals.ts';

/** Totais do mês selecionado calculados por `billing/totals.ts`. */
export type MonthTotals = ReturnType<typeof totals>;
