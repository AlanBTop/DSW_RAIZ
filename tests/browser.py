"""Navegadores reais, API substituída por fixtures. Não testa Supabase remoto."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
import importlib.util,threading,json
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('serve',ROOT/'scripts/serve.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class Quiet(module.Handler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'dist')))
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();base=f'http://127.0.0.1:{server.server_port}/'
mock=(ROOT/'tests/mock-sdk.js').read_text(encoding='utf-8')
results=[]
def context(browser,role=None,width=1280):
    c=browser.new_context(viewport={'width':width,'height':900})
    if role:c.add_init_script("if(!sessionStorage.getItem('qaStarted')){sessionStorage.setItem('qaRole',"+json.dumps(role)+");sessionStorage.setItem('qaStarted','1');}")
    def route(r):
        if r.request.url.endswith('/config/vendor/supabase-2.119.2.js'):r.fulfill(body=mock,content_type='text/javascript')
        elif r.request.url.endswith('/config/web-access.js'):
            body=(ROOT/'dist/config/web-access.js').read_text(encoding='utf-8').replace('deny(role, authError(error));',"window.__qaFatal=String(error.stack);deny(role, authError(error));")
            r.fulfill(body=body,content_type='text/javascript')
        elif r.request.url.startswith(base):r.continue_()
        else:r.abort()
    c.route('**/*',route);return c
try:
    with sync_playwright() as p:
        for channel in ('msedge','chrome'):
            browser=p.chromium.launch(channel=channel)
            c=context(browser);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            for role in ('cliente','vendedor','entregador','admin'):
                page.goto(base+role+'/?modo=demo&fonte=local');expect(page).to_have_url(base+'login.html?role='+role+'&modo=online&expirada=1')
                assert page.evaluate('RaizDB.isDemo') is False
            page.goto(base+'login.html');page.locator('#inputSenha').fill('TesteSenha123!')
            messages=[]
            for email in ['bloqueado@teste.invalid','errado@teste.invalid']:
                page.locator('#inputEmail').fill(email);page.locator('#btnSubmit').click();expect(page.locator('#accessMessage')).to_contain_text('Não foi possível');messages.append(page.locator('#accessMessage').inner_text())
            assert messages[0]==messages[1]
            page.goto(base+'recuperar-senha.html');page.locator('#recoveryEmail').fill('qualquer@teste.invalid');page.get_by_role('button',name='Enviar link de recuperação').click();expect(page.locator('#recoveryMessage')).to_contain_text('Se houver uma conta elegível')
            response=page.goto(base+'pagina-inexistente');assert response.status==404;expect(page.get_by_role('heading',name='Página não encontrada')).to_be_visible()
            c.close()
            # SDK real servido localmente, sem credencial/sessão e sem chamadas remotas.
            real=browser.new_context();real.route('**/*',lambda r:r.continue_() if r.request.url.startswith(base) else r.abort())
            realpage=real.new_page();realpage.on('pageerror',lambda e:errors.append(str(e)))
            realpage.goto(base+'cliente/?modo=demo');expect(realpage).to_have_url(base+'login.html?role=cliente&modo=online&expirada=1');real.close()
            for role in ('cliente','vendedor','entregador','admin'):
                c=context(browser,role,width=360);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
                page.goto(base+role+'/')
                try:expect(page.locator('#privacidade')).to_be_attached()
                except:print('DIAGNOSTICO',role,page.evaluate('window.__qaFatal'),flush=True);raise
                expect(page.locator('.raiz-feedback')).to_have_text('')
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),role+' transbordou'
                if role=='cliente':
                    expect(page.locator('#carrinho')).to_contain_text('Cacto fora dos cem')
                    page.get_by_role('button',name='Filtros',exact=True).click()
                    search=page.locator('#catalogo input[type=search]');search.fill('Cacto fora dos cem');search.press('Enter');expect(page.locator('#catalogo')).to_contain_text('1 resultado(s)')
                    expect(page.locator('#catalogo')).to_contain_text('Cacto fora dos cem')
                    cached=page.evaluate("""async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('raiz_catalogo_publico_v1',1);r.onsuccess=()=>resolve(r.result)});return new Promise(resolve=>{const r=db.transaction('paginas').objectStore('paginas').getAll();r.onsuccess=()=>resolve(r.result)})}""")
                    assert cached and all(not {'endereco','telefone','usuario_id','cliente_id'}.intersection(row) for entry in cached for row in entry['data']['rows'])
                    page.locator('.customer-nav a[href="#pedidos"]').click()
                    page.get_by_label('Confirmo que recebi os produtos').check();page.get_by_role('button',name='Confirmar recebimento').click();expect(page.locator('#pedidos')).to_contain_text('Recebimento confirmado em')
                    page.locator('#pedidos summary').filter(has_text='Avaliar a loja').click();page.get_by_role('button',name='Salvar avaliação').click();expect(page.locator('.raiz-feedback')).to_contain_text('Avaliação da loja salva')
                    page.get_by_text('Cancelar este pedido',exact=True).click();page.get_by_label('Motivo do cancelamento').fill('Não preciso mais');page.get_by_role('button',name='Cancelar pedido').click();expect(page.locator('#pedidos')).to_contain_text('Cancelado')
                    page.locator('.customer-nav a[href="#privacidade"]').click()
                    page.get_by_label('Li e aceito os termos').check();page.get_by_role('button',name='Registrar aceite').click();expect(page.locator('#privacidade')).to_contain_text('Aceite dos termos registrado')
                    page.get_by_text('Solicitar exclusão da minha conta',exact=True).click();page.get_by_label('Digite EXCLUIR MINHA CONTA').fill('EXCLUIR MINHA CONTA');page.get_by_role('button',name='Enviar solicitação de exclusão').click();expect(page.locator('#privacidade')).to_contain_text('Protocolo')
                    # O RLS é coberto pela suíte SQL; aqui verificamos bloqueio de tela.
                    page.goto(base+'vendedor/');expect(page.get_by_role('alert')).to_contain_text('Sua conta tem acesso ao perfil Cliente')
                if role=='vendedor':
                    page.get_by_label('Buscar produto no estoque').fill('Cacto fora dos cem');page.locator('#produtos').get_by_role('button',name='Buscar',exact=True).click();expect(page.locator('#produtos')).to_contain_text('1 resultado(s)')
                c.close()
            c=context(browser,'cliente');page=c.new_page();page.goto(base+'recuperar-senha.html');expect(page.locator('#recoveryUpdate')).to_be_visible();page.locator('#newPassword').fill('NovaSenhaSegura123!');page.locator('#confirmPassword').fill('NovaSenhaSegura123!');page.get_by_role('button',name='Salvar nova senha').click();expect(page.locator('#recoveryMessage')).to_contain_text('Senha atualizada');c.close()
            assert not errors,errors
            results.append({'browser':channel,'viewport':360,'auth_guards':'aprovados','recovery':'aprovada','search_137':'aprovada','business_ui':'aprovada','errors':errors})
            browser.close()
    (ROOT/'tests/resultado_browser.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(results,ensure_ascii=False))
finally:server.shutdown();thread.join();server.server_close()
