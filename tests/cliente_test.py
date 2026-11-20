import json, unittest, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import servidor

class ClientPortalTests(unittest.TestCase):
    def test_public_client_login(self):
        code,b,mime,_=servidor.resource('/cliente.html','127.0.0.1')
        self.assertEqual(code,200)
        self.assertIn(b'clyriva-client-auth-v2',(ROOT/'cliente.js').read_bytes())
        self.assertIn(b'client-login',b)
        self.assertNotIn(b'service_role',b.lower())
    def test_admin_publisher_page(self):
        code,b,_,_=servidor.resource('/avisos-admin.html','127.0.0.1')
        self.assertEqual(code,200)
        self.assertIn(b'notice-form',b)
        self.assertIn(b'invite-form',b)
    def test_client_manifest(self):
        code,b,mime,_=servidor.resource('/manifest-cliente.webmanifest','127.0.0.1')
        self.assertEqual(code,200)
        self.assertEqual(mime,'application/manifest+json')
        data=json.loads(b)
        self.assertEqual(data['start_url'],'/cliente.html?app=1')
        self.assertNotEqual(data['id'],'/')
        self.assertEqual(data['display'],'standalone')
    def test_private_business_data_not_public(self):
        for name in ('/schema_v1_6_reference.sql','/db/migrations/20261120_client_notices.sql','/edge-functions/clyriva-client/index.ts'):
            self.assertEqual(servidor.resource(name,'127.0.0.1')[0],404)
    def test_sw_deep_link(self):
        code,b,_,_=servidor.resource('/sw.js','127.0.0.1')
        self.assertEqual(code,200)
        self.assertIn(b'd.url',b)
        self.assertIn(b'cliente.html',b)
        self.assertNotIn(b'localStorage',b)
    def test_authorized_only_for_client_notices(self):
        code,b,_,_=servidor.resource('/avisos-admin.js','127.0.0.1')
        self.assertEqual(code,200)
        self.assertIn(b'clyriva_admins',b)
        self.assertIn(b"'/admin-'+action",b)
        self.assertIn(b"api('publish',data)",b)
        portal=(ROOT/'cliente.js').read_text()
        self.assertNotIn('clyriva_workspace',portal)
        self.assertNotIn('clyriva_vault',portal)
        self.assertIn('client-list',portal)
if __name__=='__main__':unittest.main()
