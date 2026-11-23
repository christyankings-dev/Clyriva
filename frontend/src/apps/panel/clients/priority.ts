import type { Priority } from '../../../shared/domain/types.ts';

const priorityOrder: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const priorityNames: Record<Priority, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

const priorityVal = (p: unknown): Priority =>
  typeof p === 'string' && Object.hasOwn(priorityOrder, p) ? (p as Priority) : 'medium';

const priorityName = (p: unknown): string => priorityNames[priorityVal(p)];

export { priorityName, priorityOrder, priorityVal };
