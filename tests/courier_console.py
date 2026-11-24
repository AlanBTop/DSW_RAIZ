"""Central do entregador em desktop/celular; API isolada, sem dados remotos."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
import importlib.util,json,threading
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('serve',ROOT/'scripts/serve.py');serve=importlib.util.module_from_spec(spec);spec.loader.exec_module(serve)
class Quiet(serve.Handler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'dist')))
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();base=f'http://127.0.0.1:{server.server_port}/'
mock=(ROOT/'tests/mock-sdk.js').read_text(encoding='utf-8')
mock=mock.replace('  function data(view)',"""  const profile={nome:'Entregador QA',veiculo:'Bicicleta',online:true,saldo_carteira:45,ganhos_hoje:15,total_corridas_hoje:1};
  const offers=Array.from({length:13},(_,i)=>({id:1001+i,coleta_loja:'Loja de teste '+i,item_descricao:'Planta de teste',fragil:true,valor:15}));
  const trips=[],history=[{corrida_id:999,status:'Cancelada',data_formatada:'23/11/2026'}],wallet=[];
  function data(view)""")
mock=mock.replace("function data(view){return (", "function data(view){if(view==='entregador_perfil')return sessionStorage.getItem('qaNoProfile')?[]:[profile];if(view==='entregador_corridas')return trips;if(view==='entregador_historico')return history;if(view==='entregador_extrato')return wallet;return (")
mock=mock.replace("else if(name==='raiz_ofertas_pagina')result={itens:[],total:0};", """else if(name==='raiz_ofertas')result=profile.online?offers:[];
    else if(name==='raiz_ofertas_pagina')result={itens:profile.online?offers.slice((args.p_pagina||0)*12,(args.p_pagina||0)*12+12):[],total:profile.online?offers.length:0};
    else if(name==='raiz_disponibilidade')profile.online=args.p_online;
    else if(name==='raiz_etapa'){
      if(sessionStorage.getItem('qaFail'))return {data:null,error:{code:'P0001',message:'Esta entrega já foi aceita por outro entregador.'}};
      const id=args.p_pedido;
      if(args.p_etapa===1){const index=offers.findIndex(o=>o.id===id);const offer=offers.splice(index,1)[0];trips.push({...offer,status:'Em andamento',etapa_atual:1,coleta_endereco:'Rua de coleta, 100, Cáceres',entrega_endereco:'Rua do destino, 200, Cáceres'});}
      else {const trip=trips.find(t=>t.id===id);trip.etapa_atual=args.p_etapa;if(args.p_etapa===3){trip.status='Concluída';history.unshift({corrida_id:id,status:'Concluída',data_formatada:'24/11/2026'});wallet.push({id:1,descricao:'Entrega #'+id,valor:15,status:'Registrado',data_formatada:'24/11/2026'});profile.saldo_carteira+=15;profile.ganhos_hoje+=15;profile.total_corridas_hoje++;}}
    }""")
mock=mock.replace("else if(name==='raiz_recursos')result=","else if(name==='raiz_recursos' && sessionStorage.getItem('qaLegacy'))return {data:null,error:{code:'PGRST202'}};else if(name==='raiz_recursos')result=")
out=ROOT/'artifacts/courier-console';out.mkdir(parents=True,exist_ok=True);results=[]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge')
        for width in (1440,390,320):
            c=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce');c.add_init_script("sessionStorage.setItem('qaRole','entregador')")
            c.route('**/*',lambda r:r.fulfill(body=mock,content_type='text/javascript') if r.request.url.endswith('/config/vendor/supabase-2.119.2.js') else r.continue_() if r.request.url.startswith(base) else r.abort())
            page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            def ready():expect(page.locator('.raiz-feedback')).to_have_text('')
            def nav(section):
                (page.locator('#storeAccount') if width<=760 and section=='privacidade' else page.locator(('.sidebar .raiz-section-nav' if width>760 else '.bottom-nav')+' a[href="#'+section+'"]')).click()
                expect(page.locator('#'+section)).to_be_visible();expect(page.locator('.raiz-content>section:visible')).to_have_count(1)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),section+' overflow'
            def shot(name):page.screenshot(path=str(out/f'{name}-{width}.png'),full_page=True)
            page.goto(base+'entregador/index.html?modo=online');ready();shot('visao');expect(page.locator('.courier-metric strong')).to_have_text(['1','R$\xa015,00','0','R$\xa045,00'])
            nav('ofertas');expect(page.locator('.courier-offer')).to_have_count(12);page.locator('#ofertas').get_by_role('button',name='Próxima',exact=True).click();ready();expect(page.locator('.courier-offer')).to_have_count(1)
            page.locator('#ofertas').get_by_role('button',name='Anterior',exact=True).click();ready();shot('ofertas')
            # Falha de aceite mantém a tela e não apresenta sucesso.
            page.evaluate("sessionStorage.setItem('qaFail','1')");page.locator('.courier-offer').first.get_by_role('button',name='Aceitar entrega').click();expect(page.locator('.raiz-feedback')).to_contain_text('outro entregador');expect(page.locator('#ofertas')).to_be_visible();page.evaluate("sessionStorage.removeItem('qaFail')")
            page.locator('.courier-offer').first.get_by_role('button',name='Aceitar entrega').click();expect(page.locator('.raiz-feedback')).to_contain_text('Entrega aceita');expect(page.locator('#andamento')).to_be_visible()
            trip=page.locator('.courier-trip');confirm=trip.get_by_role('button',name='Confirmar coleta');expect(confirm).to_be_disabled();trip.get_by_label('Embalagem ou vaso protegido').check();expect(confirm).to_be_disabled();trip.get_by_label('Produto e folhagem conferidos').check();expect(confirm).to_be_enabled()
            route=trip.get_by_role('link',name='Ir até a coleta no Google Maps');assert 'Rua+de+coleta' in route.get_attribute('href');shot('coleta');confirm.click();expect(page.locator('.raiz-feedback')).to_contain_text('Coleta confirmada')
            confirm=trip.get_by_role('button',name='Concluir entrega');expect(confirm).to_be_disabled();trip.get_by_label('Entrega recebida no destino').check();expect(confirm).to_be_enabled();assert 'Rua+do+destino' in trip.get_by_role('link',name='Ir até a entrega no Google Maps').get_attribute('href');shot('destino');confirm.click();expect(page.locator('.raiz-feedback')).to_contain_text('Entrega concluída');expect(page.locator('.courier-trip')).to_have_count(0)
            nav('historico');expect(page.locator('#historico .courier-record')).to_have_count(2);page.get_by_label('Situação da entrega').select_option('Concluída');ready();expect(page.locator('#historico .courier-record')).to_have_count(1);shot('historico')
            nav('carteira');expect(page.locator('.courier-balance')).to_contain_text('60,00');expect(page.locator('.courier-wallet-row')).to_have_count(1);shot('carteira')
            nav('disponibilidade');page.get_by_role('button',name='Ficar offline',exact=True).click();expect(page.locator('.raiz-feedback')).to_contain_text('Disponibilidade atualizada');nav('ofertas');expect(page.locator('#ofertas')).to_contain_text('Você está offline');expect(page.locator('.courier-offer')).to_have_count(0)
            nav('disponibilidade');page.get_by_role('button',name='Ficar online',exact=True).click();expect(page.locator('.raiz-feedback')).to_contain_text('Disponibilidade atualizada')
            nav('privacidade');shot('perfil');page.reload();ready();expect(page.locator('#privacidade')).to_be_visible();page.go_back();page.go_forward();expect(page.locator('#privacidade')).to_be_visible()
            page.goto(base+'entregador/index.html?modo=online#desconhecido');ready();expect(page.locator('#disponibilidade')).to_be_visible()
            page.evaluate("sessionStorage.setItem('qaNoProfile','1')");page.reload();ready();expect(page.locator('#disponibilidade')).to_contain_text('Seu cadastro precisa de um vínculo');nav('privacidade');expect(page.locator('.courier-profile-data')).to_contain_text('Aguardando vínculo')
            page.evaluate("sessionStorage.removeItem('qaNoProfile');sessionStorage.setItem('qaLegacy','1')");page.reload();ready();nav('ofertas');expect(page.locator('.courier-offer')).to_have_count(13)
            assert not errors,errors;c.close();results.append({'width':width,'accept_collect_deliver':True,'pagination':True,'history_filter':True,'offline':True,'missing_profile':True,'navigation':True,'errors':errors})
        browser.close()
    (ROOT/'tests/resultado_courier_console.json').write_text(json.dumps(results,indent=2),encoding='utf-8');print(json.dumps(results))
finally:server.shutdown();thread.join();server.server_close()
