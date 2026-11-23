import { priorityName, priorityVal } from '../../clients/priority.ts';
import { feeExpected, feePaid } from '../../state/selectors.ts';
import { Badge } from '../Badge/index.tsx';
import type {
  InvoiceStatus as InvoiceStatusValue,
  TaskStatus as TaskStatusValue,
} from '../../../../shared/domain/types.ts';

export function InvoiceStatus({ status }: { status: InvoiceStatusValue }) {
  if (status === 'issued') return <Badge tone="good">Emitida</Badge>;
  if (status === 'canceled') return <Badge tone="bad">Cancelada</Badge>;
  return <Badge tone="warn">A emitir</Badge>;
}

export function TaskStatus({ status }: { status: TaskStatusValue }) {
  if (status === 'done') return <Badge tone="good">Concluída</Badge>;
  if (status === 'progress') return <Badge tone="info">Em andamento</Badge>;
  return <Badge tone="warn">Pendente</Badge>;
}

export function FeeStatus({ clientId, month }: { clientId: string; month: string }) {
  const expected = feeExpected(clientId, month);
  const paid = feePaid(clientId, month);
  if (expected <= 0) return <Badge>Sem cobrança</Badge>;
  if (paid >= expected - 0.005) return <Badge tone="good">Recebido</Badge>;
  if (paid > 0) return <Badge tone="warn">Parcial</Badge>;
  return <Badge tone="bad">A receber</Badge>;
}

export function PriorityBadge({ priority }: { priority: unknown }) {
  const value = priorityVal(priority);
  return <span className={'priority-pill p-' + value}>● {priorityName(value)}</span>;
}
