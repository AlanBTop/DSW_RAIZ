/* Central do vendedor: componentes de operação sobre o contrato existente. */
(() => {
  const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  const labels={plantas:'Plantas',vasos:'Vasos',insumos:'Insumos',ferramentas:'Ferramentas'};
  const paths={
    home:'M3 10 12 3l9 7v11h-6v-7H9v7H3V10Z',
    box:'m3 7 9-5 9 5v10l-9 5-9-5V7Zm0 0 9 5 9-5M12 12v10M7.5 4.5l9 5',
    leaf:'M20 4C9 2 3 7 5 14s15 6 15-10ZM4 21l11-11',
    shop:'M3 10h18l-2-7H5l-2 7Zm2 0v11h14V10M9 21v-7h6v7',
    chart:'M4 3v18h17M8 16v-4m5 4V7m5 9V4',
    shield:'m12 2 8 4v6c0 6-8 10-8 10S4 18 4 12V6l8-4Zm-4 10 3 3 5-6',
    plus:'M12 5v14M5 12h14'
  };
  function el(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;}
  function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');for(const[k,v]of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.6','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(k,v);const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',paths[name]||paths.leaf);svg.append(p);return svg;}
  function anchor(text,hash,cls='seller-link'){const a=el('a',text,cls);a.href=hash;return a;}
  function art(category){const img=el('img',null,'seller-product-art');img.src='../assets/catalog-'+(labels[category]?category:'plantas')+'.svg';img.alt='';img.width=64;img.height=64;return img;}
  function configure({main,sidebar,navigation,onSearch}){
    main.classList.add('seller-console');
    const header=document.getElementById('storeHeader');header.classList.add('seller-site-header');
    header.querySelector('.site-categories')?.remove();header.querySelector('#siteCart')?.remove();
    const account=header.querySelector('#storeAccount');account.textContent='Minha conta';account.href='#privacidade';
    const marketplace=anchor('Ver marketplace','../index.html','seller-marketplace-link');header.querySelector('.site-account').prepend(marketplace);
    const query=header.querySelector('#storeQuery');query.placeholder='Buscar produtos da sua loja';
    header.querySelector('#storeSearch label').textContent='Buscar produtos da loja';
    header.querySelector('#storeSearch').onsubmit=e=>{e.preventDefault();onSearch(query.value.trim());};
    sidebar.querySelector('.logo')?.remove();sidebar.querySelector('.sidebar-caption')?.remove();
    sidebar.prepend(el('p','CENTRAL DO VENDEDOR','seller-sidebar-label'));
    const create=el('button',null,'raiz-button seller-new-product');create.type='button';create.append(icon('plus'),document.createTextNode('Cadastrar produto'));
    create.onclick=()=>{location.hash='produtos';const details=document.querySelector('.raiz-create');if(details){details.open=true;details.scrollIntoView({block:'start'});details.querySelector('input')?.focus();}};
    navigation.append(create);
  }
  function decorateNav(nav){const symbols={visao:'home',pedidos:'box',produtos:'leaf',loja:'shop',estatisticas:'chart',financeiro:'chart',privacidade:'shield'};for(const a of nav.querySelectorAll('a')){const text=a.dataset.section==='privacidade'?'Conta e privacidade':a.textContent;a.replaceChildren(icon(symbols[a.dataset.section]),el('span',text));}}
  async function summary(db){
    if(window.RaizDB.isLocal){
      const [p,o]=await Promise.all([RaizApi.all(db,'vendedor_produtos','id,ativo,estoque'),RaizApi.all(db,'vendedor_pedidos','id,status')]);
      return {products:p.length,active:p.filter(x=>x.ativo).length,empty:p.filter(x=>x.ativo&&x.estoque===0).length,pending:o.filter(x=>x.status==='Pendente').length};
    }
    async function count(view,filters={}){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
      try{let request=db.from(view).select('id',{count:'exact',head:true});for(const[k,v]of Object.entries(filters))request=request.eq(k,v);const result=await(request.abortSignal?request.abortSignal(controller.signal):request);if(result.error)throw result.error;if(result.count==null)throw new Error('Contagem indisponível');return result.count;}finally{clearTimeout(timer);}
    }
    const [products,active,empty,pending]=await Promise.all([count('vendedor_produtos'),count('vendedor_produtos',{ativo:true}),count('vendedor_produtos',{ativo:true,estoque:0}),count('vendedor_pedidos',{status:'Pendente'})]);return {products,active,empty,pending};
  }
  function render({stores,products,orders,items,sales,counts,recentOrders,emptyProducts,payments,canCancel,state,totals,section,productForm,action,button,field,selectCategory,list,card,paymentCard,cancellation,reload}){
    const store=stores[0];
    const createButton=document.querySelector('.seller-new-product');if(createButton)createButton.disabled=!store;
    const overview=section('Visão geral','visao','Visão geral');
    overview.append(el('p',store?'O essencial para cuidar da sua loja, todos os dias.':'Sua conta de vendedor precisa ser vinculada a uma loja para começar.','seller-lead'));
    const metrics=el('div',null,'seller-metrics');
    for(const[key,title,symbol,hash]of [['pending','Pedidos para preparar','box','#pedidos'],['active','Produtos ativos','leaf','#produtos'],['empty','Ativos sem estoque','box','#produtos'],['products','Produtos cadastrados','shop','#produtos']]){
      const tile=anchor('',hash,'seller-metric');tile.append(icon(symbol),el('span',title),el('strong',counts[key]));metrics.append(tile);
    }
    overview.append(metrics);
    const panels=el('div',null,'seller-overview-panels');
    const recent=el('div',null,'seller-panel');const recentHead=el('div',null,'seller-panel-heading');recentHead.append(el('h3','Pedidos recentes'),anchor('Ver pedidos','#pedidos'));recent.append(recentHead);
    if(!recentOrders.length)recent.append(el('p','Sua loja ainda não recebeu pedidos.','seller-empty'));
    for(const o of recentOrders.slice(0,4)){const row=anchor('','#pedidos','seller-recent-order');const copy=el('span');copy.append(el('strong','Pedido #'+o.id),el('small',o.cliente_nome));row.append(copy,el('span',o.status,'seller-status'),el('strong',money.format(o.total)));recent.append(row);}
    const attention=el('div',null,'seller-panel');attention.append(el('h3','Atenção ao catálogo'));
    if(!emptyProducts.length)attention.append(el('p','Nenhum produto ativo está sem estoque.','seller-empty'));
    for(const p of emptyProducts.slice(0,3)){const row=anchor('','#produtos','seller-stock-alert');row.append(art(p.categoria),el('span',p.nome),el('small','Repor estoque'));attention.append(row);}
    attention.append(anchor('Gerenciar produtos','#produtos','seller-secondary-link'));
    panels.append(recent,attention);overview.append(panels);
    const flow=el('div',null,'seller-workflow');flow.append(el('h3','Da sua loja até o cliente'),el('p','Cadastre seus produtos, acompanhe os pedidos e confirme o preparo para disponibilizar a coleta ao entregador.'));overview.append(flow);

    const inventory=section('Produtos e estoque','produtos','Produtos e estoque');inventory.append(el('p','Gerencie os anúncios que os clientes encontram no marketplace.','seller-lead'));
    if(!store)inventory.append(el('p','O cadastro de produtos fica disponível após a vinculação da loja.','raiz-empty'));
    else {const create=el('details',null,'raiz-create seller-create');create.append(el('summary','Cadastrar produto','raiz-button'),el('p','Informe os dados do produto. O anúncio ativo será exibido no catálogo da RAIZ.','seller-form-hint'),productForm());inventory.append(create);}
    const toolbar=el('div',null,'seller-inventory-toolbar');
    const [searchLabel,search]=field('Buscar produto no estoque','search',state.search);search.placeholder='Nome do produto';
    const [categoryLabel,category]=selectCategory(state.category,true);
    const availabilityLabel=el('label','Disponibilidade');const availability=el('select');for(const[value,label]of [['','Todos os produtos'],['ativos','Ativos'],['pausados','Pausados'],['sem-estoque','Sem estoque']]){const option=el('option',label);option.value=value;availability.append(option);}availability.value=state.availability;availabilityLabel.append(availability);
    const searchServer=()=>{Object.assign(state,{search:search.value,category:category.value,availability:availability.value});reload('vendedor_produtos');};
    search.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();searchServer();}};category.onchange=availability.onchange=searchServer;
    toolbar.append(searchLabel,categoryLabel,availabilityLabel,button('Buscar',searchServer));inventory.append(toolbar,el('p',(totals.vendedor_produtos||0)+' produto(s) encontrado(s)','seller-result-count'));
    const stock=el('div',null,'seller-stock-table');
    const tableHead=el('div',null,'seller-stock-head');for(const text of ['Produto','Preço','Estoque','Situação','Ações'])tableHead.append(el('span',text));stock.append(tableHead);
    if(!products.length)stock.append(el('p','Nenhum produto nesta seleção.','seller-empty'));
    for(const p of products){
      const row=el('article',null,'seller-stock-row');
      const identity=el('div',null,'seller-stock-identity');const copy=el('div');copy.append(el('h3',p.nome),el('small',labels[p.categoria]||p.categoria));identity.append(art(p.categoria),copy);
      const price=el('strong',money.format(p.preco),'seller-stock-price');
      const quantity=el('span',p.estoque+' un.','seller-stock-quantity'+(p.estoque===0?' is-empty':''));
      const status=el('span',p.ativo?'Ativo':'Pausado','seller-status'+(p.ativo?' is-positive':''));
      const edit=el('details',null,'seller-product-editor');edit.append(el('summary','Editar produto'),productForm(p));row.append(identity,price,quantity,status,edit);stock.append(row);
    }
    inventory.append(stock);

    const orderSection=section('Pedidos da loja','pedidos','Pedidos');orderSection.append(el('p','Separe os itens e confirme o preparo para liberar a coleta.','seller-lead'));
    const orderFilter=el('div',null,'seller-order-toolbar');const filterLabel=el('label','Situação do pedido');const select=el('select');
    for(const[value,label]of [['','Todos os pedidos'],['Pendente','Aguardando preparo'],['Em preparo','Em preparo'],['Enviado','Em entrega'],['Entregue','Entregues'],['Cancelado','Cancelados']]){const option=el('option',label);option.value=value;select.append(option);}select.value=state.status;select.onchange=()=>{state.status=select.value;reload('vendedor_pedidos');};filterLabel.append(select);orderFilter.append(filterLabel,el('span',(totals.vendedor_pedidos||0)+' pedido(s) nesta seleção','seller-result-count'));orderSection.append(orderFilter);
    list(orderSection,orders,o=>{
      const row=card('#'+o.id+' · '+o.status);row.classList.add('seller-order-card');
      const info=el('div',null,'seller-order-info');const date=new Date(o.data_pedido);info.append(el('p',o.cliente_nome||'Cliente'),el('span',Number.isNaN(date.getTime())?String(o.data_pedido||'Data não informada'):date.toLocaleDateString('pt-BR')),el('strong',money.format(o.total)));row.append(info);
      const productList=el('div',null,'seller-order-items');for(const item of items.filter(i=>i.pedido_id===o.id))productList.append(el('p',item.quantidade+' × '+item.produto_nome));row.append(productList);
      if(!/^Cancelad/.test(o.status)){const progress=el('ol',null,'seller-order-progress');const statuses=['Pendente','Em preparo','Enviado','Entregue'];for(const[step,label]of ['Recebido','Preparando','Em entrega','Concluído'].entries()){const li=el('li',label);if(step<=statuses.indexOf(o.status))li.className='is-done';progress.append(li);}row.append(progress);}
      const payment=payments?.find(t=>t.pedido_id===o.id);
      if(payment){const details=el('details',null,'seller-payment-details');details.append(el('summary','Detalhes do pagamento de demonstração'),paymentCard(o,payment));row.append(details);}
      if(o.status==='Pendente' && (payments===null||payment?.estado==='paid'))row.append(action('Iniciar preparo e disponibilizar entrega',()=>RaizApi.rpc(window.RaizAccess.client(),'preparo',{p_pedido:o.id})));
      if(!payment && canCancel && ['Pendente','Em preparo'].includes(o.status))cancellation(row,o.id);
      return row;
    },'Nenhum pedido nesta seleção.');

    const shop=section('Minha loja','loja','Minha loja');shop.append(el('p','Informações da loja vinculada à sua conta de vendedor.','seller-lead'));
    const shopCard=el('div',null,'seller-store-card');const storeBadge=el('span',store?.nome?.slice(0,1)||'R','seller-store-avatar');const shopCopy=el('div');shopCopy.append(el('h3',store?.nome||'Loja não vinculada'),el('p','Loja parceira RAIZ'));shopCard.append(storeBadge,shopCopy);shop.append(shopCard);
    const fields=el('dl',null,'seller-store-data');for(const[label,value]of [['Nome da loja',store?.nome],['Endereço de coleta',store?.endereco],['Horário de funcionamento',store?.horario_funcionamento]]){const row=el('div');row.append(el('dt',label),el('dd',value||'Não informado'));fields.append(row);}shop.append(fields);
    if(store?.endereco&&window.RaizMaps.search(store.endereco)){const map=anchor('Ver endereço de coleta no mapa',RaizMaps.search(store.endereco));map.target='_blank';map.rel='noopener noreferrer';shop.append(map);}
    const support=el('div',null,'seller-store-support');support.append(el('h3','Precisa atualizar os dados da loja?'),el('p','Solicite a atualização à equipe responsável pela RAIZ.'),anchor('Falar com o suporte','mailto:suporteraiz.mkt@hotmail.com?subject=Atualiza%C3%A7%C3%A3o%20da%20loja%20RAIZ'));shop.append(support);

    const report=section('Vendas e relatórios','estatisticas','Vendas e relatórios');report.append(el('p','Acompanhe os registros de vendas da sua loja. Os pagamentos do projeto são simulados.','seller-lead'));
    const byDate=new Map();for(const row of sales){const key=row.data_referencia;if(key)byDate.set(key,(byDate.get(key)||0)+Number(row.valor||0));}
    const total=sales.reduce((sum,row)=>sum+Number(row.valor||0),0);const reportMetrics=el('div',null,'seller-report-metrics');for(const[label,value]of [['Total registrado',money.format(total)],['Dias com registro',String(byDate.size)]]){const box=el('div');box.append(el('span',label),el('strong',value));reportMetrics.append(box);}report.append(reportMetrics);
    const chart=el('div',null,'seller-sales-chart');chart.append(el('h3','Vendas por dia'),el('p','Até 7 datas mais recentes com registro.','seller-form-hint'));const recentDates=[...byDate.entries()].sort(([a],[b])=>a.localeCompare(b)).slice(-7);const max=Math.max(1,...recentDates.map(([,v])=>v));
    if(!recentDates.length)chart.append(el('p','Ainda não há registros de vendas para exibir.','seller-empty'));
    for(const[date,value]of recentDates){const row=el('div',null,'seller-sales-row');row.append(el('span',new Date(date+'T12:00:00').toLocaleDateString('pt-BR')));const rail=el('div',null,'seller-sales-rail');const bar=el('span');bar.style.width=Math.max(0,value/max*100)+'%';rail.append(bar);rail.setAttribute('aria-hidden','true');row.append(rail,el('strong',money.format(value)));chart.append(row);}report.append(chart);
  }
  function privacy(area,{user,store,logout}){
    const title=area.firstChild;title.textContent='Conta e privacidade';const children=[...area.children].slice(1);
    const identity=el('div',null,'seller-account-card');identity.append(icon('shop'));const copy=el('div');copy.append(el('h3',store?.nome||'Conta de vendedor'),el('p',user.email||'Conta autenticada'));identity.append(copy,el('span','Vendedor','seller-status is-positive'));
    const panel=el('div',null,'seller-privacy-card');panel.append(el('h3','Documentos e dados da conta'),...children);
    const session=el('div',null,'seller-privacy-card');session.append(el('h3','Acesso à conta'),el('p','Encerre a sessão ao terminar de usar um computador compartilhado.'));logout.textContent='Sair da conta';session.append(logout);
    area.replaceChildren(title,el('p','Gerencie seu acesso e as informações de privacidade da sua loja.','seller-lead'),identity,panel,session);
  }
  function show(content,hash){const current=['visao','produtos','pedidos','loja','estatisticas','privacidade'].includes(hash)?hash:'visao';for(const item of content.children)if(item.tagName==='SECTION')item.hidden=item.id!==current;document.title=(document.getElementById(current)?.querySelector('h2')?.textContent||'Central do vendedor')+' · RAIZ';return current;}
  window.RaizSeller={configure,decorateNav,summary,render,privacy,show};
})();
