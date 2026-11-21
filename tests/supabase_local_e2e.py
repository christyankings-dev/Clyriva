"""Ciclo com Supabase Auth, Postgres, Storage e Edge locais. Usa apenas identidades sintéticas."""
import json
import os
import secrets
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import Request, urlopen

BASE = "http://127.0.0.1:54321"
ANON = os.environ["ANON_KEY"]
SERVICE = os.environ["SERVICE_ROLE_KEY"]
FN = "/functions/v1/clyriva-client/"
PDF = b"%PDF-1.4\nClyriva - documento sintetico\n%%EOF"
BUCKET = "clyriva-client-attachments"


def request(method, path, token, body=None, expected=(200,), raw=False, extra=None):
    assert path.startswith("/") and not path.startswith("//")
    headers = {"apikey": SERVICE if token == SERVICE else ANON, "Authorization": "Bearer " + token}
    if body is not None and not isinstance(body, bytes):
        body = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    headers.update(extra or {})
    req = Request(BASE + path, data=body, headers=headers, method=method)
    try:
        res = urlopen(req, timeout=20)
    except HTTPError as error:
        res = error
    with res:
        data = res.read()
        assert res.status in expected, (method, path.split("?")[0], res.status, data[:240] if res.status >= 400 else "")
    return data if raw else json.loads(data) if data else None


def user(name):
    email = name + "@example.test"
    password = secrets.token_urlsafe(28)
    u = request("POST", "/auth/v1/admin/users", SERVICE, {"email": email, "password": password, "email_confirm": True})
    s = request("POST", "/auth/v1/token?grant_type=password", ANON, {"email": email, "password": password})
    return u["id"], s["access_token"], email


def op(action, token, body=None, expected=(200,)):
    return request("POST", FN + action, token, body or {}, expected)


def insert(table, row):
    request("POST", "/rest/v1/" + table, SERVICE, row, (201,))


def rpc(name, token, params=None, expected=(200,)):
    return request("POST", "/rest/v1/rpc/" + name, token, params or {}, expected)


def upload(token, source, filename, contents=PDF):
    ticket = op("admin-internal-start", token, {**source, "fileName": filename, "mimeType": "application/pdf", "sizeBytes": len(contents)})
    path = "/storage/v1/object/upload/sign/" + BUCKET + "/" + quote(ticket["path"]) + "?token=" + quote(ticket["token"])
    request("PUT", path, token, contents, (200, 201), extra={"Content-Type":"application/pdf"})
    op("admin-internal-complete", token, {"attachmentId": ticket["attachmentId"]})
    return ticket["attachmentId"]


def download(token, ident, action="client-attachment-link"):
    signed = op(action, token, {"attachmentId":ident,"download":True})
    assert signed["expiresIn"] == 60
    url = urlsplit(signed["url"])
    assert url.path.startswith("/storage/v1/object/sign/")
    return request("GET", url.path + "?" + url.query, token, raw=True)


