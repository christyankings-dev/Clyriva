/** Aviso publicado pela gestão para uma empresa (linha de clyriva_client_notices). */
export interface Notice {
  id: string;
  admin_id: string;
  client_id: string;
  title: string;
  body: string;
  status: string;
  notice_type?: string;
  reminder_enabled: boolean;
  amount_cents: number | null;
  due_date: string | null;
  created_at: string;
}

export interface NoticeAttachment {
  id: string;
  notice_id: string;
  original_name: string;
}

export interface Company {
  admin_id: string;
  client_id: string;
  company: string;
}

export interface ClientList {
  companies?: Company[];
  notices?: Notice[];
  attachments?: NoticeAttachment[];
}

export interface PushPreference {
  enabled: boolean;
  showAmount?: boolean;
}

/** Inscrição push deste aparelho e a preferência salva no servidor. */
export interface DeviceInfo {
  sub: PushSubscription | null;
  preference: PushPreference;
}

export interface BillingView {
  items: Notice[];
  companies: Map<string, string>;
  attachments: NoticeAttachment[];
  counts: [string, number][];
}
