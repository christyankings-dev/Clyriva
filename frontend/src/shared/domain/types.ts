/** Tipos da carteira privada do escritório. Valores monetários podem vir de importações como texto. */
export type Money = number | string;

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export interface Client {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  document?: string;
  regime?: string;
  segment?: string;
  priority?: Priority;
  contactName?: string;
  billingEmail?: string;
  monthlyFee?: Money;
  phone?: string;
  email?: string;
  start?: string;
  notes?: string;
  tradeName?: string;
  activityCode?: string;
  registryStatus?: string;
  legalNature?: string;
  companySize?: string;
  openingDate?: string;
  address?: string;
  city?: string;
  uf?: string;
  zipCode?: string;
  cnpjLookupAt?: string;
  cnpjLookupSource?: string;
  cnpjLookupValues?: Record<string, string>;
}

export type InvoiceStatus = 'issued' | 'pending' | 'canceled';

export interface Invoice {
  id: string;
  clientId: string;
  number?: string;
  date: string;
  competence: string;
  value: Money;
  status: InvoiceStatus;
  description?: string;
}

export type CashKind = 'receipt' | 'expense';

export interface CashEntry {
  id: string;
  clientId: string;
  kind: CashKind;
  date: string;
  value: Money;
  category: string;
  invoiceId?: string;
  notes?: string;
}

export type TaskStatus = 'pending' | 'progress' | 'done';

export interface Task {
  id: string;
  clientId: string;
  title: string;
  category: string;
  competence: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: TaskStatus;
  notes?: string;
  awaitingClient?: boolean;
}

export type TaxStatus = 'open' | 'paid';

export interface Tax {
  id: string;
  clientId: string;
  kind: string;
  competence: string;
  dueDate: string;
  value: Money;
  status: TaxStatus;
  paidAt?: string;
  ref?: string;
  notes?: string;
}

export interface Fee {
  id: string;
  clientId: string;
  competence: string;
  expected: Money;
  paid: Money;
  paidAt?: string;
  notes?: string;
}

export interface Workspace {
  version: 1;
  clients: Client[];
  invoices: Invoice[];
  cash: CashEntry[];
  tasks: Task[];
  fees: Fee[];
  taxes: Tax[];
}

export type WorkspaceGroup = Exclude<keyof Workspace, 'version'>;

/** Envelope AES-GCM do cofre: somente texto cifrado e parâmetros públicos de derivação. */
export interface VaultBlob {
  version: 1;
  alg?: 'AES-GCM';
  kdf?: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
  iv: string;
  cipher: string;
}

export interface VaultAccess {
  id: string;
  clientId: string;
  label: string;
  username?: string;
  site?: string;
  password?: string;
  notes?: string;
}

export interface VaultData {
  version: 1;
  access: VaultAccess[];
}
