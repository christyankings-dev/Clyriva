import { filledRegistry } from '../../clients/cnpj.js';
import { field } from '../fields.js';
import { cnpjField, registryFields } from '../../clients/registryFields.js';
import { priorityVal } from '../../clients/priority.js';
import { cleanDocument, fmtCnpj, id, n, today, validCnpj, validCpf } from '../../shared/format.js';
import { toast } from '../../shared/feedback.js';
import { panelWorkspace } from '../../state/workspace.js';
import { mutate } from '../../state/transactions.js';
import { closeModal } from '../dialog.js';

export function describeClient({ item }) {
  filledRegistry.clear();
  const title = item ? 'Editar cliente' : 'Novo cliente';
  const description = 'Informações particulares para acompanhar sua carteira.';
  const fields = [
    field('Nome / Razão social', 'name', item?.name || '', {
      required: true,
      wide: true,
      placeholder: 'Ex.: Clínica Horizonte',
    }),
    cnpjField(item?.document || ''),
    field('Regime / natureza', 'regime', item?.regime || 'Outro', {
      options: [
        ['MEI', 'MEI'],
        ['Simples Nacional', 'Simples Nacional'],
        ['Lucro Presumido', 'Lucro Presumido'],
        ['Lucro Real', 'Lucro Real'],
        ['Pessoa Física', 'Pessoa física'],
        ['Outro', 'Outro / a definir'],
      ],
    }),
    field('Atividade / segmento', 'segment', item?.segment || '', {
      placeholder: 'Ex.: Serviços de saúde',
    }),
    field('Prioridade do cliente', 'priority', priorityVal(item?.priority), {
      options: [
        ['critical', 'Crítica · requer atenção imediata'],
        ['high', 'Alta · acompanhamento frequente'],
        ['medium', 'Média · rotina normal'],
        ['low', 'Baixa · rotina simples'],
      ],
    }),
    field('Nome do responsável / contato', 'contactName', item?.contactName || ''),
    field('E-mail financeiro', 'billingEmail', item?.billingEmail || '', {
      type: 'email',
    }),
    field('Honorários mensais (R$)', 'monthlyFee', item?.monthlyFee ?? 0, {
      type: 'number',
      required: true,
    }),
    field('Telefone', 'phone', item?.phone || '', {
      type: 'tel',
    }),
    field('E-mail', 'email', item?.email || '', {
      type: 'email',
    }),
    field('Início do atendimento', 'start', item?.start || today, {
      type: 'date',
    }),
    field('Situação', 'status', item?.status || 'active', {
      options: [
        ['active', 'Ativo'],
        ['inactive', 'Inativo'],
      ],
      help: 'Inativar preserva a carteira, revoga os acessos ao app e arquiva os avisos. A reativação exige nova autorização.',
    }),
    field('Anotações internas', 'notes', item?.notes || '', {
      area: true,
      wide: true,
      placeholder: 'Demandas recorrentes, observações e próximos passos...',
    }),
    registryFields(item),
  ].join('');
  return {
    title,
    description,
    fields,
  };
}
export async function saveClient({ values, item }) {
  values.name = values.name.trim();
  if (!values.name) return toast('Informe o nome do cliente.', true);
  const cleaned = cleanDocument(values.document),
    changed = cleaned !== cleanDocument(item?.document);
  if (cleaned && changed) {
    if (!validCpf(cleaned) && !validCnpj(cleaned))
      return toast('Informe um CPF ou CNPJ com dígitos verificadores válidos.', true);
    if (
      panelWorkspace.data.clients.some(
        (c) => c.id !== item?.id && cleanDocument(c.document) === cleaned,
      )
    )
      return toast('Já existe um cliente com este CPF/CNPJ.', true);
  }
  if (validCnpj(cleaned)) values.document = fmtCnpj(cleaned);
  values.cnpjLookupValues = Object.fromEntries(
    [...filledRegistry].filter(([key, value]) => values[key] === value),
  );
  values.monthlyFee = n(values.monthlyFee);
  values.priority = priorityVal(values.priority);
  const record = {
    ...values,
    id: item?.id || id(),
  };
  const ok = await mutate(() => {
    if (item) Object.assign(item, record);
    else panelWorkspace.data.clients.push(record);
  }, 'Cliente salvo.');
  if (ok) closeModal();
}
