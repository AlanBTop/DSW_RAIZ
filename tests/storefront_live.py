"""Catálogo real anônimo e autorização Google, sem efetuar login ou gravar no banco."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from urllib.parse import urlparse,urlencode
import argparse,importlib.util,threading,json
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1]
args=argparse.ArgumentParser();args.add_argument('--url');args=args.parse_args()
server=thread=None
if args.url:base=args.url.rstrip('/')+'/'
else:
    spec=importlib.util.spec_from_file_location('serve',ROOT/'scripts/serve.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    class Quiet(module.Handler):
        def log_message(self,*args):pass
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'dist')))
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();base=f'http://127.0.0.1:{server.server_port}/'
out=ROOT/'artifacts/storefront';out.mkdir(parents=True,exist_ok=True)
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge');context=browser.new_context(viewport={'width':390,'height':844})
        page=context.new_page();errors=[];bad=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('response',lambda r:bad.append({'url':r.url.split('?')[0],'status':r.status}) if '.supabase.co/rest/' in r.url and r.status>=400 else None)
        page.goto(base,wait_until='domcontentloaded');expect(page.locator('.store-product').first).to_be_visible(timeout=30000)
        count=page.locator('.store-product').count();assert count>0 and 'login' not in page.url
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        page.screenshot(path=str(out/('publicado-390.png' if args.url else 'catalogo-real-390.png')),full_page=True)
        product=page.locator('.store-product-name').first.inner_text();page.get_by_role('link',name='Ver produto',exact=True).first.click()
        expect(page.get_by_role('heading',name=product,exact=True)).to_be_visible(timeout=30000)
        assert 'login' not in page.url
        page.get_by_role('button',name='Adicionar ao carrinho').click();expect(page.locator('#storeCartCount')).to_have_text('1')
        page.get_by_role('link',name='Carrinho 1').click();expect(page.get_by_role('link',name=product,exact=True)).to_be_visible(timeout=30000)
        page.get_by_role('button',name='Continuar para comprar').click();expect(page.locator('#btnGoogle')).to_be_visible(timeout=30000)
        assert page.url.startswith(base+'login.html?role=cliente&modo=online')
        expect(page.locator('#accessMessage')).to_contain_text('Sua seleção está salva')
        cfg=page.evaluate('({url:RaizEnvironment.supabaseUrl,key:RaizEnvironment.publishableKey})')
        settings=context.request.get(cfg['url']+'/auth/v1/settings',headers={'apikey':cfg['key']});assert settings.ok and settings.json()['external']['google'] is True
        oauth=context.request.get(cfg['url']+'/auth/v1/authorize?'+urlencode({'provider':'google','redirect_to':base+'login.html?role=cliente&modo=online'}),max_redirects=0)
        assert oauth.status in (302,303)
        destination=urlparse(oauth.headers['location']);assert destination.hostname=='accounts.google.com'
        assert not errors and not bad,{'errors':errors,'bad':bad}
        result={'url':base,'anonymous_catalog_cards':count,'product_details':'public','guest_cart':'passed','login_only_at_purchase':'passed','google_button':'visible','google_provider':True,'google_authorization_host':destination.hostname,'database_writes':0,'errors':errors}
        (ROOT/'tests'/('resultado_storefront_publicado.json' if args.url else 'resultado_storefront_real.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps(result,ensure_ascii=True));context.close();browser.close()
finally:
    if server:server.shutdown();thread.join();server.server_close()
