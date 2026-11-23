"""Agenda administrativa pela entrada normal do iframe. O servidor e os arquivos são fictícios."""
from pathlib import Path
from urllib.parse import urlsplit
import mimetypes
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "http://clyriva.test"
HOST = """<!doctype html><html><head></head><body style="margin:0">
<script>
const data = {version:1,clients:[{id:'aurora-01',name:'Aurora',status:'active'},{id:'brisa-01',name:'Brisa',status:'active'}],
 invoices:[],cash:[],fees:[],tasks:[{id:'pedido-01',clientId:'aurora-01',title:'Receber extrato',status:'pending',awaitingClient:true,dueDate:'2026-12-01'}],
 taxes:[{id:'das-01',clientId:'aurora-01',kind:'DAS',value:92.75,competence:'2026-10',dueDate:'2026-11-30',status:'open'},
 {id:'das-02',clientId:'brisa-01',kind:'DARF',value:150,competence:'2026-10',dueDate:'2026-11-28',status:'open'},
 {id:'das-03',clientId:'brisa-01',kind:'Guia',value:80,competence:'2026-11',dueDate:'2026-12-07',status:'open'}]};
window.ClyrivaPanelHost={open:()=>({data:structuredClone(data),vault:null,demo:false}),token:async()=>'fake',
 commit:async(_,payload)=>Object.assign(data,structuredClone(payload))};
</script>
<iframe id="panel" style="width:100%;height:100vh;border:0" src="/admin.html"></iframe></body></html>"""


