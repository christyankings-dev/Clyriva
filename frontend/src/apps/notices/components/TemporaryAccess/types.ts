export interface TemporaryAccessProps {
  email: string;
  /** Senha provisória; ausente quando o cliente já tinha senha. */
  secret?: string;
  url: string;
  created?: boolean;
}
