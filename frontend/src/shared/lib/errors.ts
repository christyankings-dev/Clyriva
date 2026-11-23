/** Leitura segura de um erro capturado (catch entrega `unknown`). */
export interface ErrorInfo {
  message: string;
  status?: number;
  code?: string;
}

export function errorInfo(error: unknown): ErrorInfo {
  const value = (typeof error === 'object' && error !== null ? error : {}) as Record<
    string,
    unknown
  >;
  return {
    message:
      typeof value.message === 'string' ? value.message : typeof error === 'string' ? error : '',
    status: typeof value.status === 'number' ? value.status : undefined,
    code: typeof value.code === 'string' ? value.code : undefined,
  };
}

/** Cria um Error que carrega o status HTTP da resposta. */
export function httpError(message: string, status: number): Error & { status: number } {
  return Object.assign(Error(message), { status });
}
