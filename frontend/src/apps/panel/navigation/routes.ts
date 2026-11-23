import { Dashboard } from '../pages/Dashboard/index.tsx';
import { Clients } from '../pages/Clients/index.tsx';
import { Service } from '../pages/Service/index.tsx';
import { Vault } from '../pages/Vault/index.tsx';
import { Invoices } from '../pages/Invoices/index.tsx';
import { Cash } from '../pages/Cash/index.tsx';
import { Fees } from '../pages/Fees/index.tsx';
import { Taxes } from '../pages/Taxes/index.tsx';
import { Tasks } from '../pages/Tasks/index.tsx';
import { Reports } from '../pages/Reports/index.tsx';
import { Settings } from '../pages/Settings/index.tsx';
import { ClientDetails } from '../pages/ClientDetails/index.tsx';

export const routes = {
  dashboard: Dashboard,
  clients: Clients,
  service: Service,
  vault: Vault,
  invoices: Invoices,
  cash: Cash,
  fees: Fees,
  taxes: Taxes,
  tasks: Tasks,
  reports: Reports,
  settings: Settings,
  detail: ClientDetails,
};
