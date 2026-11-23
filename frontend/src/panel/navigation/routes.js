import { Dashboard } from '../pages/Dashboard.jsx';
import { Clients } from '../pages/Clients.jsx';
import { Service } from '../pages/Service.jsx';
import { Vault } from '../pages/Vault.jsx';
import { Invoices } from '../pages/Invoices.jsx';
import { Cash } from '../pages/Cash.jsx';
import { Fees } from '../pages/Fees.jsx';
import { Taxes } from '../pages/Taxes.jsx';
import { Tasks } from '../pages/Tasks.jsx';
import { Reports } from '../pages/Reports.jsx';
import { Settings } from '../pages/Settings.jsx';
import { ClientDetails } from '../pages/ClientDetails.jsx';

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
