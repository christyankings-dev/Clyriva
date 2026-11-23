import { errorInfo } from '../../../shared/lib/errors.ts';
import { core } from './config.ts';

const blank = core.empty;

const ym = (): string => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
};

const errMsg = (e: unknown): string =>
  errorInfo(e).message || 'Não foi possível concluir esta operação.';

export { blank, errMsg, ym };
