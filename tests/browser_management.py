"""Exercise the real login, iframe, React page and revisioned save with a disposable SDK."""
from playwright.sync_api import expect, sync_playwright

from built_site import open_fixture

SDK = """
window.CLYRIVA_CONFIG={supabaseUrl:'https://example.supabase.co',supabaseAnonKey:'sb_publishable_fixture'};
const user={id:'office',email:'gestao@example.test',email_confirmed_at:'2026-01-01'};
const session={access_token:'fixture',user};
const fixture={signed:false,failNext:true,revision:3,commits:[],
    data:{version:1,clients:[],invoices:[],cash:[],fees:[],taxes:[],tasks:[]}};
window.officeFixture=fixture;
window.supabase={createClient:()=>({
  auth:{
    onAuthStateChange(){},
    signInWithPassword:async()=>{fixture.signed=true;return {error:null}},
    getUser:async()=>({data:{user:fixture.signed?user:null}}),
    getSession:async()=>({data:{session:fixture.signed?session:null}}),
    signOut:async()=>{fixture.signed=false;return {error:null}}
  },
  from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{user_id:user.id}})})})}),
  rpc:async(name,args)=>{
    if(name==='clyriva_load')return {data:{revision:fixture.revision,data:fixture.data,vault:null}};
    if(name!=='clyriva_commit')throw Error(name);
    fixture.commits.push(args.p_expected);
    if(fixture.failNext){fixture.failNext=false;return {error:{message:'Conflito simulado'}}}
    if(args.p_expected!==fixture.revision)throw Error('Revisão divergente');
    fixture.data=structuredClone(args.p_workspace);return {data:++fixture.revision};
  }
})};
"""

def suite(browser):
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))
    open_fixture(page, "", SDK)
    page.locator("#login-email").fill("gestao@example.test")
    page.locator("#login-pass").fill("senha-ficticia")
    page.locator("#auth-form button[type=submit]").click()
    frame = page.frame_locator("#admin-iframe")
    expect(frame.get_by_role("heading", level=1)).to_have_text("Sua gestão, em perspectiva")
    expect(frame.get_by_text("Comece cadastrando seu primeiro cliente")).to_be_visible()
    frame.locator("[data-page=clients]").click()
    frame.locator("[data-action=new-client]").first.click()
    frame.locator("#f-name").fill("Escritório de teste")
    frame.locator("#edit-form button[type=submit]").click()
    expect(frame.locator("#toast-root")).to_contain_text("Conflito simulado")
    expect(frame.locator(".client-card")).to_have_count(0)
    frame.locator("#edit-form button[type=submit]").click()
    expect(frame.locator(".client-card h3")).to_have_text("Escritório de teste")
    expect(page.locator("#sync-state")).to_have_text("Sincronizado")
    assert page.evaluate("officeFixture.commits") == [3, 3]
    assert page.evaluate("officeFixture.data.clients.length") == 1
    page.locator("#signout").click()
    expect(page.locator("#auth-form")).to_be_visible()
    expect(page.locator("#admin-iframe")).to_have_count(0)
    assert not errors, errors
    page.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox","--disable-dev-shm-usage"])
        suite(browser)
        browser.close()
    print("OK — login, navegação, conflito, nova tentativa, revisão e saída")
