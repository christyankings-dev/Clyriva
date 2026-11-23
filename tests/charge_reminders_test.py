import unittest
from built_site import assert_js, source_text
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0,str(ROOT))
import servidor

class ChargeRemindersTests(unittest.TestCase):
    def test_admin_charge_form_public(self):
        status,data,mime,other=servidor.resource('/avisos-admin.html','127.0.0.1')
        self.assertEqual(status,200)
        self.assertIn(b'id="charge-form"',data)
        self.assertIn(b'name="clientId"',data)
        self.assertIn(b'name="amount"',data)
        self.assertIn(b'name="dueDate"',data)
        self.assertIn(b'charge-cancel-edit',data)
    def test_admin_flows(self):
        js=source_text('notices')
        assert_js(self, "api(isEdit?'update-charge':'create-charge'",js)
        assert_js(self, "api('mark-paid'",js)
        assert_js(self, "api('reopen-charge'",js)
        assert_js(self, "api('archive'",js)
    def test_client_opt_in_and_amount(self):
        status,data,*_=servidor.resource('/cliente.html','127.0.0.1')
        self.assertEqual(status,200)
        self.assertIn(b'id="client-show-amount"',data)
        js=source_text('client')
        assert_js(self, 'showAmount',js)
        assert_js(self, 'notice.amount_cents',js)
    def test_migration_no_public_push_subscriptions(self):
        sql=(ROOT/'db/migrations/20261120_client_billing_reminders.sql').read_text()
        self.assertIn('delivery_date date not null',sql)
        self.assertIn('primary key(endpoint,notice_id,delivery_date)',sql)
        self.assertIn('revoke all on public.clyriva_client_push_deliveries',sql)
        self.assertIn('reminder_enabled',sql)
    def test_no_sensitive_edge_code_public(self):
        self.assertEqual(servidor.resource('/edge-functions/clyriva-client/reminder-text.mjs','127.0.0.1')[0],404)
        self.assertEqual(servidor.resource('/db/migrations/20261120_client_billing_reminders.sql','127.0.0.1')[0],404)
    def test_edge_includes_daily_and_dedup(self):
        code=(ROOT/'edge-functions/clyriva-client/index.ts').read_text()
        self.assertIn(".eq('reminder_enabled',true)",code)
        self.assertIn(".eq('status','active')",code)
        self.assertIn(".insert({endpoint:sub.endpoint,notice_id:notice.id,delivery_date:today",code)
        self.assertIn('reminderText(current,stage',code)
        self.assertNotIn('if(sub.last_sent_on===day)continue',code)
if __name__=='__main__':unittest.main()
