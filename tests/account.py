"""Perfil convencional, retorno do login e saída, com contas de fixture isoladas."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
import importlib.util, json, threading
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('serve',ROOT/'scripts/serve.py');serve=importlib.util.module_from_spec(spec);spec.loader.exec_module(serve)
class Quiet(serve.Handler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'dist')))
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();base=f'http://127.0.0.1:{server.server_port}/'
mock=(ROOT/'tests/mock-sdk.js').read_text(encoding='utf-8')
mock=mock.replace("email:role()+'@teste.invalid'","email:role()+'@teste.invalid',user_metadata:{full_name:'Marina do teste',telefone:'(65) 99999-0000'},app_metadata:{provider:'google',providers:['google']}")
mock=mock.replace("endereco:'Endereço fictício'","endereco:state.address||'Endereço fictício'")
mock=mock.replace("else if(name==='raiz_endereco')sessionStorage.removeItem('qaNewCustomer');","else if(name==='raiz_endereco'){state.address=args.p_endereco;sessionStorage.removeItem('qaNewCustomer');}")
out=ROOT/'artifacts/account';out.mkdir(parents=True,exist_ok=True)
results=[]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge')
        for width in (1440,390,320):
            context=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce')
            def route(r):
                if r.request.url.endswith('/config/vendor/supabase-2.119.2.js'):r.fulfill(body=mock,content_type='text/javascript')
                elif r.request.url.startswith(base):r.continue_()
                else:r.abort()
            context.route('**/*',route);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(base+'cliente/index.html?modo=online#conta')
            expect(page).to_have_url(base+'login.html?role=cliente&modo=online&destino=conta&expirada=1')
            page.evaluate("sessionStorage.setItem('qaNewCustomer','1')")
            page.locator('#inputEmail').fill('cliente@teste.invalid');page.locator('#inputSenha').fill('SenhaDeTeste123!');page.locator('#btnSubmit').click()
            expect(page).to_have_url(base+'cliente/index.html?modo=online#conta')
            expect(page.locator('#account-details')).to_contain_text('Marina do teste');expect(page.locator('#account-details')).to_contain_text('cliente@teste.invalid')
            expect(page.locator('#account-security')).to_contain_text('Google');expect(page.locator('.raiz-feedback')).to_have_text('')
            expect(page.locator('.account-connected')).to_have_text('Conta conectada')
            expect(page.locator('#conta h1')).to_have_text('Minha conta')
            expect(page.locator('.raiz-content > section:visible')).to_have_count(1)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            page.screenshot(path=str(out/f'perfil-{width}.png'),full_page=True)
            page.locator('.account-menu button').filter(has_text='Endereço de entrega').click();field=page.get_by_label('Endereço completo',exact=True)
            field.fill('abc');page.get_by_role('button',name='Salvar endereço',exact=True).click()
            assert not page.evaluate("__qa.rpc.some(r=>r.name==='raiz_endereco')")
            field.fill('Rua de teste, 123, Centro, Cáceres - MT');page.get_by_role('button',name='Salvar endereço',exact=True).click()
            expect(page.locator('.raiz-feedback')).to_have_text('Endereço de entrega salvo.')
            expect(field).to_have_value('Rua de teste, 123, Centro, Cáceres - MT')
            page.get_by_role('button',name='Sair da conta',exact=True).click();expect(page.locator('#authForm')).to_be_visible();assert 'login.html?' in page.url
            page.goto(base+'cliente/index.html?modo=online#conta');expect(page).to_have_url(base+'login.html?role=cliente&modo=online&destino=conta&expirada=1')
            # O callback Google permanece na URL já permitida; a seção volta por estado local seguro.
            page.locator('#btnGoogle').click();page.wait_for_function('()=>Boolean(window.__qa.oauth)')
            assert page.evaluate('__qa.oauth.options.redirectTo')==base+'login.html?role=cliente&modo=online'
            page.evaluate("sessionStorage.setItem('qaRole','cliente')");page.goto(base+'login.html?role=cliente&modo=online')
            expect(page).to_have_url(base+'cliente/index.html?modo=online#conta');expect(page.locator('#conta')).to_be_visible()
            assert page.evaluate("sessionStorage.getItem('raiz_auth_destination_v1')") is None
            assert not errors,errors
            context.close();results.append({'width':width,'identity_without_delivery_profile':True,'address_validation_save':True,'login_returns_to_account':True,'google_returns_to_account':True,'sign_out_guard':True,'errors':errors})
        browser.close()
    (ROOT/'tests/resultado_account.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(results,ensure_ascii=True))
finally:server.shutdown();thread.join();server.server_close()
