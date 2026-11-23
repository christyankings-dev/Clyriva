"""Servidor do Clyriva. Uso local: python servidor.py. Bibliotecas padrão do Python 3.9+.

Variáveis de ambiente (produção no Railway):
  CLYRIVA_ENV=production      bloqueia demonstração local e a página de cadastro do primeiro administrador.
  CLYRIVA_TRUST_PROXY=1       usa o último IP de X-Forwarded-For (adicionado pelo proxy do Railway) como IP do visitante.
  CLYRIVA_CSP=enforce         aplica a política de conteúdo; sem isso ela é enviada só como Report-Only (teste primeiro).
"""
import argparse
from collections import OrderedDict, deque
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import threading
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from functools import lru_cache
from urllib.error import HTTPError as UrlHTTPError

ROOT = Path(__file__).resolve().parent
PUBLIC_DIR = ROOT / "dist"
LOCAL_HTML = 'Clyriva_v1_4_Local_Busca_CNPJ.html'  # caminho preservado para instalações v1.4
PUBLIC_FILES = {
    "index.html": "text/html", "admin.html": "text/html", "cliente.html": "text/html",
    "avisos-admin.html": "text/html", "offline.html": "text/html",
    "config.js": "text/javascript", "vendor/supabase.js": "text/javascript",
    "sw.js": "text/javascript", "push-test.js": "text/javascript",
    "manifest.webmanifest": "application/manifest+json",
    "manifest-cliente.webmanifest": "application/manifest+json",
    "icons/clyriva-192.png": "image/png", "icons/clyriva-512.png": "image/png",
}

def asset_type(name):
    if name in PUBLIC_FILES:
        return PUBLIC_FILES[name]
    if re.fullmatch(r"assets/[A-Za-z0-9_.-]+\.(js|css)", name):
        return "text/javascript" if name.endswith(".js") else "text/css"
    return None

PROVIDERS = {
    'brasilapi': 'https://brasilapi.com.br/api/cnpj/v1/',
    'cnpjws': 'https://publica.cnpj.ws/cnpj/',
}
BLOCKED_IN_PRODUCTION = ('file-demo.js', LOCAL_HTML, 'admin-setup.html')
CSP = ("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; "
       "connect-src 'self' https://*.supabase.co; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'")
TTL = 15 * 60
cache = OrderedDict()
hits = OrderedDict()
blocked_until = {}
lock = threading.Lock()

def valid_cnpj(value):
    if not re.fullmatch(r'[A-Z0-9]{12}[0-9]{2}', value) or len(set(value)) == 1:
        return False
    digits = [ord(ch) - 48 for ch in value]
    for size in (12, 13):
        total = sum(x * (2 + (size - 1 - i) % 8) for i, x in enumerate(digits[:size]))
        rem = total % 11
        if digits[size] != (0 if rem < 2 else 11 - rem):
            return False
    return True

def project(record, source, cnpj):
    """O navegador recebe somente os campos usados pelo cadastro."""
    def pick(item, keys):
        if not isinstance(item, dict):
            return {}
        return {k: item[k] for k in keys.split() if k in item and not isinstance(item[k], (dict, list))}
    if not isinstance(record, dict):
        raise ValueError()
    est = record.get('estabelecimento') if source == 'cnpjws' else record
    if not isinstance(est, dict) or est.get('cnpj') != cnpj or not isinstance(record.get('razao_social'), str) or not record['razao_social'].strip():
        raise ValueError()
    common = 'cnpj nome_fantasia data_inicio_atividade cep tipo_logradouro logradouro numero complemento bairro email'
    if source == 'brasilapi':
        return pick(record, common + ' razao_social cnae_fiscal_descricao cnae_fiscal descricao_situacao_cadastral natureza_juridica porte descricao_porte descricao_tipo_de_logradouro municipio uf ddd_telefone1 opcao_pelo_mei opcao_pelo_simples')
    result = pick(record, 'razao_social')
    for k, keys in [('porte','descricao'), ('natureza_juridica','descricao'), ('simples','mei simples')]:
        result[k] = pick(record.get(k), keys)
    branch = pick(est, common + ' situacao_cadastral ddd1 telefone1')
    for k, keys in [('cidade','nome'), ('estado','sigla'), ('atividade_principal','id descricao')]:
        branch[k] = pick(est.get(k), keys)
    result['estabelecimento'] = branch
    return result

