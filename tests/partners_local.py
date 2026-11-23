"""Fluxo real entre painéis, HTTP e PostgreSQL descartável. Nenhuma conta remota."""
from pathlib import Path
from threading import Thread
import json,secrets,sys,tempfile,uuid
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT.parent/'RAIZOTIMIZADO'))
from local_autenticado import Database,create_server

out=ROOT/'artifacts/partners';out.mkdir(parents=True,exist_ok=True)
password=secrets.token_urlsafe(32);db=Database(tempfile.mkdtemp(prefix='raiz-partners-'));server=None
try:
    db.start();db.configure(password)
    db.sql((ROOT/'supabase/migrations/20261123000700_vinculos_operacionais.sql').read_text(encoding='utf-8'))
    server=create_server(db);Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge');sessions={};errors=[]
        def api(context,path,data):
            response=context.request.post(base+path,data=data,headers={'Origin':base});assert response.ok,(path,response.status,response.text());return response.json()
        def rpc(context,name,args=None):return api(context,'/_local/rpc',{'name':'raiz_'+name,'args':args or {}})
        def query(context,view,columns='*'):return api(context,'/_local/query',{'view':view,'columns':columns,'limit':100})
        def reload(page,section):
            page.reload();expect(page.locator('#'+section)).to_be_attached();expect(page.locator('.raiz-feedback')).to_have_text('');page.locator('.raiz-section-nav a[href="#'+section+'"]').click()
        for role in ('cliente','vendedor','entregador','admin'):
            context=browser.new_context(viewport={'width':1366,'height':950});context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(base+'/') else r.abort())
            page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(base+'/login.html?modo=online&role='+role);page.locator('#inputEmail').fill(role+'@local.teste.invalid');page.locator('#inputSenha').fill(password);page.locator('#btnSubmit').click()
            expect(page.locator('#privacidade')).to_be_attached(timeout=20000);expect(page.locator('.raiz-feedback')).to_have_text('')
            assert page.evaluate('RaizDB.isLocal')
            sessions[role]=(context,page)
            page.screenshot(path=str(out/(role+'.png')),full_page=True)
        buyer,buyer_page=sessions['cliente'];seller,seller_page=sessions['vendedor'];courier,courier_page=sessions['entregador'];admin,admin_page=sessions['admin']
        for section in ('visao','loja','produtos','pedidos','estatisticas'):expect(seller_page.locator('#'+section)).to_be_attached()
        for section in ('disponibilidade','carteira','andamento','ofertas','historico'):expect(courier_page.locator('#'+section)).to_be_attached()
        for section in ('usuarios','moderacao','pedidos','entregas'):expect(admin_page.locator('#'+section)).to_be_attached()
        # Publicar um produto pelo painel do vendedor.
        seller_page.locator('.raiz-section-nav a[href="#produtos"]').click();new=seller_page.locator('.raiz-create');new.locator('summary').click()
        new.get_by_label('Nome',exact=True).fill('Planta do fluxo completo');new.get_by_label('Preço (R$)',exact=True).fill('25');new.get_by_label('Estoque',exact=True).fill('4');new.get_by_role('button',name='Salvar produto',exact=True).click()
        expect(seller_page.locator('.raiz-feedback')).to_have_text('Alteração salva.')
        product=next(row for row in query(seller,'vendedor_produtos') if row['nome']=='Planta do fluxo completo')
        rpc(buyer,'endereco',{'p_endereco':'Rua do teste, 123, Cáceres - MT'})
        rpc(buyer,'item_cliente',{'p_produto':product['id'],'p_quantidade':1,'p_favorito':None})
        order=rpc(buyer,'checkout_pagamento',{'p_requisicao':str(uuid.uuid4()),'p_metodo':'pix','p_parcelas':1})
        rpc(buyer,'pagamento_acao',{'p_pedido':order,'p_acao':'approve','p_metodo':None,'p_parcelas':1})
        reload(seller_page,'pedidos');card=seller_page.get_by_role('article').filter(has=seller_page.get_by_role('heading',name=f'#{order} · Pendente',exact=True))
        card.get_by_role('button',name='Iniciar preparo e disponibilizar entrega',exact=True).click();expect(seller_page.locator('.raiz-feedback')).to_have_text('Alteração salva.')
        rpc(courier,'disponibilidade',{'p_online':True});reload(courier_page,'ofertas')
        offer=courier_page.locator('#ofertas').get_by_role('article').filter(has=courier_page.get_by_role('heading',name=f'#{order} · Flora Verde Cáceres',exact=True))
        if offer.count()==0:offer=courier_page.locator('#ofertas').get_by_role('article').filter(has_text='#'+str(order)+' ·')
        offer.get_by_role('button',name='Aceitar entrega',exact=True).click();expect(courier_page.locator('.raiz-feedback')).to_have_text('Alteração salva.')
        courier_page.locator('.raiz-section-nav a[href="#andamento"]').click()
        delivery=courier_page.locator('#andamento').get_by_role('article').filter(has_text='#'+str(order)+' ·')
        delivery.get_by_label('Embalagem ou vaso protegido').check();delivery.get_by_label('Produto e folhagem conferidos').check();delivery.get_by_role('button',name='Confirmar coleta').click();expect(courier_page.locator('.raiz-feedback')).to_have_text('Alteração salva.')
        delivery=courier_page.locator('#andamento').get_by_role('article').filter(has_text='#'+str(order)+' ·')
        delivery.get_by_label('Entrega recebida no destino').check();delivery.get_by_role('button',name='Concluir entrega').click();expect(courier_page.locator('.raiz-feedback')).to_have_text('Alteração salva.')
        reload(admin_page,'pedidos');expect(admin_page.locator('#pedidos').get_by_role('article').filter(has=admin_page.get_by_role('heading',name='#'+str(order),exact=True))).to_contain_text('Entregue')
        assert next(row for row in query(buyer,'cliente_pedidos') if row['id']==order)['status']=='Entregue'
        assert not errors,errors
        result={'database':'PostgreSQL temporário','remote_writes':0,'seller_product_ui':True,'seller_preparation_ui':True,'courier_accept_collect_deliver_ui':True,'admin_delivered_order':True,'all_role_menus':True,'errors':errors}
        (ROOT/'tests/resultado_partners.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(result,ensure_ascii=True));browser.close()
finally:
    if server:server.shutdown();server.server_close()
    db.stop()
