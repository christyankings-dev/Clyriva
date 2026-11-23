import { esc } from '../shared/format.js';
import { field } from '../forms/fields.js';

const cnpjField = (value) =>
  `<div class="field wide"><label for="f-document">CPF / CNPJ (opcional)</label><div class="cnpj-lookup-row"><input id="f-document" name="document" value="${esc(value)}" placeholder="00.000.000/0000-00" autocomplete="off" maxlength="20"><button class="btn cnpj-search-btn" type="button" id="lookup-cnpj" data-action="lookup-cnpj">Buscar CNPJ</button></div><small class="help">Digite os 14 caracteres ou clique em “Buscar CNPJ”. Se a BrasilAPI falhar, o Clyriva tenta CNPJ.ws. Para CPF, preencha manualmente.</small><p id="cnpj-lookup-status" role="status" aria-live="polite" data-kind="info"></p></div>`;

const registryFields = (item) =>
  `<details class="cnpj-extra wide" id="cnpj-extra"><summary>Dados cadastrais públicos (opcionais)</summary><div class="cnpj-extra-grid">${[
    field('Nome fantasia', 'tradeName', item?.tradeName || ''),
    field('CNAE principal', 'activityCode', item?.activityCode || ''),
    field('Situação na Receita', 'registryStatus', item?.registryStatus || ''),
    field('Natureza jurídica', 'legalNature', item?.legalNature || ''),
    field('Porte', 'companySize', item?.companySize || ''),
    field('Data de abertura', 'openingDate', item?.openingDate || '', {
      type: 'date',
    }),
    field('Endereço', 'address', item?.address || '', {
      wide: true,
    }),
    field('Cidade', 'city', item?.city || ''),
    field('UF', 'uf', item?.uf || ''),
    field('CEP', 'zipCode', item?.zipCode || ''),
  ].join(
    '',
  )}<input type="hidden" name="cnpjLookupAt" value="${esc(item?.cnpjLookupAt || '')}"><input type="hidden" name="cnpjLookupSource" value="${esc(item?.cnpjLookupSource || '')}"></div><p class="cnpj-source">Fonte: ${esc(item?.cnpjLookupSource || 'BrasilAPI / CNPJ.ws')} / dados cadastrais públicos. Última consulta: ${esc(item?.cnpjLookupAt ? new Date(item.cnpjLookupAt).toLocaleString('pt-BR') : 'não realizada')}. As informações podem estar desatualizadas.</p></details>`;

export { cnpjField, registryFields };