def lookup(provider, cnpj, ip):
    key = (provider, cnpj)
    with lock:
        now = time.monotonic()
        item = cache.get(key)
        if item and now - item[0] < TTL:
            cache.move_to_end(key)
            return 200, item[1], {'X-Clyriva-Consulted-At':item[2]}
        if now < blocked_until.get(provider, 0):
            return 429, {'erro':'Limite temporário na fonte.'}, {'Retry-After':str(max(1,int(blocked_until[provider]-now)))}
        window = hits.setdefault(ip, deque())
        while window and now - window[0] >= 60:
            window.popleft()
        if len(window) >= 30:
            return 429, {'erro':'Aguarde para consultar novamente.'}, {'Retry-After':'60'}
        window.append(now)
        hits.move_to_end(ip)
        if len(hits)>4096:
            hits.popitem(last=False)
    try:
        req = Request(PROVIDERS[provider]+cnpj, headers={'Accept':'application/json','User-Agent':'Clyriva/1.6 (consulta cadastral)'})
        with urlopen(req, timeout=8) as res:
            body = res.read(512*1024+1)
            if len(body)>512*1024:
                raise ValueError()
            result = project(json.loads(body),provider,cnpj)
    except HTTPError as exc:
        status = exc.code if exc.code in (400,403,404,422,429) else 502
        if status == 429:
            retry = exc.headers.get('Retry-After','')
            seconds=min(3600,max(1,int(retry))) if retry.isdecimal() else 60
            with lock:
                blocked_until[provider]=time.monotonic()+seconds
            return 429, {'erro':'Limite do provedor.'}, {'Retry-After':str(seconds)}
        return status, {'erro':'A fonte não concluiu a consulta.'}, {}
    except (TimeoutError,URLError,OSError,ValueError):
        return 502, {'erro':'Fonte indisponível ou resposta incompatível.'}, {}
    checked = datetime.now(timezone.utc).isoformat()
    with lock:
        cache[key] = (time.monotonic(),result,checked)
        cache.move_to_end(key)
        if len(cache)>512:
            cache.popitem(last=False)
    return 200,result,{'X-Clyriva-Consulted-At':checked}

def security_headers():
    fields = {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
              'Cross-Origin-Resource-Policy':'same-origin',
              'X-Frame-Options':'SAMEORIGIN','Permissions-Policy':'camera=(), microphone=(), geolocation=()'}
    if os.getenv('CLYRIVA_ENV') == 'production':
        fields['Strict-Transport-Security'] = 'max-age=31536000'
        fields['Content-Security-Policy-Report-Only' if os.getenv('CLYRIVA_CSP') == 'report' else 'Content-Security-Policy'] = CSP
    else:
        fields['Content-Security-Policy'] = "frame-ancestors 'self'; object-src 'none'; base-uri 'self'"
    return fields

@lru_cache(maxsize=1)
def supabase_public_config():
    """These are publishable frontend settings, not server-side secrets."""
    content=(PUBLIC_DIR/'config.js').read_text(encoding='utf-8')
    url=re.search(r"supabaseUrl:\s*['\"](https://[a-z0-9-]+\.supabase\.co)['\"]",content)
    key=re.search(r"supabaseAnonKey:\s*['\"](sb_publishable_[A-Za-z0-9_-]+)['\"]",content)
    if not url or not key:
        return None
    return (url.group(1),key.group(1))

# Recheck authorization periodically without storing raw access tokens.
authorized_sessions=OrderedDict()

def admin_from_token(environ):
    value=environ.get('HTTP_AUTHORIZATION','')
    if not value.startswith('Bearer ') or len(value)>4096:
        return None
    token=value[7:].strip()
    if not re.fullmatch(r'[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+',token):
        return None
    import hashlib
    digest=hashlib.sha256(token.encode('ascii')).hexdigest()
    now=time.monotonic()
    with lock:
        prior=authorized_sessions.get(digest)
        if prior and now-prior[0]<25:
            return prior[1]
    config=supabase_public_config()
    if not config:
        return None
    base,publishable=config
    # The table has RLS; a non-admin receives [], even with a valid JWT.
    req=Request(base+'/rest/v1/clyriva_admins?select=user_id&limit=1',
        headers={'apikey':publishable,'Authorization':'Bearer '+token,'Accept':'application/json','User-Agent':'Clyriva/1.7'})
    try:
        with urlopen(req,timeout=6) as reply:
            if getattr(reply,'status',200)!=200:return None
            data=json.loads(reply.read(4096))
    except (UrlHTTPError,URLError,TimeoutError,OSError,ValueError,TypeError):
        return None
    if not isinstance(data,list) or len(data)!=1:return None
    user=data[0].get('user_id') if isinstance(data[0],dict) else None
    if not isinstance(user,str) or not re.fullmatch(r'[0-9a-fA-F-]{36}',user):return None
    with lock:
        authorized_sessions[digest]=(now,user)
        authorized_sessions.move_to_end(digest)
        if len(authorized_sessions)>1200:authorized_sessions.popitem(last=False)
    return user

