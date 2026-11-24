"""QA visual das quatro páginas públicas; sem usar contas reais."""
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
shots=ROOT/'artifacts/support';shots.mkdir(parents=True,exist_ok=True)
pages=['recuperar-senha','privacidade','termos','excluir-conta'];results=[]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge')
        context=browser.new_context();page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        context.route('**/*',lambda r:r.continue_() if r.request.url.startswith((base,'https://fonts.googleapis.com/','https://fonts.gstatic.com/')) else r.abort())
        for width in [320,360,768,1440]:
            page.set_viewport_size({'width':width,'height':1000})
            for name in pages:
                page.goto(base+name+'.html');page.evaluate('document.fonts.ready')
                expect(page.locator('h1')).to_be_visible();assert page.locator('h1').count()==1
                if name in ['privacidade','termos']:
                    expect(page.locator('.support-tabs a[aria-current=page]')).to_have_attribute('href',name+'.html')
                    assert page.locator('.support-tabs a').count()==2
                    assert not page.locator('.support-tabs a[href="/recuperar-senha.html"],.support-tabs a[href="/excluir-conta.html"]').count()
                else:
                    assert page.locator('.support-tabs').count()==0
                    other='excluir-conta' if name=='recuperar-senha' else 'recuperar-senha'
                    assert page.locator('a[href="/'+other+'.html"]').count()==0
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(name,width,page.evaluate("[...document.querySelectorAll('body *')].filter(n=>n.getBoundingClientRect().right>innerWidth+1).map(n=>n.className).slice(0,12)"))
                assert page.locator('a[href^="mailto:suporteraiz.mkt@hotmail.com"]').count()>0
                if width in [360,1440]:page.screenshot(path=str(shots/(name+'-'+str(width)+'.png')),full_page=width==360)
                if name in ['privacidade','termos']:
                    anchor=page.locator('.support-toc nav a').first;target=anchor.get_attribute('href');anchor.click();expect(page.locator(target)).to_be_in_viewport()
                results.append({'page':name,'width':width,'layout':'aprovado'})
        assert not errors,errors
        browser.close()
    (ROOT/'tests/resultado_design.json').write_text(json.dumps({'pages':results,'errors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'layouts':len(results),'errors':errors,'screenshots':str(shots)},ensure_ascii=False))
finally:server.shutdown();thread.join();server.server_close()
