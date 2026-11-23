import type { Notice, NoticeAttachment } from '../../types.ts';

export interface NoticeCardProps {
  notice: Notice;
  company: string;
  attachments: NoticeAttachment[];
}
