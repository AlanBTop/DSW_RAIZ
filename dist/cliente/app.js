/* RAIZ — App do Cliente (JavaScript) */

const logoSVG = `<svg class="logo-mark" viewBox="0 0 64 64" aria-hidden="true"><path d="M31 51C22 37 15 28 5 18c11-2 22 1 28 9 2 4 2 9-2 24Z" fill="#2D6A4F"/><path d="M33 50c1-19 5-31 20-39 3 13 0 24-7 30-4 4-8 6-13 9Z" fill="#52B788"/><path d="M31 27v29" stroke="#1B4332" stroke-width="3.4" stroke-linecap="round"/></svg><span>RAIZ Cliente</span>`;

const productSeed = [
  {id:1, name:'Costela de Adão', category:'plantas', seller:'Verde Vivo', price:79.90, emoji:'🌿', tag:'Interior', rating:4.8, reviews:120, stock:14, active:true, description:'Planta de interior de folhagem marcante, ideal para ambientes com luz indireta. Acrescenta um toque tropical e elegante ao espaço.', care:'Manter em luz indireta, regar quando a camada superficial do substrato estiver seca e evitar encharcamento.', size:'Médio porte', fragile:true},
  {id:2, name:'Zamioculca', category:'plantas', seller:'Flora Verde', price:49.90, emoji:'🌱', tag:'Fácil cuidado', rating:4.9, reviews:86, stock:18, active:true, description:'Espécie resistente e indicada para quem busca uma planta de baixa manutenção, com folhas brilhantes e crescimento compacto.', care:'Tolera meia-sombra. Regar moderadamente, deixando o substrato secar entre as regas.', size:'Pequeno porte', fragile:true},
  {id:3, name:'Lírio da Paz', category:'plantas', seller:'Casa Botânica', price:49.90, emoji:'🌾', tag:'Interior', rating:4.7, reviews:73, stock:9, active:true, description:'Planta ornamental de interior com folhagem verde intensa e flores claras, adequada para ambientes protegidos do sol direto.', care:'Prefere luz filtrada e substrato levemente úmido. Evitar exposição prolongada ao sol forte.', size:'Médio porte', fragile:true},
  {id:4, name:'Jiboia', category:'plantas', seller:'Verde Vivo', price:39.90, emoji:'🍃', tag:'Pendente', rating:4.9, reviews:142, stock:22, active:true, description:'Planta pendente versátil, indicada para prateleiras e vasos suspensos. Possui crescimento rápido em condições adequadas.', care:'Luz indireta ou meia-sombra. Regas moderadas, sem manter o solo constantemente encharcado.', size:'Pequeno porte', fragile:true},
  {id:5, name:'Vaso de Cerâmica', category:'vasos', seller:'Ateliê Terra', price:34.90, emoji:'🏺', tag:'Cerâmica', rating:4.8, reviews:54, stock:31, active:true, description:'Vaso decorativo de cerâmica para plantas de pequeno e médio porte, com acabamento neutro e uso em ambientes internos.', care:'Manusear com cuidado para evitar impactos. Conferir drenagem conforme a necessidade da espécie cultivada.', size:'Médio porte', fragile:true},
  {id:6, name:'Substrato Orgânico', category:'insumos', seller:'Raiz Forte', price:19.90, emoji:'🧺', tag:'Orgânico', rating:4.6, reviews:61, stock:40, active:true, description:'Mistura pronta para uso em vasos e jardineiras, desenvolvida para oferecer estrutura e matéria orgânica ao cultivo.', care:'Armazenar em local seco e protegido. Utilizar conforme a necessidade da espécie e do recipiente.', size:'Pacote 2 kg', fragile:false},
  {id:7, name:'Kit de Jardinagem', category:'ferramentas', seller:'Jardim & Cia', price:59.90, emoji:'🧰', tag:'3 peças', rating:4.8, reviews:47, stock:15, active:true, description:'Conjunto básico para manutenção de vasos e pequenos jardins, composto por ferramentas manuais para plantio e cuidado.', care:'Limpar e secar as ferramentas após o uso. Guardar em local protegido da umidade.', size:'Kit compacto', fragile:false},
  {id:8, name:'Cachepô Natural', category:'vasos', seller:'Ateliê Terra', price:44.90, emoji:'🪴', tag:'Decorativo', rating:4.7, reviews:39, stock:11, active:true, description:'Cachepô decorativo para composição de ambientes internos, pensado para acomodar vasos menores e valorizar a apresentação da planta.', care:'Evitar contato prolongado com água. Utilize um vaso interno para facilitar a drenagem.', size:'Médio porte', fragile:true}
];

// Helper de armazenamento local compartilhado
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

const state = {
  page: 'home',
  cart: getStorage('client_cart', []),
  favorites: getStorage('client_favorites', []),
  products: getStorage('products', structuredClone(productSeed)),
  orders: getStorage('orders', []),
  clientOrder: getStorage('client_active_order', null),
  rating: 0,
  filters: { category: 'todos', search: '' }
};

// Se os produtos salvos estiverem vazios, inicializa
if ((!state.products || !state.products.length) && window.RaizPresentation?.source !== 'real') {
  state.products = structuredClone(productSeed);
  setStorage('products', state.products);
}

const clientNavItems = [
  ['home', '⌂', 'Início'],
  ['catalog', '⌕', 'Buscar'],
  ['orders', '▣', 'Pedidos'],
  ['favorites', '♡', 'Favoritos'],
  ['profile', '☺', 'Perfil']
];

function money(v) {
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
}

