/* Navegação administrativa: uma área por vez, com cadastros como entrada. */
(() => {
  const paths={
    cadastros:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 0 2 2 4-4',
    visao:'M3 10 12 3l9 7v11h-6v-7H9v7H3V10Z',
    financeiro:'M4 3v18h17M8 16v-4m5 4V7m5 9V4',
    usuarios:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm11 10v-2a4 4 0 0 0-3-4M16 3a4 4 0 0 1 0 8',
    moderacao:'M20 4C9 2 3 7 5 14s15 6 15-10ZM4 21l11-11',
    pedidos:'m3 7 9-5 9 5v10l-9 5-9-5V7Zm0 0 9 5 9-5M12 12v10',
    entregas:'M1 4h13v13H1V4Zm13 5h4l4 4v4h-8M7 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm14 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
    shield:'m12 2 8 4v6c0 6-8 10-8 10S4 18 4 12V6l8-4Zm-4 10 3 3 5-6'
  };
  function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');for(const[k,v]of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.6','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(k,v);const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',paths[name]||paths.shield);svg.append(p);return svg;}
  function configure({main,sidebar,navigation}) {
    main.classList.add('admin-console');
    sidebar.querySelector('.logo')?.remove();
    const caption=sidebar.querySelector('.sidebar-caption');caption.textContent='ADMINISTRAÇÃO';
    const header=document.getElementById('storeHeader');header.classList.add('admin-site-header');
    header.querySelector('.site-search')?.remove();header.querySelector('.site-categories')?.remove();header.querySelector('#siteCart')?.remove();
    const account=header.querySelector('#storeAccount');account.textContent='Minha conta';account.href='#privacidade';
    navigation.firstChild.textContent='Ver marketplace';
    const subtitle=main.querySelector('.topbar .tiny');subtitle.textContent='Parceiros, acessos e operação.';
    if(!location.hash)history.replaceState(null,'',location.pathname+location.search+'#cadastros');
  }
  function decorateNav(nav) {
    for(const a of nav.querySelectorAll('a')){
      const count=a.querySelector('.partner-request-count');
      const label=document.createElement('span');label.className='admin-nav-label';label.textContent=a.dataset.section==='cadastros'?'Cadastros de parceiros':a.dataset.section==='visao'?'Visão geral':a.textContent;
      a.replaceChildren(icon(a.dataset.section),label);if(count)a.append(count);
    }
  }
  function show(content,hash) {
    const sections=[...content.children].filter(n=>n.tagName==='SECTION'&&n.id),current=sections.some(n=>n.id===hash)?hash:'cadastros';
    for(const section of sections)section.hidden=section.id!==current;
    return current;
  }
  window.RaizAdmin={configure,decorateNav,show};
})();
