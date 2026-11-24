"""Gestão da loja em desktop/celular, com API de fixture isolada."""
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
original=(ROOT/'tests/mock-sdk.js').read_text(encoding='utf-8')
products=[{'id':i,'nome':name,'categoria':category,'preco':price,'estoque':stock,'ativo':active,'descricao':'Produto de exemplo para revisão da loja.','loja_id':1,'vendedor_nome':'Flora Verde'} for i,(name,category,price,stock,active) in enumerate([('Costela de Adão','plantas',79.9,8,True),('Jiboia','plantas',39.9,0,True),('Vaso Terracota','vasos',34.9,12,True),('Substrato Orgânico','insumos',19.9,20,True),('Kit Jardinagem','ferramentas',59.9,3,False),('Zamioculca','plantas',69.9,4,True)],1)]
orders=[{'id':1201,'status':'Pendente','total':94.9,'cliente_nome':'Cliente de teste','data_pedido':'2026-11-24T10:00:00-04:00'},{'id':1202,'status':'Em preparo','total':154.8,'cliente_nome':'Outra compra de teste','data_pedido':'2026-11-23T10:00:00-04:00'},{'id':1203,'status':'Entregue','total':84.9,'cliente_nome':'Compra concluída de teste','data_pedido':'2026-11-22T10:00:00-04:00'}]
sales=[{'id':1,'dia_semana':'Sábado','data_referencia':'2026-11-21','valor':59.9},{'id':2,'dia_semana':'Domingo','data_referencia':'2026-11-22','valor':84.9},{'id':3,'dia_semana':'Segunda','data_referencia':'2026-11-23','valor':154.8}]
mock=re.sub(r'  const products=Array.from[^\n]+\n','  const products='+json.dumps(products,ensure_ascii=False)+';\n',original)
mock=mock.replace('const state={cart:','const state={sellerOrders:'+json.dumps(orders,ensure_ascii=False)+',cart:')
mock=re.sub(r"vendedor_pedidos:\[\{[^\n]+?\}\],vendedor_itens_pedido:\[\]", "vendedor_pedidos:state.sellerOrders,vendedor_itens_pedido:[{id:1,pedido_id:1201,produto_nome:'Costela de Adão',quantidade:1}]", mock)
mock=mock.replace("vendedor_lojas:[{id:1,nome:'Loja QA',endereco:'Coleta fictícia',rating:5}]","vendedor_lojas:[{id:1,nome:'Flora Verde',endereco:'Endereço de coleta de teste',horario_funcionamento:'Segunda a sexta, 8h às 18h'}],vendedor_vendas_diarias:"+json.dumps(sales,ensure_ascii=False))
mock=mock.replace("    else if(name==='raiz_pagamentos')", """    else if(name==='raiz_produto'){
      const id=args.p_id||Math.max(...products.map(p=>p.id))+1;
      const row=products.find(p=>p.id===id)||{id,loja_id:1,vendedor_nome:'Flora Verde'};
      if(!products.includes(row))products.push(row);
      Object.assign(row,{nome:args.p_nome,categoria:args.p_categoria,preco:args.p_preco,estoque:args.p_estoque,ativo:args.p_ativo,descricao:args.p_descricao});result=id;
    }
    else if(name==='raiz_preparo')state.sellerOrders.find(o=>o.id===args.p_pedido).status='Em preparo';
    else if(name==='raiz_pagamentos')""")
