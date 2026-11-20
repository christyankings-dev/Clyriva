import json
import unittest
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import servidor

class PwaTest(unittest.TestCase):
    def test_manifest_installable(self):
        code,body,mime,h=servidor.resource('/manifest.webmanifest','127.0.0.1')
        self.assertEqual(code,200)
        self.assertEqual(mime,'application/manifest+json')
        m=json.loads(body)
        self.assertEqual(m['display'],'standalone')
        self.assertEqual(m['start_url'],'/?app=1')
        self.assertEqual(len(m['icons']),2)
    def test_service_worker_served_at_root(self):
        code,body,mime,_=servidor.resource('/sw.js','127.0.0.1')
        self.assertEqual(code,200)
        self.assertEqual(mime,'text/javascript')
        self.assertIn(b"self.addEventListener('push'",body)
        self.assertNotIn(b'caches.addAll(["/index.html"',body)
    def test_icons(self):
        for size in (192,512):
            status,body,mime,_=servidor.resource(f'/icons/clyriva-{size}.png','127.0.0.1')
            self.assertEqual(status,200)
            self.assertEqual(mime,'image/png')
            self.assertEqual(body[:8],b'\x89PNG\r\n\x1a\n')
    def test_offline_page_no_client_data(self):
        status,body,_,_=servidor.resource('/offline.html','127.0.0.1')
        self.assertEqual(status,200)
        self.assertIn(b'Sem conex',body)
        self.assertNotIn(b'@',body)
    def test_legacy_private_files_still_hidden(self):
        original=servidor.os.environ.get('CLYRIVA_ENV')
        try:
            servidor.os.environ['CLYRIVA_ENV']='production'
            for path in ('/admin-setup.html','/schema_v1_6_reference.sql'):
                status,_,_,_=servidor.resource(path,'127.0.0.1')
                self.assertEqual(status,404)
        finally:
            if original is None:servidor.os.environ.pop('CLYRIVA_ENV',None)
            else:servidor.os.environ['CLYRIVA_ENV']=original
    def test_entrypoint_mentions_manifest(self):
        code,body,_,_=servidor.resource('/','127.0.0.1')
        self.assertEqual(code,200)
        self.assertIn(b'manifest.webmanifest',body)
        self.assertIn(b'pwa.js',body)

if __name__=='__main__':unittest.main()