function productById(id) {
  return state.products.find(p => p.id === Number(id)) || productSeed.find(p => p.id === Number(id));
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
    home: 'Início',
    catalog: 'Buscar produtos',
    orders: 'Meus pedidos',
    favorites: 'Favoritos',
    profile: 'Meu perfil',
    checkout: 'Checkout',
    orderSuccess: 'Pedido confirmado',
    payment: 'Pagamento local',
    product: 'Detalhes do produto',
    seller: 'Loja do vendedor'
  };
  return all[state.page] || 'RAIZ Cliente';
}

function go(page) {
  state.page = page;
  if(['home','catalog','orders','favorites','profile'].includes(page)) history.replaceState(null,'','#'+page);
  if(page==='orders' && ['local','apresentacao'].includes(RaizPresentation.source)) {
    RaizPaymentFlow.reconcile().then(()=>{syncLocalPaymentState();if(state.page==='orders')renderApp();}).catch(error=>toast(error.message));
  }
  renderApp();
  window.scrollTo(0, 0);
}

function clientActivePage() {
  if(['product','seller'].includes(state.page)) return 'catalog';
  if(['payment','orderSuccess'].includes(state.page)) return 'orders';
  return state.page;
}
function clientNavIcon(page) {
  const paths={
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-8h6v8"/>',
    catalog:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    orders:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h3"/>',
    favorites:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    about:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>'
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" focusable="false">${paths[page]||paths.home}</svg>`;
}

function renderApp() {
  const appContainer = document.getElementById('appView');
  const title = pageTitle();
  appContainer.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" aria-label="Menu do cliente">
        <a class="logo" href="#home" onclick="go('home')" aria-label="RAIZ — início">${logoSVG.replace('RAIZ Cliente','RAIZ')}</a>

        <p class="sidebar-caption">Seu espaço de cultivo</p>

        <nav class="side-nav" aria-label="Navegação do cliente">
          ${clientNavItems.map(([p, i, l]) => `
            <button class="nav-btn ${clientActivePage() === p ? 'active' : ''}" ${clientActivePage()===p?'aria-current="page"':''} onclick="go('${p}')">
              <span class="nav-icon" aria-hidden="true">${clientNavIcon(p)}</span>${l}
            </button>
          `).join('')}
        </nav>

        <div class="sidebar-foot">
          <a class="sidebar-about" href="../index.html"><span class="nav-icon" aria-hidden="true">${clientNavIcon('about')}</span><span>Sobre a RAIZ</span></a>
        </div>
      </aside>

      <main class="main">
        <header class="topbar">
          <div>
            <h2>${title}</h2>
            <div class="tiny muted">RAIZ • Marketplace de Plantas</div>
          </div>
          <div class="top-actions">
            <div id="topAuthContainer"></div>
            <button class="icon-btn" onclick="openCart()" title="Ver carrinho">
              🛒
              <span id="topCartCount" class="icon-badge ${cartCount() > 0 ? '' : 'hidden'}">${cartCount()}</span>
            </button>
            <button class="icon-btn" onclick="toast('Nenhuma notificação pendente')" title="Notificações">🔔</button>
            <a class="icon-btn mobile-only" href="../index.html" title="Voltar ao portal">↩</a>
          </div>
        </header>

        <div class="app-content" id="pageContent"></div>
      </main>
    </div>

    <nav class="bottom-nav">
      ${clientNavItems.map(([p, i, l]) => `
        <button class="nav-btn ${clientActivePage() === p ? 'active' : ''}" ${clientActivePage()===p?'aria-current="page"':''} onclick="go('${p}')">
          <span class="nav-icon" aria-hidden="true">${clientNavIcon(p)}</span>
          <span>${l}</span>
        </button>
      `).join('')}
    </nav>
  `;

  if (window.RaizDB && window.RaizDB.renderAuthTopbar) {
    window.RaizDB.renderAuthTopbar(document.getElementById('topAuthContainer'), { role: 'cliente' });
  }

  renderPage();
}

function renderPage() {
  const c = document.getElementById('pageContent');
  if (!c) return;
  const currentUser = window.RaizDB?.auth?.getCurrentUser() || { nome: 'Ana Beatriz' };

  if (window.RaizMarket && ['local','apresentacao'].includes(RaizPresentation.source) && RaizMarket.render(c)) return;
  if (state.page === 'home') {
    c.innerHTML = `
      <section class="hero-card">
        <span class="badge green">Olá, ${escapeAttr(currentUser.nome ? currentUser.nome.split(' ')[0] : 'Ana')} 👋</span>
        <h2 style="margin-top:12px">Plantas que transformam seu dia.</h2>
        <p>Encontre espécies, vasos, insumos e ferramentas em lojas especializadas.</p>
        <button class="btn btn-primary" onclick="go('catalog')">Ver ofertas</button>
        <div class="plant">🪴</div>
      </section>

      <div class="quick-cats">
        ${[
          ['plantas', '🌿', 'Plantas', 'Interior e exterior'],
          ['vasos', '🏺', 'Vasos', 'Cerâmica e decorativos'],
          ['insumos', '🌱', 'Insumos', 'Substratos e adubos'],
          ['ferramentas', '🧰', 'Ferramentas', 'Cuidados e manutenção']
        ].map(x => `
          <button class="quick-cat" onclick="setCategory('${x[0]}')">
            <div class="icon">${x[1]}</div>
            <div>
              <strong>${x[2]}</strong>
              <small>${x[3]}</small>
            </div>
          </button>
        `).join('')}
      </div>

      <div class="page-title">
        <div>
          <h1>Destaques</h1>
          <p>Produtos selecionados do marketplace.</p>
        </div>
        <button class="btn btn-outline" onclick="go('catalog')">Ver todos</button>
      </div>

      ${productGrid(state.products.slice(0, 4))}
    `;
    return;
  }

  if (state.page === 'catalog') {
    const filtered = filteredProducts();
    c.innerHTML = `
      <div class="page-title">
        <div>
          <h1>Buscar / Categoria</h1>
          <p>Use busca e filtros para encontrar produtos botânicos.</p>
        </div>
        <div class="searchbar">
          <span>🔎</span>
          <input value="${escapeAttr(state.filters.search)}" oninput="searchProducts(this.value)" placeholder="Buscar produto...">
        </div>
      </div>

      <div class="filter-line">
        ${['todos', 'plantas', 'vasos', 'insumos', 'ferramentas'].map(f => `
          <button class="chip ${state.filters.category === f ? 'active' : ''}" onclick="setCategory('${f}')">
            ${f === 'todos' ? 'Todos' : f[0].toUpperCase() + f.slice(1)}
          </button>
        `).join('')}
      </div>

      ${filtered.length ? productGrid(filtered) : `<div class="empty"><div class="big">🔎</div>Nenhum produto encontrado com os filtros atuais.</div>`}
    `;
    return;
  }

  if (state.page === 'favorites') {
    const favs = state.products.filter(p => state.favorites.includes(p.id));
    c.innerHTML = `
      <div class="page-title">
        <div>
          <h1>Favoritos</h1>
          <p>Produtos salvos para consultar e comprar depois.</p>
        </div>
      </div>
      ${favs.length ? productGrid(favs) : `<div class="empty"><div class="big">♡</div>Você ainda não favoritou nenhum produto.<br><br><button class="btn btn-primary" onclick="go('catalog')">Explorar catálogo</button></div>`}
    `;
    return;
  }

  if (state.page === 'orders') {
    c.innerHTML = clientOrdersPage();
    return;
  }

  if (state.page === 'checkout') {
    c.innerHTML = checkoutPage();
    return;
  }

  if (state.page === 'orderSuccess') {
    c.innerHTML = orderSuccessPage();
    return;
  }

  if (state.page === 'payment') {c.innerHTML=localPaymentPage();return;}

  if (state.page === 'profile') {
    const user = window.RaizPayments?.profile() || window.RaizDB?.auth?.getCurrentUser() || {
      nome: 'Ana Beatriz',
      email: 'ana.beatriz@email.com',
      telefone: '(65) 99654-3210',
      endereco: 'Rua das Flores, 123',
      bairro: 'Jardim Primavera',
      cidade: 'Cáceres - MT • CEP 78200-000'
    };
    c.innerHTML = `
      <div class="page-title" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div>
          <h1>Meu perfil</h1>
          <p>Dados e preferências da sua conta.</p>
        </div>
        <a class="btn btn-outline" href="../login.html?role=cliente" style="font-size:13px;padding:8px 14px">
          🔐 Alternar Conta / Fazer Login
        </a>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="row">
            <div class="avatar" style="overflow:hidden">
              ${user.avatar_url ? `<img src="${user.avatar_url}" style="width:100%;height:100%;object-fit:cover" />` : '🪴'}
            </div>
            <div>
              <strong>${escapeAttr(user.nome || 'Ana Beatriz')}</strong>
              <div class="small muted">${escapeAttr(user.email || 'ana.beatriz@email.com')}</div>
              <span class="badge green" style="font-size:0.72rem;margin-top:4px">🪴 Perfil de Cliente</span>
            </div>
          </div>
          <div class="divider"></div>
          <div class="field">
            <label>Nome completo</label>
            <input class="input" id="profileNome" value="${escapeAttr(user.nome || 'Ana Beatriz')}">
          </div>
          <div class="field" style="margin-top:12px">
            <label>Telefone / WhatsApp</label>
            <input class="input" id="profileTel" value="${escapeAttr(user.telefone || '(65) 99654-3210')}">
          </div>
          <button class="btn btn-primary" style="margin-top:16px" onclick="saveCustomerProfile('profile')">Salvar alterações</button>
        </div>

        <div class="card">
          <h3 style="margin-top:0">Endereço principal</h3>
          <div class="field">
            <label>Endereço e Número</label>
            <input class="input" id="profileEnd" value="${escapeAttr(user.endereco || 'Rua das Flores, 123')}">
          </div>
          <div class="field" style="margin-top:12px">
            <label>Bairro</label>
            <input class="input" id="profileBairro" value="${escapeAttr(user.bairro || 'Jardim Primavera')}">
          </div>
          <div class="field" style="margin-top:12px">
            <label>Cidade / UF</label>
            <input class="input" id="profileCidade" value="${escapeAttr(user.cidade || 'Cáceres - MT • CEP 78200-000')}">
          </div>
          <button class="btn btn-outline" style="margin-top:16px" onclick="saveCustomerProfile('address')">Atualizar endereço</button>
          ${RaizMaps.link(RaizMaps.search(customerAddress()),'Ver endereço no Google Maps')}
        </div>
      </div>
      ${paymentMethodsPanel()}
    `;
    return;
  }
}

function customerAddress() {
  const user=RaizPayments.profile();
  return user.address || [user.endereco,user.bairro,user.cidade].filter(Boolean).join(' • ') || 'Endereço fictício, Cáceres - MT';
}

function saveCustomerProfile(kind) {
  try {
    if(kind==='address') {
      const endereco=document.getElementById('profileEnd').value.trim();
      const bairro=document.getElementById('profileBairro').value.trim();
      const cidade=document.getElementById('profileCidade').value.trim();
      if(endereco.length<5 || bairro.length<2 || cidade.length<3 || /[<>]/.test(endereco+bairro+cidade)) throw new Error('Preencha endereço, bairro e cidade sem marcação HTML.');
      RaizPayments.saveProfile({endereco,bairro,cidade,address:[endereco,bairro,cidade].join(' • ')});
    } else {
      const nome=document.getElementById('profileNome').value.trim();
      const telefone=document.getElementById('profileTel').value.trim();
      if(nome.length<2 || nome.length>100 || /[<>]/.test(nome) || telefone && (!/^[+\d\s()\-]+$/.test(telefone) || !/^\d{10,13}$/.test(telefone.replace(/\D/g,'')))) throw new Error('Confira o nome sem HTML e o telefone com DDD.');
      RaizPayments.saveProfile({nome,telefone});
    }
    renderApp(); toast('Preferência salva neste navegador.');
  } catch(error) {toast(error.message);}
}

function paymentMethodsPanel() {
  if(RaizPresentation.source==='real') return '<section class="card payment-settings"><h3>Formas de pagamento</h3><p>Consulta somente leitura.</p></section>';
  const data=RaizPayments.read();
  return `<section class="card payment-settings"><h3>Formas de pagamento</h3>
    <p class="payment-notice">Cadastros fictícios na fonte selecionada. Para cartão, somente bandeira, últimos quatro dígitos e validade. Não informe número completo, CVV ou senha.</p>
    <div class="payment-list">${RaizPayments.methods().map(m=>`<article class="card soft"><strong>${escapeAttr(RaizPayments.label(m))}</strong>${m.expiry?`<p>Validade: ${escapeAttr(m.expiry)}</p>`:''}${data.defaultId===m.id?'<span class="badge green">Preferida</span>':''}<div class="raiz-route-actions"><button class="btn btn-outline" onclick="openPaymentEditor('${m.id}')">Editar</button><button class="btn btn-outline" onclick="preferPayment('${m.id}')">Tornar preferida</button><button class="btn btn-outline" onclick="deletePayment('${m.id}')">Remover</button></div></article>`).join('') || '<p>Nenhuma forma cadastrada. Pix e boleto podem ser selecionados diretamente no checkout quando aceitos pela loja.</p>'}</div>
    <button class="btn btn-primary" onclick="openPaymentEditor()">Adicionar forma de pagamento</button></section>`;
}

function openPaymentEditor(id=null) {
  if(RaizPresentation.source==='real') {toast('Esta fonte é somente leitura.');return;}
  const method=RaizPayments.methods().find(m=>m.id===id) || {type:'credit'};
  const month=new Date(); const min=`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}`;
  openModal(`<div class="modal-head"><h2>${id?'Editar':'Adicionar'} forma de pagamento de exemplo</h2><button class="icon-btn" onclick="closeModal()" aria-label="Fechar cadastro">✕</button></div>
    <form class="modal-body" onsubmit="savePaymentMethod(event,${id?`'${id}'`:'null'})" novalidate>
      <p class="payment-notice">Não cadastra cartão no banco nem gera cobrança. Use somente metadados fictícios.</p>
      <label class="field" for="paymentType">Tipo</label><select id="paymentType" class="input" onchange="togglePaymentCardFields(this.value)">${Object.entries(RaizPayments.TYPES).map(([v,t])=>`<option value="${v}" ${method.type===v?'selected':''}>${t}</option>`).join('')}</select>
      <div id="paymentCardFields" class="payment-card-fields" ${['credit','debit'].includes(method.type)?'':'hidden'}>
        <label class="field" for="paymentBrand">Bandeira</label><select id="paymentBrand" class="input">${['Visa','Mastercard','Elo','Amex','Outra'].map(brand=>`<option ${method.brand===brand?'selected':''}>${brand}</option>`).join('')}</select>
        <label class="field" for="paymentLast4">Quatro últimos dígitos</label><input id="paymentLast4" class="input" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" value="${escapeAttr(method.last4 || '')}" autocomplete="off">
        <label class="field" for="paymentExpiry">Validade</label><input id="paymentExpiry" class="input" type="month" min="${min}" value="${escapeAttr(method.expiry || '')}">
      </div>
      <label class="payment-option"><input id="paymentPreferred" type="checkbox" ${RaizPayments.read().defaultId===id?'checked':''}>Definir como preferida</label>
      <button class="btn btn-primary" type="submit">Salvar forma de pagamento</button>
    </form>`);
}
function togglePaymentCardFields(type) {document.getElementById('paymentCardFields').hidden=!['credit','debit'].includes(type);}
function savePaymentMethod(event,id) {
  event.preventDefault();
  try {
    const entry=RaizPayments.saveMethod({id,type:document.getElementById('paymentType').value,
      last4:document.getElementById('paymentLast4').value,brand:document.getElementById('paymentBrand').value,
      expiry:document.getElementById('paymentExpiry').value,preferred:document.getElementById('paymentPreferred').checked});
    state.paymentSelection=entry.id;
    closeModal(); renderApp(); toast('Forma de pagamento de exemplo salva na fonte selecionada.');
  } catch(error) {toast(error.message);}
}
function preferPayment(id) {try {RaizPayments.prefer(id);state.paymentSelection=id;renderApp();toast('Preferência salva.');}catch(error){toast(error.message);}}
function deletePayment(id) {try {RaizPayments.remove(id);state.paymentSelection=null;renderApp();toast('Forma removida.');}catch(error){toast(error.message);}}

function filteredProducts() {
  const s = state.filters.search.toLowerCase().trim();
  return state.products.filter(p => {
    const matchCat = state.filters.category === 'todos' || p.category === state.filters.category;
    const matchText = `${p.name} ${p.seller} ${p.tag} ${p.description}`.toLowerCase().includes(s);
    return p.active && matchCat && matchText;
  });
}

function searchProducts(v) {
  state.filters.search = v;
  const filtered = filteredProducts();
  const c = document.getElementById('pageContent');
  if (state.page === 'catalog') {
    const gridContainer = c.querySelector('.product-grid') || c.querySelector('.empty');
    if (gridContainer) {
      if (filtered.length) {
        gridContainer.outerHTML = productGrid(filtered);
      } else {
        gridContainer.outerHTML = `<div class="empty"><div class="big">🔎</div>Nenhum produto encontrado.</div>`;
      }
    }
  }
}

function setCategory(cat) {
  state.filters.category = cat;
  state.page = 'catalog';
  renderApp();
}

function productGrid(products) {return RaizMarket.cards(products);}

function toggleFav(id) {
  if (state.favorites.includes(id)) {
    state.favorites = state.favorites.filter(x => x !== id);
    toast('Favorito removido');
  } else {
    state.favorites.push(id);
    toast('Produto adicionado aos favoritos');
  }
  setStorage('client_favorites', state.favorites);
  renderPage();
}

function openProduct(id) {RaizMarket.product(id);}
function addCart(id) {return RaizMarket.add(id);}


function cartCount() {
  return state.cart.reduce((a, b) => a + b.qty, 0);
}

function cartSubtotal() {return state.cart.reduce((sum,i)=>sum+(Number(productById(i.id)?.price||0)+(Number(i.extraCents)||0)/100)*i.qty,0);}

function updateCartBadge() {
  const x = document.getElementById('topCartCount');
  if (x) {
    const c = cartCount();
    x.textContent = c;
    x.classList.toggle('hidden', c === 0);
  }
  if (document.getElementById('cartDrawer').classList.contains('open')) {
    renderCart();
  }
}

function openCart() {
  renderCart();
  document.getElementById('overlay').classList.add('open');
  document.getElementById('cartDrawer').classList.add('open');
}

function closeDrawer() {
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('cartDrawer').classList.remove('open');
}

function renderCart() {RaizMarket.cart();}
function changeQty(id,delta,index) {RaizMarket.quantity(index ?? state.cart.findIndex(i=>i.id===id),delta);}
function removeCart(id,index) {RaizMarket.remove(index ?? state.cart.findIndex(i=>i.id===id));}


function startCheckout() {
  if (!state.cart.length) return;
  closeDrawer();
  state.page = 'checkout';
  renderApp();
}

function checkoutPage() {
  const sub = cartSubtotal();
  const delivery = RaizMarket.shipping().cents / 100;
  const paymentOptions = RaizPayments.options();
  if (!paymentOptions.list.some(m => m.value === state.paymentSelection)) state.paymentSelection = paymentOptions.preferred;
  const method=paymentOptions.list.find(m=>m.value===state.paymentSelection)?.type;
  const discount=RaizPayments.discountCents(Math.round(sub*100),method)/100;
  const total=sub+delivery-discount;
  const installments=RaizPayments.installmentLimit(Math.round(total*100),method);

  return `
    <div class="page-title">
      <div>
        <h1>Checkout</h1>
        <p>Revise os dados de entrega e forma de pagamento.</p>
      </div>
      <button class="btn btn-outline" onclick="openCart()">Editar carrinho</button>
    </div>

    <div class="order-summary">
      <div class="stack">
        <div class="card">
          <h3 style="margin-top:0">Endereço de entrega</h3>${RaizMarket.freightForm()}
          <div class="row space">
            <div>
              <strong>${escapeAttr(customerAddress())}</strong>
              <div class="small muted">Endereço salvo no perfil de apresentação</div>
            </div>
            <button class="btn btn-outline" onclick="go('profile')">Alterar</button>
          </div>
        </div>

        <div class="card">
          <h3 style="margin-top:0">Forma de pagamento</h3>
          <p class="payment-notice">Pedido de exemplo: nenhum pagamento será cobrado. Não geramos Pix, boleto ou autorização bancária.</p>
          <div class="payment-list">${paymentOptions.list.map(m => `<label class="payment-option"><input type="radio" name="pay" value="${escapeAttr(m.value)}" ${state.paymentSelection===m.value?'checked':''} onchange="selectCheckoutPayment(this.value)">${escapeAttr(m.label)}</label>`).join('') || '<p>Nenhuma forma disponível. Cadastre um cartão de exemplo ou confira as formas aceitas na loja.</p>'}</div>
          <button class="btn btn-outline" onclick="openPaymentEditor()">Cadastrar forma de pagamento de exemplo</button>
          ${method==='credit'?`<label class="field" for="checkoutInstallments">Parcelamento demonstrativo</label><select id="checkoutInstallments" class="input">${Array.from({length:installments},(_,i)=>`<option value="${i+1}">${i===0?'À vista · '+money(total):i+1+' parcelas sem juros'}</option>`).join('')}</select>`:'<p class="small muted">Pagamento à vista.</p>'}
        </div>
      </div>

      <div class="card checkout-summary">
        <h3 style="margin-top:0">Resumo do pedido</h3>
        ${state.cart.map(i => {
          const p = productById(i.id);
          return `
            <div class="row space small" style="margin:9px 0">
              <span>${i.qty}× ${p ? escapeAttr(p.name) : 'Item'} ${escapeAttr(i.variant || '')}</span>
              <strong>${p ? money((Number(p.price)+(Number(i.extraCents)||0)/100) * i.qty) : '—'}</strong>
            </div>
          `;
        }).join('')}
        <div class="divider"></div>
        <div class="row space">
          <span>Subtotal</span>
          <strong>${money(sub)}</strong>
        </div>
        <div class="row space" style="margin-top:8px">
          <span>Entrega estimada</span>
          <strong>${money(delivery)}</strong>
        </div>
        ${discount?`<div class="row space"><span>Desconto Pix</span><strong>−${money(discount)}</strong></div>`:''}
        <div class="divider"></div>
        <div class="row space">
          <strong>Total</strong>
          <strong class="money" style="font-size:1.25rem">${money(total)}</strong>
        </div>
        <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="confirmOrder()" ${method?'':'disabled'}>
          Confirmar pedido
        </button>
      </div>
    </div>
  `;
}

async function confirmOrder() {
  if(state.checkoutBusy) return;
  state.checkoutBusy=true;
  const checkoutButton=document.querySelector('.checkout-summary .btn-primary');
  if(checkoutButton)checkoutButton.disabled=true;
  try {
    const user=RaizPayments.profile();
    state.checkoutRequestId ||= crypto.randomUUID();
    const order=await RaizPaymentFlow.checkout({requestId:state.checkoutRequestId,
      products:state.products,address:customerAddress(),customer:user.nome,email:user.email,cep:RaizMarket.cep(),
      methodId:state.paymentSelection || RaizPayments.options().preferred,
      installments:document.getElementById('checkoutInstallments')?.value || 1});
    syncLocalPaymentState();state.checkoutRequestId=null;state.paymentOrderId=order.id;
    state.page='payment';renderApp();toast('Pedido reservado. Conclua o pagamento local de demonstração.');
  } catch(error) {toast(error.message);}
  finally {state.checkoutBusy=false;if(checkoutButton)checkoutButton.disabled=false;}
}

function orderSuccessPage() {
  const o = state.clientOrder;
  return `
    <div class="card success-card">
      <div class="success-icon">✓</div>
      <h1 style="margin:0 0 8px">Pedido confirmado!</h1>
      <p class="muted">Pedido de exemplo #${o ? o.id : ''} registrado. Nenhum pagamento foi processado.</p>
      <p>${escapeAttr(o?.paymentMethod || 'Forma não registrada')} · ${escapeAttr(o?.paymentStatus || 'Exemplo sem cobrança')}</p>
      <div class="card soft" style="max-width:390px;margin:22px auto">
        <span class="small muted">Valor do pedido</span>
        <div class="money" style="font-size:1.7rem">${money(o ? o.total : 0)}</div>
      </div>
      <div class="row" style="justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="go('orders')">Acompanhar pedido</button>
        <button class="btn btn-outline" onclick="go('home')">Voltar para o início</button>
      </div>
      <div style="font-size:5rem;margin-top:20px">🌱</div>
    </div>
  `;
}

function clientOrdersPage() {
  const all=getStorage('orders',[]).filter(o=>o.paymentId);
  if(state.clientOrder && !all.some(o=>o.id===state.clientOrder.id)) all.unshift(state.clientOrder);
  return `<div class="page-title"><div><h1>Meus pedidos</h1><p>Pedidos e pagamentos de exemplo na fonte selecionada.</p></div></div>
    ${all.length?all.map(o=>{
      const tx=RaizPaymentFlow.transaction(o.id);
      return `<article class="card payment-settings"><span class="badge green">Pedido #${Number(o.id)}</span>
        <h3>${money(o.total)} · ${escapeAttr(o.status)}</h3><p>${escapeAttr(o.date)} · ${escapeAttr(o.address)}</p>
        <p>${escapeAttr(o.paymentMethod || 'Pagamento antigo não registrado')} · ${escapeAttr(tx?RaizPaymentFlow.STATUS[tx.state]:o.paymentStatus || 'Exemplo antigo')}</p>
        ${tx?`<button class="btn btn-primary" onclick="openLocalPayment(${Number(o.id)})">Ver pagamento do pedido #${Number(o.id)}</button>`:
          '<p class="small muted">Pedido anterior ao novo fluxo financeiro. Não comprova aprovação de pagamento.</p>'}
        ${tx && tx.state==='paid'?trackingTimeline(o.step || 0):''}
        ${o.step>=3 && tx?.state==='paid'?`<button class="btn btn-outline" onclick="openRating(${Number(o.id)})">${o.rating?'Editar avaliação':'Avaliar pedido'}</button>`:''}
      </article>`;
    }).join(''):'<div class="empty">Nenhum pedido registrado. Escolha produtos no catálogo.</div>'}`;
}

function selectCheckoutPayment(value) {state.paymentSelection=value;renderApp();}
function syncLocalPaymentState() {
  state.products=getStorage('products',state.products);state.cart=getStorage('client_cart',[]);
  state.orders=getStorage('orders',[]);state.clientOrder=getStorage('client_active_order',null);
}
async function openLocalPayment(id) {
  try {await RaizPaymentFlow.reconcile();syncLocalPaymentState();state.paymentOrderId=Number(id);state.page='payment';renderApp();}
  catch(error) {toast(error.message);}
}
async function localPaymentAction(action) {
  if(state.paymentBusy)return;
  state.paymentBusy=true;
  const controls=[...document.querySelectorAll('#pageContent button')];
  for(const control of controls)control.disabled=true;
  try {
    const id=state.paymentOrderId || state.clientOrder?.id;
    await RaizPaymentFlow.act(id,action,{methodId:document.getElementById('retryPaymentMethod')?.value,
      installments:document.getElementById('retryInstallments')?.value || 1});
    state.paymentBusy=false;syncLocalPaymentState();renderApp();toast('Situação atualizada na fonte selecionada. Nenhuma transação bancária.');
  } catch(error) {state.paymentBusy=false;syncLocalPaymentState();renderApp();toast(error.message);}
  finally {state.paymentBusy=false;for(const control of controls)control.disabled=false;}
}
async function copyLocalPaymentReference() {
  const field=document.getElementById('localPaymentReference');
  try {await navigator.clipboard.writeText(field.value);toast('Referência local copiada. Não é um código bancário.');}
  catch(_) {field.focus();field.select();toast('Referência selecionada. Use Copiar no navegador.');}
}
function changeRetryMethod(value) {state.retryPaymentSelection=value;renderApp();}
function localPaymentPage() {
  const id=state.paymentOrderId || state.clientOrder?.id;
  const order=getStorage('orders',[]).find(o=>o.id===Number(id));
  const tx=RaizPaymentFlow.transaction(id);
  if(!order || !tx)return '<div class="empty">Pagamento local não encontrado. Abra Meus pedidos.</div>';
  const esc=escapeAttr;const fmt=RaizPaymentFlow.money;
  const options=RaizPayments.options();
  const retry=options.list.find(o=>o.value===state.retryPaymentSelection) || options.list.find(o=>o.type===tx.method.type) || options.list[0];
  const pending=tx.state==='pending';
  return `<div class="page-title"><div><h1>Pagamento do pedido #${Number(id)}</h1><p>Fluxo completo de demonstração, sem banco e sem dinheiro real.</p></div><button class="btn btn-outline" onclick="go('orders')">Meus pedidos</button></div>
    <div class="payment-notice"><strong>DEMONSTRAÇÃO — SEM VALOR BANCÁRIO.</strong> ${RaizPresentation.source==='apresentacao'?'Dados salvos no Supabase.':'Dados salvos neste navegador.'} A confirmação é feita nos botões abaixo. Não leia este registro como cobrança, Pix ou boleto real. Não informe cartão completo, CVV ou senha.</div>
    <div class="grid-2" style="margin-top:18px"><section class="card"><h2>${esc(RaizPaymentFlow.STATUS[tx.state])}</h2>
      <p><strong>Total:</strong> ${fmt(tx.amountCents)}</p><p><strong>Forma:</strong> ${esc(tx.method.label)}</p>
      <p><strong>Parcelas:</strong> ${tx.installments.map((c,i)=>`${i+1}ª: ${fmt(c)}`).join(' · ')}</p>
      <p><strong>Pedido:</strong> ${esc(order.status)}</p>
      <p><strong>Prazo:</strong> ${esc(new Date(tx.expiresAt).toLocaleString('pt-BR'))}</p>
      <button class="btn btn-outline" onclick="openLocalPayment(${Number(id)})">Atualizar situação e prazo</button>
      ${['paid','refunded'].includes(tx.state)?`<button class="btn btn-primary" onclick="RaizPaymentFlow.download(${Number(id)})">Baixar comprovante de demonstração</button>`:''}
    </section><section class="card"><h3>${tx.method.type==='pix'?'Pix demonstrativo':tx.method.type==='boleto'?'Boleto demonstrativo':'Cartão demonstrativo'}</h3>
      <p>${tx.method.type==='pix'?'Referência interna para demonstrar pagamento pendente e recebimento. Não é Pix Copia e Cola ou QR Code de pagamento.':tx.method.type==='boleto'?'Documento local com referência, valor e vencimento. Não possui linha digitável, código de barras ou validade bancária.':'Os metadados cadastrados identificam somente o cartão fictício. A aprovação ou recusa é simulada manualmente.'}</p>
      <label for="localPaymentReference">Referência local</label><input id="localPaymentReference" class="input payment-reference" readonly value="${esc(tx.reference)}">
      <div class="raiz-route-actions"><button class="btn btn-outline" onclick="copyLocalPaymentReference()">Copiar referência local</button>
      ${['pix','boleto'].includes(tx.method.type)?`<button class="btn btn-outline" onclick="RaizPaymentFlow.download(${Number(id)})">Baixar instruções demonstrativas</button>`:''}</div>
      ${pending?`<div class="raiz-route-actions"><button class="btn btn-primary" onclick="localPaymentAction('approve')">${tx.method.type==='pix'?'Simular recebimento Pix':tx.method.type==='boleto'?'Simular compensação do boleto':'Simular aprovação do cartão'}</button>
        ${['credit','debit'].includes(tx.method.type)?'<button class="btn btn-outline" onclick="localPaymentAction(\'reject\')">Simular recusa do cartão</button>':''}</div>`:''}
      ${tx.state==='rejected'?`<h3>Nova tentativa</h3><label for="retryPaymentMethod">Forma da nova tentativa</label><select id="retryPaymentMethod" class="input" onchange="changeRetryMethod(this.value)">${options.list.map(o=>`<option value="${esc(o.value)}" ${retry?.value===o.value?'selected':''}>${esc(o.label)}</option>`).join('')}</select>
        ${retry?.type==='credit'?`<label for="retryInstallments">Parcelas</label><select id="retryInstallments" class="input">${Array.from({length:RaizPayments.installmentLimit(tx.amountCents,'credit')},(_,i)=>`<option value="${i+1}">${i+1}× sem juros</option>`).join('')}</select>`:''}
        <button class="btn btn-primary" onclick="localPaymentAction('retry')" ${retry?'':'disabled'}>Criar nova tentativa</button>`:''}
      ${['pending','rejected'].includes(tx.state)?'<button class="btn btn-outline" style="margin-top:14px" onclick="localPaymentAction(\'cancel\')">Cancelar pedido e liberar estoque</button>':''}
      ${tx.state==='paid' && order.status==='Pendente' && order.step===0?'<button class="btn btn-outline" style="margin-top:14px" onclick="localPaymentAction(\'refund\')">Simular estorno integral antes do preparo</button>':''}
      ${tx.state==='paid'?'<p class="small muted">Pagamento de exemplo aprovado. A loja pode iniciar o preparo. Após o preparo, este fluxo não permite estorno automático.</p>':''}
      ${['expired','cancelled','refunded'].includes(tx.state)?'<p>Pedido encerrado; a reserva foi liberada. Faça uma nova compra no catálogo para continuar.</p>':''}
    </section></div>
    <section class="card payment-settings"><h3>Histórico desta tentativa</h3>${tx.events.map(e=>`<p>${esc(new Date(e.at).toLocaleString('pt-BR'))} · ${esc(({created:'Criada',approved_simulation:'Aprovada por simulação',rejected_simulation:'Recusada por simulação',cancelled:'Cancelada',expired:'Expirada',refund_simulation:'Estorno simulado'})[e.action] || e.action)}</p>`).join('')}</section>`;
}

function trackingTimeline(step) {
  const labels = [
    ['Pedido confirmado', 'Exemplo registrado; nenhum pagamento foi processado'],
    ['Em preparação', 'Vendedor selecionando e embalando os itens botânicos'],
    ['Em transporte', 'Entregador retirou o pacote e está a caminho'],
    ['Entregue', 'Pedido entregue no endereço de destino']
  ];
  return `
    <div class="timeline">
      ${labels.map((x, i) => `
        <div class="timeline-step ${i < step ? 'done' : i === step ? 'current' : ''}">
          <div class="timeline-marker">
            <div class="timeline-dot">${i < step ? '✓' : ''}</div>
            <div class="timeline-line"></div>
          </div>
          <div class="timeline-copy">
            <strong>${x[0]}</strong>
            <small>${x[1]}</small>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function advanceClientOrder() {
  if (!state.clientOrder) return;
  if(state.clientOrder.paymentId) {toast('Pedidos com pagamento local avançam pela loja e pelo entregador.');return;}
  state.clientOrder.step = Math.min(3, (state.clientOrder.step || 0) + 1);
  const seq = ['Pendente', 'Em preparo', 'Enviado', 'Entregue'];
  state.clientOrder.status = seq[state.clientOrder.step];
  setStorage('client_active_order', state.clientOrder);
  renderPage();
  toast(`Status atualizado: ${state.clientOrder.status}`);
}

function openRating(id) {
  state.reviewOrderId=Number(id || state.clientOrder?.id);
  state.rating = 0;
  openModal(`
    <div class="modal-head">
      <h2>Avaliar pedido</h2>
      <button class="icon-btn" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <h3>Como foi a sua experiência com a RAIZ?</h3>
      <p class="muted">Sua avaliação ajuda outros clientes a escolherem as melhores espécies e vendedores.</p>
      <div class="stars">
        ${[1, 2, 3, 4, 5].map(i => `
          <button id="star${i}" class="star-btn" onclick="rate(${i})">★</button>
        `).join('')}
      </div>
      <textarea class="input" style="margin-top:14px" placeholder="Conte mais sobre as condições das plantas e rapidez da entrega (opcional)"></textarea>
      <button class="btn btn-primary btn-block" style="margin-top:15px" onclick="submitRating()">
        Enviar avaliação
      </button>
    </div>
  `);
}

function rate(n) {
  state.rating = n;
  for (let i = 1; i <= 5; i++) {
    const star = document.getElementById('star' + i);
    if (star) star.classList.toggle('on', i <= n);
  }
}

function submitRating() {
  if (!state.rating) {
    toast('Selecione ao menos uma estrela');
    return;
  }
  const orders=getStorage('orders',[]);
  const order=orders.find(o=>o.id===state.reviewOrderId);
  if(!order || order.step!==3 || RaizPaymentFlow.transaction(order.id)?.state!=='paid') {toast('Avalie somente um pedido local pago e entregue.');return;}
  order.rating=state.rating;
  order.review=(document.querySelector('#modal textarea')?.value.trim()||'').slice(0,1000);
  const patch={orders};if(state.clientOrder?.id===order.id){patch.client_active_order=order;state.clientOrder=order;}
  RaizPresentation.commitLocal(patch);

  closeModal();
  renderPage();toast('Avaliação local salva.');
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
if (['local','apresentacao'].includes(RaizPresentation.source)) RaizMarket.init();
renderApp();
if(['local','apresentacao'].includes(RaizPresentation.source)) {
  syncLocalPaymentState();
  if(new URLSearchParams(location.search).get('acao')==='checkout') {if(!state.cart.length)addCart(1);startCheckout();}
  else renderApp();
}