out=ROOT/'artifacts/seller-console';out.mkdir(parents=True,exist_ok=True);results=[]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge')
        for width in (1440,390,320):
            context=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce');context.add_init_script("sessionStorage.setItem('qaRole','vendedor')")
            def route(r):
                if r.request.url.endswith('/config/vendor/supabase-2.119.2.js'):r.fulfill(body=mock,content_type='text/javascript')
                elif r.request.url.startswith(base):r.continue_()
                else:r.abort()
            context.route('**/*',route);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            def loaded():expect(page.locator('.raiz-feedback')).to_have_text('')
            def nav(section):
                page.locator(('.sidebar .raiz-section-nav' if width>760 else '.bottom-nav')+' a[href="#'+section+'"]').click()
                expect(page.locator('#'+section)).to_be_visible();expect(page.locator('.raiz-content > section:visible')).to_have_count(1)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            def shot(name):page.screenshot(path=str(out/f'{name}-{width}.png'),full_page=True)
            page.goto(base+'vendedor/index.html?modo=online#privacidade');loaded();expect(page.locator('#privacidade')).to_be_visible();expect(page.locator('#visao')).to_be_hidden();shot('conta')
            nav('visao');expect(page.locator('.seller-metric strong')).to_have_text(['1','5','1','6']);shot('visao')
            page.locator('.topbar').get_by_role('button',name='Cadastrar produto',exact=True).click();create=page.locator('.raiz-create');expect(create).to_have_attribute('open','')
            create.get_by_label('Nome',exact=True).fill('Samambaia do teste');create.get_by_label('Preço (R$)',exact=True).fill('29.90');create.get_by_label('Estoque',exact=True).fill('4');create.get_by_label('Descrição',exact=True).fill('Uma nova planta cadastrada pelo vendedor.');create.get_by_role('button',name='Salvar produto',exact=True).click();expect(page.locator('.raiz-feedback')).to_have_text('Alteração salva.')
            search=page.get_by_label('Buscar produto no estoque');search.fill('Samambaia do teste');page.locator('#produtos').get_by_role('button',name='Buscar',exact=True).click();expect(page.locator('.seller-stock-row')).to_have_count(1)
            edit=page.locator('.seller-product-editor');edit.locator('summary').click();edit.get_by_label('Estoque',exact=True).fill('0');edit.get_by_label('Ativo',exact=True).uncheck();edit.get_by_role('button',name='Salvar produto',exact=True).click();expect(page.locator('.seller-stock-row')).to_contain_text('Pausado')
            page.locator('#storeQuery').fill('');page.locator('#storeSearch button').click();expect(page.locator('.seller-stock-row')).to_have_count(7);shot('produtos')
            filters=page.locator('.seller-inventory-toolbar');filters.get_by_label('Disponibilidade').select_option('sem-estoque');expect(page.locator('.seller-stock-row')).to_have_count(2)
            filters.get_by_label('Disponibilidade').select_option('pausados');expect(page.locator('.seller-stock-row')).to_have_count(2)
            nav('pedidos');page.get_by_label('Situação do pedido').select_option('Pendente');expect(page.locator('.seller-order-card')).to_have_count(1)
            page.get_by_role('button',name='Iniciar preparo e disponibilizar entrega',exact=True).click();expect(page.locator('.raiz-feedback')).to_have_text('Alteração salva.');expect(page.locator('#pedidos')).to_contain_text('Nenhum pedido nesta seleção.')
            page.get_by_label('Situação do pedido').select_option('Em preparo');expect(page.locator('.seller-order-card')).to_have_count(2);shot('pedidos')
            nav('estatisticas');expect(page.locator('.seller-report-metrics')).to_contain_text('299,60');shot('vendas')
            nav('loja');expect(page.locator('.seller-store-data')).to_contain_text('8h às 18h');shot('loja')
            nav('privacidade');page.reload();loaded();expect(page.locator('#privacidade')).to_be_visible();expect(page.locator('.raiz-content > section:visible')).to_have_count(1)
            assert not errors,errors
            context.close();results.append({'width':width,'plant_create_edit_pause':True,'stock_filters':True,'prepare_order':True,'separate_screens':True,'errors':errors})
        # Contadores independem da primeira página com doze produtos.
        context=browser.new_context();context.add_init_script("sessionStorage.setItem('qaRole','vendedor')");context.route('**/config/vendor/supabase-2.119.2.js',lambda r:r.fulfill(body=original,content_type='text/javascript'));page=context.new_page();page.goto(base+'vendedor/index.html?modo=online');expect(page.locator('.seller-metric strong')).to_have_text(['1','150','0','150']);context.close();browser.close()
    (ROOT/'tests/resultado_seller_console.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'layouts':results,'counts_beyond_first_page':True},ensure_ascii=True))
finally:server.shutdown();thread.join();server.server_close()
