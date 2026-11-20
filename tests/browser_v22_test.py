"""Cenarios de auditoria para filtros, privacidade e credenciais sem servidor real."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
FAKE='''
window.CLYRIVA_CONFIG={supabaseUrl:'https://example.supabase.co',supabaseAnonKey:'fake-key'};
window.__actions=[];window.__credentials='SECURE-FAKE-PASS-123456789';
window.__records=[
 {id:'77777777-7777-4777-8777-777777777777',client_id:'c1',notice_type:'DAS',title:'DAS novembro',body:'Guia do Simples',amount_cents:12000,due_date:'2026-11-23',status:'active',reminder_enabled:true,created_at:'2026-11-20T10:00:00Z'},
 {id:'88888888-8888-4888-8888-888888888888',client_id:'c1',notice_type:'Boleto',title:'Boleto pago',body:'Quitado',amount_cents:2000,due_date:'2026-11-25',status:'paid',reminder_enabled:true,created_at:'2026-11-20T10:00:00Z'}
];
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:{access_token:'fake'}}}),getUser:async()=>({data:{user:{id:'fake-admin'}}}),signInWithPassword:async()=>({error:null}),signOut:async()=>({error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
 from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{user_id:'fake-admin'}})})})})
})};
window.fetch=async function(url,opt={}){let type=(String(url).match(/clyriva-client\\/(admin|client)-([a-z-]+)/)||[]);let b=JSON.parse(opt.body||'{}'),route=type[2];window.__actions.push({route,b});let out={ok:true};
 if(route==='list'&&type[1]==='admin')out={ok:true,companies:[{id:'c1',name:'Minha Empresa',status:'active'}],grants:[{client_id:'c1',email:'cliente@example.test',enabled:true}],notices:window.__records};
 if(route==='list'&&type[1]==='client')out={ok:true,companies:[{admin_id:'u1',client_id:'c1',company:'Minha Empresa'}],notices:window.__records.map(x=>({...x,admin_id:'u1'}))};
 if(route==='reset-access')out={ok:true,email:b.email,temporaryPassword:window.__credentials,loginUrl:'https://example.test/cliente.html'};
 if(route==='create-charge')out={ok:true,noticeId:'new'};
 return new Response(JSON.stringify(out),{status:200,headers:{'content-type':'application/json'}});
};
'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for label,width in [('desktop',1366),('mobile',390)]:
  context=browser.new_context(viewport={'width':width,'height':850});page=context.new_page();errors=[]
  page.on('pageerror',lambda e: errors.append(str(e)))
  page.set_content((ROOT/'avisos-admin.html').read_text())
  page.add_style_tag(content=(ROOT/'cliente.css').read_text())
  page.add_script_tag(content=FAKE)
  page.add_script_tag(content=(ROOT/'avisos-admin.js').read_text())
  page.locator('#admin-workspace:not(.hidden)').wait_for(timeout=8000)
  assert page.locator('#billing-summary .summary-item').count()==4,label+' summary'
  assert page.locator('#notices-list .notice-card').count()==2,label+' all records'
  page.locator('#billing-filter').select_option('paid')
  assert page.locator('#notices-list .notice-card').count()==1,label+' paid filter'
  page.locator('#billing-filter').select_option('pending')
  assert page.locator('#notices-list .notice-card').count()==1,label+' pending filter'
  page.on('dialog',lambda d:d.accept())
  page.get_by_role('button',name='Redefinir senha do cliente').click()
  page.locator('#invite-result').get_by_text('Senha temporária gerada.').wait_for(timeout=8000)
  assert 'SECURE-FAKE-PASS' not in page.locator('body').inner_text(),label+' plaintext password exposed'
  assert page.get_by_text('Copiar credenciais').count()==1,label+' copy flow'
  assert not errors,(label,errors)
  print('PASS',label,'admin metrics, paid/pending filters, admin reset and secret hidden')
  page.close();page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content((ROOT/'cliente.html').read_text());page.add_script_tag(content=FAKE);page.add_script_tag(content=(ROOT/'cliente.js').read_text())
  page.locator('#client-area:not(.hidden)').wait_for(timeout=8000)
  assert page.locator('#client-billing-overview .summary-item').count()==4,label+' client summary'
  assert not page.locator('#client-show-amount').is_checked(),label+' optin by default'
  assert page.locator('#client-notices .notice-card').count()==1,label+' only pending visible'
  page.locator('#client-notice-filter').select_option('paid');page.locator('#client-notices .notice-card').first.wait_for()
  assert page.locator('#client-notices .notice-card').count()==1,label+' paid filter'
  assert not errors,(label,errors)
  print('PASS',label,'client metrics, opt-in and paid filter')
  context.close()
 browser.close()
