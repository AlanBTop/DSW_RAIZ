/* RAIZ — App do Vendedor (JavaScript) */

const logoSVG = `<svg class="logo-mark" viewBox="0 0 64 64" aria-hidden="true"><path d="M31 51C22 37 15 28 5 18c11-2 22 1 28 9 2 4 2 9-2 24Z" fill="#2D6A4F"/><path d="M33 50c1-19 5-31 20-39 3 13 0 24-7 30-4 4-8 6-13 9Z" fill="#52B788"/><path d="M31 27v29" stroke="#1B4332" stroke-width="3.4" stroke-linecap="round"/></svg><span>RAIZ</span>`;

const productSeed = [
  {id:1, name:'Costela de Adão', category:'plantas', seller:'Flora Verde', price:79.90, emoji:'🌿', tag:'Interior', rating:4.8, reviews:120, stock:14, active:true, description:'Planta de interior de folhagem marcante, ideal para ambientes com luz indireta.', care:'Manter em luz indireta, regar quando a camada superficial secar.', size:'Médio porte', fragile:true},
  {id:2, name:'Zamioculca', category:'plantas', seller:'Flora Verde', price:49.90, emoji:'🌱', tag:'Fácil cuidado', rating:4.9, reviews:86, stock:18, active:true, description:'Espécie resistente e indicada para quem busca baixa manutenção.', care:'Tolera meia-sombra. Regar moderadamente.', size:'Pequeno porte', fragile:true},
  {id:3, name:'Lírio da Paz', category:'plantas', seller:'Flora Verde', price:49.90, emoji:'🌾', tag:'Interior', rating:4.7, reviews:73, stock:9, active:true, description:'Planta ornamental com folhagem verde intensa e flores claras.', care:'Prefere luz filtrada e solo levemente úmido.', size:'Médio porte', fragile:true},
  {id:4, name:'Jiboia', category:'plantas', seller:'Flora Verde', price:39.90, emoji:'🍃', tag:'Pendente', rating:4.9, reviews:142, stock:22, active:true, description:'Planta pendente versátil, indicada para prateleiras e vasos suspensos.', care:'Luz indireta ou meia-sombra.', size:'Pequeno porte', fragile:true},
  {id:5, name:'Vaso de Cerâmica Terracota', category:'vasos', seller:'Flora Verde', price:34.90, emoji:'🏺', tag:'Cerâmica', rating:4.8, reviews:54, stock:31, active:true, description:'Vaso decorativo de cerâmica artesanal.', care:'Manusear com cuidado para evitar impactos.', size:'Médio porte', fragile:true},
  {id:6, name:'Substrato Orgânico Premium', category:'insumos', seller:'Flora Verde', price:19.90, emoji:'🧺', tag:'Orgânico', rating:4.6, reviews:61, stock:40, active:true, description:'Mistura pronta com matéria orgânica selecionada.', care:'Armazenar em local seco e ventilado.', size:'Pacote 2 kg', fragile:false},
  {id:7, name:'Kit de Jardinagem Manual', category:'ferramentas', seller:'Flora Verde', price:59.90, emoji:'🧰', tag:'3 peças', rating:4.8, reviews:47, stock:15, active:true, description:'Conjunto básico de ferramentas manuais.', care:'Limpar e secar após o uso.', size:'Kit compacto', fragile:false},
  {id:8, name:'Cachepô Artesanal', category:'vasos', seller:'Flora Verde', price:44.90, emoji:'🪴', tag:'Decorativo', rating:4.7, reviews:39, stock:11, active:true, description:'Cachepô rústico para ambientes aconchegantes.', care:'Evitar contato prolongado com água parada.', size:'Médio porte', fragile:true}
];

const initialOrders = [
  {id:12345, customer:'Fernanda Almeida', date:'10/09/2026 • 14:30', items:[{productId:1, qty:1}, {productId:5, qty:1}], status:'Pendente', subtotal:114.80, total:116.82, address:'Rua das Flores, 123 • Cáceres - MT'},
  {id:12344, customer:'Carlos M. Silva', date:'10/09/2026 • 11:20', items:[{productId:2, qty:1}], status:'Em preparo', subtotal:49.90, total:49.90, address:'Av. São João, 310 • Cáceres - MT'},
  {id:12343, customer:'Juliana Pereira', date:'09/09/2026 • 16:45', items:[{productId:1, qty:2}], status:'Enviado', subtotal:159.80, total:189.70, address:'Rua dos Ipês, 88 • Cáceres - MT'}
];

