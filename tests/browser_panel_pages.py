"""Percorre todas as páginas e diálogos do painel (React) pela entrada normal do iframe.
O servidor, os dados e os arquivos são fictícios; nenhuma chamada sai da máquina."""
from pathlib import Path
from urllib.parse import urlsplit
import mimetypes
import sys
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://clyriva.test"
SHOTS = Path(sys.argv[1]) if len(sys.argv) > 1 else None
HOST = """<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0"><script>
const data = {version:1,
 clients:[{id:'aurora-01',name:'Aurora Ltda',status:'active',document:'11222333000181',regime:'Simples Nacional',priority:'high',monthlyFee:900,start:'2026-01-01'},
          {id:'brisa-01',name:'Brisa ME',status:'active',regime:'MEI',priority:'low',monthlyFee:300}],
 invoices:[{id:'nf1',clientId:'aurora-01',number:'10',date:'2026-11-05',competence:'2026-11',value:1500,status:'issued'}],
 cash:[{id:'c1',clientId:'aurora-01',kind:'receipt',date:'2026-11-10',value:500,category:'Honorários',invoiceId:'nf1'},
       {id:'c2',clientId:'aurora-01',kind:'expense',date:'2026-11-11',value:80,category:'Taxas'}],
 fees:[{id:'f1',clientId:'aurora-01',competence:'2026-11',expected:900,paid:400}],
 tasks:[{id:'t1',clientId:'aurora-01',title:'Enviar balancete',category:'Obrigação',competence:'2026-11',dueDate:'2026-11-20',priority:'high',status:'pending'},
        {id:'t2',clientId:'brisa-01',title:'Dúvida do cliente',category:'Atendimento',competence:'2026-11',dueDate:'2026-11-25',priority:'medium',status:'progress'}],
 taxes:[{id:'x1',clientId:'aurora-01',kind:'DAS',value:92.75,competence:'2026-11',dueDate:'2026-11-30',status:'open'}]};
let vault=null;
window.ClyrivaPanelHost={open:()=>({data:structuredClone(data),vault,demo:false}),token:async()=>'fake',
 commit:async(_,payload,v)=>{Object.assign(data,structuredClone(payload.data||payload));if(v!==undefined)vault=v;}};
</script><iframe id="panel" style="width:100%;height:100vh;border:0" src="/admin.html"></iframe></body></html>"""

PAGES = ["dashboard", "clients", "vault", "invoices", "cash", "fees", "taxes", "service", "tasks", "reports", "settings"]
NEW = {"client": "clients", "invoice": "invoices", "cash": "cash", "task": "tasks", "tax": "taxes", "fee": "fees"}


def run(browser, width):
    errors = []
    ctx = browser.new_context(viewport={"width": width, "height": 900}, timezone_id="America/Sao_Paulo")
    page = ctx.new_page()
    page.clock.set_fixed_time("2026-11-23T15:00:00Z")
    page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
    page.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)

    def route(r):
        path = urlsplit(r.request.url).path
        if path == "/":
            return r.fulfill(content_type="text/html", body=HOST)
        if path == "/config.js":
            return r.fulfill(content_type="text/javascript", body="window.CLYRIVA_CONFIG={supabaseUrl:location.origin,supabaseAnonKey:'fake'}")
        if path == "/vendor/supabase.js":
            return r.fulfill(content_type="text/javascript", body="window.supabase={createClient:()=>({})}")
        if "/functions/v1/" in path:
            return r.fulfill(json={"ok": True, "records": [], "attachments": []})
        if path == "/favicon.ico":
            return r.fulfill(status=204)
        local = ROOT / "dist" / path.lstrip("/")
        if local.is_file():
            return r.fulfill(content_type=mimetypes.guess_type(str(local))[0] or "text/plain", body=local.read_bytes())
        return r.abort()

    ctx.route("**/*", route)
    page.goto(ORIGIN)
    f = page.frame_locator("#panel")
    expect(f.locator("h1")).to_be_visible()
    shot = lambda name: SHOTS and page.screenshot(path=str(SHOTS / f"{width}-{name}.png"))
    # Casca e navegação
    for name in PAGES:
        if width < 920:
            f.locator("#hamb").click()
        f.locator(f"#nav [data-page='{name}'], nav [data-page='{name}']").first.click()
        expect(f.locator("#breadcrumb")).not_to_be_empty()
        expect(f.locator("#page")).not_to_be_empty()
        expect(f.locator(f"[data-page='{name}'].on").first).to_be_visible()
        shot(name)
    # Diálogos de cada tipo de registro
    for kind, page_name in NEW.items():
        if width < 920:
            f.locator("#hamb").click()
        f.locator(f"#nav [data-page='{page_name}']").click()
        f.locator(f"[data-action='new-{kind}']").first.click()
        expect(f.locator("#edit-form")).to_be_visible()
        shot("modal-" + kind)
        f.locator("[data-action='close-modal']").first.click()
        expect(f.locator("#edit-form")).to_have_count(0)
    # Cadastro de cliente salvo pela interface
    if width < 920:
        f.locator("#hamb").click()
    f.locator("#nav [data-page='clients']").click()
    f.locator("[data-action='new-client']").first.click()
    f.locator("#f-name").fill("Cliente Novo SA")
    f.locator("#edit-form [type=submit]").click()
    expect(f.locator("#edit-form")).to_have_count(0)
    f.locator("#client-filter option", has_text="Cliente Novo SA").wait_for(state="attached")
    # Ficha do cliente
    f.locator("#client-filter").select_option("aurora-01")
    f.locator("[data-page='clients']").first.click() if width >= 920 else None
    if width < 920:
        f.locator("#hamb").click()
        f.locator("[data-page='clients']").first.click()
    f.locator("[data-action='view-client']").first.click()
    expect(f.locator("h1")).to_have_text("Aurora Ltda")
    shot("ficha")
    # Cofre: criar, cadastrar acesso, bloquear e desbloquear
    if width < 920:
        f.locator("#hamb").click()
    f.locator("#nav [data-page='vault']").click()
    f.locator("#vault-setup-form [name=master]").fill("senha-mestra-longa-1")
    f.locator("#vault-setup-form [name=confirm]").fill("senha-mestra-longa-1")
    f.locator("#vault-setup-form [type=submit]").click()
    expect(f.locator(".vault-ok")).to_be_visible(timeout=20000)
    f.locator("[data-action='vault-new']").first.click()
    f.locator("#vault-entry-form [name=label]").fill("Portal NFS-e")
    f.locator("#vault-password").fill("segredo")
    f.locator("#vault-entry-form button.btn", has_text="Mostrar").click()
    expect(f.locator("#vault-password")).to_have_attribute("type", "text")
    shot("vault-entry")
    f.locator("#vault-entry-form [type=submit]").click()
    expect(f.locator(".vault-records")).to_contain_text("Portal NFS-e", timeout=20000)
    f.locator("[data-action='vault-lock']").first.click()
    expect(f.locator("#vault-unlock-form")).to_be_visible()
    f.locator("#vault-unlock-form [name=master]").fill("senha-mestra-longa-1")
    f.locator("#vault-unlock-form [type=submit]").click()
    expect(f.locator(".vault-records")).to_contain_text("Portal NFS-e", timeout=20000)
    ctx.close()
    assert not errors, errors


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    for w in (1280, 390):
        run(browser, w)
    browser.close()
print("OK browser_panel_pages")
