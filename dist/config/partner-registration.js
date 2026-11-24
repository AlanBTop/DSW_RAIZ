/* Jornada de candidatura. O acesso operacional depende da decisão no servidor. */
(() => {
  const content=document.getElementById('partnerContent'),feedback=document.getElementById('partnerFeedback');
  const params=new URLSearchParams(location.search),roles={vendedor:'Vendedor',entregador:'Entregador'};
  let profile=Object.hasOwn(roles,params.get('perfil'))?params.get('perfil'):'vendedor',step=0,db,user,request,busy=false;
  const draft={nome:'',telefone:'',loja:'',endereco:'',horario:'',veiculo:'Bicicleta',email:''};
  function prepareHeader(){const shell=RaizShell.mount({role:profile});shell.header.classList.add('partner-registration-header');
  shell.header.querySelector('#storeSearch')?.remove();shell.header.querySelector('.site-categories')?.remove();shell.header.querySelector('#siteCart')?.remove();
  const headerLabel=document.createElement('span');headerLabel.className='partner-header-title';headerLabel.textContent='Cadastro de parceiros';shell.header.querySelector('.site-brand').after(headerLabel);
  const account=shell.header.querySelector('#storeAccount');account.href='#partnerMain';account.textContent='Meu cadastro';}
  function el(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;}
  function link(text,href,cls='raiz-button'){const n=el('a',text,cls);n.href=href;return n;}
  function button(text,handler,secondary=false){const b=el('button',text,'raiz-button'+(secondary?' partner-secondary':''));b.type='button';b.onclick=handler;return b;}
  function say(text){feedback.textContent=text;}
  const rpc=(name,args)=>RaizApi.rpc(db,name,args);
  function errorText(error){if(error?.code==='P0001')return error.message;if(['PGRST202','42883'].includes(error?.code))return 'O cadastro de parceiros está em preparação. Tente novamente mais tarde.';return RaizAccess.authError(error);}
  function review(parent,data,role){const list=el('dl',null,'partner-review');for(const[label,value]of [['Perfil',roles[role]],['Nome',data.nome],['Telefone',data.telefone],...(role==='vendedor'?[['Loja',data.loja],['Endereço de coleta',data.endereco],['Funcionamento',data.horario||'Não informado']]:[['Veículo',data.veiculo]])]){const row=el('div');row.append(el('dt',label),el('dd',value));list.append(row);}parent.append(list);}
  function input(parent,key,label,type='text',options={}){const wrap=el('label',label),n=el(options.area?'textarea':'input');if(!options.area)n.type=type;n.name=key;n.id='partner-'+key;n.value=draft[key]||'';n.required=options.required!==false;if(options.max)n.maxLength=options.max;if(options.min)n.minLength=options.min;if(options.auto)n.autocomplete=options.auto;if(options.hint)n.placeholder=options.hint;n.oninput=()=>{draft[key]=n.value;};wrap.append(n);if(options.full)wrap.className='full';parent.append(wrap);return n;}
  function payload(){return {nome:draft.nome.trim(),telefone:RaizPhone.digits(draft.telefone),...(profile==='vendedor'?{loja:draft.loja.trim(),endereco:draft.endereco.trim(),horario:draft.horario.trim()}:{veiculo:draft.veiculo})};}
  function validate(form){
    if(!form.reportValidity())return false;
    const phone=form.querySelector('[name=telefone]');
    if(!phone)return true;
    draft.telefone=phone.value;
    if(RaizPhone.valid(RaizPhone.digits(draft.telefone)))return true;
    say('Informe um celular ou telefone fixo brasileiro com DDD. Exemplo: (65) 99654-3210.');
    phone.focus();
    return false;
  }
  function wizard(){
    say('');content.replaceChildren();const steps=el('ol',null,'partner-steps');for(const[i,label]of ['Seus dados','Dados do perfil','Revisão e envio'].entries()){const n=el('li',label,i<step?'is-complete':'');if(i===step)n.setAttribute('aria-current','step');steps.append(n);}content.append(steps);
    const form=el('form',null,'partner-form');form.setAttribute('aria-label','Cadastro de parceiro');form.append(el('h2',['Vamos nos conhecer','Conte mais sobre seu trabalho','Revise antes de enviar'][step]));content.append(form);
    if(step===0){
      const choice=el('fieldset');choice.append(el('legend','Como você quer participar?'));for(const[value,label,description]of [['vendedor','Quero vender','Cadastre sua loja e seus produtos.'],['entregador','Quero fazer entregas','Faça coletas e entregas na RAIZ.']]){const wrap=el('label',null,'partner-choice'),radio=el('input');radio.type='radio';radio.name='perfil';radio.value=value;radio.checked=profile===value;radio.onchange=()=>{profile=value;window.history.replaceState(null,'','?perfil='+profile);};const copy=el('span',label);copy.append(el('small',description));wrap.append(radio,copy);choice.append(wrap);}form.append(choice);
      const fields=el('div',null,'partner-fields');input(fields,'nome','Nome completo','text',{min:3,max:150,auto:'name'});
      const phone=input(fields,'telefone','Telefone com DDD','tel',{max:19,auto:'tel',hint:'(65) 99654-3210'});
      phone.value=RaizPhone.format(phone.value);
      phone.oninput=()=>{phone.value=RaizPhone.format(phone.value);draft.telefone=phone.value;};
      form.append(fields);
    }else if(step===1){
      if(profile==='vendedor'){form.append(el('p','Essas informações identificam sua loja e o local de coleta dos pedidos.'));input(form,'loja','Nome da loja','text',{min:3,max:150,auto:'organization'});input(form,'endereco','Endereço completo de coleta','text',{min:10,max:500,area:true,auto:'street-address',hint:'Rua, número, bairro, cidade e estado'});input(form,'horario','Horário de funcionamento (opcional)','text',{max:100,required:false,hint:'Segunda a sexta, das 8h às 18h'});}
      else{form.append(el('p','Informe o veículo que você usará para realizar as entregas.'));const label=el('label','Veículo de entrega'),select=el('select');select.name='veiculo';for(const name of ['Bicicleta','Motocicleta','Carro','Utilitário']){const o=el('option',name);o.value=name;select.append(o);}select.value=draft.veiculo;select.onchange=()=>{draft.veiculo=select.value;};label.append(select);form.append(label);}
    }else{
      review(form,payload(),profile);
      if(!user){form.append(el('h3','Crie seu acesso'));input(form,'email','E-mail','email',{max:254,auto:'email'});const pwd=input(form,'password','Senha','password',{min:8,max:128,auto:'new-password'});pwd.pattern='(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}';pwd.title='Use pelo menos 8 caracteres, com maiúscula, minúscula, número e símbolo.';form.append(el('p','Use pelo menos 8 caracteres, com maiúscula, minúscula, número e símbolo.','partner-hint'));input(form,'confirm','Confirmar senha','password',{min:8,max:128,auto:'new-password'});}
      else form.append(el('p','Solicitação vinculada a '+user.email+'.','partner-hint'));
      const terms=el('label',null,'partner-terms'),check=el('input');check.type='checkbox';check.name='termos';check.required=true;const copy=el('span');copy.append('Li e aceito os ',link('termos de uso','termos.html',''),' e estou ciente da ',link('política de privacidade','privacidade.html',''),'.');copy.querySelectorAll('a').forEach(a=>{a.target='_blank';a.rel='noopener';});terms.append(check,copy);form.append(terms,el('p','O envio não libera o acesso de parceiro. O administrador recebe seus dados e decide pela aprovação ou recusa. Cada conta possui um perfil operacional.','partner-hint'));
    }
    const actions=el('div',null,'partner-actions');if(step>0)actions.append(button('Voltar',()=>{step--;wizard();},true));else actions.append(link('Voltar ao login','login.html?role='+profile,'raiz-button partner-secondary'));
    const next=el('button',step===2?'Enviar para análise':'Continuar','raiz-button');next.type='submit';actions.append(next);form.append(actions);
    form.onsubmit=async event=>{event.preventDefault();if(busy||!validate(form))return;if(step<2){step++;wizard();window.scrollTo(0,0);return;}if(!user&&draft.password!==draft.confirm){say('As senhas não coincidem.');form.querySelector('[name=confirm]').focus();return;}await send(next);};
    const access=el('p',null,'partner-login-link');access.append(user?'Você já está autenticado. ':'Já possui uma conta? ',link(user?'Trocar de conta':'Entrar com minha conta','login.html?role='+profile,''));if(user)access.replaceChildren(button('Sair e usar outra conta',async()=>{const r=await db.auth.signOut({scope:'local'});if(r.error){say(errorText(r.error));return;}location.reload();},true));content.append(access);
  }
  async function submitPending(data,role){await rpc('cadastro_enviar',{p_perfil:role,p_dados:data,p_termos:'2026-11-23'});request=await rpc('cadastro_status');if(!request)throw new Error('Solicitação não encontrada');status();}
  async function send(control){busy=true;control.disabled=true;say('Enviando sua solicitação…');try{
    if(!user){const data=payload();const {data:auth,error}=await db.auth.signUp({email:draft.email.trim().toLowerCase(),password:draft.password,options:{emailRedirectTo:RaizAccess.callback(profile),data:{full_name:data.nome,telefone:data.telefone,perfil_solicitado:profile,raiz_candidatura:{versao:1,perfil:profile,dados:data,termos_versao:'2026-11-23'}}}});if(error)throw error;delete draft.password;delete draft.confirm;if(!auth.session){content.replaceChildren();const panel=el('section',null,'partner-status');panel.append(el('span','Confirmação de e-mail','partner-status-tag'),el('h2','Confirme seu e-mail para continuar'),el('p','Enviamos as instruções de confirmação para o e-mail informado. Após confirmar e entrar na conta, sua solicitação será registrada para análise do administrador.'),link('Ir para o login','login.html?role='+profile));content.append(panel);say('');return;}user=auth.user;}
    await submitPending(payload(),profile);
  }catch(error){say(errorText(error));}finally{busy=false;control.disabled=false;}}
  function status(){say('');content.replaceChildren();const panel=el('section',null,'partner-status');const tag=el('span',request.status,'partner-status-tag');tag.dataset.status=request.status;panel.append(tag,el('h2',({Pendente:'Seu cadastro está em análise',Aprovado:'Cadastro aprovado. Boas-vindas!',Recusado:'Seu cadastro não foi aprovado'})[request.status]),el('p','Solicitação de '+roles[request.perfil]+' · enviada em '+new Date(request.criado_em).toLocaleDateString('pt-BR')),el('p','Protocolo: '+request.id,'partner-hint'));
    if(request.status==='Pendente'){panel.append(el('p','O administrador recebeu sua solicitação. Você pode voltar a esta página para acompanhar a decisão.'));const stages=el('ol');for(const text of ['Dados enviados para a equipe RAIZ.','Análise das informações pelo administrador.','Liberação do acesso somente após a aprovação.'])stages.append(el('li',text));panel.append(stages);}
    if(request.status==='Recusado'){panel.append(el('p','Motivo informado pelo administrador:'),el('p',request.motivo,'partner-reason'));}
    review(panel,request.dados,request.perfil);const actions=el('div',null,'partner-actions');
    if(request.status==='Aprovado')actions.append(link(request.perfil==='vendedor'?'Abrir minha loja':'Abrir central de entregas',request.perfil+'/index.html?modo=online'));
    else if(request.status==='Recusado')actions.append(button('Revisar e reenviar',()=>{Object.assign(draft,request.dados);profile=request.perfil;step=0;wizard();}));
    actions.append(button('Atualizar situação',async()=>{if(busy)return;busy=true;try{request=await rpc('cadastro_status');if(request)status();}catch(e){say(errorText(e));}finally{busy=false;}},true),link('Voltar ao marketplace','index.html','raiz-button partner-secondary'));panel.append(actions);content.append(panel);}
  async function start(){try{await RaizDB.ready;prepareHeader();db=RaizDB.getClient();const config=await rpc('cadastro_config');if(config?.versao!==1)throw {code:'PGRST202'};const session=await db.auth.getUser();if(session.error&&session.error.name!=='AuthSessionMissingError')throw session.error;user=session.data?.user;request=user?await rpc('cadastro_status'):null;
    if(request){status();return;}
    if(user){const access=await rpc('acesso');if(access!=='cliente'){content.replaceChildren(el('section',null,'partner-status'));const panel=content.firstChild;panel.append(el('h2','Sua conta já possui um perfil'),el('p','Use seu acesso atual para continuar.'),link('Abrir minha área',access+'/index.html?modo=online'));return;}
      const saved=user.user_metadata?.raiz_candidatura;if(saved?.versao===1&&Object.hasOwn(roles,saved.perfil)&&saved.dados&&saved.termos_versao==='2026-11-23'){profile=saved.perfil;Object.assign(draft,saved.dados);await submitPending(payload(),profile);return;}
      draft.nome=user.user_metadata?.full_name||'';draft.telefone=user.user_metadata?.telefone||'';
    }wizard();
  }catch(error){say(errorText(error));content.replaceChildren(link('Voltar ao login','login.html?role='+profile,'raiz-button partner-secondary'));}}
  start();
})();
