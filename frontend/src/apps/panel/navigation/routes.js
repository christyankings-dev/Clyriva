import { Dashboard } from '../pages/Dashboard/index.jsx';
import { Clients } from '../pages/Clients/index.jsx';
import { Service } from '../pages/Service/index.jsx';
import { Vault } from '../pages/Vault/index.jsx';
import { Invoices } from '../pages/Invoices/index.jsx';
import { Cash } from '../pages/Cash/index.jsx';
import { Fees } from '../pages/Fees/index.jsx';
import { Taxes } from '../pages/Taxes/index.jsx';
import { Tasks } from '../pages/Tasks/index.jsx';
import { Reports } from '../pages/Reports/index.jsx';
import { Settings } from '../pages/Settings/index.jsx';
import { ClientDetails } from '../pages/ClientDetails/index.jsx';

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
