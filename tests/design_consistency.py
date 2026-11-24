"""Consistência visual e navegação entre vitrine e conta, com API de teste isolada."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
import importlib.util
import json
import threading
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('serve', ROOT / 'scripts/serve.py')
serve = importlib.util.module_from_spec(spec)
spec.loader.exec_module(serve)
class Quiet(serve.Handler):
    def log_message(self, *args): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT / 'dist')))
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
base = f'http://127.0.0.1:{server.server_port}/'
mock = (ROOT / 'tests/mock-sdk.js').read_text(encoding='utf-8')
out = ROOT / 'artifacts/consistency'
out.mkdir(parents=True, exist_ok=True)
results = []
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge')
        for width in (320, 390, 768, 1440):
            context = browser.new_context(viewport={'width': width, 'height': 960}, reduced_motion='reduce')
            context.add_init_script("const role=location.pathname.match(/\\/(cliente|vendedor|entregador|admin)\\//)?.[1];if(role)sessionStorage.setItem('qaRole',role);else sessionStorage.removeItem('qaRole');")
            def route(r):
                if r.request.url.endswith('/config/vendor/supabase-2.119.2.js'):
                    r.fulfill(body=mock, content_type='text/javascript')
                elif r.request.url.startswith(base): r.continue_()
                else: r.abort()
            context.route('**/*', route)
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda e: errors.append(page.url+' '+str(e)))
            header_metrics = None
            for path in ('', 'produto.html?id=1', 'carrinho.html', 'login.html', 'sobre.html', 'privacidade.html', 'termos.html', 'recuperar-senha.html', 'excluir-conta.html', '404.html', 'cliente/index.html?modo=online', 'vendedor/index.html?modo=online', 'entregador/index.html?modo=online', 'admin/index.html?modo=online'):
                role = path.split('/')[0] if '/index.html' in path else None
                page.goto(base + path)
                if role:
                    expect(page.locator('#privacidade')).to_be_attached()
                    expect(page.locator('.raiz-feedback')).to_have_text('')
                expect(page.locator('body > .site-header')).to_have_count(1)
                expect(page.locator('body > .site-footer')).to_have_count(1)
                expect(page.locator('#storeQuery')).to_be_visible()
                metrics = page.locator('.site-header').evaluate('''el => {
                    const r = el.getBoundingClientRect(), brand = el.querySelector('.site-brand'), search = el.querySelector('.site-search');
                    return {height:r.height, brand:getComputedStyle(brand).fontFamily, size:getComputedStyle(brand).fontSize,
                      searchHeight:search.getBoundingClientRect().height, color:getComputedStyle(brand).color};
                }''')
                if header_metrics is None: header_metrics = metrics
                compared = ('brand','size','color','searchHeight') if role=='vendedor' else tuple(metrics)
                assert all(metrics[key]==header_metrics[key] for key in compared), (width,path,header_metrics,metrics)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), (width, path)
                if width in (390, 1440) and path in ('', 'cliente/index.html?modo=online', 'login.html'):
                    page.screenshot(path=str(out / (('cliente' if role else 'login' if path else 'inicio') + f'-{width}.png')))
                if role == 'cliente':
                    nav = page.locator('.customer-nav')
                    expect(nav.get_by_role('link', name='Pedidos', exact=True)).to_be_visible() if width == 1440 else None
                    nav.get_by_role('link', name='Favoritos', exact=True).click()
                    expect(page.locator('#catalogo input[type=checkbox]')).to_be_checked()
                    nav.get_by_role('link', name='Comprar', exact=True).click()
                    expect(page.locator('#catalogo input[type=checkbox]')).not_to_be_checked()
                    page.locator('.site-categories a[data-category="plantas"]').click()
                    expect(page.locator('#shopFilters select')).to_have_value('plantas')
                    expect(page.locator('#catalogo input[type=checkbox]')).not_to_be_checked()
                    page.locator('#storeQuery').fill('Cacto fora dos cem')
                    page.locator('#storeSearch button').click()
                    expect(page.locator('#catalogo')).to_contain_text('1 resultado(s)')
                    expect(page.locator('#catalogo')).to_contain_text('Cacto fora dos cem')
                    page.locator('#siteCart').click()
                    expect(page).to_have_url(base + path + '#carrinho')
                    expect(page.locator('#carrinho')).to_be_in_viewport()
                results.append({'width':width, 'path':path or '/', 'shared_header':True, 'overflow':False})
            assert not errors, errors
            context.close()
        browser.close()
    (ROOT / 'tests/resultado_consistency.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'layouts':len(results), 'shared_header_metrics':'identical', 'customer_search_categories_favorites_cart':'passed', 'errors':[]}, ensure_ascii=True))
finally:
    server.shutdown()
    thread.join()
    server.server_close()
