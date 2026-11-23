import io
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import servidor

class ServerTests(unittest.TestCase):
    def request(self,path,method='GET'):
        result={}
        def start(status,headers):result.update(status=int(status[:3]),headers=dict(headers))
        result['body']=b''.join(servidor.application({'PATH_INFO':path,'REQUEST_METHOD':method,'REMOTE_ADDR':'127.0.0.1','wsgi.input':io.BytesIO()},start))
        return result

    def test_wsgi_page_and_proxy(self):
        for name in ['index.html','admin.html']:
            res=self.request('/'+name)
            self.assertEqual(res['status'],200)
            if name=='admin.html':self.assertIn(b'name="clyriva-cnpj-proxy"',res['body'])
            self.assertEqual(int(res['headers']['Content-Length']),len(res['body']))

    def test_only_public_files(self):
        for path in ('/schema.sql','/frontend/src/entries/panel.js','/src/panel/state/workspace.js','/assets/hide.js.map','/assets/../config.js','/tests/banco.sql','/backup.json','/../config.js','/admin-setup.html','/file-demo.js', '/'+servidor.LOCAL_HTML):
            self.assertEqual(self.request(path)['status'],404)

    def test_validation_before_lookup(self):
        for value,valid in [('00000000000191',True),('12ABC34501DE35',True),('00000000000000',False),('12ABC34501DE34',False)]:
            self.assertEqual(servidor.valid_cnpj(value),valid)
        self.assertEqual(self.request('/api/cnpj/cnpjws/123')['status'],400)
        self.assertEqual(self.request('/api/cnpj/teste/00000000000191')['status'],400)
        self.assertEqual(self.request('/','POST')['status'],405)

    def test_projection(self):
        d={'razao_social':'Exemplo do teste','cnpj':'00000000000191','qsa':[{'dado':'não publicar'}]}
        self.assertNotIn('qsa',servidor.project(d,'brasilapi',d['cnpj']))
        with self.assertRaises(ValueError):servidor.project(d,'brasilapi','11222333000181')

if __name__=='__main__':unittest.main()
