import { $ } from '../../../shared/lib/dom.ts';
import { slot } from '../../../shared/lib/slot.ts';
import { AccessList } from '../components/AccessList/index.tsx';
import { BillingSummary } from '../components/BillingSummary/index.tsx';
import { NoticeList } from '../components/NoticeList/index.tsx';
import { requests } from '../state.ts';
import { fillCompanyOptions } from './companyOptions.ts';
import { billingCounts, filterNotices } from './filter.ts';

const accessSlot = slot('#access-list');
const noticesSlot = slot('#notices-list');
const summarySlot = slot('#billing-summary');

/** Remove o que as listas desenharam (usado quando a sessão termina). */
function clearLists(): void {
  accessSlot.unmount();
  noticesSlot.unmount();
  summarySlot.unmount();
}

function render(): void {
  fillCompanyOptions(requests.state.companies.filter((x) => x.status !== 'inactive'));
  accessSlot.render(<AccessList grants={requests.state.grants} />);
  const filterClient = $<HTMLSelectElement>('#billing-client-filter')?.value || 'all';
  const scoped = requests.state.notices.filter(
    (n) => filterClient === 'all' || n.client_id === filterClient,
  );
  if ($('#billing-summary')) summarySlot.render(<BillingSummary counts={billingCounts(scoped)} />);
  const filter = $<HTMLSelectElement>('#billing-filter')?.value || 'all';
  noticesSlot.render(<NoticeList notices={filterNotices(scoped, filter)} />);
}

export { clearLists, render };
