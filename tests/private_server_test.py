import io,os,sys,unittest,json
from pathlib import Path
from unittest import mock
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import servidor

class MockReply:
    status=200
    def __enter__(self): return self
    def __exit__(self,*a): pass
    def read(self,size):return b'[ {"user_id": "11111111-2222-3333-4444-555555555555"} ]'

class PrivateServerTests(unittest.TestCase):
    def call(self,method='GET',path='/',authorization=None):
        headers={}
        def start(status,fields): headers['status']=int(status[:3]);headers['headers']=dict(fields)
        env={'REQUEST_METHOD':method,'PATH_INFO':path,'REMOTE_ADDR':'127.0.0.1'}
        if authorization:env['HTTP_AUTHORIZATION']=authorization
        body=b''.join(servidor.application(env,start))
        return headers['status'],headers['headers'],body

    def test_production_blocks_portal_setup_and_demo(self):
        with mock.patch.dict(os.environ,{'CLYRIVA_ENV':'production'}):
            for path in ('/admin-setup.html','/file-demo.js','/'+servidor.LOCAL_HTML):
                self.assertEqual(self.call(path=path)[0],404,path)
            status,heads,body=self.call(path='/')
            self.assertEqual(status,200)
            self.assertIn('Strict-Transport-Security',heads)
            self.assertIn('Content-Security-Policy-Report-Only',heads)
            status,heads,body=self.call(method='HEAD')
            self.assertEqual(status,200);self.assertEqual(body,b'')

    def test_cnpj_requires_admin_jwt(self):
        with mock.patch.dict(os.environ,{'CLYRIVA_ENV':'production'}):
            path='/api/cnpj/brasilapi/00000000000191'
            self.assertEqual(self.call(path=path)[0],401)
            self.assertEqual(self.call(path=path,authorization='Bearer invalid')[0],401)
            with mock.patch.object(servidor,'urlopen',return_value=MockReply()),mock.patch.object(servidor,'lookup',return_value=(200,{'ok':True},{})) as lookup:
                status,heads,body=self.call(path=path,authorization='Bearer e30.e30.abc')
                self.assertEqual(status,200)
                self.assertEqual(json.loads(body),{'ok':True})
                self.assertEqual(lookup.call_args.args[-1],'admin:11111111-2222-3333-4444-555555555555')

if __name__=='__main__': unittest.main()
