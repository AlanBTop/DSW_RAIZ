"""Jornada de candidato e fila administrativa com API substituída por fixtures."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
import importlib.util,json,threading,sys
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('serve',ROOT/'scripts/serve.py');serve=importlib.util.module_from_spec(spec);spec.loader.exec_module(serve)
class Quiet(serve.Handler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'dist')));thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();base=f'http://127.0.0.1:{server.server_port}/'
mock=(ROOT/'tests/mock-sdk.js').read_text(encoding='utf-8')
mock=mock.replace("email:role()+'@teste.invalid'", "email:role()+'@teste.invalid',user_metadata:JSON.parse(sessionStorage.getItem('qaMetadata')||'{}')")
mock=mock.replace("    if(name==='raiz_acesso')", """    const apps=JSON.parse(sessionStorage.getItem('qaApplications')||'[]');
    if(name==='raiz_cadastro_config')result={versao:1};
    else if(name==='raiz_cadastro_status')result=apps.at(-1)||null;
    else if(name==='raiz_cadastro_enviar'){
      if(sessionStorage.getItem('qaFail'))return {data:null,error:{code:'P0001',message:'Sua conta já possui uma solicitação em análise ou aprovada.'}};
      const last=apps.at(-1);if(last&&last.status==='Pendente')result=last.id;
      else {result='00000000-0000-4000-8000-'+String(apps.length+1).padStart(12,'0');apps.push({id:result,usuario_id:'buyer',email:'candidato@teste.invalid',perfil:args.p_perfil,dados:args.p_dados,status:'Pendente',criado_em:'2026-11-24T10:00:00-04:00'});sessionStorage.setItem('qaApplications',JSON.stringify(apps));}
    }
    else if(name==='raiz_cadastros_listar'){if(sessionStorage.getItem('qaListFail'))return {data:null,error:{code:'PGRST202'}};const filtered=apps.filter(x=>!args.p_status||x.status===args.p_status);result={itens:filtered.slice((args.p_pagina||0)*12,(args.p_pagina||0)*12+12),total:filtered.length,pendentes:apps.filter(x=>x.status==='Pendente').length};}
    else if(name==='raiz_cadastro_decidir'){if(sessionStorage.getItem('qaDecisionFail'))return {data:null,error:{code:'TEST_FAILURE'}};const app=apps.find(x=>x.id===args.p_id);app.status=args.p_aprovar?'Aprovado':'Recusado';app.motivo=args.p_motivo;app.analisado_em='2026-11-24T11:00:00-04:00';sessionStorage.setItem('qaApplications',JSON.stringify(apps));result=app.status;}
    else if(name==='raiz_acesso')""")
mock=mock.replace("signUp:async()=>({data:{session:null},error:null})", "signUp:async(args)=>{sessionStorage.setItem('qaSignup',JSON.stringify(args));sessionStorage.setItem('qaMetadata',JSON.stringify(args.options.data));return {data:{session:null},error:null};}")
out=ROOT/'artifacts/partner-registration';out.mkdir(parents=True,exist_ok=True);results=[]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge')
        admin_only='--admin-only' in sys.argv
        for width in ((1440,820,390) if admin_only else (1440,390,320)):
            context=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce')
            def route(r):
                if r.request.url.endswith('/config/vendor/supabase-2.119.2.js'):r.fulfill(body=mock,content_type='text/javascript')
                elif r.request.url.endswith('/config/partner-registration.js'):
                    source=(ROOT/'dist/config/partner-registration.js').read_text(encoding='utf-8').replace('function errorText(error){','function errorText(error){window.__qaPartnerError=String(error.stack||error.message);')
                    r.fulfill(body=source,content_type='text/javascript')
                elif r.request.url.startswith(base):r.continue_()
                else:r.abort()
            context.route('**/*',route)
            page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            def fit():assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            def shot(name):fit();page.screenshot(path=str(out/f'{name}-{width}.png'),full_page=True)
            for role in (() if admin_only else ('vendedor','entregador')):
                page.evaluate('sessionStorage.clear()') if page.url.startswith(base) else None
                page.goto(base+'login.html?role='+role+'&cadastro=1');expect(page).to_have_url(base+'cadastro-parceiro.html?perfil='+role)
                expect(page.get_by_label('Nome completo',exact=True)).to_be_visible();page.get_by_label('Nome completo',exact=True).fill('Parceiro de teste');page.get_by_label('Telefone com DDD').fill('(65) 99999-0000');shot('dados-'+role);page.get_by_role('button',name='Continuar',exact=True).click()
                if role=='vendedor':page.get_by_label('Nome da loja',exact=True).fill('Loja do teste');page.get_by_label('Endereço completo de coleta').fill('Rua de teste, 123, Cáceres - MT');page.get_by_label('Horário de funcionamento').fill('8h às 18h')
                else:page.get_by_label('Veículo de entrega').select_option('Motocicleta')
                shot('perfil-'+role);page.get_by_role('button',name='Voltar',exact=True).click();expect(page.get_by_label('Nome completo')).to_have_value('Parceiro de teste');page.get_by_role('button',name='Continuar',exact=True).click();page.get_by_role('button',name='Continuar',exact=True).click();shot('revisao-'+role)
                page.get_by_label('E-mail',exact=True).fill(role+'@teste.invalid');page.get_by_label('Senha',exact=True).fill('TesteSeguro123!');page.get_by_label('Confirmar senha',exact=True).fill('Diferente123!');page.locator('[name=termos]').check();page.get_by_role('button',name='Enviar para análise').click();expect(page.locator('#partnerFeedback')).to_have_text('As senhas não coincidem.');assert page.evaluate("sessionStorage.getItem('qaSignup')") is None
                page.get_by_label('Confirmar senha',exact=True).fill('TesteSeguro123!');page.get_by_role('button',name='Enviar para análise').click();expect(page.get_by_role('heading',name='Confirme seu e-mail para continuar')).to_be_visible();signup=page.evaluate("JSON.parse(sessionStorage.getItem('qaSignup'))");assert signup['options']['data']['raiz_candidatura']['perfil']==role;assert 'login.html?role='+role+'&modo=online' in signup['options']['emailRedirectTo'];shot('confirmacao-'+role)
                # Simula o retorno autenticado após a confirmação de e-mail.
                page.evaluate("sessionStorage.setItem('qaRole','cliente')");page.goto(base+'cadastro-parceiro.html?perfil='+role)
                try:expect(page.get_by_role('heading',name='Seu cadastro está em análise')).to_be_visible()
                except:print('DIAGNOSTICO',page.evaluate('window.__qaPartnerError'),errors,flush=True);raise
                shot('pendente-'+role)
                applications=page.evaluate("JSON.parse(sessionStorage.getItem('qaApplications'))");assert len(applications)==1;page.reload();expect(page.get_by_role('heading',name='Seu cadastro está em análise')).to_be_visible();assert page.evaluate("JSON.parse(sessionStorage.getItem('qaApplications')).length")==1
                # A recusa exibe o motivo e permite uma nova solicitação.
                page.evaluate("const rows=JSON.parse(sessionStorage.getItem('qaApplications'));rows[0].status='Recusado';rows[0].motivo='Confira os dados e envie novamente.';sessionStorage.setItem('qaApplications',JSON.stringify(rows))")
                page.reload();expect(page.locator('.partner-reason')).to_have_text('Confira os dados e envie novamente.');page.get_by_role('button',name='Revisar e reenviar').click();page.get_by_role('button',name='Continuar',exact=True).click();page.get_by_role('button',name='Continuar',exact=True).click();expect(page.get_by_label('E-mail',exact=True)).to_have_count(0);page.locator('[name=termos]').check();page.get_by_role('button',name='Enviar para análise').click();expect(page.get_by_role('heading',name='Seu cadastro está em análise')).to_be_visible();assert page.evaluate("JSON.parse(sessionStorage.getItem('qaApplications')).length")==2
                page.evaluate("const rows=JSON.parse(sessionStorage.getItem('qaApplications'));rows.at(-1).status='Aprovado';sessionStorage.setItem('qaApplications',JSON.stringify(rows))");page.reload();expect(page.get_by_role('heading',name='Cadastro aprovado. Boas-vindas!')).to_be_visible();assert page.get_by_role('link',name='Abrir minha loja' if role=='vendedor' else 'Abrir central de entregas').get_attribute('href')==role+'/index.html?modo=online';shot('aprovado-'+role)
            # Cadastro de cliente continua no formulário atual.
            if not admin_only:
                page.evaluate('sessionStorage.clear()');page.goto(base+'login.html?role=cliente&cadastro=1');expect(page.get_by_role('heading',name='Crie sua conta')).to_be_visible();expect(page.locator('#registerFields')).to_be_visible()
            # Fila do administrador: paginação, aprovação, motivo e recusa.
            applications=[{'id':str(i),'usuario_id':'candidate'+str(i),'email':'candidato'+str(i)+'@teste.invalid','perfil':'vendedor' if i%2 else 'entregador','dados':{'nome':'Parceiro QA '+str(i),'telefone':'65999990000','loja':'Loja QA','endereco':'Endereço de coleta de teste','horario':'8h às 18h','veiculo':'Bicicleta'},'status':'Pendente','criado_em':'2026-11-24T10:00:00-04:00'} for i in range(1,14)]
            if not page.url.startswith(base):page.goto(base+'login.html?role=admin')
            page.evaluate('(rows)=>{sessionStorage.clear();sessionStorage.setItem("qaRole","admin");sessionStorage.setItem("qaApplications",JSON.stringify(rows));}',applications)
            page.goto(base+'admin/index.html?modo=online#cadastros');expect(page.locator('.raiz-feedback')).to_have_text('');area=page.locator('#cadastros');expect(area.locator('.partner-request-card')).to_have_count(12)
            expect(page.locator('.raiz-content > section:visible')).to_have_count(1);expect(area.locator('.partner-request-metric strong')).to_have_text(['13','13']);page.evaluate('scrollTo(0,0)');shot('fila-admin')
            if width<760:assert page.locator('.raiz-section-nav').evaluate('(n)=>n.getBoundingClientRect().height<75')
            area.get_by_role('button',name='Próxima',exact=True).click();expect(area.locator('.partner-request-card')).to_have_count(1)
            dialog=page.locator('.partner-request-dialog');area.locator('.partner-request-review').first.click();expect(dialog).to_be_visible();expect(dialog).to_contain_text('Loja QA');dialog.get_by_role('button',name='Aprovar cadastro',exact=True).click();expect(dialog).to_contain_text('Aprovar este cadastro?');assert not page.evaluate("__qa.rpc.some(r=>r.name==='raiz_cadastro_decidir')");dialog.get_by_role('button',name='Voltar à análise').click();expect(dialog).to_contain_text('Antes de decidir');dialog.get_by_role('button',name='Aprovar cadastro',exact=True).click();dialog.get_by_role('button',name='Confirmar aprovação').click();expect(page.locator('.raiz-feedback')).to_contain_text('Cadastro aprovado');expect(area.locator('.partner-request-card')).to_have_count(12);expect(area.locator('.partner-request-pagination')).to_contain_text('página 1 de 1')
            area.locator('.partner-request-review').first.click();dialog.get_by_role('button',name='Recusar cadastro',exact=True).click();dialog.get_by_role('button',name='Confirmar recusa').click();expect(dialog.locator('[role=alert]')).to_contain_text('Informe o motivo');assert len(page.evaluate("__qa.rpc.filter(r=>r.name==='raiz_cadastro_decidir')"))==1
            dialog.get_by_label('Motivo da recusa').fill('Confira o endereço de coleta informado.');page.evaluate("sessionStorage.setItem('qaDecisionFail','1')");dialog.get_by_role('button',name='Confirmar recusa').click();expect(dialog.locator('[role=alert]')).to_contain_text('Não foi possível');expect(dialog.get_by_label('Motivo da recusa')).to_have_value('Confira o endereço de coleta informado.');page.evaluate("sessionStorage.removeItem('qaDecisionFail')");dialog.get_by_role('button',name='Confirmar recusa').click();expect(page.locator('.raiz-feedback')).to_contain_text('Cadastro recusado');expect(area.locator('.partner-request-metric strong')).to_have_text(['11','11'])
            area.get_by_label('Situação do cadastro').select_option('Recusado');expect(area.locator('.partner-request-card')).to_have_count(1);area.locator('.partner-request-review').first.click();expect(dialog.locator('.partner-request-reason')).to_contain_text('Confira o endereço de coleta informado.');shot('recusado-admin');dialog.get_by_role('button',name='Fechar',exact=True).click()
            area.get_by_label('Situação do cadastro').select_option('Aprovado');expect(area.locator('.partner-request-card')).to_have_count(1);area.locator('.partner-request-review').first.click();expect(dialog.get_by_role('button',name='Aprovar cadastro',exact=True)).to_have_count(0);dialog.get_by_role('button',name='Fechar',exact=True).click();fit()
            page.locator('.sidebar a[href="#usuarios"]').click();expect(page.locator('#usuarios')).to_be_visible();expect(area).to_be_hidden();expect(page.locator('.raiz-content > section:visible')).to_have_count(1);page.locator('.sidebar a[href="#cadastros"]').click();expect(area).to_be_visible()
            for suffix in ('','&destino=financeiro'):
                page.evaluate("sessionStorage.setItem('raiz_auth_destination_v1',JSON.stringify({role:'admin',section:'financeiro'}))");page.goto(base+'login.html?role=admin&modo=online'+suffix);expect(page).to_have_url(base+'admin/index.html?modo=online#cadastros');expect(page.locator('#cadastros')).to_be_visible();expect(page.locator('.raiz-feedback')).to_have_text('')
            page.goto(base+'admin/index.html?modo=online');expect(page).to_have_url(base+'admin/index.html?modo=online#cadastros');expect(page.locator('.raiz-feedback')).to_have_text('')
            page.evaluate("sessionStorage.removeItem('qaRole')");page.goto(base+'login.html?role=admin&modo=online');page.locator('#inputEmail').fill('admin@teste.invalid');page.locator('#inputSenha').fill('SenhaDoTeste123!');page.locator('#btnSubmit').click();expect(page).to_have_url(base+'admin/index.html?modo=online#cadastros');expect(page.locator('.raiz-feedback')).to_have_text('')
            page.evaluate("sessionStorage.setItem('qaListFail','1')");page.locator('#cadastros').get_by_role('button',name='Atualizar solicitações').click();expect(area.locator('[role=alert]')).to_contain_text('Não foi possível carregar');expect(area.locator('.partner-request-metric strong')).to_have_text(['—','—']);page.evaluate("sessionStorage.removeItem('qaListFail')");area.get_by_role('button',name='Tentar novamente').click();expect(area.locator('.partner-request-card')).to_have_count(11)
            page.evaluate("sessionStorage.setItem('qaApplications','[]')");area.get_by_role('button',name='Atualizar solicitações').click();expect(area).to_contain_text('Nenhum cadastro aguardando análise');expect(area.locator('.partner-request-metric strong')).to_have_text(['0','0']);page.evaluate('scrollTo(0,0)');shot('vazio-admin')
            assert not errors,errors;context.close();results.append({'width':width,'wizard_checked':not admin_only,'admin_approve_reject':True,'confirmation':True,'retry_preserves_reason':True,'pagination':True,'default_admin_login':True,'empty_error_states':True,'errors':errors})
        browser.close()
    (ROOT/'tests/resultado_partner_registration.json').write_text(json.dumps(results,indent=2),encoding='utf-8');print(json.dumps(results))
finally:server.shutdown();thread.join();server.server_close()
