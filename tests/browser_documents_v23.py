"""Browser integration with simulated Supabase; no real customer data touched."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
FAKE = '''
window.CLYRIVA_CONFIG={supabaseUrl:'https://example.supabase.co',supabaseAnonKey:'fake-key'};
window.__calls=[];
window.__notice={id:'77777777-7777-4777-8777-777777777777',client_id:'c1',notice_type:'DAS',title:'DAS novembro',body:'Guia fictícia',due_date:'2026-11-23',amount_cents:8250,reminder_enabled:true,status:'active',created_at:'2026-11-20T12:00:00Z'};
window.__attachments=[{id:'55555555-5555-4555-8555-555555555555',notice_id:window.__notice.id,original_name:'das-ficticio.pdf',mime_type:'application/pdf',size_bytes:2456,created_at:'2026-11-20T12:00:00Z'}];
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:{access_token:'fake'}}}),getUser:async()=>({data:{user:{id:'fake'}}}),signInWithPassword:async()=>({error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({error:null})},
 from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{user_id:'fake'}})})})}),
 storage:{from:()=>({uploadToSignedUrl:async(...args)=>{window.__calls.push({action:'signed-upload',args});return {error:null}}})}
})};
window.fetch=async(url,opt={})=>{
 const match=String(url).match(/clyriva-client\\/(admin|client)-([a-z-]+)/);const action=match?.[2];const kind=match?.[1];
 const body=JSON.parse(opt.body||'{}');window.__calls.push({action,kind,body});let out={ok:true};
 if(action==='list'&&kind==='admin')out={ok:true,companies:[{id:'c1',name:'Empresa Fictícia',status:'active'}],grants:[],notices:[window.__notice],attachments:window.__attachments};
 if(action==='list'&&kind==='client')out={ok:true,companies:[{admin_id:'a1',client_id:'c1',company:'Empresa Fictícia'}],notices:[{...window.__notice,admin_id:'a1'}],attachments:window.__attachments};
 if(action==='attachment-link')out={ok:true,url:'https://example.supabase.co/storage/v1/object/sign/example/arquivo.pdf?token=FAKE',expiresIn:60};
 if(action==='attachment-start')out={ok:true,attachmentId:'99999999-9999-4999-8999-999999999999',path:'fake/private.pdf',token:'FAKE'};
 if(action==='attachment-complete')out={ok:true};
 if(action==='attachment-remove')window.__attachments=[];
 return new Response(JSON.stringify(out),{status:200,headers:{'content-type':'application/json'}});
}
'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for size in [390,1366]:
  ctx=browser.new_context(viewport={'width':size,'height':800});page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content((ROOT/'avisos-admin.html').read_text());page.add_script_tag(content=FAKE);page.add_script_tag(content=(ROOT/'avisos-admin.js').read_text())
  page.locator('#admin-workspace:not(.hidden)').wait_for(timeout=8000)
  assert page.locator('#charge-attachment').count()==1
  assert page.get_by_text('das-ficticio.pdf').count()>=1
  assert page.get_by_role('button',name='Adicionar documento').count()==1
  assert page.locator('#notices-list button').filter(has_text='Visualizar').count()==1
  assert page.locator('#notices-list button').filter(has_text='Baixar').count()==1
  # Teste de upload de arquivo usando assinatura simulada, sem alterar o banco.
  page.locator('#notices-list button').filter(has_text='Adicionar documento').click()
  page.locator('#notices-list input[type=file]').set_input_files({'name':'guia-ficticia.pdf','mimeType':'application/pdf','buffer':b'%PDF-1.4\nFicticio'})
  page.wait_for_function("window.__calls.some(c=>c.action==='attachment-complete')",timeout=8000)
  routes=[c['action'] for c in page.evaluate('window.__calls')]
  assert routes.index('attachment-start')<routes.index('signed-upload')<routes.index('attachment-complete'),routes
  assert not errors,errors
  print('PASS ADMIN',size,'existing attachment visible, upload/preview/download controls')
  page.close();page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content((ROOT/'cliente.html').read_text());page.add_script_tag(content=FAKE);page.add_script_tag(content=(ROOT/'cliente.js').read_text())
  page.locator('#client-area:not(.hidden)').wait_for(timeout=8000)
  assert page.get_by_text('das-ficticio.pdf').count()>=1
  assert page.get_by_role('button',name='Visualizar').count()==1
  assert page.get_by_role('button',name='Baixar').count()==1
  assert not errors,errors
  print('PASS CLIENT',size,'private attachment visible as controls under notice')
  ctx.close()
 browser.close()