def main():
    for _ in range(60):
        try:
            op("client-list", ANON, expected=(401,))
            break
        except (AssertionError, URLError):
            time.sleep(2)
    else:
        raise AssertionError("A função local não iniciou.")
    admin_id, admin, _ = user("gestor")
    insert("clyriva_admins", {"user_id":admin_id})
    a, b, tax, task = "empresa-aurora", "empresa-brisa", "guia-aurora", "tarefa-brisa"
    w = {"version":1, "clients":[{"id":a,"name":"Aurora MEI","status":"active"},{"id":b,"name":"Brisa MEI","status":"active"}],
         "taxes":[{"id":tax,"clientId":a,"kind":"DAS","competence":"2026-11","dueDate":"2026-11-25","value":92.75,"status":"open"}],
         "tasks":[{"id":task,"clientId":b,"title":"Enviar extrato","category":"Documental","status":"pending","notes":"INTERNO TESTE","dueDate":"2026-11-25"}],
         "cash":[{"id":"recebimento-01","clientId":b,"kind":"receipt","date":"2026-11-18","value":140,"invoiceId":"nota-brisa"}],
         "fees":[{"id":"honorario-01","clientId":b,"competence":"2026-11","expected":200,"paid":150}],
         "invoices":[{"id":"nota-brisa","clientId":b,"competence":"2026-11","number":"001","status":"issued","value":500}]}
    rev = 0
    def save():
        nonlocal rev
        rev = rpc("clyriva_commit", admin, {"p_workspace":w,"p_expected":rev,"p_vault":None})
    save()
    def invite(company,email):
        invitation=op("admin-invite",admin,{"clientId":company,"email":email})
        assert invitation["created"]
        session=request("POST","/auth/v1/token?grant_type=password",ANON,
                        {"email":email,"password":invitation["temporaryPassword"]})
        return session["access_token"]
    alice=invite(a,"cliente-a@example.test")
    b_mail="cliente-b@example.test"
    bob=invite(b,b_mail)
    # Só registrar e consultar no banco descartável. Este endereço fictício nunca recebe um envio.
    endpoint="https://fcm.googleapis.com/fcm/send/clyriva-local-device"
    sub={"endpoint":endpoint,"keys":{"p256dh":"a"*87,"auth":"b"*22}}
    op("client-subscribe",alice,{"subscription":sub,"showAmount":False})
    assert op("client-push-status",alice,{"endpoint":endpoint})["enabled"]
    assert not op("client-push-status",bob,{"endpoint":endpoint})["enabled"]
    test_id = "19488902-c618-4652-acc8-3726cd5fe08d"
    op("client-test", bob, {"endpoint":endpoint,"testId":test_id}, (404,))
    op("client-test", alice, {"endpoint":endpoint,"testId":"invalido"}, (400,))
    op("client-unsubscribe",alice,{"endpoint":endpoint})
    assert not op("client-push-status",alice,{"endpoint":endpoint})["enabled"]
    assert rpc("clyriva_load", alice) is None
    for actor in (alice, ANON):
        rpc("clyriva_commit", actor, {"p_expected":0,"p_workspace":w,"p_vault":None}, (401,403))
    op("admin-internal-overview",alice,expected=(403,))
    params={"entityType":"tax","entityId":tax}
    def publish(source):
        preview = op("admin-internal-list",admin,{**source,"preview":True})
        return op("admin-internal-publish",admin,{**source,"expectedSource":preview["source"],"attachmentIds":[f["id"] for f in preview["attachments"]]})
    file1=upload(admin,params,"das.pdf")
    assert not op("client-list",alice)["notices"]
    first=publish(params)
    assert first["noticeId"] == publish(params)["noticeId"]
    seen=op("client-list",alice)
    assert len(seen["notices"])==len(seen["attachments"])==1
    public_file=seen["attachments"][0]["id"]
    assert download(alice,public_file)==PDF
    assert not op("client-list",bob)["notices"]
    op("client-attachment-link",bob,{"attachmentId":public_file},(404,))
    preview=op("admin-internal-list",admin,{**params,"preview":True})
    file2=upload(admin,params,"revisao.pdf")
    op("admin-internal-sync",admin,params)
    assert len(op("client-list",alice)["attachments"])==1
    op("admin-internal-publish",admin,{**params,"expectedSource":preview["source"],"attachmentIds":[file1]},(409,))
    record=next(r for r in op("admin-internal-overview",admin,{"clientId":a})["records"] if r["id"]==tax)
    assert (record["status"],record["files"],record["privateFiles"])==("active",2,1)
    publish(params)
    assert len(op("client-list",alice)["attachments"])==2
    op("admin-internal-remove",admin,{"attachmentId":file1})
    op("client-attachment-link",alice,{"attachmentId":public_file},(404,))
    w["taxes"][0].update(status="paid",paidAt="2026-11-20"); save()
    assert op("client-list",alice)["notices"][0]["status"]=="paid"
    conflict=rpc("clyriva_commit",admin,{"p_expected":rev-1,"p_workspace":w,"p_vault":None},(409,))
    assert conflict["code"]=="PT409" and rpc("clyriva_load",admin)["revision"]==rev
    w["taxes"][0].update(status="open",paidAt="",value=95); save()
    bill=op("client-list",alice)["notices"][0]
    assert bill["status"]=="active" and bill["amount_cents"]==9500
    tp={"entityType":"task","entityId":task}
    upload(admin,tp,"pendencia.pdf"); publish(tp)
    brisa=op("client-list",bob)
    assert "INTERNO TESTE" not in json.dumps(brisa)
    task_notice=brisa["notices"][0]["id"]
    op("admin-archive",admin,{"noticeId":task_notice})
    w["tasks"][0]["title"]="Conferir extrato alterado"; save()
    op("admin-internal-sync",admin,tp)
    assert not op("client-list",bob)["notices"]
    # Exportação da carteira e recuperação de uma revisão são operações distintas dos objetos do Storage.
    backup=json.loads(json.dumps(rpc("clyriva_load",admin)["data"]))
    old_rev=rev
    w["clients"]=[w["clients"][1]]; w["taxes"]=[]; save()
    op("client-list",alice,expected=(403,))
    rev=rpc("clyriva_restore_revision",admin,{"p_expected":rev,"p_target":old_rev})
    assert rpc("clyriva_load",admin)["data"]==backup
    op("client-list",alice,expected=(403,))
    assert any(f["id"]==file2 for f in op("admin-internal-list",admin,params)["attachments"])
    restored_bytes=download(admin,file2,"admin-internal-link")
    assert restored_bytes==PDF
    op("admin-internal-remove",admin,{"attachmentId":file2})
    restored_id=upload(admin,params,"revisao.pdf",restored_bytes)
    assert download(admin,restored_id,"admin-internal-link")==restored_bytes
    op("admin-revoke",admin,{"clientId":b,"email":b_mail})
    op("client-list",bob,expected=(403,))
    print("OK: Auth de 3 contas, RPC, 2 empresas, arquivos reais, privacidade, repetição, baixa, revogação e restauração.")


if __name__ == "__main__":
    main()
