"""Painel financeiro: fixture isolada, sem alterações na produção."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
import importlib.util,json,threading,zipfile,xml.etree.ElementTree as ET
from datetime import datetime
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('serve',ROOT/'scripts/serve.py');serve=importlib.util.module_from_spec(spec);spec.loader.exec_module(serve)
class Quiet(serve.Handler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'dist')))
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();base=f'http://127.0.0.1:{server.server_port}/'
original=(ROOT/'tests/mock-sdk.js').read_text(encoding='utf-8')
today=datetime.now().astimezone().isoformat()
orders=[{'id':i,'status':'Pendente' if i<=3 else 'Entregue','total':100+i,'created_at':today,'endereco_entrega':'Endereço privado QA'} for i in range(1,206)]
payments=[{'pedido_id':i,'estado':state,'metodo':'credit' if i==2 else 'pix','parcelas':1,'valor_centavos':(100+i)*100,'criado_em':today,'referencia':'QA-'+str(i),'simulado':True,'eventos':[{'acao':'created','em':today},{'acao':'approved_simulation','em':today}]} for i,state in enumerate(['paid','paid','pending','refunded','review','rejected'],1)]
mock=original.replace('function data(view){return (',"function data(view){if(['vendedor_pedidos','cliente_pedidos'].includes(view))return window.__financeOrders;return (")
mock=mock.replace("    else if(name==='raiz_pagamentos') {", "    else if(name==='raiz_preparo'){window.__financeOrders.find(o=>o.id===args.p_pedido).status='Em preparo';}\n    else if(name==='raiz_pagamentos') {")
mock=mock.replace('result=state.payments || [];',"if(sessionStorage.getItem('qaPayError'))return {data:null,error:{code:'TEST_FAILURE'}};result=window.__financePayments;")
mock=mock.replace('if(!views.has(view))',"if(sessionStorage.getItem('qaOrderError')&&['vendedor_pedidos','cliente_pedidos'].includes(view))return Promise.resolve({data:null,error:{code:'TEST_FAILURE'}}).then(resolve,reject);if(!views.has(view))")
out=ROOT/'artifacts/finance-console';out.mkdir(parents=True,exist_ok=True)
results=[]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge')
        def context(width,role='vendedor',payment=True,extra=''):
            ctx=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce',accept_downloads=True)
            ctx.add_init_script("window.__financeOrders="+json.dumps(orders)+";window.__financePayments="+json.dumps(payments)+";"+("sessionStorage.setItem('qaRole',"+json.dumps(role)+");" if role else '')+("sessionStorage.setItem('qaPayments','1');" if payment else '')+extra)
            def route(r):
                if r.request.url.endswith('/config/vendor/supabase-2.119.2.js'):r.fulfill(body=mock,content_type='text/javascript')
                elif r.request.url.startswith(base):r.continue_()
                else:r.abort()
            ctx.route('**/*',route);return ctx
        for width in (1440,820,390):
            ctx=context(width);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(base+'financeiro/index.html?modo=online&role=vendedor');expect(page.locator('#feedback')).to_contain_text('Dados atualizados')
            expect(page.locator('#orderCount')).to_have_text('205 pedidos nesta seleção');expect(page.locator('#metrics strong')).to_have_text(['205','R$\u00a0203,00','R$\u00a0208,00','—'])
            assert len(page.evaluate("__qa.queries.filter(q=>q.view==='vendedor_pedidos')"))==2
            def nav(section):
                page.locator('a[data-module="'+section+'"]').click();expect(page.locator('#'+section)).to_be_visible()
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            page.locator('#status').select_option('paid');page.get_by_role('button',name='Aplicar filtros',exact=True).click();expect(page.locator('#orderCount')).to_have_text('2 pedidos nesta seleção')
            page.get_by_role('button',name='Ver #1',exact=True).click();expect(page.locator('#detail')).to_be_visible();expect(page.locator('.fin-address')).to_have_text('Endereço de entrega: ••••••••');expect(page.locator('.fin-timeline li')).to_have_count(2)
            page.get_by_role('button',name='Mostrar endereço',exact=True).click();expect(page.locator('.fin-address')).to_contain_text('Endereço privado QA')
            page.get_by_role('button',name='Separar produtos / iniciar preparo',exact=True).click();expect(page.locator('#confirm')).to_be_visible();page.get_by_role('button',name='Voltar',exact=True).click();assert not page.evaluate("__qa.rpc.some(r=>r.name==='raiz_preparo')")
            page.get_by_role('button',name='Ver #1',exact=True).click();page.get_by_role('button',name='Separar produtos / iniciar preparo',exact=True).click();page.get_by_role('button',name='Confirmar preparo',exact=True).click();expect(page.locator('#feedback')).to_contain_text('marcado como em preparo')
            assert len(page.evaluate("__qa.rpc.filter(r=>r.name==='raiz_preparo')"))==1
            nav('repasses');expect(page.locator('#settlement')).to_contain_text('R$\u00a0203,00')
            for label,suffix in [('↓ CSV','csv'),('↓ Excel (.xlsx)','xlsx')]:
                with page.expect_download() as event:page.get_by_role('button',name=label,exact=True).click()
                path=out/f'report-{width}.{suffix}';event.value.save_as(path)
                if suffix=='csv':assert 'Não disponível' in path.read_text(encoding='utf-8-sig')
                else:
                    with zipfile.ZipFile(path) as z:
                        assert z.testzip() is None
                        for name in z.namelist():ET.fromstring(z.read(name))
                        sheet=z.read('xl/worksheets/sheet1.xml').decode();assert 'Não disponível' in sheet and '<v>101</v>' in sheet
            page.evaluate('window.print=()=>window.__printed=true');page.get_by_role('button',name='PDF / imprimir').click();assert page.evaluate('window.__printed');expect(page.locator('#printReport')).to_contain_text('Pagamentos simulados')
            nav('meios');page.locator('#calculator button').click();expect(page.locator('#preview')).to_contain_text('3× de R$\u00a033,33');expect(page.locator('#preview')).to_contain_text('R$\u00a095,00');page.locator('#minimum').fill('60');page.locator('#calculator button').click();expect(page.locator('#preview')).to_contain_text('1× de R$\u00a0100,00');expect(page.get_by_role('button',name='Testar conexão')).to_be_disabled()
            nav('seguranca');expect(page.locator('#security')).to_contain_text('não significa baixo risco');page.screenshot(path=str(out/f'security-{width}.png'),full_page=True)
            nav('pedidos');page.locator('#clear').click();page.locator('#from').fill('2099-01-01');page.get_by_role('button',name='Aplicar filtros',exact=True).click();expect(page.locator('#orderContent')).to_contain_text('Nenhum pedido com estes filtros');page.locator('#clear').click()
            page.locator('#min').fill('200');page.locator('#max').fill('250');page.get_by_role('button',name='Aplicar filtros',exact=True).click();expect(page.locator('#orderCount')).to_have_text('51 pedidos nesta seleção');page.screenshot(path=str(out/f'orders-{width}.png'),full_page=True)
            assert not errors,errors
            results.append({'width':width,'filters':True,'exports':True,'confirmation':True,'overflow':False,'jsErrors':errors});ctx.close()
        for role in ('admin','cliente',None):
            ctx=context(1440,role);page=ctx.new_page();page.goto(base+'financeiro/index.html?modo=online&role=admin')
            if role=='admin':expect(page.locator('#scope')).to_contain_text('TODAS AS LOJAS');expect(page.locator('#feedback')).to_contain_text('Dados atualizados');page.locator('#status').select_option('paid');page.get_by_role('button',name='Aplicar filtros',exact=True).click();page.get_by_role('button',name='Ver #1',exact=True).click();expect(page.get_by_role('button',name='Separar produtos / iniciar preparo')).to_have_count(0)
            elif role=='cliente':expect(page.locator('#gate')).to_contain_text('Acesso restrito');assert not page.evaluate('__qa.queries.length')
            else:page.wait_for_url('**/login.html?modo=online&role=admin&destino=financeiro')
            ctx.close()
        for role in ('vendedor','admin'):
            ctx=context(820,role);page=ctx.new_page();page.goto(base+'login.html?role='+role+'&modo=online&destino=financeiro')
            if role=='admin':
                page.wait_for_url('**/admin/index.html?modo=online#cadastros')
                expect(page.locator('#cadastros')).to_be_visible()
                page.locator('.sidebar a[href="#financeiro"]').click()
                expect(page.locator('#financeiro #feedback')).to_contain_text('Dados atualizados')
                expect(page.locator('#cadastros')).to_be_hidden()
                page.locator('.sidebar a[href="#cadastros"]').click()
                expect(page.locator('#cadastros')).to_be_visible()
                expect(page.locator('#financeiro')).to_be_hidden()
            else:page.wait_for_url('**/financeiro/index.html?modo=online&role='+role);expect(page.locator('#feedback')).to_contain_text('Dados atualizados')
            ctx.close()
        for extra,payment in [('',False),("sessionStorage.setItem('qaPayError','1');",True),("sessionStorage.setItem('qaOrderError','1');",True)]:
            ctx=context(820,extra=extra,payment=payment);page=ctx.new_page();page.goto(base+'financeiro/index.html?modo=online')
            if 'qaOrderError' in extra:expect(page.locator('#orderContent')).to_contain_text('Não foi possível carregar os pedidos')
            else:expect(page.locator('#feedback')).to_contain_text('Pagamentos indisponíveis');expect(page.locator('#metrics strong').nth(1)).to_have_text('—');expect(page.locator('#orderContent')).to_contain_text('Sem registro')
            ctx.close()
        browser.close()
    print(json.dumps({'layouts':results,'roles':True,'pagination205':True,'independentErrors':True},ensure_ascii=True))
finally:server.shutdown();thread.join();server.server_close()
