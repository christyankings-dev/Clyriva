/** Empresa cadastrada pela gestão (como devolvida pela ação `list`). */
export interface AdminCompany {
  id: string;
  name: string;
  status?: string;
}

/** Acesso de um e-mail a uma empresa. */
export interface AccessGrant {
  client_id: string;
  email: string;
  enabled: boolean;
  active_devices: number;
}

export interface LastDelivery {
  date: string;
  daysBefore: number;
}

/** Aviso ou cobrança publicado para uma empresa. */
export interface AdminNotice {
  id: string;
  client_id: string;
  title: string;
  body: string;
  status: string;
  notice_type: string;
  reminder_enabled: boolean;
  amount_cents: number | null;
  due_date: string | null;
  paid_at?: string | null;
  source_type?: string | null;
  source_id?: string | null;
  last_delivery?: LastDelivery | null;
}

export interface AdminAttachment {
  id: string;
  notice_id: string;
  original_name: string;
  size_bytes: number;
}

export interface NoticesState {
  companies: AdminCompany[];
  grants: AccessGrant[];
  notices: AdminNotice[];
  attachments: AdminAttachment[];
}

export interface AdminList extends Partial<NoticesState> {
  ok: true;
}

export interface InviteReply {
  email: string;
  temporaryPassword?: string;
  loginUrl: string;
  created?: boolean;
}

export interface AttachmentStart {
  path: string;
  token: string;
  attachmentId: string;
}

export interface ChargeReply {
  noticeId?: string;
  alreadyExists?: boolean;
}

export interface NoticeReply {
  noticeId: string;
  pushSent?: number;
}
