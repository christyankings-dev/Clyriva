import { Field } from '../forms/fields.tsx';
import type { Client } from '../../../shared/domain/types.ts';

export function CnpjField({ value }: { value: string }) {
  return (
    <div className="field wide">
      <label htmlFor="f-document">CPF / CNPJ (opcional)</label>
      <div className="cnpj-lookup-row">
        <input
          id="f-document"
          name="document"
          defaultValue={value}
          placeholder="00.000.000/0000-00"
          autoComplete="off"
          maxLength={20}
        />
        <button
          className="btn cnpj-search-btn"
          type="button"
          id="lookup-cnpj"
          data-action="lookup-cnpj"
        >
          Buscar CNPJ
        </button>
      </div>
      <small className="help">
        Digite os 14 caracteres ou clique em “Buscar CNPJ”. Se a BrasilAPI falhar, o Clyriva tenta
        CNPJ.ws. Para CPF, preencha manualmente.
      </small>
      <p id="cnpj-lookup-status" role="status" aria-live="polite" data-kind="info"></p>
    </div>
  );
}

export function RegistryFields({ item }: { item?: Client }) {
  return (
    <details className="cnpj-extra wide" id="cnpj-extra">
      <summary>Dados cadastrais públicos (opcionais)</summary>
      <div className="cnpj-extra-grid">
        <Field label="Nome fantasia" name="tradeName" value={item?.tradeName || ''} />
        <Field label="CNAE principal" name="activityCode" value={item?.activityCode || ''} />
        <Field
          label="Situação na Receita"
          name="registryStatus"
          value={item?.registryStatus || ''}
        />
        <Field label="Natureza jurídica" name="legalNature" value={item?.legalNature || ''} />
        <Field label="Porte" name="companySize" value={item?.companySize || ''} />
        <Field
          label="Data de abertura"
          name="openingDate"
          value={item?.openingDate || ''}
          type="date"
        />
        <Field label="Endereço" name="address" value={item?.address || ''} wide />
        <Field label="Cidade" name="city" value={item?.city || ''} />
        <Field label="UF" name="uf" value={item?.uf || ''} />
        <Field label="CEP" name="zipCode" value={item?.zipCode || ''} />
        <input type="hidden" name="cnpjLookupAt" defaultValue={item?.cnpjLookupAt || ''} />
        <input type="hidden" name="cnpjLookupSource" defaultValue={item?.cnpjLookupSource || ''} />
      </div>
      <p className="cnpj-source">
        Fonte: {item?.cnpjLookupSource || 'BrasilAPI / CNPJ.ws'} / dados cadastrais públicos. Última
        consulta:{' '}
        {item?.cnpjLookupAt ? new Date(item.cnpjLookupAt).toLocaleString('pt-BR') : 'não realizada'}
        . As informações podem estar desatualizadas.
      </p>
    </details>
  );
}
