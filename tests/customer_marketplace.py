"""Fluxo do comprador e revisão visual com catálogo representativo, sem contas reais."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
import importlib.util, json, re, threading
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('serve',ROOT/'scripts/serve.py')
serve=importlib.util.module_from_spec(spec);spec.loader.exec_module(serve)
class Quiet(serve.Handler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'dist')))
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
base=f'http://127.0.0.1:{server.server_port}/'
mock=(ROOT/'tests/mock-sdk.js').read_text(encoding='utf-8')
catalog=[('Costela de Adão','plantas',79.90),('Zamioculca','plantas',69.90),('Lírio da Paz','plantas',49.90),('Jiboia','plantas',39.90),('Vaso de Cerâmica Terracota','vasos',34.90),('Substrato Orgânico Premium','insumos',19.90),('Kit de Jardinagem Manual','ferramentas',59.90),('Cachepô Artesanal','vasos',44.90)]
products=[{'id':i,'nome':name,'categoria':category,'preco':price,'estoque':5,'loja_id':1,'ativo':True,'vendedor_nome':'Flora Verde','descricao':'Produto de exemplo para conferir a apresentação do catálogo.','cuidados':'Consulte os cuidados indicados pela loja.'} for i,(name,category,price) in enumerate(catalog,1)]
mock=re.sub(r'  const products=Array.from[^\n]+\n','  const products='+json.dumps(products,ensure_ascii=False)+';\n',mock)
mock=mock.replace('produto_id:137','produto_id:1').replace('const state={cart:','const state={favorites:[{id:1,produto_id:1}],cart:').replace('cliente_favoritos:[{id:1,produto_id:1}]','cliente_favoritos:state.favorites')
start=mock.index("    else if(name==='raiz_item_cliente'){")
end=mock.index("    else if(name==='raiz_checkout')",start)
mock=mock[:start]+"""    else if(name==='raiz_item_cliente'){
      if(args.p_favorito!==null){
        state.favorites=state.favorites.filter(r=>r.produto_id!==args.p_produto);
        if(args.p_favorito)state.favorites.push({id:args.p_produto,produto_id:args.p_produto});
      } else {
        state.cart=state.cart.filter(r=>r.produto_id!==args.p_produto);
        if(args.p_quantidade>0)state.cart.push({id:args.p_produto,produto_id:args.p_produto,quantidade:args.p_quantidade});
      }
    }
"""+mock[end:]
out=ROOT/'artifacts/customer-marketplace';out.mkdir(parents=True,exist_ok=True)
results=[]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge')
        for width in (1440,390,320):
            context=browser.new_context(viewport={'width':width,'height':1080},reduced_motion='reduce')
            context.add_init_script("sessionStorage.setItem('qaRole','cliente')")
            def route(r):
                if r.request.url.endswith('/config/vendor/supabase-2.119.2.js'):r.fulfill(body=mock,content_type='text/javascript')
                elif r.request.url.startswith(base):r.continue_()
                else:r.abort()
            context.route('**/*',route);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            def loaded():expect(page.locator('.raiz-feedback')).to_have_text('')
            def screen(name):
                expect(page.locator('#'+name)).to_be_visible();expect(page.locator('.raiz-content > section:visible')).to_have_count(1)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            def shot(name):page.screenshot(path=str(out/f'{name}-{width}.png'),full_page=True)
            page.goto(base+'cliente/index.html?modo=online');expect(page.locator('.shop-product')).to_have_count(8);loaded();screen('catalogo');shot('catalogo')
            assert page.locator('.shop-product').first.bounding_box()['y']<800, (width,page.locator('.shop-product').first.bounding_box())
            page.locator('.shop-sort-label select').select_option('menor-preco');loaded()
            prices=page.locator('.shop-price').all_text_contents();assert prices[0]=='R$\xa019,90',prices
            page.locator('.shop-sort-label select').select_option('maior-preco');loaded();expect(page.locator('.shop-product h3').first).to_have_text('Costela de Adão')
            page.locator('.site-categories a[data-category="vasos"]').click();expect(page.locator('.shop-product')).to_have_count(2)
            page.locator('.site-categories a[data-category=""]').click();expect(page.locator('.shop-product')).to_have_count(8)
            page.locator('.customer-nav a[href="#favoritos"]').click();expect(page.locator('.shop-product')).to_have_count(1);screen('catalogo');shot('favoritos')
            page.locator('.shop-favorite').click();expect(page.locator('#catalogo')).to_contain_text('Nenhum produto encontrado');screen('catalogo')
            page.locator('.customer-nav a[href="#catalogo"]').click();expect(page.locator('.shop-product')).to_have_count(8)
            page.locator('.shop-product').first.get_by_role('button',name='Adicionar ao carrinho',exact=True).click();expect(page.locator('#storeCartCount')).to_have_text('2')
            page.locator('#siteCart').click();screen('carrinho');shot('carrinho')
            page.locator('.customer-nav a[href="#pedidos"]').click();screen('pedidos');shot('pedidos')
            page.locator('.customer-nav a[href="#conta"]').click();screen('conta');shot('conta')
            page.go_back();screen('pedidos');page.reload();expect(page.locator('#pedidos')).to_be_visible();screen('pedidos')
            page.locator('.customer-nav a[href="#catalogo"]').click();expect(page.locator('.shop-product')).to_have_count(8)
            page.locator('.shop-product h3 a').first.click();expect(page.get_by_role('heading',name='Cachepô Artesanal',exact=True)).to_be_visible();shot('produto')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            assert not errors,errors
            context.close();results.append({'width':width,'isolated_screens':True,'sorting_categories_favorites_cart':True,'back_reload':True,'errors':errors})
        browser.close()
    (ROOT/'tests/resultado_customer_marketplace.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(results,ensure_ascii=True))
finally:server.shutdown();thread.join();server.server_close()