def client_ip(environ):
    """Atrás do proxy do Railway, REMOTE_ADDR é o proxy; o visitante vem no último item de X-Forwarded-For."""
    if os.getenv('CLYRIVA_TRUST_PROXY') == '1':
        forwarded = environ.get('HTTP_X_FORWARDED_FOR', '').split(',')[-1].strip()
        if re.fullmatch(r'[0-9A-Fa-f:.]{3,45}', forwarded):
            return forwarded
    return environ.get('REMOTE_ADDR', '')

class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        # Evita registrar documentos, credenciais e parâmetros de links de recuperação.
        pass

    def send(self, status, data, mime, headers=None):
        self.send_response(status)
        self.send_header('Content-Type',mime+('; charset=utf-8' if not mime.startswith('image/') else ''))
        self.send_header('Content-Length',str(len(data)))
        for key,value in {**security_headers(),**(headers or {})}.items():
            self.send_header(key,value)
        self.end_headers()
        try:
            if self.command != 'HEAD':
                self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_GET(self):
        status,body,mime,headers = resource(urlsplit(self.path).path,self.client_address[0])
        self.send(status,body,mime,headers)

    do_HEAD = do_GET

def resource(path,ip,environ=None):
    if path.startswith('/api/cnpj/'):
        if os.getenv('CLYRIVA_ENV')=='production':
            if not environ:
                return 401,'{"erro":"Acesso não autorizado."}'.encode("utf-8"),'application/json',{}
            admin_id=admin_from_token(environ)
            if not admin_id:
                return 401,'{"erro":"Entre novamente para consultar CNPJ."}'.encode("utf-8"),'application/json',{}
            ip='admin:'+admin_id
        parts=path.split('/')
        if len(parts)!=5 or parts[3] not in PROVIDERS or not valid_cnpj(parts[4]):
            return 400,b'{"erro":"CNPJ ou fonte invalida."}','application/json',{}
        status,result,headers=lookup(parts[3],parts[4],ip)
        return status,json.dumps(result,ensure_ascii=False).encode(),'application/json',headers
    asset='index.html' if path=='/' else path[1:]
    if os.getenv('CLYRIVA_ENV') == 'production' and asset in BLOCKED_IN_PRODUCTION:
        return 404,b'Arquivo indisponivel.','text/plain',{}
    mime = asset_type(asset)
    if not mime:
        return 404,b'Arquivo indisponivel.','text/plain',{}
    try:
        data=(PUBLIC_DIR/asset).read_bytes()
    except OSError:
        return 404,b'Arquivo indisponivel.','text/plain',{}
    if mime=='text/html':
        data=data.replace(b'<!-- clyriva-runtime -->',b'<meta name="clyriva-cnpj-proxy" content="/api/cnpj/">',1)
    return 200,data,mime,{}

def application(environ,start_response):
    """Aplicação WSGI para hospedagem HTTPS com servidor de produção."""
    method=environ.get('REQUEST_METHOD')
    if method not in ('GET','HEAD'):
        status,body,mime,headers=405,b'Metodo indisponivel.','text/plain',{'Allow':'GET, HEAD'}
    else:
        status,body,mime,headers=resource(environ.get('PATH_INFO','/'),client_ip(environ),environ)
    fields={'Content-Type':mime+('; charset=utf-8' if not mime.startswith('image/') else ''),'Content-Length':str(len(body)),**security_headers(),**headers}
    start_response(str(status)+' '+HTTPStatus(status).phrase,list(fields.items()))
    return [] if method=='HEAD' else [body]

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--abrir',action='store_true',help='Abrir o portal no navegador após iniciar')
    parser.add_argument('--abrir-local',action='store_true',help='Abrir diretamente o painel administrativo local')
    args=parser.parse_args()
    with ThreadingHTTPServer((args.host,args.port),Handler) as server:
        print('Portal: http://'+args.host+':'+str(server.server_port)+'/\nPainel local: http://'+args.host+':'+str(server.server_port)+'/'+LOCAL_HTML,flush=True)
        if args.abrir or args.abrir_local:
            import webbrowser
            url='http://'+args.host+':'+str(server.server_port)+'/'
            if args.abrir_local:url += LOCAL_HTML
            webbrowser.open(url)
        try:server.serve_forever()
        except KeyboardInterrupt:pass
