"""Auditoria v2.2: travas regressivas para isolamento, confiabilidade e privacidade."""
from pathlib import Path
import re, unittest
ROOT=Path(__file__).resolve().parents[1]
EDGE=(ROOT/'edge-functions/clyriva-client/index.ts').read_text()
CLIENT=(ROOT/'cliente.js').read_text()
ADMIN=(ROOT/'avisos-admin.js').read_text()
DB=(ROOT/'db/migrations/20261120_v22_reliability.sql').read_text()

class AuditV22(unittest.TestCase):
    def test_no_service_worker_dependency_for_login(self):
        start=CLIENT.index('async function signIn(')
        end=CLIENT.index('const supported=',start)
        login=CLIENT[start:end]
        self.assertNotIn('if(!registration)return',login)
        self.assertIn('sb.auth.signInWithPassword',login)
        self.assertIn('clearClientScreen()',login)
    def test_admin_only_publication_and_password_reset(self):
        self.assertIn("if(!await isAdmin(user.id))",EDGE)
        self.assertIn("if(await isAdmin(grant.user_id))",EDGE)
        self.assertIn('last_password_reset_at',EDGE)
        self.assertIn(".eq('user_id',existing.id)",EDGE)
        self.assertIn('temporaryPassword=password()',EDGE)
    def test_grant_scope_and_revocation(self):
        self.assertIn('await activeGrants(grant.user_id)',EDGE)
        self.assertIn(".delete().eq('user_id',grant.user_id)",EDGE)
        self.assertIn('await activeGrants(sub.user_id)',EDGE)
        self.assertIn('prior.user_id!==uid',EDGE)
    def test_notification_dedup_retry(self):
        self.assertIn('clyriva_client_push_deliveries',EDGE)
        self.assertIn(".eq('state','pending').lt('attempted_at',expiry)",EDGE)
        self.assertIn(".eq('state','sent')",EDGE)
        self.assertIn('daysUntil(notice.due_date,today)',EDGE)
        self.assertIn('show_amount===true',EDGE)
    def test_database_migration_is_additive(self):
        self.assertIn('request_key uuid',DB)
        self.assertIn('last_password_reset_at',DB)
        self.assertIn('show_amount set default false',DB)
        self.assertNotRegex(DB.lower(),r'\bdrop\s+(table|column|schema)\b')
    def test_no_api_credentials_on_client(self):
        for s in [ADMIN,CLIENT]:
            self.assertNotIn('SUPABASE_SERVICE_ROLE_KEY',s)
            self.assertNotIn('clyriva_push_cron_token',s)
            self.assertNotIn('privateKey',s)
    def test_admin_dashboard_filters(self):
        self.assertIn("filter==='late'",ADMIN)
        self.assertIn("filter==='paid'",ADMIN)
        self.assertIn('billing-summary',ADMIN)
    def test_private_client_screen_on_logout(self):
        self.assertIn('clearClientScreen()',CLIENT)
        self.assertIn("if(event==='SIGNED_OUT')clearClientScreen()",CLIENT)
        self.assertIn("await api('client-unsubscribe'",CLIENT)

if __name__=='__main__':unittest.main()
