const priorityOrder = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const priorityName = (p) =>
  ({
    critical: 'Crítica',
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa',
  })[p] || 'Média';

const priorityVal = (p) => (Object.hasOwn(priorityOrder, p) ? p : 'medium');

export { priorityName, priorityOrder, priorityVal };
