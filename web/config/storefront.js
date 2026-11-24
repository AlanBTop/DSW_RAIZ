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
  function art(product,large=false){const e=node('div',undefined,'store-art'+(large?' store-art-large':''));if(pageType==='catalog')e.textContent=product.emoji||icons[product.categoria]||'🌿';else {const img=node('img');img.src='assets/catalog-'+(labels[product.categoria]?product.categoria:'plantas')+'.svg';img.alt='';img.width=320;img.height=260;e.append(img);}e.dataset.category=product.categoria;e.setAttribute('aria-hidden','true');return e;}
  function count(){const total=RaizShopping.cart().reduce((sum,r)=>sum+r.quantity,0);document.getElementById('storeCartCount').textContent=String(total);}
  RaizShell.mount();
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
  function carousel(rail,previous,next,label){
    rail._stopCarousel?.();
    rail.classList.add('store-carousel');rail.setAttribute('role','region');rail.setAttribute('aria-roledescription','carrossel');rail.setAttribute('aria-label',label);rail.tabIndex=0;
    function update(){const end=Math.max(0,rail.scrollWidth-rail.clientWidth);previous.disabled=rail.scrollLeft<=2;next.disabled=rail.scrollLeft>=end-2;}
    function slide(direction){rail.scrollBy({left:direction*Math.max(1,rail.clientWidth*.85),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
    function keys(event){if(event.target!==rail||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();if(event.key==='Home'||event.key==='End')rail.scrollTo({left:event.key==='Home'?0:rail.scrollWidth});else slide(event.key==='ArrowRight'?1:-1);}
    previous.onclick=()=>slide(-1);next.onclick=()=>slide(1);
    rail.addEventListener('scroll',update,{passive:true});rail.addEventListener('keydown',keys);
    const resize=new ResizeObserver(update);resize.observe(rail);requestAnimationFrame(update);
    rail._stopCarousel=()=>{resize.disconnect();rail.removeEventListener('scroll',update);rail.removeEventListener('keydown',keys);};
  }
  async function categoryCarousels(current){
    const host=document.getElementById('storeCategoryCarousels');
    host.querySelectorAll('.store-carousel').forEach(rail=>rail._stopCarousel?.());host.replaceChildren();
    const sections=Object.entries(labels).map(([category,label])=>{
      const section=node('section',undefined,'store-category-section'),head=node('div',undefined,'store-rail-heading');
      const title=node('h2',label);title.id='storeCategoryTitle-'+category;
      section.setAttribute('aria-labelledby',title.id);head.append(title,link('Ver todos',categoryUrl(category),'store-detail-link'));
      const rail=node('div',undefined,'store-products');rail.id='storeRail-'+category;
      const controls=node('div',undefined,'store-rail-buttons');
      const previous=button('←',()=>{},'store-outline'),next=button('→',()=>{},'store-outline');
      previous.setAttribute('aria-label','Produtos anteriores de '+label);next.setAttribute('aria-label','Próximos produtos de '+label);controls.append(previous,next);
      const hint=node('p','Carregando produtos…','store-muted');section.append(head,rail,hint,controls);host.append(section);
      return {category,label,rail,previous,next,hint};
    });
    await Promise.all(sections.map(async({category,label,rail,previous,next,hint})=>{
      try {
        const result=await RaizApi.page(db,'cliente_produtos',COLUMNS,{page:0,active:true,publicCatalog:true,category,order:'id',ascending:false});
        if(current!==ticket)return;
        rail.replaceChildren(...result.rows.map(productCard));hint.textContent=result.total?result.total+' produto(s) nesta categoria.':'Novos produtos em breve.';
        carousel(rail,previous,next,label);
      }catch(_){hint.textContent='Não foi possível carregar esta categoria. Use a busca para tentar novamente.';previous.disabled=next.disabled=true;}
    }));
  }
  async function catalog(){
    const current=++ticket;const grid=document.getElementById('storeProducts');grid.setAttribute('aria-busy','true');announce('Carregando produtos…');
    const search=(params.get('busca')||'').slice(0,120);const category=Object.hasOwn(labels,params.get('categoria'))?params.get('categoria'):'';
    const order=['recentes','menor-preco','maior-preco'].includes(params.get('ordem'))?params.get('ordem'):'recentes';const page=Math.max(0,Math.min(999,Math.floor(Number(params.get('pagina'))||0)));
    const home=!search&&!category&&!params.has('catalogo')&&!params.has('pagina')&&!params.has('ordem');
    document.getElementById('storeCategory').value=category;document.getElementById('storeOrder').value=order;
    document.getElementById('catalogTitle').textContent=search?'Resultados para “'+search+'”':category?labels[category]:'Encontre seu próximo verde.';
    const result=await RaizApi.page(db,'cliente_produtos',COLUMNS,{page,active:true,publicCatalog:true,category,search,searchColumns:['nome','vendedor_nome'],order:order==='recentes'?'id':'preco',ascending:order==='menor-preco'});
    if(current!==ticket)return;
    grid.replaceChildren(...result.rows.map(productCard));grid.setAttribute('aria-busy','false');
    if(!result.rows.length)grid.append(node('p','Nenhum produto encontrado. Experimente outra busca ou categoria.','store-empty'));
    announce(result.total+' produto(s) encontrado(s).');
    const pages=Math.max(1,Math.ceil(result.total/RaizApi.PAGE));const pager=document.getElementById('storePagination');pager.replaceChildren();
    document.getElementById('storeHighlightControls').hidden=!home;document.getElementById('storeFullCatalog').hidden=!home;pager.hidden=home;
    const categories=document.getElementById('storeCategoryCarousels');categories.hidden=!home;
    grid._stopCarousel?.();grid.classList.toggle('store-carousel',home);
    if(home){carousel(grid,document.getElementById('storeHighlightPrev'),document.getElementById('storeHighlightNext'),'Produtos em destaque');void categoryCarousels(current);}
    else {grid.removeAttribute('role');grid.removeAttribute('aria-roledescription');grid.removeAttribute('aria-label');grid.removeAttribute('tabindex');categories.querySelectorAll('.store-carousel').forEach(rail=>rail._stopCarousel?.());categories.replaceChildren();}
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
    const layout=node('section',undefined,'store-product-layout');const gallery=node('div',undefined,'store-gallery');gallery.append(art(p,true),node('p','Representação ilustrativa da categoria. Consulte a descrição do anúncio.','store-muted'));
    const info=node('div',undefined,'store-product-info');info.append(node('p',labels[p.categoria]||'Catálogo','store-eyebrow'),node('h1',p.nome),node('p','Vendido por '+p.vendedor_nome,'store-seller'),node('strong',money.format(p.preco),'store-detail-price'),node('p',p.estoque>0?p.estoque+' unidade(s) disponível(is)':'Produto sem estoque','store-availability'));
    const quantityLabel=node('label','Quantidade','store-quantity');const quantity=node('input');quantity.type='number';quantity.min=1;quantity.max=Math.min(99,p.estoque);quantity.value=1;quantityLabel.append(quantity);
    const quantityValue=()=>{if(!quantity.checkValidity()||Number(quantity.value)<1)throw new Error('Confira a quantidade disponível.');return Number(quantity.value);};
    const actions=node('div',undefined,'store-buy-actions');
    const buy=button('Comprar agora',()=>{try{purchase([{id:p.id,quantity:quantityValue()}]);}catch(e){announce(e.message,true);}});
    const addButton=button('Adicionar ao carrinho',()=>{try{add(p,quantityValue());}catch(e){announce(e.message,true);}},'store-outline');
    buy.disabled=addButton.disabled=p.estoque<1||!p.loja_id;actions.append(buy,addButton);
    if(p.descricao)info.append(node('p',p.descricao.length>220?p.descricao.slice(0,217)+'…':p.descricao,'buyer-product-excerpt'));
    if(p.porte)info.append(node('p','Porte: '+p.porte,'store-muted'));
    const purchasePanel=node('aside',undefined,'buyer-purchase-panel');purchasePanel.setAttribute('aria-label','Compra do produto');
    purchasePanel.append(node('h2','Leve mais verde para casa'),node('p','Frete de R$ 15,00 por pedido. Finalize uma compra por loja.','store-muted'),quantityLabel,actions,node('p','Preço, estoque e endereço são conferidos antes de confirmar.','store-muted'),node('p','Projeto acadêmico. O pagamento é simulado, sem cobrança real.','buyer-payment-note'));
    layout.append(gallery,info,purchasePanel);
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
      const lines=node('div',undefined,'buyer-cart-lines');section.append(lines);
      let subtotal=0,valid=store!=='indisponivel';
      for(const {row,p}of entries){
        const item=node('article',undefined,'store-cart-item');if(p)item.append(art(p));const info=node('div');
        info.append(p?link(p.nome,url('produto.html',{id:p.id}),'store-product-name'):node('h3','Produto #'+row.id+' indisponível'));
        if(p){info.append(node('p',money.format(p.preco)+' por unidade'));subtotal+=Math.round(Number(p.preco)*100)*row.quantity;if(row.quantity>p.estoque){info.append(node('p','Quantidade acima do estoque disponível.','store-error'));valid=false;}}
        const label=node('label','Quantidade');const q=node('input');q.type='number';q.min=1;q.max=p?Math.min(99,p.estoque):99;q.value=row.quantity;label.append(q);info.append(label);
        info.append(button('Atualizar',()=>{if(!q.checkValidity())return announce('Confira a quantidade disponível.',true);RaizShopping.save(RaizShopping.cart().map(r=>r.id===row.id?{...r,quantity:Number(q.value)}:r));cart().catch(fail);},'store-text-button'),button('Remover',()=>{RaizShopping.save(RaizShopping.cart().filter(r=>r.id!==row.id));cart().catch(fail);},'store-text-button'));
        item.append(info);lines.append(item);
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
    }catch(error){fail(error);}
  }
  if(pageType==='catalog')for(const [id,param]of [['storeCategory','categoria'],['storeOrder','ordem']])document.getElementById(id).onchange=event=>{params.set(param,event.target.value);params.delete('pagina');history.replaceState(null,'','?'+params);catalog().catch(fail);};
  start();
})();
