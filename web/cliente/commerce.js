/* Componentes da experiência de compra. Sem dados ou operações de negócio próprios. */
(() => {
  const labels = {plantas:'Plantas',vasos:'Vasos',insumos:'Insumos',ferramentas:'Ferramentas'};
  const paths = {
    leaf:'M20 4C9 2 3 7 5 14s15 6 15-10ZM4 21l11-11',
    heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
    bag:'M5 7h14l1 14H4L5 7ZM8 7V6a4 4 0 0 1 8 0v1',
    box:'m3 7 9-5 9 5v10l-9 5-9-5V7Zm0 0 9 5 9-5M12 12v10M7.5 4.5l9 5',
    user:'M20 21v-2a7 7 0 0 0-14 0v2M17 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    truck:'M1 3h14v13H1V3Zm14 5h4l4 5v3h-8M8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM21 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
    shield:'m12 2 8 4v6c0 6-8 10-8 10S4 18 4 12V6l8-4Zm-4 10 3 3 5-6',
    filter:'M4 7h16M7 12h10M10 17h4'
  };
  function node(tag, text, cls) {
    const n=document.createElement(tag); if(text!=null)n.textContent=text; if(cls)n.className=cls; return n;
  }
  function icon(name) {
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    for(const [k,v] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.6','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(k,v);
    const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[name]||paths.leaf);svg.append(path);return svg;
  }
  function art(product) {
    const image=node('img',null,'shop-illustration');
    image.src='../assets/catalog-'+(labels[product.categoria]?product.categoria:'plantas')+'.svg';
    image.alt=''; image.width=320; image.height=260;
    image.loading='lazy'; return image;
  }
  function intro(catalog, chooseCategory) {
    const hero=node('div',null,'shop-hero');
    const copy=node('div',null,'shop-hero-copy');
    copy.append(node('span','CULTIVE NOVAS POSSIBILIDADES','shop-kicker'),node('h1','Mais verde no seu dia.'),node('p','Plantas, vasos e cuidados. Encontre o que combina com o seu espaço.'));
    const cta=node('button','Explorar plantas','shop-primary');cta.type='button';cta.onclick=()=>chooseCategory('plantas');copy.append(cta);
    const photo=node('img');photo.src='../assets/vitrine-botanica.webp';photo.alt='Plantas em vasos em um ambiente iluminado';photo.width=560;photo.height=360;
    hero.append(copy,photo);
    const categories=node('nav',null,'shop-category-tiles');categories.setAttribute('aria-label','Explore as categorias');
    const subtitles={plantas:'Um verde para cada espaço',vasos:'Novos lares para suas plantas',insumos:'Tudo para crescer bem',ferramentas:'Cuidado na medida certa'};
    for(const [value,label] of Object.entries(labels)) {
      const b=node('button',null,'shop-category-tile');b.type='button';
      const image=art({categoria:value});const text=node('span');text.append(node('strong',label),node('small',subtitles[value]));b.append(image,text);b.onclick=()=>chooseCategory(value);categories.append(b);
    }
    catalog.prepend(hero,categories);
    return hero;
  }
  function navigation(nav) {
    const icons={catalogo:'leaf',favoritos:'heart',carrinho:'bag',pedidos:'box',conta:'user',privacidade:'shield'};
    for(const link of nav.querySelectorAll('a')) {
      const label=link.textContent;link.replaceChildren(icon(icons[link.dataset.section]),node('span',label));
    }
  }
  function servicebar(main, profile) {
    let bar=main.querySelector('.shop-servicebar');
    if(!bar){bar=node('div',null,'shop-servicebar');main.prepend(bar);}
    const address=node('a',null,'shop-delivery');address.href='#conta';
    const copy=node('span');copy.append(node('small','Entregar em'),node('strong',profile?.endereco || 'Cadastre seu endereço'));
    address.append(icon('pin'),copy);
    const greeting=node('span',profile?.nome?'Olá, '+profile.nome.split(' ')[0]:'Sua loja de plantas','shop-greeting');
    bar.replaceChildren(address,greeting);
  }
  function profile({section, user, customer, name, addressLabel, saveAddress, navigation, notice, map}) {
    section.classList.add('customer-account');
    const heading=section.querySelector('h2');
    const title=node('h1','Minha conta');title.id=heading.id;heading.replaceWith(title);
    const head=node('div',null,'account-page-heading');
    head.append(title,node('p','Seus dados e endereços, do seu jeito.'));
    const layout=node('div',null,'account-layout');
    const aside=node('aside',null,'account-sidebar');aside.setAttribute('aria-label','Menu da minha conta');
    const summary=node('div',null,'account-summary');
    const avatar=node('span',name.slice(0,1).toLocaleUpperCase('pt-BR'),'account-avatar');avatar.setAttribute('aria-hidden','true');
    summary.append(avatar,node('strong',name),node('span','Conta conectada','account-connected'));
    const menu=node('nav',null,'account-menu');menu.setAttribute('aria-label','Seções da minha conta');
    for(const [target,label,symbol] of [['account-details','Dados pessoais','user'],['account-delivery','Endereço de entrega','pin'],['account-security','Acesso e segurança','shield']]) {
      const control=node('button',null,'account-menu-item');control.type='button';control.append(icon(symbol),node('span',label));
      if(target==='account-details')control.classList.add('active');
      control.onclick=()=>{menu.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===control));document.getElementById(target).scrollIntoView({behavior:'smooth',block:'start'});};menu.append(control);
    }
    const shortcuts=node('div',null,'account-shortcuts');shortcuts.append(node('span','SUAS COMPRAS','account-menu-label'));
    for(const [target,label,symbol] of [['pedidos','Meus pedidos','box'],['favoritos','Meus favoritos','heart'],['privacidade','Privacidade e termos','shield']]) {
      const link=node('a',null,'account-menu-item');link.href='#'+target;link.append(icon(symbol),node('span',label));shortcuts.append(link);
    }
    aside.append(summary,menu,shortcuts);
    const panels=node('div',null,'account-panels');
    function panel(id,title,symbol,description) {
      const card=node('div',null,'account-panel');card.id=id;
      const header=node('div',null,'account-panel-heading');const copy=node('div');
      copy.append(node('h2',title),node('p',description));header.append(icon(symbol),copy);card.append(header);panels.append(card);return card;
    }
    const details=panel('account-details','Dados pessoais','user','Informações do seu cadastro na RAIZ.');
    const fields=node('dl',null,'account-data');
    for(const [label,value] of [['Nome completo',name],['E-mail',user.email||'Não informado'],['Telefone',customer?.telefone||user.user_metadata?.telefone||'Não informado']]) {
      const row=node('div');row.append(node('dt',label),node('dd',value));fields.append(row);
    }
    details.append(fields);
    const delivery=panel('account-delivery','Endereço de entrega','pin','Mantenha seu endereço atualizado para receber suas compras.');
    if(notice)delivery.append(node('p',notice,'raiz-notice'));
    delivery.append(addressLabel);
    const addressActions=node('div',null,'account-address-actions');addressActions.append(saveAddress);if(map)addressActions.append(map);delivery.append(addressActions);
    const security=panel('account-security','Acesso e segurança','shield','Gerencie o acesso à sua conta com tranquilidade.');
    const methods=user.app_metadata?.providers||[user.app_metadata?.provider];
    const names=[...new Set(methods.map(p=>({google:'Google',email:'E-mail e senha'})[p]).filter(Boolean))];
    const session=node('div',null,'account-session');const sessionCopy=node('div');sessionCopy.append(node('strong',names.join(' e ')||'Conta RAIZ'),node('p',user.email||'Sua sessão está ativa.'));session.append(sessionCopy,node('span','Conectado','account-session-badge'));security.append(session);
    const recovery=node('a','Recuperar acesso por e-mail','account-recovery');recovery.href='../recuperar-senha.html';security.append(recovery);
    navigation.className='account-session-actions';navigation.firstChild.textContent='Atualizar dados';navigation.lastChild.textContent='Sair da conta';security.append(navigation);
    layout.append(aside,panels);section.replaceChildren(head,layout);
  }
  function show(content, current) {
    const selected=current==='favoritos'?'catalogo':current;
    for(const section of content.children) if(section.tagName==='SECTION')section.hidden=section.id!==selected;
    const active=content.querySelector('#'+selected);
    if(active) document.title=(current==='favoritos'?'Favoritos':active.querySelector('h1,h2')?.textContent||'Marketplace')+' · RAIZ';
  }
  window.RaizCustomer={node,icon,art,intro,navigation,servicebar,profile,show,labels};
})();
