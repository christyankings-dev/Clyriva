"""Login instalado, inscrição e teste de um único aparelho com serviços fictícios."""
import json
import sys
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from servidor import Handler

CONFIG = "window.CLYRIVA_CONFIG={supabaseUrl:location.origin,supabaseAnonKey:'teste'};"
AUTH = """
window.supabase={createClient:()=>({
 auth:{
  getSession:async()=>({data:{session:(location.pathname==='/avisos-admin.html'||sessionStorage.getItem('signed'))?{access_token:'teste'}:null}}),
  getUser:async()=>({data:{user:{id:'gestor-ficticio'}}}),
  signInWithPassword:async({email,password})=>{
   if(email!=='pessoa@example.test'||password!=='senha-do-teste')return {error:{code:'invalid_credentials'}};
   sessionStorage.setItem('signed','1');return {error:null};
  },
  signOut:async()=>{sessionStorage.removeItem('signed');return {error:null};},
  onAuthStateChange:()=>({})
 },
 from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{user_id:'gestor-ficticio'}})})})})
})};
"""
HANDSET = """
window.mobileTest={scopes:[],removed:[],requests:0,permission:'default'};
const model=window.mobileTest;
const endpoint=role=>'https://fcm.googleapis.com/fcm/send/android-testing-'+role;
function registration(role,scope,already){
 let sub;
 function make(){return {endpoint:endpoint(role),toJSON(){return {endpoint:this.endpoint}},
  unsubscribe:async()=>{model.removed.push(role);sub=null;return true;}};}
 if(already)sub=make();
 return {active:{state:'activated'},scope:location.origin+scope,pushManager:{
  getSubscription:async()=>sub,subscribe:async()=>{sub=make();return sub;}
 }};
}
const legacy=registration('antigo','/',true), client=registration('cliente','/cliente.html',false);
Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{
 register:async(_,options)=>{model.scopes.push(options.scope);return client;},
 getRegistration:async url=>url==='/'?legacy:client
}});
Object.defineProperty(window,'PushManager',{configurable:true,value:function(){}});
Object.defineProperty(window,'Notification',{configurable:true,value:{
 get permission(){return model.permission},requestPermission:()=>{model.requests++;model.permission='granted';return Promise.resolve('granted');}
}});
Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{model.copied=value;}}});
"""

def app_scripts(context):
    context.route("**/config.js", lambda route: route.fulfill(content_type="text/javascript", body=CONFIG))
    context.route("**/vendor/supabase.js", lambda route: route.fulfill(content_type="text/javascript", body=AUTH))


