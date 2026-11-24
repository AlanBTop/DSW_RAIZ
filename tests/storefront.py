"""Fluxo visitante -> Google/e-mail -> revisão autenticada, com API isolada por fixtures."""
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
mock=(ROOT/'tests/mock-sdk.js').read_text(encoding='utf-8').replace("cliente_carrinho:[{id:1,produto_id:137,quantidade:1}]","cliente_carrinho:state.cart")
out=ROOT/'artifacts/storefront';out.mkdir(parents=True,exist_ok=True)
results=[]
try:
    with sync_playwright() as p:
        for channel in ('msedge','chrome'):
            browser=p.chromium.launch(channel=channel)
            for width in (1440,390,360):
                context=browser.new_context(viewport={'width':width,'height':960},reduced_motion='reduce');errors=[]
                def route(r):
                    if r.request.url.endswith('/config/vendor/supabase-2.119.2.js'):r.fulfill(body=mock,content_type='text/javascript')
                    elif r.request.url.startswith(base):r.continue_()
                    else:r.abort()
                context.route('**/*',route);page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
                page.goto(base);expect(page.locator('#storeProducts .store-product')).to_have_count(12)
                assert 'login' not in page.url
                assert page.locator('#storeProducts .store-product').first.bounding_box()['y']<750
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                if channel=='msedge' and width in (1440,390):page.screenshot(path=str(out/f'catalogo-{width}.png'),full_page=True)
                featured=page.locator('#storeProducts');featured.focus();featured.press('End');page.wait_for_function('()=>document.getElementById("storeProducts").scrollLeft>0')
                featured.press('Home');page.wait_for_function('()=>document.getElementById("storeProducts").scrollLeft<=2')
                page.locator('#storeHighlightControls button').last.click();page.wait_for_function('()=>document.getElementById("storeProducts").scrollLeft>0')
                plant_rail=page.locator('#storeRail-plantas');expect(plant_rail.locator('.store-product')).to_have_count(12)
                initial=featured.evaluate('(el)=>el.scrollLeft')
                page.get_by_role('button',name='Próximos produtos de Plantas',exact=True).click();page.wait_for_function('()=>document.getElementById("storeRail-plantas").scrollLeft>0')
                assert featured.evaluate('(el)=>el.scrollLeft')==initial
                plant_rail.focus();plant_rail.press('End');expect(page.get_by_role('button',name='Próximos produtos de Plantas',exact=True)).to_be_disabled()
                assert 'login' not in page.url
                page.get_by_role('link',name='Ver catálogo completo',exact=True).click();expect(page.locator('#storeProducts .store-product')).to_have_count(12)
                page.get_by_role('button',name='Próxima',exact=True).click();expect(page.locator('#storePagination')).to_contain_text('Página 2 de 13')
                page.locator('#storeCategory').select_option('vasos');expect(page.locator('#storeProducts')).to_contain_text('Nenhum produto')
                page.locator('#storeQuery').fill('Cacto fora dos cem');page.get_by_role('button',name='Buscar',exact=True).click()
                expect(page.locator('.store-product')).to_have_count(1);page.get_by_role('link',name='Ver produto',exact=True).click()
                expect(page.get_by_role('heading',name='Cacto fora dos cem',exact=True)).to_be_visible()
                expect(page.locator('.store-description').get_by_text('Descrição de teste',exact=True)).to_be_visible()
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                if channel=='msedge' and width==390:page.screenshot(path=str(out/'produto-390.png'),full_page=True)
                page.get_by_role('button',name='Adicionar ao carrinho').click();expect(page.locator('#storeCartCount')).to_have_text('1')
                page.reload();expect(page.locator('#storeCartCount')).to_have_text('1')
                page.get_by_role('link',name='Carrinho 1').click();expect(page.get_by_role('heading',name='Seu carrinho',exact=True)).to_be_visible()
                expect(page.get_by_role('link',name='Cacto fora dos cem',exact=True)).to_be_visible()
                assert not page.evaluate('window.__qa.rpc.some(r=>/checkout/.test(r.name))')
                page.get_by_role('button',name='Continuar para comprar').click();expect(page).to_have_url(base+'login.html?role=cliente&modo=online')
                expect(page.locator('#btnGoogle')).to_be_visible();expect(page.locator('#accessMessage')).to_contain_text('Sua seleção está salva')
                if channel=='msedge' and width==390:page.screenshot(path=str(out/'login-google-390.png'),full_page=True)
                page.locator('#btnGoogle').click();page.wait_for_function('window.__qa.oauth')
                oauth=page.evaluate('window.__qa.oauth');assert oauth['provider']=='google' and oauth['options']['redirectTo']==base+'login.html?role=cliente&modo=online'
                assert page.evaluate('RaizShopping.intent().items')[0]=={'id':137,'quantity':1}
                # Mesmo callback usado pelo Google. Nenhum pedido é criado ao autenticar.
                page.evaluate("sessionStorage.setItem('qaRole','cliente')");page.reload()
                expect(page).to_have_url(base+'cliente/index.html?modo=online#carrinho')
                expect(page.locator('#carrinho')).to_contain_text('Cacto fora dos cem')
                expect(page.locator('.raiz-feedback')).to_have_text('')
                calls=page.evaluate('window.__qa.rpc')
                assert [r['args']['p_quantidade'] for r in calls if r['name']=='raiz_item_cliente']==[2]
                assert not any('checkout' in r['name'] for r in calls)
                assert page.evaluate('RaizShopping.intent()') is None
                assert page.evaluate('RaizShopping.cart()')==[]
                page.reload();expect(page.locator('#carrinho')).to_be_visible();assert not page.evaluate("window.__qa.rpc.some(r=>r.name==='raiz_item_cliente')")
                # Compra direta também exige login e guarda quantidade; ID inválido tem retorno útil.
                page.evaluate("sessionStorage.removeItem('qaRole')");page.goto(base+'produto.html?id=1')
                page.get_by_label('Quantidade',exact=True).fill('3');page.get_by_role('button',name='Comprar agora').click()
                expect(page).to_have_url(base+'login.html?role=cliente&modo=online');expect(page.locator('#btnGoogle')).to_be_visible();page.wait_for_function('() => Boolean(window.RaizShopping)');assert page.evaluate('RaizShopping.intent().items')==[{'id':1,'quantity':3}]
                page.goto(base+'produto.html?id=9999');expect(page.get_by_role('heading',name='Produto não encontrado')).to_be_visible()
                page.goto(base+'produto.html?id=abc');expect(page.get_by_role('link',name='Explorar produtos')).to_be_visible()
                assert not errors,errors
                results.append({'browser':channel,'width':width,'public_catalog':True,'carousels_buttons_keyboard_independence':True,'public_product':True,'guest_cart':True,'google_redirect':True,'resume_without_order':True,'errors':errors})
                context.close()
            # Primeira compra: conta Google nova precisa informar o endereço.
            context=browser.new_context();context.route('**/*',route);page=context.new_page()
            page.goto(base);expect(page.locator('.store-product').first).to_be_visible()
            page.evaluate("RaizShopping.setIntent([{id:2,quantity:1}]);sessionStorage.setItem('qaRole','cliente');sessionStorage.setItem('qaNewCustomer','1')")
            page.goto(base+'login.html?role=cliente&modo=online');expect(page).to_have_url(base+'cliente/index.html?modo=online#conta')
            expect(page.locator('#conta')).to_contain_text('Sua seleção está salva')
            assert page.evaluate('RaizShopping.intent()') is not None
            page.get_by_label('Endereço completo',exact=True).fill('Rua de teste, 123, Cáceres - MT');page.get_by_role('button',name='Salvar endereço',exact=True).click()
            expect(page.locator('#carrinho')).to_be_visible();expect(page).to_have_url(base+'cliente/index.html?modo=online#carrinho')
            expect(page.locator('#carrinho')).to_contain_text('Planta 002')
            assert page.evaluate('RaizShopping.intent()') is None
            assert not page.evaluate('window.__qa.rpc.some(r=>/checkout/.test(r.name))')
            # Mudança de estoque não transfere itens nem perde a orientação ao cliente.
            page.evaluate('RaizShopping.setIntent([{id:3,quantity:99}])');page.reload()
            expect(page.locator('#carrinho')).to_contain_text('excede o estoque')
            assert not page.evaluate("window.__qa.rpc.some(r=>r.name==='raiz_item_cliente')")
            context.close();results.append({'browser':channel,'new_customer_address':'passed','stock_revalidation':'passed'})
            browser.close()
    (ROOT/'tests/resultado_storefront.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(results,ensure_ascii=True))
finally:server.shutdown();thread.join();server.server_close()
