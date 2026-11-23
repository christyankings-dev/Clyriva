import type { ReactNode } from 'react';
import type { FormValues, RecordMap, RecordPreset, RecordType } from '../types.ts';

/** Título, texto de apoio e campos de um formulário de registro. */
export interface RecordSchema {
  title: string;
  description: string;
  fields: ReactNode;
}

export interface DescribeArgs<T extends RecordType> {
  item?: RecordMap[T];
  preset: RecordPreset;
  clientId: string;
}

export interface SaveArgs<T extends RecordType> {
  form: HTMLFormElement;
  values: FormValues;
  item?: RecordMap[T];
}

/**
 * Os valores do formulário ficam como texto; o domínio valida a estrutura final em
 * `core.workspace()` ao gravar. Este ponto único converte o objeto montado em registro.
 */
export function asRecord<T extends RecordType>(data: object): RecordMap[T] {
  return data as RecordMap[T];
}
