"""Pagamento na interface publicada, API de teste; não realiza operações remotas."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
import importlib.util, json, threading
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('serve',ROOT/'scripts/serve.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class Quiet(module.Handler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'dist')))
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
base=f'http://127.0.0.1:{server.server_port}/'
mock=(ROOT/'tests/mock-sdk.js').read_text(encoding='utf-8')
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge');context=browser.new_context(viewport={'width':390,'height':950})
        context.add_init_script("sessionStorage.setItem('qaRole','cliente');sessionStorage.setItem('qaPayments','1');")
        def route(r):
            if r.request.url.endswith('/config/vendor/supabase-2.119.2.js'):r.fulfill(body=mock,content_type='text/javascript')
            elif r.request.url.startswith(base):r.continue_()
            else:r.abort()
        context.route('**/*',route);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(base+'cliente/');summary=page.locator('.raiz-checkout')
        favorite=page.get_by_role('button',name='Favoritar',exact=True).first
        expect(favorite).to_be_visible()
        assert favorite.evaluate('(e)=>getComputedStyle(e).color!==getComputedStyle(e).backgroundColor')
        assert page.locator('.bottom-nav a').first.evaluate('(e)=>e.getBoundingClientRect().width<innerWidth/2')
        expect(summary.get_by_label('Forma de pagamento')).to_be_visible()
        summary.get_by_label('Forma de pagamento').select_option('credit');summary.get_by_label('Parcelas').select_option('3')
        summary.get_by_role('button',name='Confirmar pedido e simular pagamento').click()
        expect(page.locator('.raiz-feedback')).to_contain_text('reservado')
        row=page.get_by_role('article').filter(has=page.get_by_role('heading',name='#902 · Confirmado',exact=True))
        row.get_by_role('button',name='Simular recusa do cartão').click();expect(row.get_by_role('heading',name='Recusado (simulado)',exact=True)).to_be_visible()
        row.get_by_role('button',name='Criar nova tentativa').click();expect(row.get_by_role('heading',name='Aguardando pagamento',exact=True)).to_be_visible()
        row.get_by_role('button',name='Simular aprovação do cartão').click();expect(row.get_by_role('heading',name='Aprovado (simulado)',exact=True)).to_be_visible()
        with page.expect_download() as download:row.get_by_role('button',name='Baixar comprovante de demonstração').click()
        assert download.value.suggested_filename=='RAIZ_DEMONSTRACAO_902.txt'
        row.get_by_role('button',name='Simular estorno integral antes do preparo').click();expect(row.get_by_role('heading',name='Estornado (simulado)',exact=True)).to_be_visible()
        assert not errors,errors
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        checkout=page.evaluate("__qa.rpc.find(r=>r.name==='raiz_checkout_pagamento')")
        assert checkout['args']['p_metodo']=='credit' and checkout['args']['p_parcelas']==3
        out=ROOT/'artifacts/parity';out.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(out/'payment-390.png'),full_page=True)
        browser.close()
        print(json.dumps({'payment_ui':'passed','credit_installments':3,'reject_retry_approve_refund':'passed','receipt':'passed','errors':errors}))
finally:server.shutdown();thread.join();server.server_close()
