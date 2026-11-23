export interface InternalDocsDialogProps {
  type: 'task' | 'tax';
  recordId: string;
  initialFile?: File | null;
}

/** Mensagem de status do diálogo (vermelha quando `bad`). */
export interface Notice {
  text: string;
  bad?: boolean;
}
