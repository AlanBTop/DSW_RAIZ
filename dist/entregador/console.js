/* Central do entregador: apresentação sobre as operações autenticadas existentes. */
(() => {
  const money = new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'});
  const sections = ['disponibilidade','andamento','ofertas','historico','carteira','privacidade'];
  const paths = {
    disponibilidade:'M3 10 12 3l9 7v11h-6v-7H9v7H3V10Z',
    andamento:'M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0ZM12 7v6m-3-3h6',
    ofertas:'M3 6h11v11H3V6Zm11 4h4l3 3v4h-7M7 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm11 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
    historico:'M3 11a9 9 0 1 1 2 7M3 4v7h7m2-4v5l3 2',
    carteira:'M3 6h18v15H3V6Zm0 4h18m-5 5h2M7 6V3h10v3',
    privacidade:'M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM4 21v-2a8 8 0 0 1 16 0v2',
    leaf:'M20 4C9 2 3 7 5 14s15 6 15-10ZM4 21l11-11'
  };
  function el(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;}
  function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');for(const[k,v]of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(k,v);const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[name]||paths.leaf);svg.append(path);return svg;}
  function link(text,href,cls='courier-link'){const n=el('a',text,cls);n.href=href;return n;}
  function panel(title,cls=''){const n=el('article',null,'courier-panel '+cls);if(title)n.append(el('h3',title));return n;}
  function lead(area,text){area.append(el('p',text,'courier-lead'));}
  function empty(area,title,copy,href,label){const n=panel(null,'courier-empty');n.append(icon('leaf'),el('h3',title),el('p',copy));if(href)n.append(link(label,href,'raiz-button courier-secondary'));area.append(n);}
  function badge(text,positive=false){return el('span',text,'courier-badge'+(positive?' is-positive':''));}
  function configure({main,sidebar,navigation}){
    main.classList.add('courier-console');
    main.querySelector('.topbar .tiny').textContent='RAIZ · Cuidado em cada entrega';
    const header=document.getElementById('storeHeader');header.classList.add('courier-site-header');
    header.querySelector('.site-categories')?.remove();header.querySelector('#siteCart')?.remove();header.querySelector('#storeSearch')?.remove();
    header.querySelector('.site-brand').after(el('span','Central do entregador','courier-header-label'));
    const account=header.querySelector('#storeAccount');account.href='#privacidade';account.textContent='Minha conta';
    header.querySelector('.site-account').prepend(link('Ver marketplace','../index.html','courier-marketplace'));
    sidebar.querySelector('.logo')?.remove();sidebar.querySelector('.sidebar-caption')?.remove();sidebar.prepend(el('p','CENTRAL DO ENTREGADOR','courier-sidebar-label'));
    navigation.firstChild.textContent='Ver oportunidades';navigation.firstChild.href='#ofertas';
    const logout=navigation.lastChild;logout.remove();return logout;
  }
  function decorateNav(nav){for(const a of nav.querySelectorAll('a'))a.replaceChildren(icon(a.dataset.section),el('span',nav.classList.contains('bottom-nav')?({disponibilidade:'Início',andamento:'Entregas',ofertas:'Ofertas',historico:'Histórico',carteira:'Carteira',privacidade:'Perfil'}[a.dataset.section]):a.dataset.section==='privacidade'?'Meu perfil':a.textContent));}
  function show(content,hash){const current=sections.includes(hash)?hash:'disponibilidade';for(const n of content.children)if(n.tagName==='SECTION')n.hidden=n.id!==current;document.title=(document.getElementById(current)?.querySelector('h2')?.textContent||'Central do entregador')+' · RAIZ';return current;}
  function routeStop(title,address,name){const row=el('div',null,'courier-stop');row.append(icon('andamento'));const copy=el('div');copy.append(el('span',title));if(name)copy.append(el('strong',name));copy.append(el('p',address||'Endereço não informado'));row.append(copy);return row;}
  function render({profile,offers,trips,history,wallet,totals,state,section,action,field,rpc,reload,onProfile,onAccepted}){
    const home=section('Visão geral','disponibilidade','Visão geral');
    lead(home,'Seu dia de entregas, organizado do aceite até o destino.');
    if(!profile){empty(home,'Seu cadastro precisa de um vínculo','Fale com a equipe RAIZ para vincular sua conta ao perfil de entregador.','mailto:suporteraiz.mkt@hotmail.com','Falar com o suporte');}
    if(profile){
      const status=panel(null,'courier-availability');const copy=el('div');copy.append(badge(profile.online?'Online para entregas':'Offline',profile.online),el('h3',profile.online?'Pronto para levar mais verde?':'Faça uma pausa quando precisar.'),el('p',profile.online?'Consulte as oportunidades e escolha sua próxima entrega.':'Fique online para receber novas oportunidades. Suas entregas em andamento continuam disponíveis.'));const toggle=action(profile.online?'Ficar offline':'Ficar online',()=>rpc('disponibilidade',{p_online:!profile.online}),'Disponibilidade atualizada.');toggle.setAttribute('aria-label',profile.online?'Ficar offline':'Ficar online');status.append(copy,toggle);home.append(status);
      const metrics=el('div',null,'courier-metrics');for(const[label,value,hash,symbol]of [['Entregas de hoje',String(profile.total_corridas_hoje||0),'#historico','ofertas'],['Ganhos de hoje',money.format(profile.ganhos_hoje||0),'#carteira','carteira'],['Em andamento',String(totals.entregador_corridas||0),'#andamento','andamento'],['Saldo registrado',money.format(profile.saldo_carteira||0),'#carteira','carteira']]){const tile=link('',hash,'courier-metric');tile.append(icon(symbol),el('span',label),el('strong',value));metrics.append(tile);}home.append(metrics);
      const next=panel('Sua próxima parada');if(trips.length){const t=trips[0];next.append(badge(t.etapa_atual===1?'Aguardando coleta':'A caminho do destino',true),el('p','Entrega #'+t.id+' · '+t.item_descricao),routeStop(t.etapa_atual===1?'Coleta':'Entrega',t.etapa_atual===1?t.coleta_endereco:t.entrega_endereco,t.etapa_atual===1?t.coleta_loja:null),link('Continuar entrega','#andamento','raiz-button'));}else{next.append(el('p',profile.online?'Você está livre para uma nova entrega.':'Nenhuma entrega em andamento.'),link('Consultar oportunidades','#ofertas','raiz-button courier-secondary'));}
      const care=panel('Cuidado que acompanha a entrega','courier-care');care.append(icon('leaf'),el('p','Mantenha os vasos em pé, proteja as embalagens e evite pressionar a folhagem. Confira cada item com a loja antes de sair.'));
      const duo=el('div',null,'courier-overview');duo.append(next,care);home.append(duo);
    }
    const active=section('Entregas em andamento','andamento','Em andamento');lead(active,'Confira a rota e confirme cada etapa ao finalizar.');
    if(!trips.length)empty(active,'Tudo em dia por aqui','Quando você aceitar uma entrega, os endereços e as etapas aparecerão aqui.','#ofertas','Ver oportunidades');
    const tripGrid=el('div',null,'courier-trips');active.append(tripGrid);
    const step=(id,number,pot=false,leaves=false,delivered=false)=>rpc('etapa',{p_pedido:id,p_etapa:number,p_vaso:pot,p_folhagem:leaves,p_entrega:delivered});
    for(const t of trips){
      const row=panel(null,'courier-trip');const head=el('div',null,'courier-card-head');const copy=el('div');copy.append(el('span','Entrega #'+t.id,'courier-kicker'),el('h3',t.item_descricao||'Pedido para entrega'));head.append(copy,badge(t.etapa_atual===1?'Coleta pendente':'Entrega pendente',true));row.append(head);
      const progress=el('ol',null,'courier-progress');for(const [i,label]of ['Aceita','Coleta','Entrega'].entries()){const li=el('li',label,i<t.etapa_atual?'is-done':'');if(i===t.etapa_atual)li.setAttribute('aria-current','step');progress.append(li);}row.append(progress);
      row.append(routeStop('Retirar em',t.coleta_endereco,t.coleta_loja),routeStop('Entregar em',t.entrega_endereco));
      const maps=el('div',null,'courier-map-actions');const primary=RaizMaps.route('',t.etapa_atual===1?t.coleta_endereco:t.entrega_endereco),full=RaizMaps.route(t.coleta_endereco,t.entrega_endereco);for(const[url,label]of [[primary,t.etapa_atual===1?'Ir até a coleta no Google Maps':'Ir até a entrega no Google Maps'],[full,'Ver rota completa no Google Maps']]){if(url){const a=link(label,url,'courier-map-link');a.target='_blank';a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';maps.append(a);}}row.append(maps);
      row.append(el('p',t.fragil?'Carga frágil · mantenha o vaso em pé e proteja a folhagem.':'Confira os itens e a integridade da embalagem na coleta.','courier-notice'));
      const checks=el('fieldset',null,'courier-checklist');checks.append(el('legend',t.etapa_atual===1?'Antes de confirmar a coleta':'Ao chegar ao destino'));
      if(t.etapa_atual===1){const [potLabel,pot]=field('Embalagem ou vaso protegido','checkbox'),[leavesLabel,leaves]=field('Produto e folhagem conferidos','checkbox');const confirm=action('Confirmar coleta',()=>step(t.id,2,pot.checked,leaves.checked),'Coleta confirmada. Siga até o destino.');confirm.disabled=true;pot.onchange=leaves.onchange=()=>confirm.disabled=!(pot.checked&&leaves.checked);checks.append(potLabel,leavesLabel,confirm);}
      else if(t.etapa_atual===2){const[label,received]=field('Entrega recebida no destino','checkbox');const confirm=action('Concluir entrega',()=>step(t.id,3,false,false,received.checked),'Entrega concluída. Confira seu histórico.');confirm.disabled=true;received.onchange=()=>confirm.disabled=!received.checked;checks.append(label,confirm);}row.append(checks,el('p','Valor da entrega: '+money.format(t.valor||0),'courier-trip-value'));tripGrid.append(row);
    }
    const available=section('Entregas disponíveis','ofertas','Oportunidades');lead(available,'Escolha uma entrega para ver os endereços e iniciar a coleta.');
    if(!profile)empty(available,'Cadastro aguardando vínculo','Entre em contato com a equipe para começar.');
    else if(!profile.online)empty(available,'Você está offline','Ative sua disponibilidade na visão geral para consultar as oportunidades.','#disponibilidade','Gerenciar disponibilidade');
    else if(!offers.length)empty(available,'Nenhuma oportunidade por enquanto','Novas entregas aparecem quando uma loja confirma o preparo. Use Atualizar para consultar novamente.');
    else{available.append(el('p',totals.ofertas!=null?totals.ofertas+' entrega(s) disponível(is)':'Oportunidades nesta consulta','courier-result'));const grid=el('div',null,'courier-offers');for(const o of offers){const row=panel(null,'courier-offer');const head=el('div',null,'courier-card-head');head.append(el('span','Entrega #'+o.id,'courier-kicker'),badge(o.fragil?'Carga frágil':'Coleta disponível'));row.append(head,el('h3',o.coleta_loja),el('p',o.item_descricao,'courier-offer-items'),el('strong',money.format(o.valor),'courier-offer-value'),el('span','Valor da entrega','courier-value-label'));row.append(action('Aceitar entrega',async()=>{await step(o.id,1);onAccepted();window.history.replaceState(null,'','#andamento');},'Entrega aceita. Confira o endereço de coleta.'));grid.append(row);}available.append(grid);}
    const past=section('Histórico de entregas','historico','Histórico');lead(past,'Consulte as entregas já encerradas e sua situação.');
    const toolbar=el('div',null,'courier-filter');const label=el('label','Situação da entrega'),select=el('select');for(const[value,text]of [['','Todas as situações'],['Concluída','Concluídas'],['Cancelada','Canceladas']]){const option=el('option',text);option.value=value;select.append(option);}select.value=state.history;select.onchange=()=>{state.history=select.value;reload('entregador_historico');};label.append(select);toolbar.append(label);past.append(toolbar);
    if(!history.length)empty(past,'Nenhuma entrega nesta seleção','As entregas encerradas serão listadas aqui.');
    else {const table=el('div',null,'courier-records');for(const t of history){const row=el('article',null,'courier-record');row.append(icon('historico'),el('strong','Entrega #'+t.corrida_id),el('span',t.data_formatada||'Data não informada'),badge(t.status,t.status==='Concluída'));table.append(row);}past.append(table);}
    const funds=section('Minha carteira','carteira','Carteira');lead(funds,'Acompanhe os valores registrados na sua conta de entregador.');
    if(profile){const summary=panel(null,'courier-balance');summary.append(el('span','Saldo registrado'),el('strong',money.format(profile.saldo_carteira||0)),el('p','Ganhos de hoje: '+money.format(profile.ganhos_hoje||0)));funds.append(summary);}
    funds.append(el('h3','Movimentações','courier-subheading'));
    if(!wallet.length)empty(funds,'Sua carteira ainda não tem movimentações','Os valores registrados aparecerão aqui após as entregas.');
    else{const records=el('div',null,'courier-records');for(const w of wallet){const row=el('article',null,'courier-record courier-wallet-row'),copy=el('div');copy.append(el('strong',w.descricao||w.tipo||'Movimentação'),el('small',w.data_formatada||'Data não informada'));row.append(copy,badge(w.status||'Registrado'),el('strong',money.format(w.valor)));records.append(row);}funds.append(records);}
    funds.append(el('p','Os valores fazem parte da operação acadêmica da RAIZ. Não há transferência bancária nesta tela.','courier-footnote'));
    onProfile(profile);
  }
  function privacy(area,{user,profile,logout}){const title=area.firstChild;title.textContent='Meu perfil e privacidade';const children=[...area.children].slice(1);const identity=panel(null,'courier-profile');const avatar=el('span',(profile?.nome||user.email||'E').slice(0,1).toUpperCase(),'courier-profile-avatar');const copy=el('div');copy.append(el('h3',profile?.nome||'Conta de entregador'),el('p',user.email||'Conta autenticada'));identity.append(avatar,copy,badge('Entregador',true));const data=panel('Dados do entregador');const details=el('dl',null,'courier-profile-data');for(const[label,value]of [['Nome',profile?.nome||'Aguardando vínculo'],['Veículo',profile?.veiculo||'Não informado'],['Disponibilidade',profile?(profile.online?'Online':'Offline'):'Aguardando vínculo']]){const row=el('div');row.append(el('dt',label),el('dd',value));details.append(row);}data.append(details,el('p','Para atualizar seu cadastro ou veículo, entre em contato com a equipe.','courier-footnote'),link('Falar com o suporte','mailto:suporteraiz.mkt@hotmail.com'));const privacy=panel('Privacidade e documentos');privacy.append(...children);const session=panel('Acesso à conta');session.append(el('p','Encerre a sessão ao terminar de usar um dispositivo compartilhado.'));logout.textContent='Sair da conta';session.append(logout);area.replaceChildren(title,el('p','Seus dados, documentos e acesso em um só lugar.','courier-lead'),identity,data,privacy,session);}
  window.RaizCourier={configure,decorateNav,show,render,privacy};
})();