function getStorage(key, fallback) {
  if (window.RaizPresentation) return RaizPresentation.get(key, fallback);
  try {
    const item = localStorage.getItem('raiz_demo_' + key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setStorage(key, value) {
  if (window.RaizPresentation) { RaizPresentation.set(key, value); return; }
  try {
    localStorage.setItem('raiz_demo_' + key, JSON.stringify(value));
  } catch (e) {}
}

const currentUser = window.RaizDB?.auth?.getCurrentUser();
const isRealUser = currentUser && window.RaizDB?.auth?.isDemoUser ? !window.RaizDB.auth.isDemoUser(currentUser) : false;

const state = {
  page: 'home',
  products: getStorage('products', structuredClone(productSeed)),
  orders: isRealUser ? getStorage('orders', []) : getStorage('orders', structuredClone(initialOrders)),
  storeInfo: getStorage('store_info', {
    name: isRealUser && currentUser?.nome ? `Viveiro ${currentUser.nome.split(' ')[0]}` : 'Flora Verde',
    tagline: 'Plantas que transformam espaços',
    description: 'Especializada em plantas de interior, vasos de cerâmica artesanal e substratos nobres em Cáceres - MT.',
    hours: 'Seg–Sáb, 08:00–18:00',
    address: 'Av. São João, 310 • Cáceres - MT'
  }),
  orderFilter: 'todos'
};

if ((!state.products || !state.products.length) && window.RaizPresentation?.source !== 'real') {
  state.products = structuredClone(productSeed);
  setStorage('products', state.products);
}

if (!isRealUser && (!state.orders || !state.orders.length) && window.RaizPresentation?.source !== 'real') {
  state.orders = structuredClone(initialOrders);
  setStorage('orders', state.orders);
}

const sellerNavItems = [
  ['home', '⌂', 'Início'],
  ['products', '▦', 'Produtos'],
  ['sellerOrders', '▣', 'Pedidos'],
  ['store', '🏪', 'Loja'],
  ['stats', '▥', 'Estatísticas']
];

function money(v) {
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
}

function productById(id) {
  return state.products.find(p => p.id === Number(id));
}

function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => t.classList.remove('show'), 2000);
}

function pageTitle() {
  const all = {
    home: 'Painel da Loja',
    products: 'Meus Produtos',
    sellerOrders: 'Gestão de Pedidos',
    store: 'Minha Loja',
    stats: 'Estatísticas de Desempenho'
  };
  return all[state.page] || 'RAIZ Vendedor';
}

function go(page) {
  state.page = page;
  renderApp();
  window.scrollTo(0, 0);
}

function vendedorNavIcon(page) {
  const paths={home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-8h6v8"/>',products:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16M15 10v10"/>',sellerOrders:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6"/>',store:'<path d="M3 10h18l-2-6H5z"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>',stats:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',deliveries:'<path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',activeDelivery:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',history:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',wallet:'<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 9h18M16 15h2M7 6V4h10v2"/>',dashboard:'<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="5" rx="1"/><rect x="13" y="10" width="8" height="11" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/>',users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5"/>',catalog:'<path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="9"/>',disputes:'<path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v4M12 17h.01"/>',security:'<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>'};
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[page]||paths.home}</svg>`;
}

function renderApp() {
  const appContainer = document.getElementById('appView');
  const title = pageTitle();
  const pendingCount = state.orders.filter(o => o.status === 'Pendente').length;

  appContainer.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" aria-label="Menu principal">
        <a class="logo" href="#home" onclick="go('home')">${logoSVG}</a>
        
        <p class="sidebar-caption">Espaço do vendedor</p>

        <nav class="side-nav" aria-label="Navegação principal">
          ${sellerNavItems.map(([p, i, l]) => `
            <button class="nav-btn ${state.page === p ? 'active' : ''}" aria-current="${state.page === p ? 'page' : 'false'}" onclick="go('${p}')">
              <span class="nav-icon">${vendedorNavIcon(p)}</span>${l}
              ${p === 'sellerOrders' && pendingCount > 0 ? `<span class="badge orange" style="margin-left:auto;padding:2px 7px;font-size:.7rem">${pendingCount}</span>` : ''}
            </button>
          `).join('')}
        </nav>

        <div class="sidebar-foot">
          <div class="hub-tag">
            <span>🌿</span>
            <span>Painel do Parceiro</span>
          </div>
          <a class="sidebar-about" href="../index.html"><span class="nav-icon">ⓘ</span><span>Sobre a RAIZ</span></a>
        </div>
      </aside>

      <main class="main">
        <header class="topbar">
          <div>
            <h2>${title}</h2>
            <div class="tiny muted">RAIZ • ${state.storeInfo.name}</div>
          </div>
          <div class="top-actions">
            <div id="topAuthContainer"></div>
            <button class="btn btn-primary" onclick="openProductEditor()" style="padding:8px 14px;font-size:.85rem">
              ＋ Novo produto
            </button>
            <button class="icon-btn" onclick="toast('Nenhuma nova notificação de venda')" title="Notificações">🔔</button>
            <a class="icon-btn mobile-only" href="../index.html" title="Voltar ao portal">↩</a>
          </div>
        </header>

        <div class="app-content" id="pageContent"></div>
      </main>
    </div>

    <nav class="bottom-nav">
      ${sellerNavItems.map(([p, i, l]) => `
        <button class="nav-btn ${state.page === p ? 'active' : ''}" aria-current="${state.page === p ? 'page' : 'false'}" onclick="go('${p}')">
          <span class="nav-icon">${vendedorNavIcon(p)}</span>
          <span>${l}</span>
        </button>
      `).join('')}
    </nav>
  `;

  if (window.RaizDB && window.RaizDB.renderAuthTopbar) {
    window.RaizDB.renderAuthTopbar(document.getElementById('topAuthContainer'), { role: 'vendedor' });
  }

  renderPage();
  window.RaizPartnerDesign?.prepare();
}

function renderPage() {
  const c = document.getElementById('pageContent');
  if (!c) return;

  if (state.page === 'home') {
    const user = window.RaizDB?.auth?.getCurrentUser() || { nome: 'Flora Verde' };
    const userIsReal = user && window.RaizDB?.auth?.isDemoUser ? !window.RaizDB.auth.isDemoUser(user) : false;
    const pending = state.orders.filter(o => o.status === 'Pendente').length;
    const activeProducts = state.products.filter(p => p.active).length;
    const salesTotal = state.orders.filter(o => o.status !== 'Cancelado').reduce((sum, o) => sum + (o.total || 0), 0);
    const realData = window.RaizPresentation?.source === 'real';
    const salesFormatted = realData || userIsReal ? money(salesTotal) : 'R$ 1.250,00';
    const viewsFormatted = realData ? 'Não disponível' : userIsReal ? (state.orders.length ? '124' : '0') : '1.430';

    c.innerHTML = `
      <section class="partner-hero" aria-labelledby="seller-welcome">
        <div class="partner-hero-copy">
          <span class="eyebrow">Seu negócio, mais verde</span>
          <h1 id="seller-welcome">Olá, ${user.nome ? user.nome.split(' ')[0] : 'Lojista'}!<br>Vamos cultivar boas vendas?</h1>
          <p>Cuide da sua vitrine, acompanhe os pedidos e veja sua loja crescer a cada novo cultivo.</p>
          <div class="row wrap">
            <button class="btn btn-primary" onclick="go('sellerOrders')">Acompanhar pedidos</button>
            <button class="btn btn-outline" onclick="go('products')">Gerenciar produtos</button>
          </div>
        </div>
        <img src="../assets/vitrine-botanica.webp" alt="Composição ilustrativa de plantas em vasos" width="720" height="640">
      </section>

      <div class="grid-4">
        <div class="card metric">
          <div class="label">Vendas neste mês</div>
          <div class="value">${salesFormatted}</div>
          <div class="trend">${realData ? 'Total dos pedidos consultados' : userIsReal ? '● Atualizado em tempo real' : '↑ 12% vs. mês anterior'}</div>
        </div>
        <div class="card metric">
          <div class="label">Produtos ativos</div>
          <div class="value">${activeProducts}</div>
          <div class="small muted" style="margin-top:3px">${state.products.length} no catálogo</div>
        </div>
        <div class="card metric">
          <div class="label">Pedidos pendentes</div>
          <div class="value" style="color:${pending > 0 ? 'var(--terracotta)' : 'var(--ever)'}">${pending}</div>
          <div class="small muted" style="margin-top:3px">Aguardando separação</div>
        </div>
        <div class="card metric">
          <div class="label">Visualizações na vitrine</div>
          <div class="value">${viewsFormatted}</div>
          <div class="trend">${realData ? 'Métrica não exposta na consulta' : userIsReal ? '● Vitrine ativa' : '↑ 24% esta semana'}</div>
        </div>
      </div>

      <div class="grid-2" style="margin-top:18px">
        <div class="card">
          <h3 style="margin-top:0">Acesso rápido</h3>
          <div class="grid-2">
            <button type="button" class="quick-cat" onclick="go('products')">
              <span class="icon nav-icon">${vendedorNavIcon('products')}</span>
              <div>
                <strong>Meus produtos</strong>
                <small>${state.products.length} cadastrados</small>
              </div></button>
            <button type="button" class="quick-cat" onclick="go('sellerOrders')">
              <span class="icon nav-icon">${vendedorNavIcon('sellerOrders')}</span>
              <div>
                <strong>Pedidos</strong>
                <small>${pending} pendente(s)</small>
              </div></button>
            <button type="button" class="quick-cat" onclick="go('stats')">
              <span class="icon nav-icon">${vendedorNavIcon('stats')}</span>
              <div>
                <strong>Estatísticas</strong>
                <small>Gráficos de vendas</small>
              </div></button>
            <button type="button" class="quick-cat" onclick="go('store')">
              <span class="icon nav-icon">${vendedorNavIcon('store')}</span>
              <div>
                <strong>Minha loja</strong>
                <small>Editar dados e perfil</small>
              </div></button>
          </div>
        </div>

        <div class="hero-card partner-note">
          <span class="badge green">Sua vitrine digital</span>
          <h2 style="margin-top:10px">Plantas conectam pessoas!</h2>
          <p>Mantenha produtos com estoque atualizado e prepare pedidos com carinho para encantar seus clientes botânicos.</p>
          <div class="plant">🌿</div>
        </div>
      </div>
    `;
    return;
  }

  if (state.page === 'products') {
    c.innerHTML = sellerProductsPage();
    return;
  }

  if (state.page === 'sellerOrders') {
    c.innerHTML = sellerOrdersPage();
    return;
  }

  if (state.page === 'store') {
    c.innerHTML = storePage();
    return;
  }

  if (state.page === 'stats') {
    c.innerHTML = statsPage();
    return;
  }
}

function sellerProductsPage() {
  return `
    <div class="page-title">
      <div>
        <h1>Meus Produtos</h1>
        <p>Cadastre novas espécies, edite preços, pause itens ou controle o estoque.</p>
      </div>
      <button class="btn btn-primary" onclick="openProductEditor()">＋ Adicionar produto</button>
    </div>

    <div class="card">
      <div class="searchbar" style="max-width:420px;margin-bottom:16px">
        <span>🔎</span>
        <input placeholder="Buscar produto por nome ou categoria..." oninput="filterSellerProducts(this.value)">
      </div>
      <div id="sellerProductsList" class="list">
        ${sellerProductItems(state.products)}
      </div>
    </div>
  `;
}

function sellerProductItems(arr) {
  if (!arr.length) {
    return `<div class="empty"><div class="big">🌱</div>Nenhum produto cadastrado com esse termo.</div>`;
  }
  return arr.map(p => `
    <div class="list-item">
      <div class="thumb">${p.emoji}</div>
      <div class="list-main">
        <strong>${p.name}</strong>
        <small>${money(p.price)} • Estoque: ${p.stock} un. • ${p.category}</small>
      </div>
      <span class="badge ${p.active ? 'green' : 'orange'}">
        ${p.active ? '● Ativo' : '○ Pausado'}
      </span>
      <button class="icon-btn" onclick="openProductEditor(${p.id})" title="Editar produto">✎</button>
    </div>
  `).join('');
}

function filterSellerProducts(v) {
  const s = v.toLowerCase().trim();
  const filtered = state.products.filter(p => 
    p.name.toLowerCase().includes(s) || p.category.toLowerCase().includes(s)
  );
  document.getElementById('sellerProductsList').innerHTML = sellerProductItems(filtered);
}

function openProductEditor(id = null) {
  const p = id ? productById(id) : {
    id: null,
    name: '',
    category: 'plantas',
    price: '',
    stock: 10,
    description: '',
    active: true,
    emoji: '🌿',
    seller: state.storeInfo.name,
    tag: 'Novo',
    rating: 5.0,
    reviews: 1,
    care: 'Regar moderadamente e manter em local bem iluminado.',
    size: 'Médio porte',
    fragile: true
  };

  openModal(`
    <div class="modal-head">
      <h2>${id ? 'Editar Produto' : 'Cadastrar Novo Produto'}</h2>
      <button class="icon-btn" onclick="closeModal()">✕</button>
    </div>
    <form class="modal-body" onsubmit="saveProduct(event, ${id || 'null'})">
      <div class="card" style="background:var(--field);text-align:center;font-size:4rem;padding:15px">
        <div id="pePreviewEmoji">${p.emoji}</div>
        <div class="small muted">Ícone botânico / Foto do produto</div>
      </div>

      <div class="grid-2" style="margin-top:16px">
        <div class="field">
          <label>Nome do produto</label>
          <input id="peName" class="input" value="${escapeAttr(p.name)}" placeholder="Ex: Suculenta Jade" required>
        </div>
        <div class="field">
          <label>Categoria</label>
          <select id="peCat" class="input" onchange="updateEmojiCat(this.value)">
            <option value="plantas" ${p.category === 'plantas' ? 'selected' : ''}>Plantas</option>
            <option value="vasos" ${p.category === 'vasos' ? 'selected' : ''}>Vasos</option>
            <option value="insumos" ${p.category === 'insumos' ? 'selected' : ''}>Insumos</option>
            <option value="ferramentas" ${p.category === 'ferramentas' ? 'selected' : ''}>Ferramentas</option>
          </select>
        </div>
        <div class="field">
          <label>Preço de venda (R$)</label>
          <input id="pePrice" class="input" type="number" step="0.01" value="${p.price}" placeholder="0,00" required>
        </div>
        <div class="field">
          <label>Quantidade em Estoque</label>
          <input id="peStock" class="input" type="number" value="${p.stock}" required>
        </div>
      </div>

      <div class="field" style="margin-top:12px">
        <label>Descrição detalhada</label>
        <textarea id="peDesc" class="input" placeholder="Detalhes botânicos, tipo de folhagem, indicação de ambiente...">${p.description}</textarea>
      </div>

      <div class="field" style="margin-top:12px">
        <label>Orientações de cuidado</label>
        <input id="peCare" class="input" value="${escapeAttr(p.care || '')}" placeholder="Frequência de rega, sol pleno ou meia sombra...">
      </div>

      <label class="row" style="margin-top:14px;cursor:pointer">
        <span>
          <strong>Produto ativo para venda</strong>
          <div class="tiny muted">Se desativado, o produto não aparecerá nas buscas dos clientes</div>
        </span>
        <span style="margin-left:auto" class="switch">
          <input id="peActive" type="checkbox" ${p.active ? 'checked' : ''}>
          <span class="slider"></span>
        </span>
      </label>

      <div class="row" style="margin-top:20px;gap:10px">
        ${id ? `
          <button type="button" class="btn btn-outline" onclick="toggleProduct(${id})">
            ${p.active ? '⏸ Pausar' : '▶ Ativar'}
          </button>
          <button type="button" class="btn btn-danger" onclick="deleteProductItem(${id})">
            🗑 Excluir produto
          </button>
        ` : ''}
        <button class="btn btn-primary" style="margin-left:auto" type="submit">
          ${id ? 'Salvar alterações' : 'Publicar produto'}
        </button>
      </div>
    </form>
  `, true);
}

function updateEmojiCat(cat) {
  const map = { plantas: '🌿', vasos: '🏺', insumos: '🧺', ferramentas: '🧰' };
  const em = document.getElementById('pePreviewEmoji');
  if (em) em.textContent = map[cat] || '🌱';
}

function saveProduct(e, id) {
  e.preventDefault();
  const cat = document.getElementById('peCat').value;
  const emojiMap = { plantas: '🌿', vasos: '🏺', insumos: '🧺', ferramentas: '🧰' };

  const data = {
    name: document.getElementById('peName').value,
    category: cat,
    price: Number(document.getElementById('pePrice').value),
    stock: Number(document.getElementById('peStock').value),
    description: document.getElementById('peDesc').value,
    care: document.getElementById('peCare').value || 'Manter regas regulares conforme o substrato secar.',
    active: document.getElementById('peActive').checked
  };

  if (!data.name.trim() || !['plantas', 'vasos', 'insumos', 'ferramentas'].includes(cat) ||
      !Number.isFinite(data.price) || data.price < 0 || !Number.isInteger(data.stock) || data.stock < 0) {
    toast('Informe nome, categoria, preço não negativo e estoque inteiro não negativo.');
    return;
  }

  if (id) {
    Object.assign(productById(id), data);
  } else {
    const newProd = {
      id: Date.now(),
      seller: state.storeInfo.name,
      emoji: emojiMap[cat] || '🌱',
      tag: 'Novo',
      rating: 5.0,
      reviews: 1,
      size: 'Médio porte',
      fragile: cat !== 'insumos',
      ...data
    };
    state.products.push(newProd);
  }

  setStorage('products', state.products);
  closeModal();
  renderPage();
  toast(id ? 'Produto atualizado com sucesso' : 'Novo produto publicado na vitrine');
}

function toggleProduct(id) {
  const p = productById(id);
  if (!p) return;
  p.active = !p.active;
  setStorage('products', state.products);
  closeModal();
  renderPage();
  toast(p.active ? 'Produto reativado na vitrine' : 'Produto pausado');
}

function deleteProductItem(id) {
  if(getStorage('orders',[]).some(o=>o.paymentId && o.inventoryReserved && !['Entregue','Cancelado'].includes(o.status) && o.items.some(i=>Number(i.productId)===Number(id)))) {
    toast('Este produto está reservado em um pedido. Cancele o pedido ou finalize a entrega antes de excluir.');return;
  }
  const p = productById(id);
  if (!p) return;
  state.products = state.products.filter(x => Number(x.id) !== Number(id));
  setStorage('products', state.products);
  closeModal();
  renderPage();
  toast(`Produto "${p.name}" excluído do catálogo`);
}

function sellerOrdersPage() {
  const pendingCount = state.orders.filter(o => o.status === 'Pendente').length;
  const prepCount = state.orders.filter(o => o.status === 'Em preparo').length;
  const sentCount = state.orders.filter(o => o.status === 'Enviado').length;

  let filtered = state.orders;
  if (state.orderFilter === 'pendente') filtered = state.orders.filter(o => o.status === 'Pendente');
  if (state.orderFilter === 'preparo') filtered = state.orders.filter(o => o.status === 'Em preparo');

  return `
    <div class="page-title">
      <div>
        <h1>Gestão de Pedidos</h1>
        <p>Acompanhe pedidos recebidos, confirme a preparação e despache para os entregadores.</p>
      </div>
    </div>

    <div class="filter-line">
      <button class="chip ${state.orderFilter === 'todos' ? 'active' : ''}" onclick="filterOrders('todos')">
        Todos (${state.orders.length})
      </button>
      <button class="chip ${state.orderFilter === 'pendente' ? 'active' : ''}" onclick="filterOrders('pendente')">
        Pendentes (${pendingCount})
      </button>
      <button class="chip ${state.orderFilter === 'preparo' ? 'active' : ''}" onclick="filterOrders('preparo')">
        Em preparo (${prepCount})
      </button>
    </div>

    <div class="list">
      ${filtered.length ? filtered.map(o => `
        <div class="list-item clickable" onclick="openSellerOrder(${o.id})">
          <div class="thumb">#</div>
          <div class="list-main">
            <strong>#${o.id} • ${o.customer}</strong>
            <small>${o.items.reduce((a, b) => a + b.qty, 0)} item(ns) • ${money(o.total)} • ${o.date}</small>
            ${o.paymentId?`<small>${escapeAttr(o.paymentStatus || '')}</small>`:''}
          </div>
          ${statusBadge(o.status)}
          <span style="font-size:1.2rem;color:var(--muted)">›</span>
        </div>
      `).join('') : `
        <div class="empty">
          <div class="big">📦</div>
          Nenhum pedido nesta categoria.
        </div>
      `}
    </div>
  `;
}

function filterOrders(f) {
  state.orderFilter = f;
  renderPage();
}

function statusBadge(s) {
  const cls = s === 'Pendente' ? 'orange' : s === 'Em preparo' ? 'blue' : s === 'Enviado' ? 'purple' : s === 'Entregue' ? 'green' : 'gray';
  return `<span class="badge ${cls}">${s}</span>`;
}

function openSellerOrder(id) {
  const o = state.orders.find(x => x.id === id);
  if (!o) return;

  const tx=o.paymentId?RaizPaymentFlow.transaction(o.id):null;
  const nextAction = o.paymentId ? tx?.state==='paid' && o.status==='Pendente'?'Iniciar preparo e liberar entrega':'' : o.status === 'Pendente' ? 'Iniciar preparação' : o.status === 'Em preparo' ? 'Confirmar preparação e chamar entregador' : o.status === 'Enviado' ? 'Marcar como entregue' : '';

  openModal(`
    <div class="modal-head">
      <div>
        <h2>Pedido #${o.id}</h2>
        <div class="small muted">${o.date}</div>
      </div>
      <button class="icon-btn" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="row space">
        <span>${statusBadge(o.status)}</span>
        <strong class="money" style="font-size:1.3rem">${money(o.total)}</strong>
      </div>

      <h3 style="margin:16px 0 8px">Itens do Pedido</h3>
      <div class="list">
        ${o.items.map(i => {
          const p = productById(i.productId);
          return `
            <div class="list-item">
              <div class="thumb">${p ? p.emoji : '📦'}</div>
              <div class="list-main">
                <strong>${p ? p.name : 'Item botânico'}</strong>
                <small>${i.qty} unidade(s)</small>
              </div>
              <strong>${p ? money(p.price * i.qty) : '—'}</strong>
            </div>
          `;
        }).join('')}
      </div>

      <div class="divider"></div>
      
      <h3>Dados para Entrega</h3>
      ${tx?`<p class="payment-notice">${escapeAttr(RaizPaymentFlow.STATUS[tx.state])} · ${escapeAttr(tx.method.label)}. Somente demonstração local.</p>`:''}
      <div class="card soft">
        <strong>Cliente: ${o.customer}</strong>
        <div class="small muted" style="margin-top:4px">📍 ${o.address}</div>
      </div>

      ${nextAction ? `
        <button class="btn btn-primary btn-block" style="margin-top:18px" onclick="advanceSellerOrder(${o.id})">
          ${nextAction}
        </button>
      ` : `
        <div class="card soft" style="text-align:center;margin-top:16px">
          <span class="badge green">${o.status==='Entregue'?'✓ Pedido finalizado':o.paymentId && tx?.state!=='paid'?'Pedido não liberado para preparo':'Etapas de transporte realizadas pelo entregador'}</span>
        </div>
      `}
    </div>
  `);
}

async function advanceSellerOrder(id) {
  state.orders=getStorage('orders',state.orders);
  const o = state.orders.find(x => x.id === id);
  if (!o) return;
  if(o.paymentId) {
    try {await RaizPaymentFlow.prepare(id);state.orders=getStorage('orders',[]);closeModal();renderPage();toast('Preparo iniciado; entrega disponível. Pagamento simulado aprovado.');}
    catch(error) {toast(error.message);}
    return;
  }

  const seq = ['Pendente', 'Em preparo', 'Enviado', 'Entregue'];
  const curIdx = seq.indexOf(o.status);
  if (curIdx < seq.length - 1) {
    o.status = seq[curIdx + 1];
    setStorage('orders', state.orders);

    // Se houver um pedido ativo do cliente associado a esse id, atualiza o status dele também!
    const clientOrder = getStorage('client_active_order', null);
    if (clientOrder && clientOrder.id === o.id) {
      clientOrder.status = o.status;
      clientOrder.step = curIdx + 1;
      setStorage('client_active_order', clientOrder);
    }


    closeModal();
    renderPage();
    toast(`Pedido #${o.id} atualizado para: ${o.status}`);
  }
}

function storePage() {
  const info = state.storeInfo;
  return `
    <div class="page-title" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <div>
        <h1>Minha Loja</h1>
        <p>Gerencie informações comerciais, horário de atendimento e dados de contato.</p>
      </div>
      <a class="btn btn-outline" href="../login.html?role=vendedor" style="font-size:13px;padding:8px 14px">
        🔐 Alternar Conta / Fazer Login
      </a>
    </div>

    <div class="grid-2">
      <div class="card">
        <div style="text-align:center;padding:12px 0">
          <div style="font-size:5rem">🏪</div>
          <h2 style="margin:5px 0">${info.name}</h2>
          <p class="muted">${info.tagline}</p>
        </div>
        <div class="divider"></div>
        ${[
          ['✎', 'Editar perfil público da loja'],
          ['▣', 'Dados fiscais e CNPJ'],
          ['◷', 'Horários de funcionamento'],
          ['🚚', 'Políticas de entrega e retirada'],
          ['⚙', 'Configurações de notificações']
        ].map(x => `
          <button class="nav-btn" onclick="toast('${x[1]}: recurso de demonstração')" style="justify-content:space-between">
            <span class="row"><span class="icon">${x[0]}</span>${x[1]}</span>
            <span>›</span>
          </button>
        `).join('')}
      </div>

      <div class="card">
        <h3 style="margin-top:0">Editar Dados da Loja</h3>
        <div class="field">
          <label>Nome Comercial</label>
          <input class="input" id="storeName" value="${escapeAttr(info.name)}">
        </div>
        <div class="field" style="margin-top:12px">
          <label>Slogan da Loja</label>
          <input class="input" id="storeTagline" value="${escapeAttr(info.tagline)}">
        </div>
        <div class="field" style="margin-top:12px">
          <label>Descrição Institucional</label>
          <textarea class="input" id="storeDesc">${info.description}</textarea>
        </div>
        <div class="field" style="margin-top:12px">
          <label>Horário de Funcionamento</label>
          <input class="input" id="storeHours" value="${escapeAttr(info.hours)}">
        </div>
        <div class="field" style="margin-top:12px">
          <label>Endereço Físico</label>
          <input class="input" id="storeAddress" value="${escapeAttr(info.address)}">
        </div>
        <button class="btn btn-primary" style="margin-top:18px" onclick="saveStoreInfo()">
          Salvar alterações da loja
        </button>
      </div>
    </div>
    ${sellerPaymentPanel()}
  `;
}

function saveStoreInfo() {
  state.storeInfo = {
    name: document.getElementById('storeName').value,
    tagline: document.getElementById('storeTagline').value,
    description: document.getElementById('storeDesc').value,
    hours: document.getElementById('storeHours').value,
    address: document.getElementById('storeAddress').value
  };
  setStorage('store_info', state.storeInfo);
  toast('Informações da loja atualizadas com sucesso');
  renderApp();
}

function sellerPaymentPanel() {
  if(RaizPresentation.source!=='local') return '<section class="card payment-settings"><h3>Pagamentos</h3><p>Preferências disponíveis somente nos exemplos locais. Nenhuma cobrança é processada.</p></section>';
  const accepted=RaizPayments.accepted();
  return `<section class="card payment-settings"><h3>Formas de pagamento aceitas na apresentação</h3>
    <p class="payment-notice">Preferências da loja de exemplo neste navegador. Afetam o checkout de demonstração, não habilitam uma adquirente nem cobranças reais.</p>
    ${Object.entries(RaizPayments.TYPES).map(([key,label])=>`<label class="payment-option"><input type="checkbox" id="accept_${key}" ${accepted.includes(key)?'checked':''}>${escapeAttr(label)}</label>`).join('')}
    <button class="btn btn-primary" onclick="saveAcceptedPayments()">Salvar formas aceitas</button>
    </section>${RaizPayments.pixForm('vendedor')}${RaizPaymentFlow.panel()}`;
}
function saveAcceptedPayments() {try {RaizPayments.saveAccepted(Object.keys(RaizPayments.TYPES).filter(key=>document.getElementById('accept_'+key).checked));renderApp();toast('Formas aceitas salvas para a apresentação.');}catch(error){toast(error.message);}}
function savePixPreference() {try {RaizPayments.savePix('vendedor',document.getElementById('pixType').value,document.getElementById('pixValue').value);renderApp();toast('Chave de exemplo salva localmente.');}catch(error){toast(error.message);}}
function removePixPreference() {try {RaizPayments.removePix('vendedor');renderApp();toast('Chave de exemplo removida.');}catch(error){toast(error.message);}}

function statsPage() {
  if (window.RaizPresentation?.source === 'real') {
    const sales = getStorage('daily_sales', []);
    return `<div class="page-title"><div><h1>Estatísticas de Vendas</h1><p>Valores consultados no Supabase. Até 100 pedidos.</p></div></div>
      <div class="grid-2"><div class="card metric"><div class="label">Total dos pedidos consultados</div><div class="value">${money(state.orders.filter(o => o.status !== 'Cancelado').reduce((sum,o) => sum + Number(o.total),0))}</div></div>
      <div class="card metric"><div class="label">Pedidos consultados</div><div class="value">${state.orders.length}</div></div></div>
      <div class="card" style="margin-top:18px"><h3>Vendas diárias registradas</h3>${sales.map(s => `<p>${escapeAttr(s.dia_semana)}: ${money(s.valor)}</p>`).join('') || '<p>Nenhuma venda diária registrada.</p>'}</div>`;
  }
  const vals = [45, 62, 88, 55, 105, 76, 120, 91, 68, 132, 112, 96];
  return `
    <div class="page-title">
      <div>
        <h1>Estatísticas de Vendas</h1>
        <p>Métricas consolidadas de vendas, volume de pedidos e taxa de conversão.</p>
      </div>
      <select class="input" style="width:170px">
        <option>Últimos 30 dias</option>
        <option>Últimos 7 dias</option>
        <option>Este ano</option>
      </select>
    </div>

    <div class="grid-3">
      <div class="card metric">
        <div class="label">Total de Vendas</div>
        <div class="value">R$ 1.250,00</div>
        <div class="trend">↑ 12% vs. mês passado</div>
      </div>
      <div class="card metric">
        <div class="label">Pedidos Faturados</div>
        <div class="value">${state.orders.length + 15}</div>
        <div class="trend">↑ 8% novos compradores</div>
      </div>
      <div class="card metric">
        <div class="label">Visualizações de Produtos</div>
        <div class="value">1.430</div>
        <div class="trend">↑ 24% engajamento</div>
      </div>
    </div>

    <div class="card" style="margin-top:18px">
      <div class="row space">
        <h3 style="margin:0">Vendas Diárias no Período</h3>
        <span class="small muted">Valores em R$</span>
      </div>
      <div class="stat-bars">
        ${vals.map((v, i) => `
          <div class="bar-col" title="Dia ${i + 1}: R$ ${(v * 12.5).toFixed(2)}">
            <div class="bar" style="height:${v}px"></div>
            <span>${i + 1}/09</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function openModal(html, wide = false) {
  const m = document.getElementById('modal');
  m.innerHTML = `<div class="modal-card ${wide ? 'wide' : ''}" onclick="event.stopPropagation()">${html}</div>`;
  m.classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

function modalBackdrop(e) {
  if (e.target.id === 'modal') closeModal();
}

function escapeAttr(s = '') {
  return String(s).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

// Inicializa a aplicação
renderApp();
