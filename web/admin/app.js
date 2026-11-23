/* RAIZ — Painel Administrativo & Governança (UA) — v5.0 Consolidado */

const logoSVG = `<svg class="logo-mark" viewBox="0 0 64 64" aria-hidden="true"><path d="M31 51C22 37 15 28 5 18c11-2 22 1 28 9 2 4 2 9-2 24Z" fill="#2D6A4F"/><path d="M33 50c1-19 5-31 20-39 3 13 0 24-7 30-4 4-8 6-13 9Z" fill="#52B788"/><path d="M31 27v29" stroke="#1B4332" stroke-width="3.4" stroke-linecap="round"/></svg><span>RAIZ</span>`;

const defaultUsersSeed = [
  { id: 'a0000000-0000-0000-0000-000000000001', nome: 'Ana Beatriz', email: 'ana.beatriz@email.com', role: 'cliente', telefone: '(65) 99654-3210', endereco: 'Rua das Flores, 123 • Cáceres - MT' },
  { id: 'b0000000-0000-0000-0000-000000000002', nome: 'Flora Verde', email: 'contato@floraverde.com', role: 'vendedor', telefone: '(65) 99888-1122', endereco: 'Av. São João, 310 • Cáceres - MT' },
  { id: 'c0000000-0000-0000-0000-000000000003', nome: 'Lucas Motoboy', email: 'lucas.motoboy@email.com', role: 'entregador', telefone: '(65) 99876-5432', endereco: 'Rua Cuiabá, 789 • Cáceres - MT' },
  { id: 'd0000000-0000-0000-0000-000000000004', nome: 'Helena Martins (Admin UA)', email: 'admin@raizmarketplace.com', role: 'admin', telefone: '(65) 99900-0001', endereco: 'Sede Administrativa RAIZ • Cáceres - MT' }
];

const defaultProductsSeed = [
  {id:1, name:'Costela de Adão', category:'plantas', seller:'Flora Verde', price:79.90, emoji:'🌿', tag:'Interior', rating:4.8, reviews:120, stock:14, active:true, porte:'Médio porte', fragile:true},
  {id:2, name:'Zamioculca', category:'plantas', seller:'Flora Verde', price:49.90, emoji:'🌱', tag:'Fácil cuidado', rating:4.9, reviews:86, stock:18, active:true, porte:'Pequeno porte', fragile:true},
  {id:3, name:'Lírio da Paz', category:'plantas', seller:'Flora Verde', price:49.90, emoji:'🌾', tag:'Interior', rating:4.7, reviews:73, stock:9, active:true, porte:'Médio porte', fragile:true},
  {id:4, name:'Jiboia', category:'plantas', seller:'Flora Verde', price:39.90, emoji:'🍃', tag:'Pendente', rating:4.9, reviews:142, stock:22, active:true, porte:'Pequeno porte', fragile:true},
  {id:5, name:'Vaso de Cerâmica Terracota', category:'vasos', seller:'Flora Verde', price:34.90, emoji:'🏺', tag:'Cerâmica', rating:4.8, reviews:54, stock:31, active:true, porte:'Médio porte', fragile:true},
  {id:6, name:'Substrato Orgânico Premium', category:'insumos', seller:'Flora Verde', price:19.90, emoji:'🧺', tag:'Orgânico', rating:4.6, reviews:61, stock:40, active:true, porte:'Pacote 2 kg', fragile:false},
  {id:7, name:'Kit de Jardinagem Manual', category:'ferramentas', seller:'Flora Verde', price:59.90, emoji:'🧰', tag:'3 peças', rating:4.8, reviews:47, stock:15, active:true, porte:'Kit compacto', fragile:false},
  {id:8, name:'Cachepô Artesanal', category:'vasos', seller:'Flora Verde', price:44.90, emoji:'🪴', tag:'Decorativo', rating:4.7, reviews:39, stock:11, active:true, porte:'Médio porte', fragile:true}
];

const defaultDisputesSeed = [
  {
    id: 1,
    pedido_id: 12344,
    titulo: 'Folha levemente dobrada no transporte',
    descricao: 'Cliente solicitou verificação da embalagem da Zamioculca após recebimento.',
    solicitante_nome: 'Carlos M. Silva',
    solicitante_perfil: 'cliente',
    status: 'Em análise',
    prioridade: 'Média',
    resolucao_admin: 'Acionado o vendedor Flora Verde para envio de cupom de reposição.',
    data_formatada: 'Hoje, 10:15'
  },
  {
    id: 2,
    pedido_id: 5837,
    titulo: 'Endereço de coleta fechado no horário agendado',
    descricao: 'Entregador reportou que o viveiro parceiro estava em intervalo no momento da retirada.',
    solicitante_nome: 'Lucas Motoboy',
    solicitante_perfil: 'entregador',
    status: 'Resolvida',
    prioridade: 'Alta',
    resolucao_admin: 'Taxa de deslocamento de R$ 9,50 abonada ao entregador e horário da loja ajustado.',
    data_formatada: 'Ontem, 11:00'
  }
];

const defaultSecurityLogsSeed = [
  {
    id: 103,
    evento: 'BLOQUEIO_AUTH_401',
    usuario_email: 'anonimo',
    perfil_atual: 'visitante',
    recurso_alvo: 'GET /api/auth/protegido',
    status_http: 401,
    detalhes: 'Tentativa de acesso sem credenciais/token Bearer válido bloqueada.',
    data_formatada: 'Hoje, 08:15'
  },
  {
    id: 102,
    evento: 'BLOQUEIO_RBAC_403',
    usuario_email: 'ana.beatriz@email.com',
    perfil_atual: 'cliente',
    recurso_alvo: 'DELETE /api/admin/usuarios/b0000000-0000-0000-0000-000000000002',
    status_http: 403,
    detalhes: 'Acesso bloqueado: Perfil UC (cliente) tentou executar operação restrita ao perfil UA (admin).',
    data_formatada: 'Hoje, 08:12'
  },
  {
    id: 101,
    evento: 'LOGIN_SUCESSO',
    usuario_email: 'admin@raizmarketplace.com',
    perfil_atual: 'admin',
    recurso_alvo: 'POST /api/auth/login',
    status_http: 200,
    detalhes: 'Autenticação administrativa (UA) validada com token Bearer.',
    data_formatada: 'Hoje, 08:00'
  }
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

const state = {
  page: 'dashboard',
  apiConnected: false,
  users: getStorage('admin_users', structuredClone(defaultUsersSeed)),
  products: getStorage('products', structuredClone(defaultProductsSeed)),
  orders: getStorage('orders', [
    {id:12345, customer:'Ana Beatriz', date:'Hoje, 14:30', status:'Em preparação', total:129.80, address:'Rua das Flores, 123 • Cáceres - MT'},
    {id:12344, customer:'Carlos M. Silva', date:'Ontem, 11:20', status:'Em transporte', total:64.90, address:'Av. São João, 310 • Cáceres - MT'},
    {id:12343, customer:'Juliana Pereira', date:'09/09/2026 • 16:45', status:'Entregue', total:174.80, address:'Rua dos Ipês, 88 • Cáceres - MT'}
  ]),
  disputes: getStorage('admin_disputes', structuredClone(defaultDisputesSeed)),
  securityLogs: getStorage('admin_security_logs', structuredClone(defaultSecurityLogsSeed)),
  dailySales: getStorage('daily_sales', [
    { dia_semana: 'Seg', valor: 240.00 },
    { dia_semana: 'Ter', valor: 180.00 },
    { dia_semana: 'Qua', valor: 320.00 },
    { dia_semana: 'Qui', valor: 290.00 },
    { dia_semana: 'Sex', valor: 450.00 },
    { dia_semana: 'Sáb', valor: 520.00 },
    { dia_semana: 'Dom', valor: 150.00 }
  ]),
  userRoleFilter: 'todos',
  disputeStatusFilter: 'todas',
  lastRbacTestResult: null
};

const adminNavItems = [
  ['dashboard', '📊', 'Visão geral'],
  ['users', '👥', 'Usuários'],
  ['catalog', '🌿', 'Catálogo'],
  ['disputes', '⚖️', 'Disputas'],
  ['security', '🛡️', 'Segurança']
];

function money(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
}

function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => t.classList.remove('show'), 2600);
}

