/* Vitrine pública: nenhuma conta é necessária para consultar produtos ou montar o carrinho. */
(() => {
  const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  const labels={plantas:'Plantas',vasos:'Vasos',insumos:'Insumos',ferramentas:'Ferramentas'};
  const icons={plantas:'🌿',vasos:'🪴',insumos:'🌱',ferramentas:'🧤'};
  const COLUMNS='id,nome,categoria,vendedor_nome,preco,estoque,descricao,cuidados,porte,fragil,loja_id,emoji';
  const params=new URLSearchParams(location.search);
  const pageType=document.body.dataset.storePage;
  const main=document.getElementById('storeContent');
  const status=document.getElementById('storeStatus');
  let db,ticket=0;
  const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
  function link(text,href,cls){const e=node('a',text,cls);e.href=href;return e;}
  function button(text,fn,cls='raiz-button'){const b=node('button',text,cls);b.type='button';b.onclick=fn;return b;}
  function announce(text,error=false){status.textContent=text;status.classList.toggle('store-error',error);}
  function url(path,query={}){const u=new URL(path,location.href);for(const [k,v]of Object.entries(query))if(v!==''&&v!==undefined)u.searchParams.set(k,v);return u.pathname+u.search;}
  function categoryUrl(category){return url('index.html',{categoria:category});}
  function art(product,large=false){const e=node('div',product.emoji||icons[product.categoria]||'🌿','store-art'+(large?' store-art-large':''));e.dataset.category=product.categoria;e.setAttribute('aria-hidden','true');return e;}
  function count(){const total=RaizShopping.cart().reduce((sum,r)=>sum+r.quantity,0);document.getElementById('storeCartCount').textContent=String(total);}
  document.getElementById('storeHeader').innerHTML=`<div class="market-wrap store-header-row"><a class="store-brand" href="index.html" aria-label="RAIZ, início"><span aria-hidden="true">🌿</span>RAIZ</a><form class="store-search" id="storeSearch" role="search"><label class="raiz-sr" for="storeQuery">Buscar produtos</label><input id="storeQuery" type="search" maxlength="120" placeholder="Busque plantas, vasos e tudo para cultivar"><button type="submit">Buscar</button></form><nav class="store-account" aria-label="Sua conta"><a id="storeAccount" href="login.html?role=cliente&amp;modo=online">Entrar / Cadastrar</a><a class="store-cart-link" href="carrinho.html">Carrinho <span id="storeCartCount">0</span></a></nav></div><nav class="market-wrap store-categories" aria-label="Categorias"><a href="index.html">Todos os produtos</a><a href="index.html?categoria=plantas">Plantas</a><a href="index.html?categoria=vasos">Vasos</a><a href="index.html?categoria=insumos">Insumos</a><a href="index.html?categoria=ferramentas">Ferramentas</a><a class="store-about-link" href="sobre.html">Sobre a RAIZ</a></nav>`;
  document.getElementById('storeQuery').value=params.get('busca')||'';
  document.getElementById('storeSearch').onsubmit=event=>{event.preventDefault();location.href=url('index.html',{busca:document.getElementById('storeQuery').value.trim()});};
  document.getElementById('storeFooter').innerHTML=`<div class="market-wrap store-footer-row"><div><strong>RAIZ</strong><p>Plantas, pessoas e cuidado.</p></div><nav aria-label="Informações e parceiros"><a href="sobre.html">Sobre a RAIZ</a><a href="login.html?role=vendedor&amp;modo=online">Área do vendedor</a><a href="login.html?role=entregador&amp;modo=online">Área do entregador</a><a href="privacidade.html">Privacidade</a><a href="termos.html">Termos</a><a href="mailto:suporteraiz.mkt@hotmail.com">Suporte</a></nav><p>Projeto acadêmico. Pagamentos simulados, sem cobrança bancária.</p></div>`;
  count();window.addEventListener('raiz-cart-updated',count);window.addEventListener('storage',count);
  async function query(builder){const {data,error}=await builder;if(error)throw error;return data||[];}
  function add(product,quantity){
    try {const current=RaizShopping.cart().find(r=>r.id===product.id)?.quantity||0;if(quantity+current>product.estoque)throw new Error('A quantidade excede o estoque disponível.');RaizShopping.add(product.id,quantity);announce('Produto adicionado ao carrinho. Você pode continuar explorando.');}
    catch(error){announce(error.message,true);}
  }
  async function purchase(rows,source='direct'){
    try {
      RaizShopping.setIntent(rows,source);
      let user=null;
      try {const result=await db.auth.getUser();user=result.data?.user;}catch(_){}
      location.href=user?'cliente/index.html?modo=online#carrinho':'login.html?role=cliente&modo=online';
    }catch(error){announce(error.message||'Não foi possível continuar. Tente novamente.',true);}
  }
  function productCard(product){
    const card=node('article',undefined,'store-product');const target=url('produto.html',{id:product.id});
    const picture=link('',target,'store-picture');picture.setAttribute('aria-label','Ver '+product.nome);picture.append(art(product));
    const body=node('div',undefined,'store-product-body');
    body.append(node('p',labels[product.categoria]||product.categoria,'store-eyebrow'),link(product.nome,target,'store-product-name'),node('p',product.vendedor_nome,'store-seller'),node('strong',money.format(product.preco),'store-price'));
    body.append(node('span',product.estoque>0?'Disponível':'Sem estoque','store-availability'));
    const actions=node('div',undefined,'store-card-actions');actions.append(link('Ver produto',target,'store-detail-link'));
    const addButton=button('Adicionar',()=>add(product,1));addButton.disabled=product.estoque<1||!product.loja_id;actions.append(addButton);
    body.append(actions);card.append(picture,body);return card;
  }
  async function catalog(){
    const current=++ticket;const grid=document.getElementById('storeProducts');grid.setAttribute('aria-busy','true');announce('Carregando produtos…');
    const search=(params.get('busca')||'').slice(0,120);const category=Object.hasOwn(labels,params.get('categoria'))?params.get('categoria'):'';
    const order=['recentes','menor-preco','maior-preco'].includes(params.get('ordem'))?params.get('ordem'):'recentes';const page=Math.max(0,Math.min(999,Math.floor(Number(params.get('pagina'))||0)));
    document.getElementById('storeCategory').value=category;document.getElementById('storeOrder').value=order;
    document.getElementById('catalogTitle').textContent=search?'Resultados para “'+search+'”':category?labels[category]:'Encontre seu próximo verde.';
    const result=await RaizApi.page(db,'cliente_produtos',COLUMNS,{page,active:true,publicCatalog:true,category,search,searchColumns:['nome','vendedor_nome'],order:order==='recentes'?'id':'preco',ascending:order==='menor-preco'});
    if(current!==ticket)return;
    grid.replaceChildren(...result.rows.map(productCard));grid.setAttribute('aria-busy','false');
    if(!result.rows.length)grid.append(node('p','Nenhum produto encontrado. Experimente outra busca ou categoria.','store-empty'));
    announce(result.total+' produto(s) encontrado(s).');
    const pages=Math.max(1,Math.ceil(result.total/RaizApi.PAGE));const pager=document.getElementById('storePagination');pager.replaceChildren();
    function move(next){params.set('pagina',next);history.replaceState(null,'','?'+params);catalog().catch(fail);document.getElementById('catalogTitle').scrollIntoView({block:'start'});}
    const prev=button('Anterior',()=>move(page-1),'store-outline');prev.disabled=page===0;
    const next=button('Próxima',()=>move(page+1),'store-outline');next.disabled=page+1>=pages;
    pager.append(prev,node('span','Página '+(page+1)+' de '+pages),next);
  }
  async function product(){
    const id=Number(params.get('id'));if(!Number.isSafeInteger(id)||id<1)return unavailable();
    const rows=await query(db.from('cliente_produtos').select(COLUMNS).eq('ativo',true).eq('id',id).limit(1));
    const p=rows[0];if(!p)return unavailable();
    document.title=p.nome+' · RAIZ';main.replaceChildren();
    const crumbs=node('nav',undefined,'store-breadcrumb');crumbs.setAttribute('aria-label','Você está em');crumbs.append(link('Todos os produtos','index.html'),node('span','/'),link(labels[p.categoria]||'Categoria',categoryUrl(p.categoria)),node('span','/'),node('span',p.nome));
    const layout=node('section',undefined,'store-product-layout');const gallery=node('div',undefined,'store-gallery');gallery.append(art(p,true),node('p','Representação ilustrativa do produto.','store-muted'));
    const info=node('div',undefined,'store-product-info');info.append(node('p',labels[p.categoria]||'Catálogo','store-eyebrow'),node('h1',p.nome),node('p','Vendido por '+p.vendedor_nome,'store-seller'),node('strong',money.format(p.preco),'store-detail-price'),node('p',p.estoque>0?p.estoque+' unidade(s) disponível(is)':'Produto sem estoque','store-availability'));
    const quantityLabel=node('label','Quantidade','store-quantity');const quantity=node('input');quantity.type='number';quantity.min=1;quantity.max=Math.min(99,p.estoque);quantity.value=1;quantityLabel.append(quantity);
    const quantityValue=()=>{if(!quantity.checkValidity()||Number(quantity.value)<1)throw new Error('Confira a quantidade disponível.');return Number(quantity.value);};
    const actions=node('div',undefined,'store-buy-actions');
    const buy=button('Comprar agora',()=>{try{purchase([{id:p.id,quantity:quantityValue()}]);}catch(e){announce(e.message,true);}});
    const addButton=button('Adicionar ao carrinho',()=>{try{add(p,quantityValue());}catch(e){announce(e.message,true);}},'store-outline');
    buy.disabled=addButton.disabled=p.estoque<1||!p.loja_id;actions.append(buy,addButton);
    info.append(quantityLabel,actions,node('p','Explore à vontade. Sua conta será solicitada ao continuar a compra.','store-muted'));
    layout.append(gallery,info);
    const details=node('section',undefined,'store-description');details.append(node('h2','Sobre o produto'),node('p',p.descricao||'O vendedor ainda não adicionou uma descrição.'),node('h3','Cuidados'),node('p',p.cuidados||'Consulte a loja sobre os cuidados deste produto.'));
    if(p.porte)details.append(node('p','Porte: '+p.porte));if(p.fragil)details.append(node('p','Produto frágil: transporte com cuidado.'));
    main.append(crumbs,layout,details);announce('');
  }
  function unavailable(){main.replaceChildren(node('h1','Produto não encontrado'),node('p','Este anúncio está indisponível ou foi retirado do catálogo.'),link('Explorar produtos','index.html','raiz-button'));announce('');}
  async function cart(){
    const saved=RaizShopping.cart();main.replaceChildren(node('h1','Seu carrinho'));announce('');
    if(!saved.length){main.append(node('div','Seu carrinho está vazio.','store-empty'),link('Explorar produtos','index.html','raiz-button'));return;}
    const products=await query(db.from('cliente_produtos').select(COLUMNS).eq('ativo',true).in('id',saved.map(r=>r.id)).order('id').limit(50));
    const groups=new Map();
    for(const row of saved){const p=products.find(p=>p.id===row.id);const key=p?.loja_id||'indisponivel';if(!groups.has(key))groups.set(key,[]);groups.get(key).push({row,p});}
    for(const [store,entries]of groups){
      const section=node('section',undefined,'store-cart-group');section.append(node('h2',store==='indisponivel'?'Itens indisponíveis':entries[0].p.vendedor_nome));
      let subtotal=0,valid=store!=='indisponivel';
      for(const {row,p}of entries){
        const item=node('article',undefined,'store-cart-item');if(p)item.append(art(p));const info=node('div');
        info.append(p?link(p.nome,url('produto.html',{id:p.id}),'store-product-name'):node('h3','Produto #'+row.id+' indisponível'));
        if(p){info.append(node('p',money.format(p.preco)+' por unidade'));subtotal+=Math.round(Number(p.preco)*100)*row.quantity;if(row.quantity>p.estoque){info.append(node('p','Quantidade acima do estoque disponível.','store-error'));valid=false;}}
        const label=node('label','Quantidade');const q=node('input');q.type='number';q.min=1;q.max=p?Math.min(99,p.estoque):99;q.value=row.quantity;label.append(q);info.append(label);
        info.append(button('Atualizar',()=>{if(!q.checkValidity())return announce('Confira a quantidade disponível.',true);RaizShopping.save(RaizShopping.cart().map(r=>r.id===row.id?{...r,quantity:Number(q.value)}:r));cart().catch(fail);},'store-text-button'),button('Remover',()=>{RaizShopping.save(RaizShopping.cart().filter(r=>r.id!==row.id));cart().catch(fail);},'store-text-button'));
        item.append(info);section.append(item);
      }
      if(store!=='indisponivel'){
        const summary=node('div',undefined,'store-cart-summary');summary.append(node('p','Subtotal: '+money.format(subtotal/100)),node('p','Frete: '+money.format(15)),node('strong','Total estimado: '+money.format(subtotal/100+15)));
        const checkout=button('Continuar para comprar',()=>purchase(entries.map(e=>e.row),'cart'));checkout.disabled=!valid;summary.append(checkout);section.append(summary);
      }
      main.append(section);
    }
    main.append(node('p','Finalize um pedido por loja. Preço, estoque e endereço serão conferidos ao continuar.','store-muted'),link('Continuar explorando','index.html','store-outline'));
  }
  function fail(error){announce(!navigator.onLine?'Sem conexão. Confira sua internet e tente novamente.':'Não foi possível carregar o catálogo. Tente novamente.',true);const grid=document.getElementById('storeProducts');grid?.setAttribute('aria-busy','false');if(grid)grid.replaceChildren();status.append(' ',button('Tentar novamente',()=>start(),'store-text-button'));}
  async function start(){
    try {
      await RaizDB.ready;db=RaizDB.getClient({publicCatalog:true});if(!db)throw new Error('Catálogo indisponível');
      if(pageType==='catalog')await catalog();else if(pageType==='product')await product();else await cart();
      try {const {data}=await db.auth.getUser();if(data?.user){const account=document.getElementById('storeAccount');account.textContent='Minha conta';account.href='cliente/index.html?modo=online';}}catch(_){}
    }catch(error){fail(error);}
  }
  if(pageType==='catalog')for(const [id,param]of [['storeCategory','categoria'],['storeOrder','ordem']])document.getElementById(id).onchange=event=>{params.set(param,event.target.value);params.delete('pagina');history.replaceState(null,'','?'+params);catalog().catch(fail);};
  start();
})();
