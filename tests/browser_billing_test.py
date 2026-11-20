"""Testes de interface da versao 2.1 com dados ficticios e backend inteiramente simulado."""
import threading,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
checks=[]
FAKE='''
window.CLYRIVA_CONFIG={supabaseUrl:'https://example.supabase.co',supabaseAnonKey:'fake-publishable-key'};
window.__fakeNotices=[];
window.__fakeActions=[];
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:{access_token:'fake-jwt'}}}),getUser:async()=>({data:{user:{id:'fake-admin'}}}),signInWithPassword:async()=>({error:null}),signOut:async()=>({error:null})},
 from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{user_id:'fake-admin'}})})})})
})};
const orig=window.fetch;
window.fetch=async function(url,opts={}){
 const s=String(url),m=(s.match(/clyriva-client\\/(admin|client)-([a-z-]+)/)||[]),type=m[1],action=m[2];
 if(type){
 let b=JSON.parse(opts.body||'{}');window.__fakeActions.push({type,action,body:b});let out={ok:true};
 if(type==='admin'){
 if(action==='list')out={ok:true,companies:[{id:'empresa1',name:'Empresa Exemplo MEI',status:'active'}],grants:[],notices:window.__fakeNotices};
 if(action==='create-charge'){
   window.__fakeNotices.unshift({id:'99999999-8888-7777-6666-555555555555',client_id:b.clientId,notice_type:b.noticeType,title:b.title,body:b.message||'Cobrança fictícia',due_date:b.dueDate,amount_cents:8250,reminder_enabled:true,status:'active'});
   out={ok:true};
 }
 if(action==='update-charge'){
   const rec=window.__fakeNotices.find(x=>x.id===b.noticeId);Object.assign(rec,{notice_type:b.noticeType,title:b.title,body:b.message||'Nova cobrança',due_date:b.dueDate,amount_cents:9250});
 }
 if(action==='mark-paid'){window.__fakeNotices.find(x=>x.id===b.noticeId).status='paid';}
 if(action==='reopen-charge'){window.__fakeNotices.find(x=>x.id===b.noticeId).status='active';}
 if(action==='archive'){window.__fakeNotices.find(x=>x.id===b.noticeId).status='archived';}
 }else if(type==='client'){
 if(action==='list')out={ok:true,companies:[{admin_id:'admin1',client_id:'empresa1',company:'Empresa Exemplo MEI'}],notices:[{id:'x',admin_id:'admin1',client_id:'empresa1',notice_type:'DAS',title:'DAS novembro',body:'Guia DAS disponível',due_date:'2026-11-23',amount_cents:8250,status:'active',reminder_enabled:true,created_at:'2026-11-19T12:00:00Z'},{id:'y',admin_id:'admin1',client_id:'empresa1',notice_type:'Boleto',title:'Boleto honorários',body:'Registrado',due_date:'2026-11-25',amount_cents:9950,status:'paid',reminder_enabled:true,created_at:'2026-11-19T12:00:00Z'}]};
 }
 return new Response(JSON.stringify(out),{status:200,headers:{'content-type':'application/json'}});
 }
 return orig(url,opts);
};
'''
def check(name,condition):
    checks.append((name,bool(condition)))
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for label,width,height in [('desktop',1440,900),('mobile',390,844)]:
   ctx=browser.new_context(viewport={'width':width,'height':height});page=ctx.new_page();errs=[]
   page.on('pageerror',lambda e:errs.append(str(e)))
   page.set_content((ROOT/'avisos-admin.html').read_text())
   page.add_style_tag(content=(ROOT/'cliente.css').read_text())
   page.add_script_tag(content=FAKE)
   page.add_script_tag(content=(ROOT/'avisos-admin.js').read_text())
   page.wait_for_selector('#admin-workspace:not(.hidden)',timeout=8000)
   check(label+' administração abre',True)
   check(label+' form de cobrança',page.locator('#charge-form').is_visible())
   page.locator('#charge-form select[name="clientId"]').select_option('empresa1')
   page.locator('#charge-form select[name="noticeType"]').select_option('DAS')
   page.locator('#charge-form input[name="title"]').fill('DAS novembro 2026')
   page.locator('#charge-form input[name="amount"]').fill('82.50')
   page.locator('#charge-form input[name="dueDate"]').fill('2026-11-23')
   check(label+' prévia 4 dias',all(x in page.locator('#charge-preview').inner_text() for x in ['20/11/2026','21/11/2026','22/11/2026','23/11/2026','R$ 82,50']))
   page.locator('#charge-submit').click()
   page.wait_for_function('window.__fakeActions.some(a=>a.action==="create-charge")',timeout=6000)
   page.get_by_text('DAS · DAS novembro 2026').wait_for(timeout=6000)
   check(label+' cobrança salva',page.get_by_text('DAS · DAS novembro 2026').count()==1)
   check(label+' valor na lista',page.get_by_text('R$ 82,50').count()>=1)
   page.get_by_role('button',name='Editar cobrança').click()
   check(label+' edição preenche',page.locator('#charge-form input[name="amount"]').input_value()=='82.50')
   page.locator('#charge-form input[name="amount"]').fill('92.50')
   page.locator('#charge-submit').click()
   page.wait_for_function('window.__fakeActions.some(a=>a.action==="update-charge")',timeout=6000)
   page.get_by_text('R$ 92,50').wait_for(timeout=6000)
   check(label+' edição salva',page.get_by_text('R$ 92,50').count()>=1)
   page.on('dialog',lambda dialog:dialog.accept())
   page.get_by_role('button',name='Marcar como pago').click()
   page.get_by_text('Pago',exact=True).wait_for(timeout=6000)
   check(label+' marcar como pago',page.get_by_text('Pago',exact=True).count()>=1)
   page.get_by_role('button',name='Reabrir cobrança').click()
   page.get_by_role('button',name='Marcar como pago').wait_for(timeout=6000)
   check(label+' reabrir',page.get_by_role('button',name='Marcar como pago').count()==1)
   check(label+' sem JS errors',not errs)
   page.close();page=ctx.new_page();errs=[]
   page.on('pageerror',lambda e:errs.append(str(e)))
   page.set_content((ROOT/'cliente.html').read_text())
   page.add_script_tag(content=FAKE)
   page.add_script_tag(content=(ROOT/'cliente.js').read_text())
   page.wait_for_selector('#client-area:not(.hidden)',timeout=6000)
   check(label+' área cliente abre',page.locator('#client-area').is_visible())
   check(label+' valores separados',page.get_by_text('R$ 82,50').count()==1 and page.get_by_text('R$ 99,50').count()==1)
   check(label+' histórico pago',page.get_by_text('Pago',exact=True).count()==1)
   check(label+' opção privacidade',page.locator('#client-show-amount').is_checked())
   check(label+' sem JS errors no cliente',not errs)
   if errs:print('CLIENT_JS_ERRORS:',errs[:5])
   ctx.close()
  browser.close()
finally:
 pass
print('BROWSER_CHECKS',len(checks),'PASSED',sum(ok for _,ok in checks))
for k,v in checks:print('OK' if v else 'FAIL',k)
if any(not v for k,v in checks):sys.exit(1)
