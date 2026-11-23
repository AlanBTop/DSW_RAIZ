(() => {
  const search = document.getElementById('catalogSearch');
  const category = document.getElementById('catalogCategory');
  const status = document.getElementById('publicCatalogStatus');
  const grid = document.getElementById('publicCatalog');
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const icons = { plantas: '🌿', vasos: '🪴', insumos: '🌱', ferramentas: '🧤' };
  let products;

  function element(tag, text, style) {
    const node = document.createElement(tag);
    node.textContent = text;
    if (style) node.className = style;
    return node;
  }

  function render() {
    if (!products) return;
    const term = search.value.trim().toLocaleLowerCase('pt-BR');
    const shown = products.filter(p => (!category.value || p.categoria === category.value)
      && (p.nome + ' ' + p.vendedor_nome).toLocaleLowerCase('pt-BR').includes(term));
    grid.replaceChildren();
    status.textContent = (window.RaizDB.isDemo && (localStorage.getItem('raiz_fonte') || 'local') === 'local' ? 'Exemplos fictícios locais • ' : '') + (shown.length ? shown.length + (shown.length === 1 ? ' produto' : ' produtos') : 'Nenhum produto encontrado.');
    for (const p of shown) {
      const card = element('article', '', 'market-product');
      const picture = element('div', p.emoji || icons[p.categoria] || '🌿', 'market-product-art');
      picture.dataset.category = p.categoria;
      picture.setAttribute('aria-hidden', 'true');
      const body = element('div', '', 'market-product-body');
      body.append(element('h3', p.nome), element('p', p.vendedor_nome), element('strong', currency.format(p.preco)));
      const link = element('a', 'Ver no catálogo');
      link.href = 'cliente/index.html';
      body.append(link);
      card.append(picture, body);
      grid.append(card);
    }
  }

  search.addEventListener('input', render);
  category.addEventListener('change', render);
  document.getElementById('marketSearch').addEventListener('submit', event => {
    event.preventDefault();
    document.getElementById('catalogo').scrollIntoView();
  });
  document.querySelectorAll('[data-category]').forEach(link => link.addEventListener('click', () => {
    category.value = link.dataset.category;
    render();
  }));
  if (window.RaizDB.isDemo && (localStorage.getItem('raiz_fonte') || 'local') === 'local') {
    const dbStatus=document.getElementById('btnPgHeader');
    if(dbStatus) dbStatus.textContent='Exemplos locais';
    let cached;
    try { cached = JSON.parse(localStorage.getItem('raiz_local_state_v2'))?.products || JSON.parse(localStorage.getItem('raiz_local_products')); } catch (_) {}
    products = Array.isArray(cached) ? cached.filter(p => p.active !== false).map(p => ({nome:p.name, categoria:p.category, vendedor_nome:p.seller, preco:p.price, emoji:p.emoji})) : [
      {nome:'Costela de Adão',categoria:'plantas',vendedor_nome:'Flora Verde (exemplo)',preco:79.90,emoji:'🌿'},
      {nome:'Zamioculca',categoria:'plantas',vendedor_nome:'Flora Verde (exemplo)',preco:49.90,emoji:'🌱'},
      {nome:'Substrato Orgânico Premium',categoria:'insumos',vendedor_nome:'Flora Verde (exemplo)',preco:19.90,emoji:'🌱'}
    ];
    render();
    return;
  }
  window.RaizDB.cliente.getProdutos().then(data => {
    window.RaizDB.renderDbStatusUI(data);
    products = data;
    if (products === null) {
      status.textContent = 'Catálogo indisponível. Atualize a página para tentar novamente.';
      return;
    }
    render();
  });
})();
