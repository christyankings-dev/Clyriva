import { CnpjField, RegistryFields } from '../../clients/registryFields.tsx';
import { priorityVal } from '../../clients/priority.ts';
import { cleanDocument, fmtCnpj, id, n, today, validCnpj, validCpf } from '../../lib/format.ts';
import { toast } from '../../lib/feedback.ts';
import { panelWorkspace } from '../../state/workspace.ts';
import { mutate } from '../../state/transactions.ts';
import { filledRegistry } from '../../clients/cnpj/lookup.ts';
import { closeModal } from '../dialog.tsx';
import { Field } from '../fields.tsx';
import { asRecord, type DescribeArgs, type RecordSchema, type SaveArgs } from '../schema.ts';

export function describeClient({ item }: DescribeArgs<'client'>): RecordSchema {
  return {
    title: item ? 'Editar cliente' : 'Novo cliente',
    description: 'Informações particulares para acompanhar sua carteira.',
    fields: (
      <>
        <Field
          label="Nome / Razão social"
          name="name"
          value={item?.name || ''}
          required
          wide
          placeholder="Ex.: Clínica Horizonte"
        />
        <CnpjField value={item?.document || ''} />
        <Field
          label="Regime / natureza"
          name="regime"
          value={item?.regime || 'Outro'}
          options={[
            ['MEI', 'MEI'],
            ['Simples Nacional', 'Simples Nacional'],
            ['Lucro Presumido', 'Lucro Presumido'],
            ['Lucro Real', 'Lucro Real'],
            ['Pessoa Física', 'Pessoa física'],
            ['Outro', 'Outro / a definir'],
          ]}
        />
        <Field
          label="Atividade / segmento"
          name="segment"
          value={item?.segment || ''}
          placeholder="Ex.: Serviços de saúde"
        />
        <Field
          label="Prioridade do cliente"
          name="priority"
          value={priorityVal(item?.priority)}
          options={[
            ['critical', 'Crítica · requer atenção imediata'],
            ['high', 'Alta · acompanhamento frequente'],
            ['medium', 'Média · rotina normal'],
            ['low', 'Baixa · rotina simples'],
          ]}
        />
        <Field
          label="Nome do responsável / contato"
          name="contactName"
          value={item?.contactName || ''}
        />
        <Field
          label="E-mail financeiro"
          name="billingEmail"
          value={item?.billingEmail || ''}
          type="email"
        />
        <Field
          label="Honorários mensais (R$)"
          name="monthlyFee"
          value={item?.monthlyFee ?? 0}
          type="number"
          required
        />
        <Field label="Telefone" name="phone" value={item?.phone || ''} type="tel" />
        <Field label="E-mail" name="email" value={item?.email || ''} type="email" />
        <Field
          label="Início do atendimento"
          name="start"
          value={item?.start || today}
          type="date"
        />
        <Field
          label="Situação"
          name="status"
          value={item?.status || 'active'}
          options={[
            ['active', 'Ativo'],
            ['inactive', 'Inativo'],
          ]}
          help="Inativar preserva a carteira, revoga os acessos ao app e arquiva os avisos. A reativação exige nova autorização."
        />
        <Field
          label="Anotações internas"
          name="notes"
          value={item?.notes || ''}
          area
          wide
          placeholder="Demandas recorrentes, observações e próximos passos..."
        />
        <RegistryFields item={item} />
      </>
    ),
  };
}

export async function saveClient({ values, item }: SaveArgs<'client'>): Promise<void> {
  const name = values.name.trim();
  if (!name) return toast('Informe o nome do cliente.', true);
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
  const record = asRecord<'client'>({
    ...values,
    name,
    document: validCnpj(cleaned) ? fmtCnpj(cleaned) : values.document,
    cnpjLookupValues: Object.fromEntries(
      [...filledRegistry].filter(([key, value]) => values[key] === value),
    ),
    monthlyFee: n(values.monthlyFee),
    priority: priorityVal(values.priority),
    id: item?.id || id(),
  });
  const ok = await mutate(() => {
    if (item) Object.assign(item, record);
    else panelWorkspace.data.clients.push(record);
  }, 'Cliente salvo.');
  if (ok) closeModal();
}