def onboarding(browser, origin):
    ctx = browser.new_context(viewport={"width":390,"height":844}, is_mobile=True, has_touch=True)
    app_scripts(ctx)
    ctx.add_init_script(HANDSET)
    enrolled = set()
    attempts = []
    admin_root = "https://fcm.googleapis.com/fcm/send/android-testing-antigo"
    client_device = "https://fcm.googleapis.com/fcm/send/android-testing-cliente"
    def backend(route):
        action = route.request.url.rsplit("/",1)[-1]
        data = route.request.post_data_json if route.request.method == "POST" else {}
        out = {"ok":True}
        if action == "admin-list":
            out.update(companies=[{"id":"acme","name":"Empresa fictícia","status":"active"}], grants=[], notices=[])
        elif action == "admin-invite":
            assert data == {"clientId":"acme","email":"pessoa@example.test"}
            out.update(email=data["email"],created=True,temporaryPassword="senha-do-teste",loginUrl=origin+"/cliente.html")
        elif action == "client-list":
            out.update(companies=[{"admin_id":"gestor","client_id":"acme","company":"Empresa fictícia"}],notices=[])
        elif action == "public-key":
            out["publicKey"]="BA"+"A"*85
        elif action == "client-push-status":
            out.update(enabled=data["endpoint"] in enrolled,showAmount=False)
        elif action == "client-subscribe":
            assert not data["showAmount"]
            enrolled.add(data["subscription"]["endpoint"])
        elif action == "client-test":
            assert data["endpoint"] in enrolled
            attempts.append(data["endpoint"])
        elif action == "client-unsubscribe":
            enrolled.discard(data["endpoint"])
        else:
            raise AssertionError(action)
        route.fulfill(json=out)
    ctx.route("**/functions/v1/**",backend)
    page = ctx.new_page()
    errors = []
    page.on("pageerror",lambda err:errors.append(str(err)))
    page.goto(origin+"/avisos-admin.html#autorizar?empresa=acme")
    expect(page.locator("#admin-workspace")).to_be_visible()
    expect(page.locator('#invite-form [name="clientId"]')).to_have_value("acme")
    page.locator('#invite-form [name="email"]').fill("pessoa@example.test")
    page.locator('#invite-form button').click()
    copy = page.get_by_role("button", name="Copiar credenciais para enviar em particular")
    expect(copy).to_be_visible()
    assert "senha-do-teste" not in page.locator("body").inner_text()
    copy.click()
    instructions=page.evaluate("mobileTest.copied")
    assert all(part in instructions for part in ["/cliente.html","pessoa@example.test","senha-do-teste","Enviar notificação de teste"])

    page.goto(origin+"/cliente.html?app=1")
    page.get_by_role("button",name="Instalar no celular",exact=True).click()
    expect(page.locator('#login-area [data-install-feedback]')).to_contain_text("tela inicial")
    page.locator('#c-email').fill("pessoa@example.test")
    page.locator('#c-password').fill("incorreta")
    page.get_by_role("button",name="Entrar",exact=True).click()
    expect(page.locator('#login-feedback')).to_contain_text("Confira o e-mail")
    page.locator('#c-password').fill("senha-do-teste")
    page.get_by_role("button",name="Entrar",exact=True).click()
    expect(page.locator('#device-status')).to_contain_text("Ative")
    expect(page.locator('#client-push-test')).to_be_disabled()
    assert page.evaluate("mobileTest.requests") == 0
    page.get_by_role("button",name="Ativar notificações").click()
    expect(page.locator('#client-push-test')).to_be_enabled()
    assert enrolled == {client_device}
    page.locator('#client-push-test').click()
    expect(page.locator('#push-feedback')).to_contain_text("serviço aceitou")
    assert attempts == [client_device]
    page.locator('#client-logout').click()
    expect(page.locator('#client-login')).to_be_visible()
    assert not enrolled and page.evaluate("mobileTest.removed") == ["cliente"]
    assert page.evaluate("mobileTest.scopes.every(s=>s==='/cliente.html')")

    # Uma instalação anterior continua testável com o vínculo já confirmado, sem nova inscrição.
    enrolled.add(admin_root)
    page.evaluate("mobileTest.permission='granted'")
    page.locator('#c-email').fill("pessoa@example.test")
    page.locator('#c-password').fill("senha-do-teste")
    page.get_by_role("button",name="Entrar",exact=True).click()
    expect(page.locator('#client-push-test')).to_be_enabled()
    page.locator('#client-push-test').click()
    expect(page.locator('#push-feedback')).to_contain_text("serviço aceitou")
    assert attempts == [client_device,admin_root]
    assert not errors,errors
    ctx.close()
    print("OK convite por empresa, instalação antes de entrar, senha, permissão e teste individual; acesso legado preservado")


def service_worker(browser, origin):
    ctx=browser.new_context(permissions=["notifications"])
    app_scripts(ctx)
    page=ctx.new_page()
    cdp=ctx.new_cdp_session(page)
    registrations={}
    def registered(event):
        for item in event["registrations"]:
            registrations[item["scopeURL"]]=item["registrationId"]
    cdp.on("ServiceWorker.workerRegistrationUpdated",registered)
    cdp.send("ServiceWorker.enable")
    page.goto(origin+"/cliente.html?app=1")
    page.wait_for_function("""async()=> (await navigator.serviceWorker.getRegistration(location.href))?.active?.state==='activated'""")
    scope=origin+"/cliente.html"
    assert scope in registrations,registrations
    payload={"title":"Notificação de teste","body":"Teste no navegador","url":"/cliente.html","tag":"teste-cliente"}
    cdp.send("ServiceWorker.deliverPushMessage",{"origin":origin,"registrationId":registrations[scope],"data":json.dumps(payload)})
    page.wait_for_function("""async()=> {
      const r=await navigator.serviceWorker.getRegistration(location.href);
      const msgs=await r.getNotifications();
      return msgs.some(n=>n.title==='Clyriva · Notificação de teste' && n.data.url==='/cliente.html');
    }""",timeout=10000)
    ctx.set_offline(True)
    page.reload(wait_until="domcontentloaded")
    reconnect=page.get_by_role("link",name="Abrir Clyriva Clientes")
    expect(reconnect).to_be_visible()
    ctx.set_offline(False)
    reconnect.click()
    expect(page.locator("#client-login")).to_be_visible()
    ctx.close()
    print("OK push simulado no Chromium com worker real, notificação exibida e destino Clyriva Clientes")


if __name__ == "__main__":
    with ThreadingHTTPServer(("127.0.0.1",0),Handler) as server:
        thread=threading.Thread(target=server.serve_forever,daemon=True)
        thread.start()
        try:
            with sync_playwright() as pw:
                browser=pw.chromium.launch(executable_path="/usr/bin/chromium",args=["--no-sandbox","--disable-dev-shm-usage"])
                origin=f"http://127.0.0.1:{server.server_port}"
                onboarding(browser,origin)
                service_worker(browser,origin)
                browser.close()
        finally:
            server.shutdown()
