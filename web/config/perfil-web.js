(() => {
  const categories = ['plantas', 'vasos', 'insumos', 'ferramentas'];
  const icons = { plantas: '🌿', vasos: '🪴', insumos: '🌱', ferramentas: '🧤' };
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function field(label, type, value = '') {
    const wrapper = el('label', label);
    const input = el('input');
    input.type = type;
    if (type === 'checkbox') input.checked = Boolean(value);
    else input.value = value;
    wrapper.append(input);
    return [wrapper, input];
  }

  function selectCategory(initial = '', all = false) {
    const wrapper = el('label', 'Categoria');
    const select = el('select');
    for (const category of (all ? ['', ...categories] : categories)) {
      const option = el('option', category || 'Todas');
      option.value = category;
      select.append(option);
    }
    select.value = initial || (all ? '' : categories[0]);
    wrapper.append(select);
    return [wrapper, select];
  }

  function button(text, handler) {
    const control = el('button', text, 'raiz-button');
    control.type = 'button';
    control.onclick = handler;
    return control;
  }

  function mapLink(url,label) {
    const anchor=el('a',label+' ↗','raiz-button');
    anchor.href=url; anchor.target='_blank'; anchor.rel='noopener noreferrer'; anchor.referrerPolicy='no-referrer';
    return anchor;
  }

  function list(parent, rows, render, empty) {
    if (!rows.length) {
      parent.append(el('p', empty, 'raiz-empty'));
      return;
    }
    const grid = el('div', null, 'raiz-grid');
    for (const row of rows) grid.append(render(row));
    parent.append(grid);
  }

  function card(title, ...children) {
    const node = el('article', null, 'raiz-card');
    node.append(el('h3', title), ...children);
    return node;
  }

  async function render(db, active, switchAccount) {
    const { role, user } = active;
    const features = await RaizApi.initialize(db);
    const main = el('div', null, 'app-shell raiz-dashboard raiz-' + role + (role === 'cliente' ? ' raiz-customer' : ''));
    const sidebar = el('aside', null, 'sidebar');
    sidebar.setAttribute('aria-label', 'Menu do perfil ' + RaizAccess.labels[role]);
    const logo = el('a', null, 'logo');
    logo.href = '../index.html';
    logo.setAttribute('aria-label', 'RAIZ — voltar ao portal');
    logo.append(el('span', '🌿', 'logo-mark'), el('span', 'RAIZ ' + RaizAccess.labels[role]));
    const captions = {cliente:'Seu espaço de cultivo',vendedor:'Espaço do vendedor',entregador:'Logística botânica',admin:'Governança do ecossistema'};
    const caption = el('p', captions[role], 'sidebar-caption');
    const userCard = el('div', null, 'user-mini');
    const avatar = el('div', (user.email || 'R').slice(0, 1).toUpperCase(), 'avatar');
    const userName = el('strong', user.email || RaizAccess.labels[role]);
    const userEmail = el('p', user.email || '', 'tiny muted');
    userCard.append(avatar, el('div', null, 'user-mini-copy'));
    userCard.lastChild.append(userName, userEmail);
    function setIdentity(name) {
      const display = String(name || '').trim();
      if (display) {
        userName.textContent = display;
        avatar.textContent = display.slice(0, 1).toUpperCase();
        if (role === 'vendedor') subtitle.textContent = 'RAIZ · ' + display;
      }
    }
    const sectionNav = el('nav', null, 'side-nav raiz-section-nav');
    sectionNav.setAttribute('aria-label', 'Navegação do perfil');
    const sidebarFoot = el('div', null, 'sidebar-foot');
    const hub = el('div', null, 'hub-tag');
    hub.append(el('span', '🌱'), el('span', role === 'cliente' ? 'Marketplace RAIZ' : 'Painel RAIZ'));
    const about = el('a', 'Voltar ao portal', 'sidebar-about');
    about.href = '../index.html';
    sidebarFoot.append(hub, about);
    sidebar.append(logo, caption, userCard, sectionNav, sidebarFoot);
    const workspace = el('main', null, 'main');
    const header = el('header', null, role === 'cliente' ? 'customer-toolbar' : 'topbar');
    const headerCopy = el('div');
    const title = el(role==='vendedor'?'h1':'h2', RaizAccess.labels[role]);
    const subtitles = {cliente:'RAIZ · Marketplace de Plantas',vendedor:'RAIZ · Área do vendedor',entregador:'RAIZ · Logística Botânica',admin:'RAIZ · Governança'};
    const subtitle = el('div', subtitles[role] + ' · ' + (RaizDB.backendLabel || 'Supabase'), 'tiny muted');
    headerCopy.append(title, subtitle);
    const navigation = el('nav', null, 'top-actions raiz-actions');
    const portal = el('a', 'Portal RAIZ', 'raiz-button');
    portal.href = '../index.html';
    const feedback = el('p', '', 'raiz-feedback');
    feedback.setAttribute('role', 'status');
    const pageContent = el('div', null, 'app-content raiz-app-content');
    const content = el('div', null, 'raiz-content');
    const partnerCopy = {
      cliente: ['Marketplace RAIZ', 'Encontre seu próximo verde.', 'Plantas, vasos e tudo para cultivar, de quem entende de cuidado.'],
      vendedor: ['Seu negócio, mais verde', 'Vamos cultivar boas vendas?', 'Cuide da sua vitrine, acompanhe os pedidos e veja sua loja crescer.'],
      entregador: ['Conectando jardins e pessoas', 'Cada entrega, um novo começo.', 'Organize suas rotas, acompanhe as oportunidades e leve mais verde para cada lar.'],
      admin: ['Um ecossistema em crescimento', 'Cuidar de cada detalhe.', 'Acompanhe a operação, os parceiros e o catálogo em um só lugar.']
    };
    function welcome() {
      if (['cliente','vendedor'].includes(role)) return;
      if (!partnerCopy[role]) return;
      const [eyebrow, headline, description] = partnerCopy[role];
      const hero = el('section', null, 'partner-hero');
      const copy = el('div', null, 'partner-hero-copy');
      const heading = el(role === 'cliente' ? 'h1' : 'h2', headline);
      heading.id = 'partner-welcome';
      hero.setAttribute('aria-labelledby', heading.id);
      copy.append(el('span', eyebrow, 'eyebrow'), heading, el('p', description));
      const photo = el('img');
      photo.src = '../assets/vitrine-botanica.webp';
      photo.alt = 'Composição ilustrativa de plantas em vasos';
      photo.width = 720;
      photo.height = 640;
      hero.append(copy, photo);
      content.append(hero);
    }
    navigation.append(portal, button('Atualizar', () => load()), switchAccount('../login.html?role=' + role + '&modo=online', value => feedback.textContent = value));
    navigation.lastChild.textContent = 'Sair';
    header.append(headerCopy, navigation);
    pageContent.append(feedback, content);
    if (role === 'cliente') {
      sectionNav.classList.add('customer-nav');
      workspace.append(header, sectionNav, pageContent);
    } else workspace.append(header, pageContent);
    const mobileNav = el('nav', null, 'bottom-nav');
    mobileNav.setAttribute('aria-label', 'Navegação rápida do perfil');
    if (role === 'cliente') main.append(workspace);
    else main.append(sidebar, workspace, mobileNav);
    document.body.replaceChildren(main);
    document.body.classList.remove('raiz-pending');
    RaizShell.mount({ role,
      ...(role === 'cliente' ? {
        search: value => { catalogState.search = value; catalogState.favorites = false; pages.catalog = 0; location.hash = 'catalogo'; load(); },
        category: value => { catalogState.category = value; catalogState.search = ''; catalogState.favorites = false; pages.catalog = 0; document.getElementById('storeQuery').value=''; location.hash = 'catalogo'; load(); }
      } : {})
    });
    if (role === 'cliente') navigation.firstChild.remove();
    let sellerLogout, sellerStore;
    if(role==='vendedor'){
      sellerLogout=navigation.lastChild;sellerLogout.remove();
      navigation.firstChild.textContent='Ver marketplace';
      RaizSeller.configure({main,sidebar,navigation,onSearch:value=>{sellerState.search=value;pages.vendedor_produtos=0;location.hash='produtos';load();}});
    }

    async function call(promise) {
      const { data, error } = await promise;
      if (error) throw error;
      return data;
    }

    const pages = {}, totals = {};
    const sellerState={search:'',category:'',availability:'',status:''};
    const paged = {
      cliente_produtos:'moderacao',
      vendedor_produtos:'produtos',vendedor_pedidos:'pedidos',cliente_pedidos:'pedidos',
      entregador_corridas:role==='admin'?'entregas':'andamento',entregador_historico:'historico'
    };
    const query = async (view, columns) => {
      if (!paged[view]) return RaizApi.all(db,view,columns);
      const result=await RaizApi.page(db,view,columns,{page:pages[view]||0,
        ...(view==='vendedor_produtos'?{search:sellerState.search,category:sellerState.category,
          ...(['ativos','pausados'].includes(sellerState.availability)?{active:sellerState.availability==='ativos'}:{}),
          ...(sellerState.availability==='sem-estoque'?{stock:0}:{})}:{}),
        ...(view==='vendedor_pedidos' && sellerState.status?{status:sellerState.status}:{}),
        ...(view==='entregador_corridas' && role==='entregador'?{status:'Em andamento'}:{}),
        ascending:!view.includes('pedidos') && view!=='entregador_historico'});
      totals[view]=result.total;return result.rows;
    };
    const rpc = async (name, args) => {
      const result=await RaizApi.rpc(db,name,args);
      const event={checkout:'pedido',cancelar_pedido:'cancelamento',confirmar_recebimento:'recebimento',avaliar_pedido:'avaliacao',etapa:args?.p_etapa===3?'entrega':args?.p_etapa===2?'coleta':null}[name];
      if(event) void RaizApi.event(db,event,role);
      return result;
    };
    function pager(parent, key, total) {
      const page=pages[key]||0, nav=el('nav',null,'raiz-actions');nav.setAttribute('aria-label','Paginação');
      const previous=button('Anterior',()=>{pages[key]=page-1;load();});previous.disabled=page===0;
      const next=button('Próxima',()=>{pages[key]=page+1;load();});next.disabled=(page+1)*RaizApi.PAGE>=total;
      nav.append(previous,el('span',total+' resultado(s) · página '+(page+1)+' de '+Math.max(1,Math.ceil(total/RaizApi.PAGE))),next);parent.append(nav);
    }
    const section = (label, id, navLabel = label) => {
      const element = el('section');
      element.id = id;
      const heading = el('h2', label);
      heading.id = id + '-titulo';
      element.setAttribute('aria-labelledby', heading.id);
      element.append(heading);
      const anchor = el('a', navLabel, 'nav-btn');
      anchor.href = '#' + id;
      anchor.dataset.section = id;
      if (role === 'cliente' && id === 'catalogo') anchor.onclick = () => {
        if (catalogState.favorites) { catalogState.favorites = false; pages.catalog = 0; load(); }
      };
      sectionNav.append(anchor);
      content.append(element);
      return element;
    };

    let busy = false;
    function action(label, task, success = 'Alteração salva.') {
      return button(label, async () => {
        if (busy) return;
        if(!navigator.onLine){feedback.textContent='Sem conexão. Tente novamente quando a internet voltar.';return;}
        busy = true;
        try {
          feedback.textContent = 'Salvando…';
          const result = await task();
          await load(typeof success === 'function' ? success(result) : success, true);
        } catch (error) {
          feedback.textContent = RaizApi.errorText(error);
          void RaizApi.event(db,'erro',role);
        } finally {
          busy = false;
        }
      });
    }

    function metrics(parent, values) {
      const grid = el('dl', null, 'raiz-metrics');
      for (const [label, value] of values) {
        const item = el('div');
        item.append(el('dt', label), el('dd', value));
        grid.append(item);
      }
      parent.append(grid);
    }

    let checkoutId;
    let checkoutMethod = 'pix';
    let checkoutInstallments = 1;
    const paymentNames = {pix:'Pix',credit:'Cartão de crédito',debit:'Cartão de débito',boleto:'Boleto'};
    const paymentStates = {pending:'Aguardando pagamento',paid:'Aprovado (simulado)',rejected:'Recusado (simulado)',expired:'Expirado',cancelled:'Cancelado',refunded:'Estornado (simulado)'};
    function paymentChoice(initial='pix',count=1) {
      const wrapper=el('div');
      const label=el('label','Forma de pagamento');
      const method=el('select');
      for(const [value,text] of Object.entries(paymentNames)) {const option=el('option',text);option.value=value;method.append(option);}
      method.value=initial;label.append(method);
      const installmentLabel=el('label','Parcelas');const installments=el('select');
      for(let n=1;n<=3;n++) {const option=el('option',n===1?'À vista':n+' parcelas sem juros (simulação)');option.value=n;installments.append(option);}
      installments.value=count;installments.disabled=method.value!=='credit';
      method.onchange=()=>{installments.disabled=method.value!=='credit';if(installments.disabled)installments.value=1;};
      installmentLabel.append(installments);wrapper.append(label,installmentLabel);
      return {wrapper,method,installments};
    }
    function paymentCard(o,t,editable=false) {
      const box=el('div',null,'raiz-payment');
      if(!t) {box.append(el('p','Pedido anterior à integração. Não há confirmação de pagamento.'));return box;}
      const pieces=Array.from({length:t.parcelas},(_,i)=>Math.floor(t.valor_centavos/t.parcelas)+(i<t.valor_centavos%t.parcelas?1:0));
      box.append(el('h4',paymentStates[t.estado]),el('p',paymentNames[t.metodo]+' · '+money.format(t.valor_centavos/100)),
        el('p','Parcelas: '+pieces.map((v,i)=>(i+1)+'ª '+money.format(v/100)).join(' · ')),
        el('p','Vencimento: '+new Date(t.expira_em).toLocaleString('pt-BR')),el('p',t.referencia),
        el('p','Demonstração acadêmica persistida. Não é cobrança, Pix Copia e Cola ou boleto bancário.','raiz-notice'));
      if(editable) {
        const act=(label,kind,method=null,count=1)=>action(label,()=>rpc('pagamento_acao',{p_pedido:o.id,p_acao:kind,p_metodo:method,p_parcelas:count}),'Pagamento de demonstração atualizado.');
        box.append(act('Atualizar situação e prazo','refresh'));
        if(t.estado==='pending') {
          box.append(act(t.metodo==='pix'?'Simular recebimento Pix':t.metodo==='boleto'?'Simular compensação do boleto':'Simular aprovação do cartão','approve'));
          if(['credit','debit'].includes(t.metodo))box.append(act('Simular recusa do cartão','reject'));
        }
        if(t.estado==='rejected') {
          const choice=paymentChoice(t.metodo,t.parcelas);box.append(choice.wrapper,
            action('Criar nova tentativa',()=>rpc('pagamento_acao',{p_pedido:o.id,p_acao:'retry',p_metodo:choice.method.value,p_parcelas:Number(choice.installments.value)}),'Nova tentativa criada sem nova reserva de estoque.'));
        }
        if(['pending','rejected'].includes(t.estado))box.append(act('Cancelar pedido e liberar estoque','cancel'));
        if(t.estado==='paid' && o.status==='Confirmado')box.append(act('Simular estorno integral antes do preparo','refund'));
        box.append(button('Baixar comprovante de demonstração',()=>{
          const text=['RAIZ — DEMONSTRAÇÃO ACADÊMICA','SEM VALOR FISCAL OU BANCÁRIO','Pedido #'+o.id,t.referencia,paymentNames[t.metodo],paymentStates[t.estado],money.format(t.valor_centavos/100),'Parcelas: '+pieces.map(v=>money.format(v/100)).join(' + ')].join('\n');
          const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
          const a=el('a');a.href=url;a.download='RAIZ_DEMONSTRACAO_'+o.id+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
        }));
      }
      const history=el('details');history.append(el('summary','Histórico do pagamento'));
      for(const event of t.eventos)history.append(el('p',new Date(event.em).toLocaleString('pt-BR')+' · '+event.acao));
      box.append(history);return box;
    }

    const initialParams = new URLSearchParams(location.search);
    const catalogState = { search: initialParams.get('busca') || '', category: initialParams.get('categoria') || '', favorites: location.hash === '#favoritos', sort: 'recentes' };
    let catalogOffline=false;
    async function paymentsForRole() {
      try { return await rpc('pagamentos') || []; }
      catch (error) { if (['PGRST202','42883'].includes(error?.code)) return null; throw error; }
    }
    async function customer() {
      const payments = await paymentsForRole();
      const savedFavorites=await RaizApi.all(db,'cliente_favoritos','id,produto_id');
      const catalogResult=await RaizApi.catalog(db,{page:pages.catalog||0,search:catalogState.search,category:catalogState.category,
        order:catalogState.sort==='recentes'?'id':'preco',ascending:catalogState.sort==='menor-preco',
        ...(catalogState.favorites?{ids:savedFavorites.map(f=>f.produto_id)}:{})});
      catalogOffline=catalogResult.offline;
      const [products, profile, favorites, cart, orders, items] = await Promise.all([
        Promise.resolve(catalogResult.rows),
        query('cliente_usuarios','nome,telefone,endereco'), Promise.resolve(savedFavorites),
        query('cliente_carrinho','produto_id,quantidade'),
        query('cliente_pedidos','id,data_formatada,status,total,frete,forma_pagamento,avaliacao_nota,avaliacao_comentario'+(features.recebimento?',recebimento_confirmado_em':'')),
        Promise.resolve([])
      ]);
      let shoppingNotice='';
      if(window.RaizShopping?.intent()) {
        if(profile.length) {
          try {if(await RaizShopping.resume(db,cart)){location.hash='carrinho';return customer();}}
          catch(error){shoppingNotice=RaizApi.errorText(error);}
        } else {
          shoppingNotice='Sua seleção está salva. Cadastre o endereço para continuar a compra.';
          location.hash='conta';
        }
      }
      const identityName=profile[0]?.nome || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Cliente';
      setIdentity(identityName);
      RaizCustomer.servicebar(main,{...profile[0],nome:identityName});
      RaizShell.updateCart(cart.reduce((sum, item) => sum + item.quantidade, 0));
      if (role === 'cliente') title.textContent = profile[0]?.nome ? 'Olá, ' + profile[0].nome + '.' : 'Minha conta';
      items.push(...await RaizApi.related(db,'cliente_itens_pedido','id,pedido_id,produto_nome,quantidade,preco_unitario','pedido_id',orders.map(o=>o.id)));
      const cartProducts=await RaizApi.related(db,'cliente_produtos','id,nome,categoria,preco,estoque,loja_id','id',cart.map(i=>i.produto_id));
      const catalog = section(catalogState.favorites ? 'Seus favoritos' : catalogState.search ? 'Resultados da busca' : catalogState.category ? RaizCustomer.labels[catalogState.category] : 'Todos os produtos', 'catalogo', 'Comprar');
      const chooseCategory = value => {catalogState.category=value;catalogState.search='';catalogState.favorites=false;pages.catalog=0;location.hash='catalogo';document.getElementById('storeQuery').value='';load();};
      const heading = el('div',null,'shop-heading');
      const headingCopy = el('div');headingCopy.append(catalog.firstChild,el('p',catalogResult.total+' resultado(s)'+(catalogState.search?' para “'+catalogState.search+'”':''),'shop-result-count'));
      const orderLabel=el('label','Ordenar por','shop-sort-label');const order=el('select');
      for(const [value,label] of [['recentes','Mais recentes'],['menor-preco','Menor preço'],['maior-preco','Maior preço']]){const option=el('option',label);option.value=value;order.append(option);}
      order.value=catalogState.sort;order.onchange=()=>{catalogState.sort=order.value;pages.catalog=0;load();};orderLabel.append(order);
      heading.append(headingCopy,orderLabel);catalog.append(heading);
      if(!catalogState.search && !catalogState.category && !catalogState.favorites)RaizCustomer.intro(catalog,chooseCategory);
      if(shoppingNotice) catalog.append(el('p',shoppingNotice,'raiz-notice'));
      const favoritesShortcut = el('a', 'Favoritos', 'nav-btn');
      favoritesShortcut.href = '#favoritos';
      favoritesShortcut.dataset.section = 'favoritos';
      favoritesShortcut.onclick = event => {
        event.preventDefault();
        catalogState.favorites = true;
        pages.catalog = 0;
        if (location.hash !== '#favoritos') location.hash = 'favoritos';
        load();
      };
      sectionNav.append(favoritesShortcut);
      if(catalogOffline) catalog.append(el('p','Sem conexão: catálogo salvo por até 24 horas. Preço e estoque serão conferidos quando a conexão voltar.','raiz-notice'));
      const [searchLabel, search] = field('Buscar produto','search', catalogState.search);
      search.placeholder = 'Nome ou loja';
      const [categoryLabel, category] = selectCategory(catalogState.category, true);
      const [favoriteLabel, onlyFavorites] = field('Somente favoritos','checkbox', catalogState.favorites);
      const filters = el('aside', null, 'raiz-filters');
      filters.id='shopFilters';
      filters.setAttribute('aria-label', 'Filtros do catálogo');
      filters.append(el('h3','Filtrar produtos'),searchLabel,categoryLabel,favoriteLabel);
      const filterToggle=el('button',null,'shop-mobile-filters');filterToggle.type='button';filterToggle.append(RaizCustomer.icon('filter'),document.createTextNode('Filtros'));filterToggle.setAttribute('aria-controls',filters.id);filterToggle.setAttribute('aria-expanded','false');
      filterToggle.onclick=()=>{const open=filters.classList.toggle('is-open');filterToggle.setAttribute('aria-expanded',String(open));};heading.append(filterToggle);
      const results = el('div', null, 'raiz-catalog-results');
      const catalogLayout = el('div', null, 'raiz-catalog-layout');
      catalogLayout.append(filters,results);
      catalog.append(catalogLayout);
      if (!profile.length) {
        const addressLink = el('a','Cadastre um endereço para liberar o carrinho e os favoritos.','raiz-notice');
        addressLink.href = '#conta';
        catalog.prepend(addressLink);
      }
      const favoriteIds = new Set(favorites.map(row => row.produto_id));
      const setItem = (id, quantity, favorite = null) => rpc('item_cliente', {p_produto:id,p_quantidade:quantity,p_favorito:favorite});
      function filter() {
        Object.assign(catalogState, {search:search.value,category:category.value,favorites:onlyFavorites.checked});
        const term = search.value.trim().toLocaleLowerCase('pt-BR');
        results.replaceChildren();
        list(results, products.filter(p => (!category.value || p.categoria === category.value) &&
          (!onlyFavorites.checked || favoriteIds.has(p.id)) &&
          (p.nome + ' ' + p.vendedor_nome).toLocaleLowerCase('pt-BR').includes(term)), p => {
          const row=el('article',null,'shop-product');row.dataset.category=p.categoria;
          const target='../produto.html?id='+encodeURIComponent(p.id);
          const picture=el('a',null,'shop-picture');picture.href=target;picture.setAttribute('aria-label','Ver '+p.nome);picture.append(RaizCustomer.art(p),el('small','Imagem ilustrativa'));
          const body=el('div',null,'shop-product-body');
          const name=el('h3');const productLink=el('a',p.nome);productLink.href=target;name.append(productLink);
          const detail=el('a','Ver detalhes','shop-details');detail.href=target;
          body.append(el('span',RaizCustomer.labels[p.categoria]||p.categoria,'shop-product-category'),name,el('span','Vendido por '+p.vendedor_nome,'shop-seller'),el('strong',money.format(p.preco),'shop-price'),el('span',p.estoque>0?'Em estoque':'Indisponível','shop-stock'),detail);
          row.append(picture,body);
          if (profile.length && !catalogOffline) {
            const favorite = action('', () => setItem(p.id,0,!favoriteIds.has(p.id)));
            favorite.className='shop-favorite';favorite.setAttribute('aria-label',(favoriteIds.has(p.id)?'Remover favorito: ':'Favoritar: ')+p.nome);favorite.setAttribute('aria-pressed',String(favoriteIds.has(p.id)));favorite.append(RaizCustomer.icon('heart'));
            row.append(favorite);
            const quantity = cart.find(item => item.produto_id === p.id)?.quantidade || 0;
            const add=action('Adicionar ao carrinho', () => setItem(p.id,quantity+1), 'Produto adicionado ao carrinho.');add.className='shop-primary';add.disabled=!p.loja_id || p.estoque<=quantity;body.append(add);
          } else {
            const register=el('a',catalogOffline?'Ver produto':'Cadastrar endereço','shop-primary');register.href=catalogOffline?target:'#conta';body.append(register);
          }
          return row;
        }, 'Nenhum produto encontrado.');
      }
      function searchServer(){Object.assign(catalogState,{search:search.value,category:category.value,favorites:onlyFavorites.checked});pages.catalog=0;location.hash=onlyFavorites.checked?'favoritos':'catalogo';load();}
      search.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();searchServer();}};
      category.onchange=onlyFavorites.onchange=searchServer;
      filters.append(button('Buscar',searchServer));
      const clear=button('Limpar filtros',()=>{Object.assign(catalogState,{search:'',category:'',favorites:false});pages.catalog=0;location.hash='catalogo';document.getElementById('storeQuery').value='';load();});clear.className='shop-clear';filters.append(clear);
      filter();pager(catalog,'catalog',catalogResult.total);
      const basket = section('Carrinho', 'carrinho');
      const continueShopping=el('a','Continuar comprando','shop-continue');continueShopping.href='#catalogo';basket.firstChild.after(continueShopping);
      if(shoppingNotice) basket.append(el('p',shoppingNotice,'raiz-notice'));
      const basketLayout = el('div', null, 'raiz-basket-layout');
      const lines = el('div', null, 'raiz-cart-lines');
      basketLayout.append(lines);
      basket.append(basketLayout);
      list(lines,cart,item => {
        const p = cartProducts.find(product => product.id === item.produto_id);
        const [label,qty] = field('Quantidade','number',item.quantidade);
        qty.min = 1; qty.max = 99;
        const row=el('article',null,'raiz-card shop-cart-line');
        const picture=el('div',null,'shop-cart-picture');picture.append(RaizCustomer.art({categoria:p?.categoria||'plantas'}));
        const info=el('div',null,'shop-cart-info');const controls=el('div',null,'shop-cart-controls');
        controls.append(label,action('Atualizar quantidade', () => {if(!qty.checkValidity())throw new Error('Confira a quantidade.');return setItem(item.produto_id,Number(qty.value));}),action('Remover', () => setItem(item.produto_id,0)));
        info.append(el('h3',p?.nome||'Produto indisponível'),el('p',p?money.format(p.preco)+' por unidade':'Preço indisponível'),controls);row.append(picture,info);return row;
      }, 'Seu carrinho está vazio.');
      const summary = el('aside', null, 'raiz-checkout');
      if (cart.length) {
        basketLayout.classList.add('raiz-has-summary');
        basketLayout.append(summary);
        summary.append(el('h3','Resumo do pedido'));
        const prices = cart.map(item => cartProducts.find(p => p.id === item.produto_id));
        if (prices.every(Boolean)) {
          const subtotal = cart.reduce((sum, item, i) => sum + RaizApi.moneyCents(prices[i].preco) * item.quantidade, 0) / 100;
          metrics(summary,[['Subtotal',money.format(subtotal)],['Frete',money.format(15)],['Total estimado',money.format(subtotal+15)]]);
        }
        if (payments !== null) {
          const choice=paymentChoice(checkoutMethod,checkoutInstallments);
          choice.method.addEventListener('change',()=>{checkoutMethod=choice.method.value;});
          choice.installments.addEventListener('change',()=>{checkoutInstallments=Number(choice.installments.value);});
          summary.append(el('p','Pagamento acadêmico simulado, sem cobrança real. Finalize um pedido por loja.'),choice.wrapper,
            action('Confirmar pedido e simular pagamento',async()=>{
              checkoutId ||= crypto.randomUUID();
              const id=await rpc('checkout_pagamento',{p_requisicao:checkoutId,p_metodo:choice.method.value,p_parcelas:Number(choice.installments.value)});
              checkoutId=null;location.hash='pedidos';return id;
            },id=>'Pedido #'+id+' reservado. Aguardando pagamento de demonstração.'));
        } else {
          summary.append(el('p','Registro sem cobrança. Finalize um pedido por loja.'),
            action('Registrar pedido sem pagamento',async()=>{
              checkoutId ||= crypto.randomUUID();
              const id=await rpc('checkout',{p_requisicao:checkoutId});checkoutId=null;location.hash='pedidos';return id;
            },id=>'Pedido #'+id+' registrado. Nenhum pagamento foi processado.'));
        }
      }
      list(section('Meus pedidos', 'pedidos', 'Pedidos'),orders,o => {
        const row=card('#'+o.id+' · '+o.status,el('p',o.data_formatada+' · '+money.format(o.total)),el('p',o.forma_pagamento),
          ...items.filter(i=>i.pedido_id===o.id).map(i=>el('p',i.quantidade+' × '+i.produto_nome)));
        const payment=payments?.find(t=>t.pedido_id===o.id);
        if(payments !== null) row.append(paymentCard(o,payment,true));
        if(!payment && features.cancelamento && o.status==='Confirmado') cancellation(row,o.id);
        if(features.recebimento && o.status==='Entregue' && !o.recebimento_confirmado_em){
          const [label,received]=field('Confirmo que recebi os produtos','checkbox');
          row.append(label,action('Confirmar recebimento',()=>{
            if(!received.checked) throw {code:'P0001',message:'Marque a confirmação de recebimento.'};
            return rpc('confirmar_recebimento',{p_pedido:o.id});
          },'Recebimento confirmado. Você já pode avaliar a loja.'));
        }
        if(o.recebimento_confirmado_em){
          row.append(el('p','Recebimento confirmado em '+new Date(o.recebimento_confirmado_em).toLocaleDateString('pt-BR')));
          if(features.avaliacao){
            const review=el('details'), note=el('select');review.append(el('summary',o.avaliacao_nota?'Editar avaliação da loja':'Avaliar a loja'));
            for(let i=1;i<=5;i++){const option=el('option',i+' estrela(s)');option.value=i;note.append(option);}note.value=o.avaliacao_nota||5;
            const noteLabel=el('label','Nota');noteLabel.append(note);
            const [commentLabel,comment]=field('Comentário opcional','text',o.avaliacao_comentario||'');comment.maxLength=1000;
            review.append(noteLabel,commentLabel,action('Salvar avaliação',()=>rpc('avaliar_pedido',{p_pedido:o.id,p_nota:Number(note.value),p_comentario:comment.value}),'Avaliação da loja salva.'));row.append(review);
          }
        }
        return row;
      },'Você ainda não tem pedidos.');
      const address = section('Minha conta', 'conta', 'Minha conta');
      const [addressLabel, addressInput] = field('Endereço completo','text',profile[0]?.endereco);
      addressInput.placeholder='Rua, número, bairro, cidade, estado e CEP';addressInput.required=true;addressInput.minLength=5;addressInput.maxLength=300;
      const saveAddress=action('Salvar endereço',()=>{
        if(!addressInput.reportValidity())throw {code:'P0001',message:'Informe um endereço completo com pelo menos 5 caracteres.'};
        return rpc('endereco',{p_endereco:addressInput.value.trim()});
      },'Endereço de entrega salvo.');
      RaizCustomer.profile({section:address,user,customer:profile[0],name:identityName,addressLabel,saveAddress,navigation,
        notice:!profile.length?(shoppingNotice||'Complete seu endereço de entrega para começar a comprar.'):'',
        map:profile[0]?.endereco && RaizMaps.search(profile[0].endereco)?mapLink(RaizMaps.search(profile[0].endereco),'Ver no mapa'):null});
    }

    function productForm(p = {}) {
      const [nameLabel,name] = field('Nome','text',p.nome);
      const [categoryLabel,category] = selectCategory(p.categoria);
      const [priceLabel,price] = field('Preço (R$)','number',p.preco);
      const [stockLabel,stock] = field('Estoque','number',p.estoque);
      const descLabel=el('label','Descrição');const desc=el('textarea');desc.value=p.descricao||'';desc.rows=3;descLabel.append(desc);
      const [activeLabel,enabled] = field('Ativo','checkbox',p.ativo ?? true);
      const fields = el('div',null,'raiz-actions');
      fields.classList.add('seller-product-form');
      price.min = stock.min = 0; price.step = '0.01';
      stock.step='1';name.maxLength=150;desc.maxLength=3000;
      fields.append(nameLabel,categoryLabel,priceLabel,stockLabel,descLabel,activeLabel,action('Salvar produto', () => {
        if (!name.value.trim() || !price.value || !stock.value || !price.checkValidity() || !stock.checkValidity()) {
          throw new Error('Confira nome, preço e estoque.');
        }
        return rpc('produto',{p_id:p.id ?? null,p_nome:name.value,p_categoria:category.value,
          p_preco:Number(price.value),p_estoque:Number(stock.value),p_ativo:enabled.checked,p_descricao:desc.value});
      }));
      return fields;
    }

    async function seller() {
      const payments=await paymentsForRole();
      const [stores,products,orders,sales,counts,recent,empty]=await Promise.all([
        query('vendedor_lojas','nome,endereco,horario_funcionamento'),
        query('vendedor_produtos','id,nome,categoria,preco,estoque,ativo,descricao'),
        query('vendedor_pedidos','id,status,total,data_pedido,cliente_nome'),
        query('vendedor_vendas_diarias','id,dia_semana,valor,data_referencia'),
        RaizSeller.summary(db),
        RaizApi.page(db,'vendedor_pedidos','id,status,total,data_pedido,cliente_nome',{page:0,ascending:false}),
        RaizApi.page(db,'vendedor_produtos','id,nome,categoria,estoque,ativo',{page:0,stock:0,active:true})
      ]);
      sellerStore=stores[0];setIdentity(sellerStore?.nome);
      const items=await RaizApi.related(db,'vendedor_itens_pedido','id,pedido_id,produto_nome,quantidade','pedido_id',orders.map(o=>o.id));
      RaizSeller.render({stores,products,orders,items,sales,counts,recentOrders:recent.rows,emptyProducts:empty.rows,payments,canCancel:features.cancelamento,
        state:sellerState,totals,section,productForm,action,button,field,selectCategory,list,card,paymentCard,cancellation,
        reload:key=>{pages[key]=0;load();}});
    }

    async function courier() {
      const [profiles, offers, trips, history, wallet] = await Promise.all([
        query('entregador_perfil','nome,veiculo,online,saldo_carteira,ganhos_hoje,total_corridas_hoje'),features.versao>=4?rpc('ofertas_pagina',{p_pagina:pages.ofertas||0}):rpc('ofertas'),
        query('entregador_corridas','id,status,etapa_atual,coleta_loja,coleta_endereco,entrega_endereco,item_descricao,fragil,valor'),
        query('entregador_historico','corrida_id,status,data_formatada'),
        query('entregador_extrato','id,tipo,descricao,valor,status,data_formatada')
      ]);
      const account = section('Disponibilidade', 'disponibilidade', 'Início');
      const profile = profiles[0];
      setIdentity(profile?.nome);
      if (!profile) {
        account.append(el('p','A equipe responsável precisa vincular seu perfil de entregador.'));
        return;
      }
      account.append(el('span',profile.online ? 'Online' : 'Offline','raiz-status ' + (profile.online ? 'raiz-positive' : '')),
        el('p',[profile.nome,profile.veiculo].filter(Boolean).join(' · ')),
        action(profile.online ? 'Ficar offline' : 'Ficar online', () => rpc('disponibilidade',{p_online:!profile.online})));
      const walletSection = section('Carteira', 'carteira');
      metrics(walletSection,[['Saldo registrado',money.format(profile.saldo_carteira||0)],['Ganhos de hoje',money.format(profile.ganhos_hoje||0)],['Entregas de hoje',String(profile.total_corridas_hoje||0)]]);
      list(walletSection,wallet,row=>card(row.descricao,el('p',money.format(row.valor)+' · '+row.status+' · '+row.data_formatada)),'Nenhum lançamento na carteira.');
      const step = (p_pedido,p_etapa,p_vaso=false,p_folhagem=false,p_entrega=false) => rpc('etapa',{p_pedido,p_etapa,p_vaso,p_folhagem,p_entrega});
      list(section('Entregas em andamento', 'andamento', 'Entregas'),trips.filter(t => t.status === 'Em andamento'),t => {
        const row = card('#' + t.id + ' · ' + t.item_descricao,
          el('span',t.etapa_atual === 1 ? 'Próximo passo: coleta' : 'Próximo passo: entrega','raiz-status raiz-positive'),
          el('p','Coleta · ' + t.coleta_loja + ' · ' + t.coleta_endereco, 'raiz-route-stop'),
          el('p','Destino · ' + t.entrega_endereco,'raiz-route-stop'),el('p',t.fragil ? 'Carga frágil. Mantenha o vaso em pé.' : 'Carga sem indicação de fragilidade.',t.fragil ? 'raiz-notice' : 'raiz-muted'));
        if(RaizMaps.route('',t.etapa_atual===1?t.coleta_endereco:t.entrega_endereco)) {
          row.append(mapLink(RaizMaps.route('',t.etapa_atual===1?t.coleta_endereco:t.entrega_endereco),t.etapa_atual===1?'Ir até a coleta no Google Maps':'Ir até a entrega no Google Maps'));
          if(RaizMaps.route(t.coleta_endereco,t.entrega_endereco)) row.append(mapLink(RaizMaps.route(t.coleta_endereco,t.entrega_endereco),'Ver rota completa no Google Maps'));
        }
        if (t.etapa_atual === 1) {
          const [potLabel,pot] = field('Embalagem ou vaso protegido','checkbox');
          const [leavesLabel,leaves] = field('Produto e folhagem conferidos','checkbox');
          row.append(potLabel,leavesLabel,action('Confirmar coleta', () => step(t.id,2,pot.checked,leaves.checked)));
        }
        if (t.etapa_atual === 2) {
          const [label,delivered] = field('Entrega recebida no destino','checkbox');
          row.append(label,action('Concluir entrega', () => step(t.id,3,false,false,delivered.checked)));
        }
        return row;
      },'Nenhuma entrega em andamento.');
      if(features.versao>=4) totals.ofertas=offers.total;
      list(section('Entregas disponíveis', 'ofertas', 'Oportunidades'),features.versao>=4?offers.itens:offers,o => card('#' + o.id + ' · ' + o.coleta_loja,
        el('p',o.item_descricao + (o.fragil ? ' · Frágil' : '') + ' · ' + money.format(o.valor)),
        action('Aceitar entrega', () => step(o.id,1))),profile.online ? 'Nenhuma entrega disponível.' : 'Fique online para consultar as ofertas.');
      list(section('Histórico', 'historico'),history,t => card('#' + t.corrida_id + ' · ' + t.status,el('p',t.data_formatada)),'Nenhuma entrega concluída.');
    }

    let adminSearch='';
    async function admin() {
      const payments=await paymentsForRole();
      const [userResult,orders,trips,products] = await Promise.all([
        features.versao>=4?rpc('usuarios_pagina',{p_busca:adminSearch,p_pagina:pages.usuarios||0}):rpc('usuarios'),query('cliente_pedidos','id,status,total'),query('entregador_corridas','id,status'),
        query('cliente_produtos','id,nome,vendedor_nome,ativo')
      ]);
      const users=features.versao>=4?userResult.itens:userResult;
      setIdentity(users.find(u=>u.id===user.id)?.email || RaizAccess.labels.admin);
      if(features.versao>=4) totals.usuarios=userResult.total;
      const summary = section('Visão geral desta página', 'visao', 'Dashboard');
      metrics(summary,[['Contas exibidas',users.length],['Pedidos exibidos',orders.length],['Entregas exibidas',trips.length],
        ['GMV dos pedidos exibidos',money.format(orders.filter(o => !/^Cancelad/.test(o.status)).reduce((sum,o) => sum+Number(o.total || 0),0))],
        ['Pedidos entregues exibidos',orders.filter(o => o.status === 'Entregue').length]]);
      summary.append(el('p','Indicadores dos registros exibidos nesta página.', 'raiz-muted'),
        el('p',RaizDB.isLocal ? 'Contas fictícias e vínculos configurados pelo responsável no banco local. Disputas da apresentação não integram este painel.' : 'Vínculos e permissões são administrados no Supabase. Disputas e auditoria REST local estão fora deste painel.'));
      const people = section('Usuários e perfis', 'usuarios', 'Usuários');
      const [searchLabel, search] = field('Buscar por e-mail ou perfil', 'search',adminSearch);
      const matches = el('div', null, 'raiz-admin-rows');
      people.append(searchLabel, matches);
      const filter = () => {
        const term = search.value.trim().toLocaleLowerCase('pt-BR');
        matches.replaceChildren();
        list(matches,users.filter(u => ((u.email || u.id) + ' ' + RaizAccess.labels[u.perfil]).toLocaleLowerCase('pt-BR').includes(term)),u =>
          card(u.email || u.id,el('p',RaizAccess.labels[u.perfil]),el('span',u.ativo ? 'Ativo' : 'Inativo','raiz-status ' + (u.ativo ? 'raiz-positive' : ''))),'Nenhum usuário encontrado.');
      };
      search.onkeydown=e=>{if(e.key==='Enter'){adminSearch=search.value;pages.usuarios=0;load();}};
      people.append(button('Buscar',()=>{adminSearch=search.value;pages.usuarios=0;load();}));
      filter();
      list(section('Moderação de produtos', 'moderacao', 'Catálogo'),products,p => {
        const row = card(p.nome,el('p',p.vendedor_nome + (p.ativo ? ' · ativo' : ' · inativo')));
        if (p.ativo) row.append(action('Desativar produto', () => rpc('moderar_produto',{p_produto:p.id})));
        return row;
      },'Nenhum produto.');
      list(section('Pedidos', 'pedidos'),orders,o => card('#' + o.id, el('span',o.status,'raiz-status'),el('p',money.format(o.total)),...(payments === null ? [] : [paymentCard(o,payments.find(t=>t.pedido_id===o.id))])), 'Nenhum pedido.');
      list(section('Entregas', 'entregas'),trips,t => card('#' + t.id,el('span',t.status,'raiz-status')), 'Nenhuma entrega.');
    }

    async function load(success = '', duringAction = false) {
      if (busy && !duringAction) return;
      busy = true;
      feedback.textContent = ['cliente','vendedor'].includes(role)?'Carregando…':'Carregando dados de ' + (RaizDB.backendLabel || 'Supabase') + '…';
      try {
        content.replaceChildren();
        sectionNav.replaceChildren();
        welcome();
        await ({cliente:customer,vendedor:seller,entregador:courier,admin})[role]();
        await privacy();
        if(role==='vendedor')RaizSeller.privacy(document.getElementById('privacidade'),{user,store:sellerStore,logout:sellerLogout});
        const order = {
          cliente:['catalogo','favoritos','carrinho','pedidos','conta','privacidade'],
          vendedor:['visao','pedidos','produtos','loja','estatisticas','privacidade'],
          entregador:['disponibilidade','andamento','ofertas','historico','carteira','privacidade'],
          admin:['visao','usuarios','moderacao','pedidos','entregas','solicitacoes','eventos','privacidade']
        }[role] || [];
        const rank = id => { const index=order.indexOf(id); return index < 0 ? order.length : index; };
        [...sectionNav.children]
          .sort((a,b)=>rank(a.dataset.section)-rank(b.dataset.section))
          .forEach(link=>sectionNav.append(link));
        if(role==='cliente')RaizCustomer.navigation(sectionNav);
        if(role==='vendedor')RaizSeller.decorateNav(sectionNav);
        mobileNav.replaceChildren(...[...sectionNav.querySelectorAll('a')].map(item => {
          const link = el('a', item.textContent, 'nav-btn');
          link.href = item.getAttribute('href');
          link.dataset.section = item.dataset.section;
          link.onclick = item.onclick;
          return link;
        }));
        syncNavigation();
        for(const [view,total] of Object.entries(totals)){
          const id=paged[view] || (view==='ofertas'?'ofertas':view==='usuarios'?'usuarios':null);
          const parent=id && document.getElementById(id);if(parent)pager(parent,view,total);
        }
        feedback.textContent = success;
        if (!duringAction && location.hash) {
          if(['cliente','vendedor'].includes(role))window.scrollTo({top:0,behavior:'instant'});
          else document.getElementById(location.hash.slice(1))?.scrollIntoView();
        }
      } catch (error) {
        feedback.textContent = RaizApi.errorText(error);
        void RaizApi.event(db,'erro',role);
      } finally {
        busy = false;
      }
    }
    function cancellation(parent,id){
      if(['cliente','vendedor'].includes(role)){
        const details=el('details',null,'shop-cancellation');details.append(el('summary','Cancelar este pedido'));parent.append(details);parent=details;
      }
      const [label,reason]=field('Motivo do cancelamento','text');reason.maxLength=300;
      parent.append(label,action('Cancelar pedido',()=>{
        if(reason.value.trim().length<3)throw {code:'P0001',message:'Informe um motivo com pelo menos 3 caracteres.'};
        return rpc('cancelar_pedido',{p_pedido:id,p_motivo:reason.value.trim()});
      },'Pedido cancelado. Estoque devolvido.'));
    }
    async function privacy(){
      const area=section('Privacidade e termos','privacidade');
      const policy=el('a','Política de privacidade','raiz-button');policy.href='../privacidade.html';
      const terms=el('a','Termos de uso','raiz-button');terms.href='../termos.html';area.append(policy,terms);
      if(features.aceites){
        const acceptance=await RaizApi.all(db,'raiz_aceites','usuario_id,versao,aceito_em','usuario_id');
        if(acceptance.some(a=>a.usuario_id===user.id && a.versao===RaizApi.version))area.append(el('p','Aceite dos termos registrado.'));
        else {const [label,accepted]=field('Li e aceito os termos de uso e estou ciente da política de privacidade','checkbox');
          area.append(label,action('Registrar aceite',()=>{
            if(!accepted.checked)throw {code:'P0001',message:'Leia os documentos e marque o aceite.'};
            return rpc('aceitar_termos',{p_versao:RaizApi.version});
          },'Aceite registrado.'));}
      }
      area.append(el('p','Contato: suporteraiz.mkt@hotmail.com'));
      if(!features.privacidade){const a=el('a','Solicitar exclusão por e-mail','raiz-button');a.href='mailto:suporteraiz.mkt@hotmail.com?subject=Exclus%C3%A3o%20de%20conta%20RAIZ';area.append(a);return;}
      const requestPage=role==='admin'?await RaizApi.page(db,'raiz_solicitacoes_privacidade','id,usuario_id,status,created_at',{page:pages.solicitacoes||0}):null;
      const requests=requestPage?requestPage.rows:await RaizApi.all(db,'raiz_solicitacoes_privacidade','id,usuario_id,status,created_at');
      const own=requests.filter(r=>r.usuario_id===user.id);
      own.forEach(r=>area.append(el('p','Protocolo '+r.id+' · '+r.status)));
      if(!own.some(r=>r.status!=='Concluída')){
        const details=el('details');details.append(el('summary','Solicitar exclusão da minha conta'),el('p','A equipe processará a exclusão da conta e o tratamento dos dados conforme a política. Pedidos em andamento precisam ser encerrados.'));
        const [label,confirmation]=field('Digite EXCLUIR MINHA CONTA');confirmation.autocomplete='off';
        details.append(label,action('Enviar solicitação de exclusão',()=>rpc('solicitar_exclusao',{p_confirmacao:confirmation.value}),id=>'Solicitação registrada. Protocolo: '+id));area.append(details);
      }
      if(role==='admin'){
        const pending=section('Solicitações de exclusão','solicitacoes');
        list(pending,requests.filter(r=>r.status!=='Concluída'),r=>card('Protocolo '+r.id,el('p',r.status),
          action('Processar exclusão',async()=>{
            const result=await db.functions.invoke('processar-exclusao',{body:{protocolo:r.id}});if(result.error)throw result.error;return result.data;
          },'Exclusão processada.')),'Nenhuma solicitação pendente nesta página.');
        pager(pending,'solicitacoes',requestPage.total);
        if(features.eventos){const events=section('Eventos operacionais','eventos');
          const result=await RaizApi.page(db,'raiz_eventos_operacao','id,evento,area,referencia,created_at',{page:pages.eventos||0,ascending:false});
          list(events,result.rows,e=>card(e.evento+' · '+e.area,el('p',new Date(e.created_at).toLocaleString('pt-BR')),el('small','Referência '+e.referencia)));
          pager(events,'eventos',result.total);}
      }
    }
    await load();
    function syncNavigation() {
      let current = role === 'cliente' && catalogState.favorites && ['#catalogo','#favoritos'].includes(location.hash)
        ? 'favoritos' : location.hash.slice(1) || sectionNav.querySelector('a')?.dataset.section;
      if(role==='vendedor')current=RaizSeller.show(content,location.hash.slice(1));
      if(role==='cliente'){
        if(!['catalogo','favoritos','carrinho','pedidos','conta','privacidade'].includes(current))current='catalogo';
        RaizCustomer.show(content,current);
      }
      for (const link of [...sectionNav.querySelectorAll('a'), ...mobileNav.querySelectorAll('a')]) {
        const selected = link.dataset.section === current;
        link.classList.toggle('active', selected);
        if (selected) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
      if (role !== 'cliente') title.textContent = document.getElementById(current)?.querySelector('h2')?.textContent || RaizAccess.labels[role];
    }
    window.addEventListener('hashchange', () => {
      if(['cliente','vendedor'].includes(role) && !busy)feedback.textContent='';
      if(role==='cliente' && ['#catalogo','#favoritos',''].includes(location.hash)){
        const favorites=location.hash==='#favoritos';
        if(catalogState.favorites!==favorites){catalogState.favorites=favorites;pages.catalog=0;load();}
      }
      syncNavigation();
      if(['cliente','vendedor'].includes(role))window.scrollTo({top:0,behavior:'instant'});
    });
    window.addEventListener('unhandledrejection',()=>{void RaizApi.event(db,'erro',role);});
    window.addEventListener('error',()=>{void RaizApi.event(db,'erro',role);});
  }

  window.RaizPerfil = { render };
})();
