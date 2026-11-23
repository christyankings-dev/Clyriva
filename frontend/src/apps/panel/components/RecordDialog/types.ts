import type { RecordPreset, RecordType } from '../../types.ts';

export interface RecordDialogProps {
  type: RecordType;
  editId: string | null;
  preset: RecordPreset;
  clientId: string;
}
