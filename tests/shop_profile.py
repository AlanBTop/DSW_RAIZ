"""Perfil público do vendedor: acesso só no detalhe, isolamento da loja e navegação."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
import importlib.util,json,re,threading
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('serve',ROOT/'scripts/serve.py');serve=importlib.util.module_from_spec(spec);spec.loader.exec_module(serve)
class Quiet(serve.Handler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'dist')))
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();base=f'http://127.0.0.1:{server.server_port}/'
products=[{'id':i,'nome':'Produto da loja '+str(i),'categoria':'plantas' if i<14 else 'vasos','vendedor_nome':'Loja Verde','loja_id':7,'preco':10+i,'estoque':5,'ativo':True,'descricao':'Descrição do anúncio','cuidados':'Cuidados do produto'} for i in range(1,16)]
products.extend([{'id':101,'nome':'Especial de outra loja','categoria':'vasos','vendedor_nome':'Loja Verde','loja_id':8,'preco':1,'estoque':5,'ativo':True}, {'id':102,'nome':'Anúncio pausado','categoria':'plantas','vendedor_nome':'Loja Verde','loja_id':7,'preco':1,'estoque':5,'ativo':False}, {'id':200,'nome':'Produto sem vínculo','categoria':'plantas','vendedor_nome':'Sem loja','loja_id':None,'preco':10,'estoque':5,'ativo':True}])
mock=(ROOT/'tests/mock-sdk.js').read_text(encoding='utf-8');mock=re.sub(r'  const products=Array.from[^\n]+\n','  const products='+json.dumps(products,ensure_ascii=False)+';\n',mock)
out=ROOT/'artifacts/shop-profile';out.mkdir(parents=True,exist_ok=True);results=[]
try:
    with sync_playwright() as p:
        for channel in ('msedge','chrome'):
            browser=p.chromium.launch(channel=channel)
            for width in (1440,390,320):
                context=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce')
                def route(r):
                    if r.request.url.endswith('/config/vendor/supabase-2.119.2.js'):r.fulfill(body=mock,content_type='text/javascript')
                    elif r.request.url.startswith(base):r.continue_()
                    else:r.abort()
                context.route('**/*',route);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                def no_overflow():assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                def shot(name):
                    if channel=='msedge':page.screenshot(path=str(out/f'{name}-{width}.png'),full_page=True)
                page.goto(base);expect(page.locator('.store-product').first).to_be_visible();expect(page.locator('a[href*="loja.html"]')).to_have_count(0)
                page.goto(base+'produto.html?id=1');button=page.get_by_role('link',name='Ver perfil do vendedor',exact=True);expect(button).to_be_visible();expect(button).to_have_attribute('href','/loja.html?id=7');shot('produto')
                button.click();expect(page.locator('.shop-profile-hero h1')).to_have_text('Loja Verde');expect(page.locator('#shopProducts .store-product')).to_have_count(12);expect(page.locator('.shop-profile-caption')).to_contain_text('15 anúncio(s)')
                expect(page.locator('#shop-produtos')).not_to_contain_text('Especial de outra loja');expect(page.locator('#shop-produtos')).not_to_contain_text('Anúncio pausado');expect(page.locator('a.buyer-seller-profile')).to_have_count(0);no_overflow();shot('loja')
                page.get_by_role('link',name='Sobre a loja',exact=True).click();expect(page.locator('#shop-sobre')).to_be_visible();expect(page.locator('#shop-produtos')).to_be_hidden();expect(page.locator('#shop-sobre')).to_contain_text('Loja Verde vende seus produtos');no_overflow();shot('sobre')
                page.locator('.shop-profile-category-links').get_by_role('link',name='Vasos · 2',exact=True).click();expect(page.locator('#shopProducts .store-product')).to_have_count(2)
                page.get_by_label('Ordenar por').select_option('menor-preco');expect(page.locator('#shopProducts .store-product-name').first).to_have_text('Produto da loja 14')
                page.locator('#shopQuery').fill('Especial de outra loja');page.locator('.shop-profile-search button').click();expect(page.locator('#shopProducts')).to_contain_text('Nenhum produto nesta seleção')
                page.locator('#shopQuery').fill('');page.locator('.shop-profile-search button').click();page.get_by_label('Categoria',exact=True).select_option('');expect(page.locator('#shopProducts .store-product')).to_have_count(12)
                page.get_by_role('button',name='Próxima',exact=True).click();expect(page.locator('#shopProducts .store-product')).to_have_count(3);expect(page.locator('.store-pagination')).to_contain_text('Página 2 de 2')
                page.locator('#shopProducts').get_by_role('button',name='Adicionar',exact=True).first.click();expect(page.locator('#storeCartCount')).to_have_text('1')
                page.locator('#shopProducts').get_by_role('link',name='Ver produto',exact=True).first.click();expect(page.get_by_role('link',name='Ver perfil do vendedor',exact=True)).to_have_attribute('href','/loja.html?id=7');expect(page.locator('#storeCartCount')).to_have_text('1');no_overflow()
                page.goto(base+'produto.html?id=200');expect(page.get_by_role('heading',name='Produto sem vínculo',exact=True)).to_be_visible();expect(page.get_by_role('link',name='Ver perfil do vendedor',exact=True)).to_have_count(0)
                for value in ('abc','-1','9999'):
                    page.goto(base+'loja.html?id='+value);expect(page.get_by_role('heading',name='Loja indisponível',exact=True)).to_be_visible();expect(page.locator('.store-product')).to_have_count(0)
                page.goto(base+'loja.html?id=7#sobre');expect(page.locator('#shop-sobre')).to_be_visible();page.reload();expect(page.locator('#shop-sobre')).to_be_visible()
                page.evaluate("sessionStorage.setItem('qaRole','cliente')");page.goto(base+'cliente/index.html?modo=online');expect(page.locator('#privacidade')).to_be_attached();expect(page.locator('#catalogo a[href*="loja.html"]')).to_have_count(0)
                assert not errors,errors
                context.close();results.append({'browser':channel,'width':width,'button_only_on_product_details':True,'store_id_isolation':True,'about_products_search_sort_pagination':True,'guest_cart':True,'invalid_store':True,'errors':errors})
            browser.close()
    (ROOT/'tests/resultado_shop_profile.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(results,ensure_ascii=True))
finally:server.shutdown();thread.join();server.server_close()