function escapeAttr(s = '') {
  return String(s).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function pageTitle() {
  const all = {
    dashboard: 'Visão geral da operação',
    users: 'Usuários e parceiros',
    catalog: 'Moderação do catálogo',
    disputes: 'Central de disputas',
    security: 'Segurança e auditoria'
  };
  return all[state.page] || 'RAIZ Administrador (UA)';
}

function go(page) {
  state.page = page;
  renderApp();
  window.scrollTo(0, 0);
}

// Sincroniza com Backend FastAPI / Spring Boot se online
async function syncFromBackendAPI() {
  if (!window.RaizAPI) return;
  try {
    const dash = await window.RaizAPI.admin.getDashboard();
    if (dash && dash.kpis) {
      state.apiConnected = true;
      if (dash.vendas_diarias && dash.vendas_diarias.length) {
        state.dailySales = dash.vendas_diarias;
      }
      if (dash.ultimos_logs && dash.ultimos_logs.length) {
        state.securityLogs = dash.ultimos_logs;
        setStorage('admin_security_logs', state.securityLogs);
      }
    }
    const [users, prods, disps] = await Promise.all([
      window.RaizAPI.admin.getUsuarios(),
      window.RaizAPI.admin.getProdutosModeracao(),
      window.RaizAPI.admin.getDisputas()
    ]);
    if (Array.isArray(users) && users.length) {
      state.users = users;
      setStorage('admin_users', users);
    }
    if (Array.isArray(prods) && prods.length) {
      state.products = prods.map(p => ({
        id: p.id,
        name: p.nome || p.name,
        category: p.categoria || p.category,
        seller: p.vendedor_nome || p.seller || 'Flora Verde',
        price: p.preco !== undefined ? p.preco : p.price,
        emoji: p.emoji || '🌿',
        tag: p.tag || '',
        stock: p.estoque !== undefined ? p.estoque : p.stock,
        active: p.ativo !== undefined ? p.ativo : p.active,
        porte: p.porte || p.size || 'Médio porte',
        fragile: p.fragil !== undefined ? p.fragil : p.fragile
      }));
      setStorage('products', state.products);
    }
    if (Array.isArray(disps)) {
      state.disputes = disps;
      setStorage('admin_disputes', disps);
    }
    renderApp();
  } catch (e) {
    state.apiConnected = false;
  }
}

function computeKPIs() {
  const orders = getStorage('orders', state.orders);
  const products = state.products;
  const users = state.users;
  const disputes = state.disputes;
  const logs = state.securityLogs;

  const ordersSum = orders.filter(o => o.status !== 'Cancelado').reduce((acc, o) => acc + Number(o.total || 0), 0);
  const gmvTotal = ['local','apresentacao'].includes(RaizPresentation.source) && RaizPaymentFlow.summary().count ? RaizPaymentFlow.summary().paidCents/100 : ordersSum;
  const deliveredCount = orders.filter(o => o.status === 'Entregue').length;
  const activeProducts = products.filter(p => p.active !== false && p.ativo !== false).length;
  const pausedProducts = products.length - activeProducts;
  const openDisputes = disputes.filter(d => d.status === 'Aberta' || d.status === 'Em análise').length;
  const blockedEvents = logs.filter(l => l.status_http === 401 || l.status_http === 403).length;

  const roleCounts = {
    cliente: users.filter(u => u.role === 'cliente').length,
    vendedor: users.filter(u => u.role === 'vendedor').length,
    entregador: users.filter(u => u.role === 'entregador').length,
    admin: users.filter(u => u.role === 'admin').length
  };

  return {
    gmvTotal,
    totalOrders: orders.length,
    deliveredCount,
    inProgressOrders: orders.length - deliveredCount,
    totalProducts: products.length,
    activeProducts,
    pausedProducts,
    totalUsers: users.length,
    roleCounts,
    openDisputes,
    totalDisputes: disputes.length,
    blockedEvents
  };
}

function adminNavIcon(page) {
  const paths={home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-8h6v8"/>',products:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16M15 10v10"/>',sellerOrders:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6"/>',store:'<path d="M3 10h18l-2-6H5z"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>',stats:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',deliveries:'<path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',activeDelivery:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',history:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',wallet:'<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 9h18M16 15h2M7 6V4h10v2"/>',dashboard:'<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="5" rx="1"/><rect x="13" y="10" width="8" height="11" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/>',users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5"/>',catalog:'<path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="9"/>',disputes:'<path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v4M12 17h.01"/>',security:'<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>'};
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[page]||paths.home}</svg>`;
}

function renderApp() {
  const appContainer = document.getElementById('appView');
  const title = pageTitle();
  const kpis = computeKPIs();

  appContainer.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" aria-label="Menu principal">
        <a class="logo" href="#dashboard" onclick="go('dashboard')">${logoSVG}</a>

        <p class="sidebar-caption">Área administrativa</p>

        <nav class="side-nav" aria-label="Navegação principal">
          ${adminNavItems.map(([p, i, l]) => `
            <button class="nav-btn ${state.page === p ? 'active' : ''}" aria-current="${state.page === p ? 'page' : 'false'}" onclick="go('${p}')">
              <span class="nav-icon">${adminNavIcon(p)}</span>${l}
              ${p === 'disputes' && kpis.openDisputes > 0 ? `<span class="badge orange" style="margin-left:auto;padding:2px 7px;font-size:.7rem">${kpis.openDisputes}</span>` : ''}
              ${p === 'security' && kpis.blockedEvents > 0 ? `<span class="badge red" style="margin-left:auto;padding:2px 7px;font-size:.7rem">${kpis.blockedEvents}</span>` : ''}
            </button>
          `).join('')}
        </nav>

        <div class="sidebar-foot">
          <div class="hub-tag" style="background:${state.apiConnected ? '#E8F5E9' : '#FFF3E0'};color:${state.apiConnected ? '#1B4332' : '#A45100'}">
            <span>${state.apiConnected ? '🟢' : '⚡'}</span>
            <span>${window.RaizPresentation?.source === 'local' ? 'Exemplos locais' : window.RaizPresentation?.connected ? 'Supabase conectado' : 'Configuração Supabase pendente'}</span>
          </div>
          <a class="sidebar-about" href="../index.html"><span class="nav-icon">ⓘ</span><span>Sobre a RAIZ</span></a>
        </div>
      </aside>

      <main class="main">
        <header class="topbar">
          <div>
            <h2>${title}</h2>
            <div class="tiny muted">RAIZ • Administração do marketplace</div>
          </div>
          <div class="top-actions">
            <div id="topAuthContainer"></div>
            <button class="btn btn-primary" onclick="openUserModal()" style="padding:8px 14px;font-size:.84rem">
              ＋ Novo Usuário
            </button>
            <button class="btn btn-outline" onclick="location.reload()" style="padding:8px 12px;font-size:.82rem">
              🔄 Atualizar
            </button>
          </div>
        </header>

        <div class="app-content" id="pageContent"></div>
      </main>
    </div>

    <nav class="bottom-nav">
      ${adminNavItems.map(([p, i, l]) => `
        <button class="nav-btn ${state.page === p ? 'active' : ''}" aria-current="${state.page === p ? 'page' : 'false'}" onclick="go('${p}')">
          <span class="nav-icon">${adminNavIcon(p)}</span>
          <span>${l.split(' ')[0]}</span>
        </button>
      `).join('')}
    </nav>
  `;

  if (window.RaizDB && window.RaizDB.renderAuthTopbar) {
    window.RaizDB.renderAuthTopbar(document.getElementById('topAuthContainer'), { role: 'admin' });
  }

  renderPage();
  window.RaizPartnerDesign?.prepare();
}

function renderPage() {
  const c = document.getElementById('pageContent');
  if (!c) return;
  const kpis = computeKPIs();

  // =========================================================================
  // ABA 1: DASHBOARD ADMINISTRATIVO COM DADOS PERSISTIDOS
  // =========================================================================
  if (state.page === 'dashboard') {
    const maxSale = Math.max(...state.dailySales.map(d => d.valor), 100);
    c.innerHTML = `
      <section class="partner-hero" aria-labelledby="admin-welcome">
        <div class="partner-hero-copy">
        <span class="eyebrow">Um ecossistema em crescimento</span>
        <h1 id="admin-welcome">Cuidar de cada detalhe.<br>Conectar mais pessoas.</h1>
        <p>Indicadores do estado disponível. Na apresentação, usuários, disputas e registros de segurança são fictícios; recarregue para atualizar.</p>
        <div class="row wrap" style="margin-top:14px">
          <button class="btn btn-primary" onclick="go('users')">Gerenciar Usuários (${kpis.totalUsers})</button>
          <button class="btn btn-outline" onclick="go('security')">Auditoria RBAC (${kpis.blockedEvents} bloqueios)</button>
        </div>
        </div>
        <img src="../assets/vitrine-botanica.png" alt="Composição ilustrativa do universo botânico RAIZ" width="720" height="640">
      </section>

      <div class="grid-4" style="margin-top:20px">
        <div class="card metric">
          <div class="label">GMV / Faturamento Acumulado</div>
          <div class="value">${money(kpis.gmvTotal)}</div>
          <div class="trend">${RaizPresentation.source==='local' && RaizPaymentFlow.summary().count?'Pagamentos locais aprovados, sem estornos':'Pedidos antigos de demonstração, sem validação de pagamento'}</div>
        </div>
        <div class="card metric">
          <div class="label">Pedidos no Ecossistema</div>
          <div class="value">${kpis.totalOrders}</div>
          <div class="small muted" style="margin-top:4px">${kpis.deliveredCount} entregues • ${kpis.inProgressOrders} em curso</div>
        </div>
        <div class="card metric">
          <div class="label">Catálogo Botânico</div>
          <div class="value">${kpis.activeProducts} <span class="small muted">/ ${kpis.totalProducts}</span></div>
          <div class="small muted" style="margin-top:4px">${kpis.pausedProducts} anúncio(s) pausado(s)</div>
        </div>
        <div class="card metric">
          <div class="label">Segurança & Bloqueios RBAC</div>
          <div class="value" style="color:var(--danger)">${kpis.blockedEvents}</div>
          <div class="small muted" style="margin-top:4px">Exemplos de eventos 401/403, sem autenticação real</div>
        </div>
      </div>

      <div class="grid-2" style="margin-top:18px">
        <div class="card">
          <div class="row space">
            <h3 style="margin:0">Volume Financeiro Diário (R$)</h3>
            <span class="badge green">Série disponível / carga de exemplo</span>
          </div>
          <div class="stat-bars">
            ${state.dailySales.map(d => {
              const h = Math.max(16, Math.round((d.valor / maxSale) * 130));
              return `
                <div class="bar-col" title="${d.dia_semana}: ${money(d.valor)}">
                  <div class="small" style="font-size:.68rem;font-weight:800;color:var(--deep)">${Math.round(d.valor)}</div>
                  <div class="bar" style="height:${h}px"></div>
                  <span>${d.dia_semana}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="card">
          <div class="row space">
            <h3 style="margin:0">Distribuição por Perfil (UC, UP, UE, UA)</h3>
            <button class="btn btn-outline" style="padding:6px 12px;font-size:.78rem" onclick="go('users')">Ver todos</button>
          </div>
          <div class="list" style="margin-top:14px">
            <div class="list-item">
              <div class="thumb" style="width:42px;height:42px;font-size:1.3rem">🪴</div>
              <div class="list-main">
                <strong>Clientes Compradores (UC)</strong>
                <small>Acesso ao catálogo, carrinho, checkout e avaliação</small>
              </div>
              <span class="badge green">${kpis.roleCounts.cliente} ativo(s)</span>
            </div>
            <div class="list-item">
              <div class="thumb" style="width:42px;height:42px;font-size:1.3rem">🏪</div>
              <div class="list-main">
                <strong>Produtores / Vendedores (UP)</strong>
                <small>Gestão de estoque, loja Flora Verde e preparo de pedidos</small>
              </div>
              <span class="badge orange">${kpis.roleCounts.vendedor} ativo(s)</span>
            </div>
            <div class="list-item">
              <div class="thumb" style="width:42px;height:42px;font-size:1.3rem">🛵</div>
              <div class="list-main">
                <strong>Entregadores Parceiros (UE)</strong>
                <small>Rotas GPS, checklist fitossanitário e carteira Pix</small>
              </div>
              <span class="badge blue">${kpis.roleCounts.entregador} ativo(s)</span>
            </div>
            <div class="list-item">
              <div class="thumb" style="width:42px;height:42px;font-size:1.3rem">🛡️</div>
              <div class="list-main">
                <strong>Administradores (UA)</strong>
                <small>Governança total, moderação, disputas e auditoria RBAC</small>
              </div>
              <span class="badge purple">${kpis.roleCounts.admin} ativo(s)</span>
            </div>
          </div>
        </div>
      </div>

      <div class="grid-2" style="margin-top:18px">
        <div class="card">
          <div class="row space" style="margin-bottom:12px">
            <h3 style="margin:0">Últimas Disputas & Mediações</h3>
            <button class="btn btn-outline" style="padding:6px 12px;font-size:.78rem" onclick="go('disputes')">Gerenciar</button>
          </div>
          <div class="list">
            ${state.disputes.slice(0, 3).map(d => `
              <div class="list-item clickable" onclick="openDisputeModal(${d.id})">
                <div class="thumb" style="width:44px;height:44px;font-size:1.3rem">⚖️</div>
                <div class="list-main">
                  <strong>#${d.id} • ${escapeAttr(d.titulo)}</strong>
                  <small>Solicitante: ${escapeAttr(d.solicitante_nome)} (${d.solicitante_perfil.toUpperCase()}) • Pedido #${d.pedido_id || '—'}</small>
                </div>
                <span class="badge ${d.status === 'Resolvida' ? 'green' : 'orange'}">${d.status}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card">
          <div class="row space" style="margin-bottom:12px">
            <h3 style="margin:0">Eventos Recentes de Segurança</h3>
            <button class="btn btn-outline" style="padding:6px 12px;font-size:.78rem" onclick="go('security')">Auditoria completa</button>
          </div>
          <div class="list">
            ${state.securityLogs.slice(0, 3).map(l => `
              <div class="list-item">
                <div class="thumb" style="width:44px;height:44px;font-size:1.2rem;background:${l.status_http >= 400 ? 'var(--danger-bg)' : 'var(--subtle)'}">
                  ${l.status_http >= 400 ? '🚫' : '✅'}
                </div>
                <div class="list-main">
                  <strong>${l.evento} <span class="tiny muted">(${l.usuario_email})</span></strong>
                  <small>${escapeAttr(l.detalhes)}</small>
                </div>
                <span class="badge ${l.status_http >= 400 ? 'red' : 'green'}">HTTP ${l.status_http}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    if(['local','apresentacao'].includes(RaizPresentation.source)) c.insertAdjacentHTML('beforeend',RaizPaymentFlow.panel());
    return;
  }

  // =========================================================================
  // ABA 2: CRUD DE USUÁRIOS E PARCEIROS (UC, UP, UE, UA)
  // =========================================================================
  if (state.page === 'users') {
    const filteredUsers = state.userRoleFilter === 'todos'
      ? state.users
      : state.users.filter(u => u.role === state.userRoleFilter);

    const roleBadger = (r) => {
      const map = {
        cliente: ['green', '🪴 UC • Cliente'],
        vendedor: ['orange', '🏪 UP • Produtor'],
        entregador: ['blue', '🛵 UE • Entregador'],
        admin: ['purple', '🛡️ UA • Admin']
      };
      const [cls, txt] = map[r] || ['gray', r];
      return `<span class="badge ${cls}">${txt}</span>`;
    };

    c.innerHTML = `
      <div class="page-title">
        <div>
          <span class="eyebrow">Pessoas que fazem a RAIZ</span>
          <h1>Usuários e parceiros</h1>
          <p>Cadastre, edite ou remova usuários fictícios da apresentação. Não altera contas de autenticação reais.</p>
        </div>
        <button class="btn btn-primary" onclick="openUserModal()">＋ Cadastrar Usuário</button>
      </div>

      <div class="filter-line">
        ${[
          ['todos', `Todos (${state.users.length})`],
          ['cliente', `🪴 Clientes UC (${kpis.roleCounts.cliente})`],
          ['vendedor', `🏪 Produtores UP (${kpis.roleCounts.vendedor})`],
          ['entregador', `🛵 Entregadores UE (${kpis.roleCounts.entregador})`],
          ['admin', `🛡️ Admins UA (${kpis.roleCounts.admin})`]
        ].map(([roleKey, label]) => `
          <button class="chip ${state.userRoleFilter === roleKey ? 'active' : ''}" onclick="setUserFilter('${roleKey}')">
            ${label}
          </button>
        `).join('')}
      </div>

      <div class="card">
        <div class="list">
          ${filteredUsers.map(u => `
            <div class="list-item">
              <div class="thumb" style="font-size:1.5rem">
                ${{ cliente: '🪴', vendedor: '🏪', entregador: '🛵', admin: '🛡️' }[u.role] || '👤'}
              </div>
              <div class="list-main">
                <div class="row wrap" style="gap:8px">
                  <strong>${escapeAttr(u.nome)}</strong>
                  ${roleBadger(u.role)}
                </div>
                <small>${escapeAttr(u.email)} • ${escapeAttr(u.telefone || '(65) 99000-0000')} • ${escapeAttr(u.endereco || 'Cáceres - MT')}</small>
              </div>
              <div class="row">
                <button class="btn btn-outline" style="padding:8px 12px;font-size:.8rem" onclick="openUserModal('${u.id}')">✎ Editar</button>
                <button class="btn btn-danger" style="padding:8px 12px;font-size:.8rem" onclick="deleteUser('${u.id}')">✕ Excluir</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    return;
  }

  // =========================================================================
  // ABA 3: MODERAÇÃO DE CATÁLOGO E ESTOQUE
  // =========================================================================
  if (state.page === 'catalog') {
    c.innerHTML = `
      <div class="page-title">
        <div>
          <span class="eyebrow">Uma vitrine bem cuidada</span>
          <h1>Moderação do catálogo</h1>
          <p>Audite anúncios publicados pelos produtores (UP), verifique conformidade botânica e pause/ative itens na vitrine.</p>
        </div>
      </div>

      <div class="card">
        <div class="list">
          ${state.products.map(p => `
            <div class="list-item">
              <div class="thumb">${p.emoji || '🌿'}</div>
              <div class="list-main">
                <div class="row wrap" style="gap:8px">
                  <strong>#${p.id} • ${escapeAttr(p.name)}</strong>
                  <span class="badge ${p.active !== false ? 'green' : 'gray'}">${p.active !== false ? '✓ Ativo na Vitrine' : '⏸ Pausado pela Moderação'}</span>
                  ${p.fragile ? `<span class="badge orange">⚠️ Espécie Frágil</span>` : ''}
                </div>
                <small>Loja: ${escapeAttr(p.seller || 'Flora Verde')} • Categoria: ${p.category} • Estoque: ${p.stock} un. • Preço: <strong>${money(p.price)}</strong></small>
              </div>
              <div class="row">
                <button class="btn ${p.active !== false ? 'btn-outline' : 'btn-primary'}" style="padding:8px 14px;font-size:.82rem" onclick="toggleProductModeration(${p.id})">
                  ${p.active !== false ? '⏸ Pausar Anúncio' : '▶ Aprovar / Ativar'}
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    return;
  }

  // =========================================================================
  // ABA 4: CRUD DE DISPUTAS E MEDIAÇÃO OPERACIONAL
  // =========================================================================
  if (state.page === 'disputes') {
    const filtered = state.disputeStatusFilter === 'todas'
      ? state.disputes
      : state.disputes.filter(d => d.status.toLowerCase() === state.disputeStatusFilter.toLowerCase());

    c.innerHTML = `
      <div class="page-title">
        <div>
          <span class="eyebrow">Cuidado em cada experiência</span>
          <h1>Central de disputas</h1>
          <p>Registre ocorrências logísticas ou fitossanitárias e delibere resoluções entre Clientes (UC), Lojistas (UP) e Entregadores (UE).</p>
        </div>
        <button class="btn btn-primary" onclick="openDisputeModal()">＋ Nova Disputa</button>
      </div>

      <div class="filter-line">
        ${['todas', 'Aberta', 'Em análise', 'Resolvida'].map(st => `
          <button class="chip ${state.disputeStatusFilter === st ? 'active' : ''}" onclick="setDisputeFilter('${st}')">
            ${st === 'todas' ? `Todas (${state.disputes.length})` : st}
          </button>
        `).join('')}
      </div>

      <div class="card">
        <div class="list">
          ${filtered.length ? filtered.map(d => `
            <div class="list-item">
              <div class="thumb">⚖️</div>
              <div class="list-main">
                <div class="row wrap" style="gap:8px">
                  <strong>Disputa #${d.id} — ${escapeAttr(d.titulo)}</strong>
                  <span class="badge ${d.status === 'Resolvida' ? 'green' : d.status === 'Aberta' ? 'red' : 'orange'}">${d.status}</span>
                  <span class="badge gray">Prioridade: ${d.prioridade}</span>
                </div>
                <small style="margin-top:4px">${escapeAttr(d.descricao)}</small>
                <small style="margin-top:4px;color:var(--deep)"><strong>Resolução Admin (UA):</strong> ${escapeAttr(d.resolucao_admin || 'Aguardando deliberação.')}</small>
                <small class="muted" style="margin-top:2px">Solicitante: ${escapeAttr(d.solicitante_nome)} (${d.solicitante_perfil.toUpperCase()}) • Pedido #${d.pedido_id || '—'} • ${d.data_formatada}</small>
              </div>
              <div class="row">
                <button class="btn btn-outline" style="padding:8px 12px;font-size:.8rem" onclick="openDisputeModal(${d.id})">✎ Mediar</button>
                <button class="btn btn-danger" style="padding:8px 12px;font-size:.8rem" onclick="deleteDispute(${d.id})">✕</button>
              </div>
            </div>
          `).join('') : `<div class="empty">Nenhuma disputa encontrada para este filtro.</div>`}
        </div>
      </div>
    `;
    return;
  }

  // =========================================================================
  // ABA 5: SEGURANÇA, VALIDAÇÃO DE AUTENTICAÇÃO E SIMULADOR RBAC (401 / 403)
  // =========================================================================
  if (state.page === 'security') {
    c.innerHTML = `
      <div class="page-title">
        <div>
          <span class="eyebrow">Proteção do ecossistema</span>
          <h1>Segurança e auditoria</h1>
          <p>Simulação didática de respostas 401/403. Esta tela não comprova autenticação nem autorização reais.</p>
        </div>
      </div>

      <div class="grid-2">
        <!-- Simulador Interativo de Bloqueio RBAC -->
        <div class="card" style="border-color:#C9E7D0;background:linear-gradient(180deg,#FFFFFF,#F6FBF8)">
          <span class="badge green">🧪 Validador Interativo de Segurança</span>
          <h3 style="margin:10px 0 6px">Simulador de Permissões e Bloqueios (401 / 403)</h3>
          <p class="small muted" style="margin:0 0 14px">
            Gere exemplos locais de eventos. Para evidências reais de bloqueio, consulte os testes SQL executados e seus limites:
          </p>

          <div class="stack">
            <button class="btn btn-outline" style="justify-content:space-between;text-align:left" onclick="simularTesteSeguranca('AUTH_401')">
              <span>🚫 <strong>Teste 1 (HTTP 401):</strong> Acessar rota protegida sem Token Bearer</span>
              <span class="badge red">Testar 401</span>
            </button>
            <button class="btn btn-outline" style="justify-content:space-between;text-align:left" onclick="simularTesteSeguranca('RBAC_UC_ADMIN_403')">
              <span>🚫 <strong>Teste 2 (HTTP 403):</strong> Cliente (UC) tentando abrir Dashboard Admin (UA)</span>
              <span class="badge red">Testar 403</span>
            </button>
            <button class="btn btn-outline" style="justify-content:space-between;text-align:left" onclick="simularTesteSeguranca('RBAC_UC_VEND_403')">
              <span>🚫 <strong>Teste 3 (HTTP 403):</strong> Cliente (UC) tentando excluir produto do Vendedor (UP)</span>
              <span class="badge red">Testar 403</span>
            </button>
            <button class="btn btn-outline" style="justify-content:space-between;text-align:left" onclick="simularTesteSeguranca('RBAC_UE_ADMIN_403')">
              <span>🚫 <strong>Teste 4 (HTTP 403):</strong> Entregador (UE) tentando listar usuários do Admin (UA)</span>
              <span class="badge red">Testar 403</span>
            </button>
            <button class="btn btn-primary" style="justify-content:space-between;text-align:left" onclick="simularTesteSeguranca('AUTH_UA_200')">
              <span>✅ <strong>Teste 5 (HTTP 200):</strong> Administrador (UA) autenticado acessando Governança</span>
              <span class="badge green">Testar 200</span>
            </button>
          </div>

          ${state.lastRbacTestResult ? `
            <div style="margin-top:16px;padding:14px;border-radius:14px;border:1px solid ${state.lastRbacTestResult.status >= 400 ? '#FEB2B2' : '#9AE6B4'};background:${state.lastRbacTestResult.status >= 400 ? '#FFF5F5' : '#F0FFF4'}">
              <div class="row space">
                <strong style="color:${state.lastRbacTestResult.status >= 400 ? '#C53030' : '#22543D'}">${state.lastRbacTestResult.title}</strong>
                <span class="badge ${state.lastRbacTestResult.status >= 400 ? 'red' : 'green'}">HTTP ${state.lastRbacTestResult.status}</span>
              </div>
              <div class="small" style="margin-top:6px;font-family:monospace;color:#2D3748">${escapeAttr(state.lastRbacTestResult.detail)}</div>
            </div>
          ` : ''}
        </div>

        <!-- Matriz RBAC Oficial -->
        <div class="card">
          <h3 style="margin-top:0">Matriz Oficial de Permissões (RBAC)</h3>
          <p class="small muted">Isolamento estrito de domínio entre os 4 perfis do ecossistema RAIZ:</p>
          <div style="overflow-x:auto;margin-top:12px">
            <table style="width:100%;border-collapse:collapse;font-size:.82rem">
              <thead>
                <tr style="border-bottom:2px solid var(--border);text-align:left">
                  <th style="padding:8px">Recurso / Operação</th>
                  <th style="padding:8px;text-align:center">UC</th>
                  <th style="padding:8px;text-align:center">UP</th>
                  <th style="padding:8px;text-align:center">UE</th>
                  <th style="padding:8px;text-align:center">UA</th>
                </tr>
              </thead>
              <tbody>
                ${[
                  ['Catálogo Botânico & Busca', '✅', '✅', '—', '✅'],
                  ['Carrinho, Checkout & Avaliação', '✅', '🚫 403', '🚫 403', '✅'],
                  ['CRUD de Produtos & Estoque Loja', '🚫 403', '✅', '🚫 403', '✅'],
                  ['Gestão de Preparo de Pedidos', '🚫 403', '✅', '🚫 403', '✅'],
                  ['Aceite de Corridas & Checklist GPS', '🚫 403', '🚫 403', '✅', '✅'],
                  ['Carteira Digital & Saque Pix', '🚫 403', '🚫 403', '✅', '✅'],
                  ['Dashboard Global & CRUD Usuários', '🚫 403', '🚫 403', '🚫 403', '✅'],
                  ['Moderação & Mediação de Disputas', '🚫 403', '🚫 403', '🚫 403', '✅']
                ].map(r => `
                  <tr style="border-bottom:1px solid var(--border)">
                    <td style="padding:9px 8px;font-weight:700">${r[0]}</td>
                    <td style="padding:9px 8px;text-align:center">${r[1]}</td>
                    <td style="padding:9px 8px;text-align:center">${r[2]}</td>
                    <td style="padding:9px 8px;text-align:center">${r[3]}</td>
                    <td style="padding:9px 8px;text-align:center">${r[4]}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Log de Auditoria Persistido -->
      <div class="card" style="margin-top:18px">
        <div class="row space" style="margin-bottom:12px">
          <div>
            <h3 style="margin:0">Trilha de Auditoria e Evidências de Bloqueio (logs_seguranca)</h3>
            <small class="muted">Registros de exemplo da apresentação; não são uma trilha de auditoria de contas reais.</small>
          </div>
          <span class="badge purple">${state.securityLogs.length} eventos registrados</span>
        </div>
        <div class="list">
          ${state.securityLogs.map(l => `
            <div class="list-item">
              <div class="thumb" style="width:44px;height:44px;font-size:1.25rem;background:${l.status_http >= 400 ? 'var(--danger-bg)' : 'var(--subtle)'}">
                ${l.status_http >= 400 ? '🛡️' : '🔓'}
              </div>
              <div class="list-main">
                <div class="row wrap" style="gap:8px">
                  <strong>${l.evento}</strong>
                  <span class="badge ${l.status_http === 401 || l.status_http === 403 ? 'red' : 'green'}">HTTP ${l.status_http}</span>
                  <span class="badge gray">Perfil: ${l.perfil_atual.toUpperCase()}</span>
                </div>
                <small style="margin-top:3px"><strong>Alvo:</strong> <code>${escapeAttr(l.recurso_alvo)}</code> • <strong>Usuário:</strong> ${escapeAttr(l.usuario_email)}</small>
                <small style="margin-top:2px">${escapeAttr(l.detalhes)} (${l.data_formatada})</small>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    return;
  }
}

// =========================================================================
// FUNÇÕES DE AÇÃO — CRUD DE USUÁRIOS (UA)
// =========================================================================
function setUserFilter(role) {
  state.userRoleFilter = role;
  renderPage();
}

function openUserModal(userId = null) {
  const existing = userId ? state.users.find(u => String(u.id) === String(userId)) : null;
  const u = existing || {
    nome: '',
    email: '',
    role: 'cliente',
    telefone: '(65) 99654-3210',
    endereco: 'Cáceres - MT'
  };

  openModal(`
    <div class="modal-head">
      <h2>${existing ? 'Editar Usuário / Permissão RBAC' : 'Cadastrar Novo Usuário'}</h2>
      <button class="icon-btn" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="grid-2">
        <div class="field">
          <label>Nome Completo / Razão Social</label>
          <input id="uNome" class="input" value="${escapeAttr(u.nome)}" placeholder="Ex: Viveiro Pantanal">
        </div>
        <div class="field">
          <label>E-mail de Acesso</label>
          <input id="uEmail" class="input" type="email" value="${escapeAttr(u.email)}" placeholder="contato@exemplo.com">
        </div>
        <div class="field">
          <label>Perfil de Acesso (RBAC)</label>
          <select id="uRole" class="input">
            <option value="cliente" ${u.role === 'cliente' ? 'selected' : ''}>🪴 Cliente Comprador (UC)</option>
            <option value="vendedor" ${u.role === 'vendedor' ? 'selected' : ''}>🏪 Produtor / Vendedor (UP)</option>
            <option value="entregador" ${u.role === 'entregador' ? 'selected' : ''}>🛵 Entregador Parceiro (UE)</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>🛡️ Administrador (UA)</option>
          </select>
        </div>
        <div class="field">
          <label>Telefone / WhatsApp</label>
          <input id="uTel" class="input" value="${escapeAttr(u.telefone || '')}" placeholder="(65) 99999-9999">
        </div>
      </div>
      <div class="field" style="margin-top:12px">
        <label>Endereço / Cidade</label>
        <input id="uEnd" class="input" value="${escapeAttr(u.endereco || '')}" placeholder="Rua das Flores, 123 • Cáceres - MT">
      </div>
      <div class="row" style="justify-content:flex-end;margin-top:18px">
        <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveUser('${existing ? existing.id : ''}')">Salvar Usuário</button>
      </div>
    </div>
  `);
}

async function saveUser(userId) {
  const nome = document.getElementById('uNome').value.trim();
  const email = document.getElementById('uEmail').value.trim().toLowerCase();
  const role = document.getElementById('uRole').value;
  const telefone = document.getElementById('uTel').value.trim();
  const endereco = document.getElementById('uEnd').value.trim();

  if (!nome || !email) {
    toast('Preencha nome e e-mail do usuário');
    return;
  }
  if (!document.getElementById('uEmail').checkValidity() ||
      !['cliente','vendedor','entregador','admin'].includes(role) ||
      state.users.some(u => u.email.toLowerCase() === email && String(u.id) !== String(userId))) {
    toast('Informe e-mail válido e único e um perfil disponível.');
    return;
  }

  if (userId) {
    const idx = state.users.findIndex(u => String(u.id) === String(userId));
    if (idx >= 0) {
      state.users[idx] = { ...state.users[idx], nome, email, role, telefone, endereco };
    }
    if (window.RaizAPI) {
      try {
        await window.RaizAPI.admin.atualizarUsuario(userId, { nome, email, role, telefone, endereco });
      } catch (e) {}
    }
    toast(`Usuário ${nome} atualizado (${role.toUpperCase()})`);
  } else {
    let created = {
      id: 'u_' + Date.now(),
      nome,
      email,
      role,
      telefone,
      endereco
    };
    if (window.RaizAPI) {
      try {
        const apiUser = await window.RaizAPI.admin.criarUsuario({ nome, email, role, telefone, endereco });
        if (apiUser && apiUser.id) created = apiUser;
      } catch (e) {}
    }
    state.users.unshift(created);
    toast(`Usuário ${nome} cadastrado com sucesso!`);
  }

  setStorage('admin_users', state.users);
  closeModal();
  renderApp();
}

async function deleteUser(userId) {
  const u = state.users.find(x => String(x.id) === String(userId));
  if (!u) return;
  if (window.RaizAPI) {
    try {
      await window.RaizAPI.admin.removerUsuario(userId);
    } catch (e) {}
  }
  state.users = state.users.filter(x => String(x.id) !== String(userId));
  setStorage('admin_users', state.users);
  toast(`Usuário ${u.nome} removido.`);
  renderApp();
}

// =========================================================================
// FUNÇÕES DE AÇÃO — MODERAÇÃO DE CATÁLOGO
// =========================================================================
async function toggleProductModeration(prodId) {
  const p = state.products.find(x => Number(x.id) === Number(prodId));
  if (!p) return;
  p.active = !(p.active !== false);
  setStorage('products', state.products);

  if (window.RaizAPI) {
    try {
      await window.RaizAPI.admin.moderarProduto(prodId);
    } catch (e) {}
  }

  toast(`Anúncio "${p.name}" ${p.active ? 'ativado na vitrine' : 'pausado pela moderação'}.`);
  renderApp();
}

// =========================================================================
// FUNÇÕES DE AÇÃO — CRUD DE DISPUTAS E MEDIAÇÃO (UA)
// =========================================================================
function setDisputeFilter(status) {
  state.disputeStatusFilter = status;
  renderPage();
}

function openDisputeModal(disputeId = null) {
  const existing = disputeId ? state.disputes.find(d => Number(d.id) === Number(disputeId)) : null;
  const d = existing || {
    pedido_id: 12345,
    titulo: '',
    descricao: '',
    solicitante_nome: 'Ana Beatriz',
    solicitante_perfil: 'cliente',
    status: 'Aberta',
    prioridade: 'Alta',
    resolucao_admin: ''
  };

  openModal(`
    <div class="modal-head">
      <h2>${existing ? `Mediar Disputa #${existing.id}` : 'Registrar Nova Disputa'}</h2>
      <button class="icon-btn" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="grid-2">
        <div class="field">
          <label>Título da Ocorrência</label>
          <input id="dTitulo" class="input" value="${escapeAttr(d.titulo)}" placeholder="Ex: Vaso trincado no transporte">
        </div>
        <div class="field">
          <label>Nº do Pedido Relacionado</label>
          <input id="dPedido" class="input" type="number" value="${d.pedido_id || 12345}">
        </div>
        <div class="field">
          <label>Solicitante</label>
          <input id="dSolicitante" class="input" value="${escapeAttr(d.solicitante_nome)}">
        </div>
        <div class="field">
          <label>Perfil do Solicitante</label>
          <select id="dPerfil" class="input">
            <option value="cliente" ${d.solicitante_perfil === 'cliente' ? 'selected' : ''}>Cliente (UC)</option>
            <option value="vendedor" ${d.solicitante_perfil === 'vendedor' ? 'selected' : ''}>Produtor (UP)</option>
            <option value="entregador" ${d.solicitante_perfil === 'entregador' ? 'selected' : ''}>Entregador (UE)</option>
          </select>
        </div>
        <div class="field">
          <label>Status da Mediação</label>
          <select id="dStatus" class="input">
            <option value="Aberta" ${d.status === 'Aberta' ? 'selected' : ''}>Aberta</option>
            <option value="Em análise" ${d.status === 'Em análise' ? 'selected' : ''}>Em análise</option>
            <option value="Resolvida" ${d.status === 'Resolvida' ? 'selected' : ''}>Resolvida</option>
            <option value="Reembolsada" ${d.status === 'Reembolsada' ? 'selected' : ''}>Reembolsada</option>
          </select>
        </div>
        <div class="field">
          <label>Prioridade</label>
          <select id="dPrio" class="input">
            <option value="Baixa" ${d.prioridade === 'Baixa' ? 'selected' : ''}>Baixa</option>
            <option value="Média" ${d.prioridade === 'Média' ? 'selected' : ''}>Média</option>
            <option value="Alta" ${d.prioridade === 'Alta' ? 'selected' : ''}>Alta</option>
          </select>
        </div>
      </div>
      <div class="field" style="margin-top:12px">
        <label>Descrição Detalhada</label>
        <textarea id="dDesc" class="input">${escapeAttr(d.descricao)}</textarea>
      </div>
      <div class="field" style="margin-top:12px">
        <label>Deliberação / Resolução do Administrador (UA)</label>
        <textarea id="dResolucao" class="input" placeholder="Descreva a decisão tomada pela governança...">${escapeAttr(d.resolucao_admin || '')}</textarea>
      </div>
      <div class="row" style="justify-content:flex-end;margin-top:18px">
        <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveDispute(${existing ? existing.id : 'null'})">Salvar Mediação</button>
      </div>
    </div>
  `);
}

async function saveDispute(disputeId) {
  const titulo = document.getElementById('dTitulo').value.trim();
  const pedido_id = Number(document.getElementById('dPedido').value) || 12345;
  const solicitante_nome = document.getElementById('dSolicitante').value.trim();
  const solicitante_perfil = document.getElementById('dPerfil').value;
  const status = document.getElementById('dStatus').value;
  const prioridade = document.getElementById('dPrio').value;
  const descricao = document.getElementById('dDesc').value.trim();
  const resolucao_admin = document.getElementById('dResolucao').value.trim();

  if (!titulo) {
    toast('Informe o título da disputa');
    return;
  }

  if (disputeId) {
    const idx = state.disputes.findIndex(d => Number(d.id) === Number(disputeId));
    if (idx >= 0) {
      state.disputes[idx] = {
        ...state.disputes[idx],
        titulo, pedido_id, solicitante_nome, solicitante_perfil,
        status, prioridade, descricao, resolucao_admin
      };
    }
    if (window.RaizAPI) {
      try {
        await window.RaizAPI.admin.atualizarDisputa(disputeId, { titulo, descricao, status, prioridade, resolucao_admin });
      } catch (e) {}
    }
    toast(`Disputa #${disputeId} atualizada para "${status}"`);
  } else {
    let nova = {
      id: state.disputes.length ? Math.max(...state.disputes.map(d => d.id)) + 1 : 1,
      pedido_id,
      titulo,
      descricao,
      solicitante_nome,
      solicitante_perfil,
      status,
      prioridade,
      resolucao_admin: resolucao_admin || 'Em análise pela administração.',
      data_formatada: 'Agora'
    };
    if (window.RaizAPI) {
      try {
        const created = await window.RaizAPI.admin.criarDisputa({
          pedido_id, titulo, descricao, solicitante_nome, solicitante_perfil, prioridade
        });
        if (created && created.id) nova = created;
      } catch (e) {}
    }
    state.disputes.unshift(nova);
    toast('Nova disputa registrada!');
  }

  setStorage('admin_disputes', state.disputes);
  closeModal();
  renderApp();
}

async function deleteDispute(disputeId) {
  if (window.RaizAPI) {
    try {
      await window.RaizAPI.admin.excluirDisputa(disputeId);
    } catch (e) {}
  }
  state.disputes = state.disputes.filter(d => Number(d.id) !== Number(disputeId));
  setStorage('admin_disputes', state.disputes);
  toast(`Disputa #${disputeId} arquivada/excluída.`);
  renderApp();
}

// =========================================================================
// FUNÇÕES DE AÇÃO — SIMULADOR DE SEGURANÇA E BLOQUEIO RBAC (401 / 403)
// =========================================================================
async function simularTesteSeguranca(cenario) {
  const agora = new Date().toLocaleTimeString('pt-BR');
  let novoLog = null;

  if (cenario === 'AUTH_401') {
    if (window.RaizAPI) {
      try {
        await window.RaizAPI.auth.verificarProtegido('');
      } catch (e) {}
    }
    novoLog = {
      id: Date.now(),
      evento: 'BLOQUEIO_AUTH_401',
      usuario_email: 'anonimo',
      perfil_atual: 'visitante',
      recurso_alvo: 'GET /api/auth/protegido',
      status_http: 401,
      detalhes: 'Acesso negado: Autenticação obrigatória (Token Bearer ausente ou inválido).',
      data_formatada: `Hoje • ${agora}`
    };
    state.lastRbacTestResult = {
      status: 401,
      title: 'Bloqueio de Autenticação Confirmado (HTTP 401 Unauthorized)',
      detail: 'GET /api/auth/protegido -> {"detail": "Acesso negado: Autenticação obrigatória (Token Bearer ausente ou inválido)."}'
    };
  } else if (cenario === 'RBAC_UC_ADMIN_403') {
    if (window.RaizAPI) {
      try {
        await window.RaizAPI.auth.verificarPermissao('dashboard_admin', 'cliente', 'raiz_token_a0000000-0000-0000-0000-000000000001');
      } catch (e) {}
    }
    novoLog = {
      id: Date.now(),
      evento: 'BLOQUEIO_RBAC_403',
      usuario_email: 'ana.beatriz@email.com',
      perfil_atual: 'cliente',
      recurso_alvo: 'GET /api/admin/dashboard',
      status_http: 403,
      detalhes: 'Acesso bloqueado (RBAC): O perfil CLIENTE (UC) não possui permissão para Painel Administrativo (UA).',
      data_formatada: `Hoje • ${agora}`
    };
    state.lastRbacTestResult = {
      status: 403,
      title: 'Bloqueio RBAC Confirmado: UC tentando acessar UA (HTTP 403 Forbidden)',
      detail: 'GET /api/admin/dashboard [Role: cliente] -> {"detail": "Acesso bloqueado (RBAC): O perfil \'cliente\' não possui permissão para \'Painel Administrativo (UA)\'."}'
    };
  } else if (cenario === 'RBAC_UC_VEND_403') {
    if (window.RaizAPI) {
      try {
        await window.RaizAPI.auth.verificarPermissao('produtos_crud', 'cliente', 'raiz_token_a0000000-0000-0000-0000-000000000001');
      } catch (e) {}
    }
    novoLog = {
      id: Date.now(),
      evento: 'BLOQUEIO_RBAC_403',
      usuario_email: 'ana.beatriz@email.com',
      perfil_atual: 'cliente',
      recurso_alvo: 'DELETE /api/vendedor/produtos/1',
      status_http: 403,
      detalhes: 'Acesso bloqueado (RBAC): O perfil CLIENTE (UC) não pode alterar/excluir produtos do Produtor (UP).',
      data_formatada: `Hoje • ${agora}`
    };
    state.lastRbacTestResult = {
      status: 403,
      title: 'Bloqueio RBAC Confirmado: UC tentando alterar estoque UP (HTTP 403 Forbidden)',
      detail: 'DELETE /api/vendedor/produtos/1 [Role: cliente] -> {"detail": "Acesso bloqueado (RBAC): O perfil \'cliente\' não possui permissão para \'Módulo Vendedor (UP)\'."}'
    };
  } else if (cenario === 'RBAC_UE_ADMIN_403') {
    if (window.RaizAPI) {
      try {
        await window.RaizAPI.auth.verificarPermissao('usuarios_crud', 'entregador', 'raiz_token_c0000000-0000-0000-0000-000000000003');
      } catch (e) {}
    }
    novoLog = {
      id: Date.now(),
      evento: 'BLOQUEIO_RBAC_403',
      usuario_email: 'lucas.motoboy@email.com',
      perfil_atual: 'entregador',
      recurso_alvo: 'GET /api/admin/usuarios',
      status_http: 403,
      detalhes: 'Acesso bloqueado (RBAC): O perfil ENTREGADOR (UE) não possui acesso à gestão de usuários (UA).',
      data_formatada: `Hoje • ${agora}`
    };
    state.lastRbacTestResult = {
      status: 403,
      title: 'Bloqueio RBAC Confirmado: UE tentando acessar Gestão UA (HTTP 403 Forbidden)',
      detail: 'GET /api/admin/usuarios [Role: entregador] -> {"detail": "Acesso bloqueado (RBAC): O perfil \'entregador\' não possui permissão para \'Painel Administrativo (UA)\'."}'
    };
  } else if (cenario === 'AUTH_UA_200') {
    if (window.RaizAPI) {
      try {
        await window.RaizAPI.auth.verificarPermissao('dashboard_admin', 'admin', 'raiz_token_d0000000-0000-0000-0000-000000000004');
      } catch (e) {}
    }
    novoLog = {
      id: Date.now(),
      evento: 'ACESSO_AUTORIZADO_200',
      usuario_email: 'admin@raizmarketplace.com',
      perfil_atual: 'admin',
      recurso_alvo: 'GET /api/admin/dashboard',
      status_http: 200,
      detalhes: 'Token Bearer UA validado com sucesso. Permissão total concedida.',
      data_formatada: `Hoje • ${agora}`
    };
    state.lastRbacTestResult = {
      status: 200,
      title: 'Acesso Autorizado com Sucesso (HTTP 200 OK)',
      detail: 'GET /api/admin/dashboard [Role: admin] -> {"autorizado": true, "perfil": "admin", "recurso": "dashboard_admin"}'
    };
  }

  if (novoLog) {
    state.securityLogs.unshift(novoLog);
    setStorage('admin_security_logs', state.securityLogs);
  }
  if (!window.RaizAPI) state.lastRbacTestResult.title = 'Simulação: ' + state.lastRbacTestResult.title;
  toast(`Exemplo registrado: HTTP ${state.lastRbacTestResult.status}`);
  renderApp();
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

// Inicializa a aplicação
renderApp();
syncFromBackendAPI();

if (window.RaizDB) {
  window.RaizDB.renderDbStatusUI('Painel Admin (UA)');
}

window.addEventListener('raiz:auth-changed', () => {
  renderApp();
});