def suite(browser, width):
    files, shared, published = {}, set(), set()
    actions, errors = [], []
    fail_overview = False
    fail_first_upload = True
    ctx = browser.new_context(viewport={"width": width, "height": 900}, timezone_id="UTC")
    page = ctx.new_page()
    page.clock.set_fixed_time("2026-12-01T01:00:00Z")  # Ainda é 30/11 em Brasília.
    page.on("pageerror", lambda err: errors.append(str(err)))

    def route(r):
        nonlocal fail_first_upload
        path = urlsplit(r.request.url).path
        if path == "/":
            return r.fulfill(content_type="text/html", body=HOST)
        if path == "/admin.html":
            html=(ROOT/"dist"/"admin.html").read_text()
            return r.fulfill(content_type="text/html",body=html)
        if path.startswith("/api/cnpj/brasilapi/"):
            return r.fulfill(status=429,json={})
        if path.startswith("/api/cnpj/cnpjws/"):
            return r.fulfill(json={"razao_social":"Nome da consulta","estabelecimento":{"cnpj":"00000000000191","nome_fantasia":"Fantasia de teste"}})
        if path == "/config.js":
            return r.fulfill(content_type="text/javascript", body="window.CLYRIVA_CONFIG={supabaseUrl:location.origin,supabaseAnonKey:'fake'}")
        if path == "/vendor/supabase.js":
            return r.fulfill(content_type="text/javascript", body="window.supabase={createClient:()=>({storage:{from:()=>({uploadToSignedUrl:async()=>({error:null})})}})}")
        if "/functions/v1/" in path:
            action = path.split("admin-internal-")[-1]
            body = r.request.post_data_json
            actions.append(action)
            result = {"ok":True}
            if action == "overview":
                if fail_overview:
                    return r.fulfill(status=503,json={"ok":False,"error":"indisponível"})
                records = []
                for key, cid, typ in [("das-01","aurora-01","tax"),("das-02","brisa-01","tax"),("das-03","brisa-01","tax"),("pedido-01","aurora-01","task")]:
                    if body.get("clientId") and body["clientId"] != cid:
                        continue
                    records.append({"id":key,"type":typ,"clientId":cid,"files":len(files.get(key,[])),"privateFiles":sum(f["id"] not in shared for f in files.get(key,[])),"status":"active" if key in published else "internal"})
                result["records"]=records
            elif action == "list":
                key=body["entityId"]
                result.update(attachments=files.get(key,[]))
                if body.get("preview"):
                    result.update(source={"companyId":"aurora-01","companyName":"Aurora","label":"DAS","competence":"2026-10","amount":92.75,"dueDate":"2026-11-30","status":"open"},audience={"count":1,"emails":["aurora@example.test"]})
            elif action == "start":
                if fail_first_upload:
                    fail_first_upload=False
                    return r.fulfill(status=503,json={"ok":False,"error":"Falha temporária"})
                result.update(attachmentId="doc-fixture",path="teste.pdf",token="ticket")
                route.target=body
            elif action == "complete":
                key=route.target["entityId"]
                files[key]=[{"id":"doc-fixture","entity_type":route.target["entityType"],"entity_id":key,"original_name":route.target["fileName"]}]
            elif action == "publish":
                assert body["attachmentIds"]==["doc-fixture"] and body["expectedSource"]["companyId"]=="aurora-01"
                published.add(body["entityId"]);shared.update(body["attachmentIds"]);result.update(status="active",attachmentsAdded=1)
            elif action == "sync":
                result["skipped"]=True
            return r.fulfill(json=result)
        if path == "/favicon.ico":
            return r.fulfill(status=204)
        local = ROOT / "dist" / path.lstrip("/")
        if local.is_file():
            return r.fulfill(content_type=mimetypes.guess_type(str(local))[0] or "text/plain",body=local.read_bytes())
        return r.abort()

    ctx.route("**/*",route)
    page.goto(ORIGIN)
    frame=page.frame_locator("#panel")
    agenda=frame.locator("#agenda-vencimentos")
    counter=lambda code: agenda.locator(f"button[data-range='{code}']")
    for key, value in [("late",1),("today",1),("soon",1),("next",2),("waiting",1),("missing",3),("unsent",3),("published",0)]:
        expect(counter(key).locator("strong")).to_have_text(str(value))
    counter("late").click()
    expect(agenda.locator(".routine-date")).to_contain_text("2 dias de atraso")
    counter("waiting").click()
    expect(agenda.locator(".routine-date")).to_contain_text("Receber extrato")
    counter("today").click()
    expect(agenda.locator(".routine-date")).to_contain_text("10/2026")
    agenda.get_by_role("button",name="Abrir ficha",exact=False).click()
    expect(frame.locator("h1")).to_have_text("Aurora")
    expect(frame.locator("#month")).to_have_value("2026-10")
    frame.locator("[data-action='new-tax-for']").click()
    expect(frame.locator("#f-clientId")).to_have_value("aurora-01")
    frame.locator("[data-action='close-modal']").first.click()
    if width < 920:
        frame.locator("#hamb").click()
    frame.locator("[data-page='dashboard']").click()
    frame.locator("#client-filter").select_option("aurora-01")
    expect(counter("missing").locator("strong")).to_have_text("1")
    counter("missing").click()
    agenda.get_by_role("button",name="Anexar",exact=False).click()
    frame.locator("#internal-file").set_input_files({"name":"das-ficticio.pdf","mimeType":"application/pdf","buffer":b"%PDF-1.4\n"})
    frame.locator("#internal-upload").click()
    expect(frame.locator("#internal-upload")).to_have_text("Tentar novamente")
    frame.locator("#internal-upload").click()
    expect(frame.locator("#internal-file-list")).to_contain_text("das-ficticio.pdf")
    assert "publish" not in actions
    prompts=[]
    def confirm(dialog):
        prompts.append(dialog.message)
        dialog.accept()
    page.once("dialog",confirm)
    frame.locator("#internal-publish").click()
    expect(counter("published").locator("strong")).to_have_text("1")
    assert all(s in prompts[0] for s in ["Aurora","92,75","30/11/2026","das-ficticio.pdf","aurora@example.test"])
    frame.locator("[data-action='close-modal']").first.click()
    fail_overview=True
    agenda.get_by_role("button",name="Atualizar documentos").click()
    expect(agenda.get_by_text("Não foi possível conferir os anexos e as publicações.")).to_be_visible()
    expect(counter("missing").locator("strong")).to_have_text("—")
    expect(counter("missing")).to_be_disabled()
    fail_overview=False
    agenda.get_by_role("button",name="Atualizar documentos").click()
    expect(counter("published").locator("strong")).to_have_text("1")
    assert agenda.evaluate("(el)=>el.scrollWidth<=el.clientWidth"),width
    frame.locator("[data-action='new-client']").first.click()
    frame.locator("#f-name").fill("Razão social conferida")
    frame.locator("#f-document").fill("00000000000191")
    expect(frame.locator("#f-tradeName")).to_have_value("Fantasia de teste")
    frame.locator("#lookup-cnpj").click()
    expect(frame.locator("#lookup-cnpj")).to_be_enabled()
    expect(frame.locator("#f-name")).to_have_value("Razão social conferida")
    frame.locator("[data-action='close-modal']").first.click()
    for route, title in [
        ("clients","Meus clientes"), ("invoices","Notas fiscais"), ("cash","Financeiro dos clientes"),
        ("fees","Meus honorários"), ("taxes","Guias e tributos"), ("tasks","Obrigações e pendências"),
        ("service","Atendimentos"), ("vault","Cofre de acessos"), ("reports","Relatórios por cliente"),
        ("settings","Dados e backup"), ("dashboard","Sua gestão, em perspectiva"),
    ]:
        if width < 920:
            frame.locator("#hamb").click()
        frame.locator(f"[data-page='{route}']").click()
        expect(frame.locator("#page h1")).to_have_text(title)
        if route == "clients":
            frame.locator("#search").press_sequentially("Aurora")
            expect(frame.locator(".client-card")).to_have_count(1)
            expect(frame.locator("#search")).to_be_focused()
            expect(frame.locator(".client-card h3")).to_have_text("Aurora")
        if route == "reports":
            expect(frame.locator("#page tbody")).to_contain_text("Aurora")
        assert "[object Object]" not in frame.locator("#page").inner_text(), route
    assert not errors,errors
    ctx.close()
    print(f"OK: agenda, fuso, ficha, anexo privado, retentativa, publicação e falha de consulta ({width}px)")


if __name__ == "__main__":
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path="/usr/bin/chromium",args=["--no-sandbox","--disable-dev-shm-usage"])
        for width in (1440,390):
            suite(browser,width)
        browser.close()
