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
    const main = el('main', null, 'raiz-page raiz-dashboard raiz-' + role);
    const header = el('header');
    const title = el('h1', 'RAIZ · ' + RaizAccess.labels[role]);
    const navigation = el('nav', null, 'raiz-actions');
    const portal = el('a', 'Portal RAIZ', 'raiz-button');
    portal.href = '../index.html';
    const feedback = el('p', '', 'raiz-feedback');
    feedback.setAttribute('role', 'status');
    const content = el('div', null, 'raiz-content');
    const partnerCopy = {
      vendedor: ['Seu negócio, mais verde', 'Vamos cultivar boas vendas?', 'Cuide da sua vitrine, acompanhe os pedidos e veja sua loja crescer.'],
      entregador: ['Conectando jardins e pessoas', 'Cada entrega, um novo começo.', 'Organize suas rotas, acompanhe as oportunidades e leve mais verde para cada lar.'],
      admin: ['Um ecossistema em crescimento', 'Cuidar de cada detalhe.', 'Acompanhe a operação, os parceiros e o catálogo em um só lugar.']
    };
    function welcome() {
      if (!partnerCopy[role]) return;
      const [eyebrow, headline, description] = partnerCopy[role];
      const hero = el('section', null, 'partner-hero');
      const copy = el('div', null, 'partner-hero-copy');
      const heading = el('h2', headline);
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
    const sectionNav = el('nav', null, 'raiz-section-nav');
    sectionNav.setAttribute('aria-label', 'Seções do perfil');
    const layout = el('div', null, 'raiz-dashboard-layout');
    layout.append(sectionNav, content);
    navigation.append(portal, button('Atualizar', () => load()), switchAccount('../login.html?role=' + role + '&modo=online', value => feedback.textContent = value));
    navigation.lastChild.textContent = 'Sair';
    const identity = el('div');
    identity.append(title, el('p', user.email, 'raiz-identity'), el('p', RaizDB.backendLabel || 'Supabase', 'raiz-identity'));
    header.append(identity, navigation);
    main.append(header, feedback, layout);
    document.body.replaceChildren(main);
    document.body.classList.remove('raiz-pending');

    async function call(promise) {
      const { data, error } = await promise;
      if (error) throw error;
      return data;
    }

    const pages = {}, totals = {};
    let sellerSearch = '';
    const paged = {
      cliente_produtos:'moderacao',
      vendedor_produtos:'produtos',vendedor_pedidos:'pedidos',cliente_pedidos:'pedidos',
      entregador_corridas:role==='admin'?'entregas':'andamento',entregador_historico:'historico'
    };
    const query = async (view, columns) => {
      if (!paged[view]) return RaizApi.all(db,view,columns);
      const result=await RaizApi.page(db,view,columns,{page:pages[view]||0,
        ...(view==='vendedor_produtos'?{search:sellerSearch}:{}),
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
      const anchor = el('a', navLabel);
      anchor.href = '#' + id;
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
    const catalogState = { search: '', category: '', favorites: false };
    let catalogOffline=false;
    async function customer() {
      const savedFavorites=await RaizApi.all(db,'cliente_favoritos','id,produto_id');
      const catalogResult=await RaizApi.catalog(db,{page:pages.catalog||0,search:catalogState.search,category:catalogState.category,
        ...(catalogState.favorites?{ids:savedFavorites.map(f=>f.produto_id)}:{})});
      catalogOffline=catalogResult.offline;
      const [products, profile, favorites, cart, orders, items] = await Promise.all([
        Promise.resolve(catalogResult.rows),
        query('cliente_usuarios','nome,telefone,endereco'), Promise.resolve(savedFavorites),
        query('cliente_carrinho','produto_id,quantidade'),
        query('cliente_pedidos','id,data_formatada,status,total,frete,forma_pagamento,avaliacao_nota,avaliacao_comentario'+(features.recebimento?',recebimento_confirmado_em':'')),
        Promise.resolve([])
      ]);
      items.push(...await RaizApi.related(db,'cliente_itens_pedido','id,pedido_id,produto_nome,quantidade,preco_unitario','pedido_id',orders.map(o=>o.id)));
      const cartProducts=await RaizApi.related(db,'cliente_produtos','id,nome,preco,estoque,loja_id','id',cart.map(i=>i.produto_id));
      const catalog = section('Catálogo', 'catalogo');
      if(catalogOffline) catalog.append(el('p','Sem conexão: catálogo salvo por até 24 horas. Preço e estoque serão conferidos quando a conexão voltar.','raiz-notice'));
      const [searchLabel, search] = field('Buscar produto','search', catalogState.search);
      search.placeholder = 'Nome ou loja';
      const [categoryLabel, category] = selectCategory(catalogState.category, true);
      const [favoriteLabel, onlyFavorites] = field('Somente favoritos','checkbox', catalogState.favorites);
      const filters = el('aside', null, 'raiz-filters');
      filters.setAttribute('aria-label', 'Filtros do catálogo');
      filters.append(searchLabel,categoryLabel,favoriteLabel);
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
          const details = el('details');
          details.append(el('summary','Detalhes'), el('p',p.descricao || 'Descrição indisponível.'), el('p',p.cuidados));
          const row = card(p.nome,el('p',p.vendedor_nome, 'raiz-muted'),el('strong',money.format(p.preco), 'raiz-price'),details);
          row.classList.add('raiz-product-card');
          const art = el('div', p.emoji || icons[p.categoria] || '🌿', 'raiz-product-art');
          art.dataset.category = p.categoria;
          art.setAttribute('aria-hidden','true');
          row.prepend(art);
          if (profile.length && !catalogOffline) {
            const favorite = action(favoriteIds.has(p.id) ? 'Remover favorito' : 'Favoritar', () => setItem(p.id,0,!favoriteIds.has(p.id)));
            favorite.classList.add('raiz-secondary');
            row.append(favorite);
            const quantity = cart.find(item => item.produto_id === p.id)?.quantidade || 0;
            if (p.loja_id && p.estoque > quantity) row.append(action('Adicionar ao carrinho', () => setItem(p.id,quantity+1)));
          }
          return row;
        }, 'Nenhum produto encontrado.');
      }
      function searchServer(){Object.assign(catalogState,{search:search.value,category:category.value,favorites:onlyFavorites.checked});pages.catalog=0;load();}
      search.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();searchServer();}};
      category.onchange=onlyFavorites.onchange=searchServer;
      filters.append(button('Buscar',searchServer));
      filter();pager(catalog,'catalog',catalogResult.total);
      const basket = section('Carrinho', 'carrinho');
      const basketLayout = el('div', null, 'raiz-basket-layout');
      const lines = el('div', null, 'raiz-cart-lines');
      basketLayout.append(lines);
      basket.append(basketLayout);
      list(lines,cart,item => {
        const p = cartProducts.find(product => product.id === item.produto_id);
        const [label,qty] = field('Quantidade','number',item.quantidade);
        qty.min = 1; qty.max = 99;
        return card(p?.nome || 'Produto indisponível', el('p', p ? money.format(p.preco) + ' por unidade' : 'Preço indisponível'), label,action('Atualizar quantidade', () => setItem(item.produto_id,Number(qty.value))),
          action('Remover', () => setItem(item.produto_id,0)));
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
        summary.append(el('p','Registro sem cobrança. Finalize um pedido por loja.'),
        action('Registrar pedido sem pagamento', async () => {
          checkoutId ||= crypto.randomUUID();
          const id = await rpc('checkout',{p_requisicao:checkoutId});
          checkoutId = null;
          return id;
        }, id => 'Pedido #' + id + ' registrado. Nenhum pagamento foi processado.'));
      }
      list(section('Meus pedidos', 'pedidos', 'Pedidos'),orders,o => {
        const row=card('#'+o.id+' · '+o.status,el('p',o.data_formatada+' · '+money.format(o.total)),el('p',o.forma_pagamento),
          ...items.filter(i=>i.pedido_id===o.id).map(i=>el('p',i.quantidade+' × '+i.produto_nome)));
        if(features.cancelamento && o.status==='Confirmado') cancellation(row,o.id);
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
      const address = section('Minha conta e endereço', 'conta', 'Conta');
      if (profile.length) address.append(el('p',[profile[0].nome,profile[0].telefone].filter(Boolean).join(' · ')));
      if (profile[0]?.endereco && RaizMaps.search(profile[0].endereco)) address.append(mapLink(RaizMaps.search(profile[0].endereco),'Ver endereço no Google Maps'));
      const [addressLabel, addressInput] = field('Endereço completo','text',profile[0]?.endereco);
      if (!profile.length) address.append(el('p','Salve seu endereço para liberar favoritos, carrinho e pedidos.'));
      address.append(addressLabel, action('Salvar endereço', () => rpc('endereco',{p_endereco:addressInput.value})));
    }

    function productForm(p = {}) {
      const [nameLabel,name] = field('Nome','text',p.nome);
      const [categoryLabel,category] = selectCategory(p.categoria);
      const [priceLabel,price] = field('Preço (R$)','number',p.preco);
      const [stockLabel,stock] = field('Estoque','number',p.estoque);
      const [descLabel,desc] = field('Descrição','text',p.descricao);
      const [activeLabel,enabled] = field('Ativo','checkbox',p.ativo ?? true);
      const fields = el('div',null,'raiz-actions');
      price.min = stock.min = 0; price.step = '0.01';
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
      const [stores, products, orders, items] = await Promise.all([
        query('vendedor_lojas','nome,endereco,horario_funcionamento'),
        query('vendedor_produtos','id,nome,categoria,preco,estoque,ativo,descricao'),
        query('vendedor_pedidos','id,status,total,data_pedido,cliente_nome'),
        Promise.resolve([])
      ]);
      items.push(...await RaizApi.related(db,'vendedor_itens_pedido','id,pedido_id,produto_nome,quantidade','pedido_id',orders.map(o=>o.id)));
      const overview = section('Visão geral desta página', 'visao');
      metrics(overview,[['Pedidos aguardando preparo',orders.filter(o => o.status === 'Pendente').length],['Produtos ativos',products.filter(p => p.ativo).length],['Produtos sem estoque',products.filter(p => p.estoque === 0).length]]);
      const store = section('Minha loja', 'loja');
      for (const s of stores) store.append(el('p',[s.nome,s.endereco,s.horario_funcionamento].filter(Boolean).join(' · ')));
      for (const s of stores) if(RaizMaps.search(s.endereco)) store.append(mapLink(RaizMaps.search(s.endereco),'Ver loja no Google Maps'));
      if (!stores.length) {
        store.append(el('p','A equipe responsável precisa vincular sua conta a uma loja.'));
        return;
      }
      const inventory = section('Produtos', 'produtos');
      const newProduct = el('details');
      newProduct.className = 'raiz-create';
      newProduct.append(el('summary','Cadastrar produto','raiz-button'),productForm());
      inventory.append(newProduct);
      const [searchLabel, search] = field('Buscar produto no estoque','search',sellerSearch);
      const stock = el('div', null, 'raiz-stock-list');
      inventory.append(searchLabel,stock);
      const filter = () => {
        stock.replaceChildren();
        const term = search.value.trim().toLocaleLowerCase('pt-BR');
        list(stock, products.filter(p => p.nome.toLocaleLowerCase('pt-BR').includes(term)),p => {
          const details = el('details');
          details.append(el('summary','Editar produto'),productForm(p));
          return card(p.nome,el('span',p.ativo ? 'Ativo' : 'Inativo', 'raiz-status ' + (p.ativo ? 'raiz-positive' : '')),el('p',money.format(p.preco) + ' · ' + p.estoque + ' em estoque'),details);
        },'Nenhum produto encontrado.');
      };
      const searchServer=()=>{sellerSearch=search.value;pages.vendedor_produtos=0;load();};
      search.onkeydown=e=>{if(e.key==='Enter')searchServer();};inventory.append(button('Buscar',searchServer));
      filter();
      const orderSection = section('Pedidos da loja', 'pedidos', 'Pedidos');
      orderSection.append(el('p',orders.length + ' pedidos exibidos · ' + orders.filter(o => o.status === 'Pendente').length + ' aguardando preparo'));
      list(orderSection,orders,o => {
        const row = card('#' + o.id + ' · ' + o.status,el('p',o.cliente_nome + ' · ' + money.format(o.total)),
          ...items.filter(i => i.pedido_id === o.id).map(i => el('p',i.quantidade + ' × ' + i.produto_nome)));
        if (o.status === 'Pendente') row.append(action('Iniciar preparo e disponibilizar entrega', () => rpc('preparo',{p_pedido:o.id})));
        if(features.cancelamento && ['Pendente','Em preparo'].includes(o.status)) cancellation(row,o.id);
        return row;
      },'Nenhum pedido recebido.');
    }

    async function courier() {
      const [profiles, offers, trips, history] = await Promise.all([
        query('entregador_perfil','nome,veiculo,online'),features.versao>=4?rpc('ofertas_pagina',{p_pagina:pages.ofertas||0}):rpc('ofertas'),
        query('entregador_corridas','id,status,etapa_atual,coleta_loja,coleta_endereco,entrega_endereco,item_descricao,fragil,valor'),
        query('entregador_historico','corrida_id,status,data_formatada')
      ]);
      const account = section('Disponibilidade', 'disponibilidade');
      const profile = profiles[0];
      if (!profile) {
        account.append(el('p','A equipe responsável precisa vincular seu perfil de entregador.'));
        return;
      }
      account.append(el('span',profile.online ? 'Online' : 'Offline','raiz-status ' + (profile.online ? 'raiz-positive' : '')),
        el('p',[profile.nome,profile.veiculo].filter(Boolean).join(' · ')),
        action(profile.online ? 'Ficar offline' : 'Ficar online', () => rpc('disponibilidade',{p_online:!profile.online})),
        el('p','Carteira, saque e rastreamento indisponíveis.', 'raiz-muted'));
      const step = (p_pedido,p_etapa,p_vaso=false,p_folhagem=false,p_entrega=false) => rpc('etapa',{p_pedido,p_etapa,p_vaso,p_folhagem,p_entrega});
      list(section('Entregas em andamento', 'andamento', 'Em andamento'),trips.filter(t => t.status === 'Em andamento'),t => {
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
      list(section('Entregas disponíveis', 'ofertas', 'Ofertas'),features.versao>=4?offers.itens:offers,o => card('#' + o.id + ' · ' + o.coleta_loja,
        el('p',o.item_descricao + (o.fragil ? ' · Frágil' : '') + ' · ' + money.format(o.valor)),
        action('Aceitar entrega', () => step(o.id,1))),profile.online ? 'Nenhuma entrega disponível.' : 'Fique online para consultar as ofertas.');
      list(section('Histórico', 'historico'),history,t => card('#' + t.corrida_id + ' · ' + t.status,el('p',t.data_formatada)),'Nenhuma entrega concluída.');
    }

    let adminSearch='';
    async function admin() {
      const [userResult,orders,trips,products] = await Promise.all([
        features.versao>=4?rpc('usuarios_pagina',{p_busca:adminSearch,p_pagina:pages.usuarios||0}):rpc('usuarios'),query('cliente_pedidos','id,status,total'),query('entregador_corridas','id,status'),
        query('cliente_produtos','id,nome,vendedor_nome,ativo')
      ]);
      const users=features.versao>=4?userResult.itens:userResult;
      if(features.versao>=4) totals.usuarios=userResult.total;
      const summary = section('Visão geral desta página', 'visao');
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
      list(section('Moderação de produtos', 'moderacao', 'Moderação'),products,p => {
        const row = card(p.nome,el('p',p.vendedor_nome + (p.ativo ? ' · ativo' : ' · inativo')));
        if (p.ativo) row.append(action('Desativar produto', () => rpc('moderar_produto',{p_produto:p.id})));
        return row;
      },'Nenhum produto.');
      list(section('Pedidos', 'pedidos'),orders,o => card('#' + o.id, el('span',o.status,'raiz-status'),el('p',money.format(o.total))), 'Nenhum pedido.');
      list(section('Entregas', 'entregas'),trips,t => card('#' + t.id,el('span',t.status,'raiz-status')), 'Nenhuma entrega.');
    }

    async function load(success = '', duringAction = false) {
      if (busy && !duringAction) return;
      busy = true;
      feedback.textContent = 'Carregando dados de ' + (RaizDB.backendLabel || 'Supabase') + '…';
      try {
        content.replaceChildren();
        sectionNav.replaceChildren();
        welcome();
        await ({cliente:customer,vendedor:seller,entregador:courier,admin})[role]();
        await privacy();
        for(const [view,total] of Object.entries(totals)){
          const id=paged[view] || (view==='ofertas'?'ofertas':view==='usuarios'?'usuarios':null);
          const parent=id && document.getElementById(id);if(parent)pager(parent,view,total);
        }
        feedback.textContent = success;
        if (!duringAction && location.hash) {
          document.getElementById(location.hash.slice(1))?.scrollIntoView();
        }
      } catch (error) {
        feedback.textContent = RaizApi.errorText(error);
        void RaizApi.event(db,'erro',role);
      } finally {
        busy = false;
      }
    }
    function cancellation(parent,id){
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
    window.addEventListener('unhandledrejection',()=>{void RaizApi.event(db,'erro',role);});
    window.addEventListener('error',()=>{void RaizApi.event(db,'erro',role);});
  }

  window.RaizPerfil = { render };
})();
