/* RAIZ — App do Entregador (JavaScript) */

const logoSVG = `<svg class="logo-mark" viewBox="0 0 64 64" aria-hidden="true"><path d="M31 51C22 37 15 28 5 18c11-2 22 1 28 9 2 4 2 9-2 24Z" fill="#2D6A4F"/><path d="M33 50c1-19 5-31 20-39 3 13 0 24-7 30-4 4-8 6-13 9Z" fill="#52B788"/><path d="M31 27v29" stroke="#1B4332" stroke-width="3.4" stroke-linecap="round"/></svg><span>RAIZ</span>`;

const productSeed = [
  {id:1, name:'Costela de Adão', category:'plantas', seller:'Flora Verde', emoji:'🌿', fragile:true, size:'Médio porte'},
  {id:2, name:'Zamioculca', category:'plantas', seller:'Flora Verde', emoji:'🌱', fragile:true, size:'Pequeno porte'},
  {id:3, name:'Lírio da Paz', category:'plantas', seller:'Casa Botânica', emoji:'🌾', fragile:true, size:'Médio porte'},
  {id:4, name:'Jiboia', category:'plantas', seller:'Verde Vivo', emoji:'🍃', fragile:true, size:'Pequeno porte'},
  {id:5, name:'Vaso de Cerâmica', category:'vasos', seller:'Ateliê Terra', emoji:'🏺', fragile:true, size:'Médio porte'},
  {id:6, name:'Substrato Orgânico', category:'insumos', seller:'Raiz Forte', emoji:'🧺', fragile:false, size:'Pacote 2 kg'},
  {id:7, name:'Kit de Jardinagem', category:'ferramentas', seller:'Jardim & Cia', emoji:'🧰', fragile:false, size:'Kit compacto'},
  {id:8, name:'Cachepô Natural', category:'vasos', seller:'Ateliê Terra', emoji:'🪴', fragile:true, size:'Médio porte'}
];

const deliverySeed = [
  {id:5842, distance:'2,1 km', value:12.50, pickup:'Floricultura Verde Vida', pickupAddress:'Rua das Flores, 123 • Cáceres - MT', drop:'Jardim Primavera', dropAddress:'Rua Ipê, 456 • Cáceres - MT', item:'Costela de Adão', productId:1, fragile:true, size:'Médio porte', note:'Manter a planta em pé e evitar exposição direta ao sol.'},
  {id:5841, distance:'4,8 km', value:18.90, pickup:'Viveiro Raízes', pickupAddress:'Av. Getúlio Vargas, 321 • Cáceres - MT', drop:'Centro', dropAddress:'Rua Cuiabá, 789 • Cáceres - MT', item:'Zamioculca', productId:2, fragile:true, size:'Pequeno porte', note:'Transportar o vaso em posição estável e sem pressionar a folhagem.'},
  {id:5839, distance:'3,6 km', value:15.00, pickup:'Casa Botânica', pickupAddress:'Rua Tiradentes, 119 • Cáceres - MT', drop:'Jardim Guanabara', dropAddress:'Rua 13 de Junho, 402 • Cáceres - MT', item:'Substrato Orgânico', productId:6, fragile:false, size:'Pacote 2 kg', note:'Conferir se a embalagem está lacrada antes da coleta.'}
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
  courierOnline: getStorage('courier_online', true),
  deliveries: isRealUser ? getStorage('deliveries', []) : getStorage('deliveries', structuredClone(deliverySeed)),
  deliveryHistory: isRealUser ? getStorage('delivery_history', []) : getStorage('delivery_history', [
    {id:5837, value:9.50, status:'Cancelada', date:'Ontem, 10:10'},
    {id:5835, value:22.00, status:'Concluída', date:'12/09/2026'}
  ]),
  currentDelivery: getStorage('current_delivery', null),
  deliveryStep: getStorage('delivery_step', 0),
  wallet: isRealUser ? getStorage('courier_wallet', 0.00) : getStorage('courier_wallet', 245.30),
  todayDeliveries: getStorage('today_deliveries', 0),
  todayEarnings: getStorage('today_earnings', 0.00),
  deliveryFilter: 'todas',
  historyFilter: 'todas'
};

if (!isRealUser && (!state.deliveries || !state.deliveries.length) && window.RaizPresentation?.source !== 'real') {
  state.deliveries = structuredClone(deliverySeed);
  setStorage('deliveries', state.deliveries);
}

const courierNavItems = [
  ['home', '⌂', 'Início'],
  ['deliveries', '▣', 'Entregas'],
  ['activeDelivery', '⌖', 'Mapa'],
  ['history', '◷', 'Histórico'],
  ['wallet', '💰', 'Carteira']
];

function money(v) {
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
}

function productById(id) {
  return productSeed.find(p => p.id === Number(id)) || { emoji: '📦', name: 'Item Botânico' };
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
    home: 'Painel do Entregador',
    deliveries: 'Entregas Disponíveis',
    activeDelivery: 'Entrega em Andamento',
    history: 'Histórico de Entregas',
    wallet: 'Minha Carteira'
  };
  return all[state.page] || 'RAIZ Entregador';
}

function go(page) {
  state.page = page;
  renderApp();
  window.scrollTo(0, 0);
}

function entregadorNavIcon(page) {
  const paths={home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-8h6v8"/>',products:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16M15 10v10"/>',sellerOrders:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6"/>',store:'<path d="M3 10h18l-2-6H5z"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>',stats:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',deliveries:'<path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',activeDelivery:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',history:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',wallet:'<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 9h18M16 15h2M7 6V4h10v2"/>',dashboard:'<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="5" rx="1"/><rect x="13" y="10" width="8" height="11" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/>',users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5"/>',catalog:'<path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="9"/>',disputes:'<path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v4M12 17h.01"/>',security:'<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>'};
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[page]||paths.home}</svg>`;
}

function renderApp() {
  const appContainer = document.getElementById('appView');
  const title = pageTitle();
  const availableCount = state.deliveries.length;

  appContainer.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" aria-label="Menu principal">
        <a class="logo" href="#home" onclick="go('home')">${logoSVG}</a>
        
        <p class="sidebar-caption">Área do entregador</p>

        <nav class="side-nav" aria-label="Navegação principal">
          ${courierNavItems.map(([p, i, l]) => `
            <button class="nav-btn ${state.page === p ? 'active' : ''}" aria-current="${state.page === p ? 'page' : 'false'}" onclick="go('${p}')">
              <span class="nav-icon">${entregadorNavIcon(p)}</span>${l}
              ${p === 'deliveries' && state.courierOnline && availableCount > 0 ? `
                <span class="badge green" style="margin-left:auto;padding:2px 7px;font-size:.7rem">${availableCount}</span>
              ` : ''}
              ${p === 'activeDelivery' && state.currentDelivery ? `
                <span class="badge blue" style="margin-left:auto;padding:2px 7px;font-size:.7rem">Em rota</span>
              ` : ''}
            </button>
          `).join('')}
        </nav>

        <div class="sidebar-foot">
          <div class="hub-tag">
            <span>🌿</span>
            <span>Entregas Seguras</span>
          </div>
          <a class="sidebar-about" href="../index.html"><span class="nav-icon">ⓘ</span><span>Sobre a RAIZ</span></a>
        </div>
      </aside>

      <main class="main">
        <header class="topbar">
          <div>
            <h2>${title}</h2>
            <div class="tiny muted">RAIZ • Logística Botânica</div>
          </div>
          <div class="top-actions">
            <div id="topAuthContainer"></div>
            <label class="row" style="background:var(--card);padding:6px 12px;border:1px solid var(--border);border-radius:14px;cursor:pointer">
              <span class="small" style="font-weight:750">${state.courierOnline ? 'Online' : 'Offline'}</span>
              <span class="switch" style="width:40px;height:24px;margin-left:6px">
                <input type="checkbox" ${state.courierOnline ? 'checked' : ''} onchange="toggleCourier(this.checked)">
                <span class="slider" style="border-radius:999px"></span>
              </span>
            </label>
            <button class="icon-btn" onclick="toast('Nenhum alerta de rota no momento')" title="Notificações">🔔</button>
            <a class="icon-btn mobile-only" href="../index.html" title="Voltar ao portal">↩</a>
          </div>
        </header>

        <div class="app-content" id="pageContent"></div>
      </main>
    </div>

    <nav class="bottom-nav">
      ${courierNavItems.map(([p, i, l]) => `
        <button class="nav-btn ${state.page === p ? 'active' : ''}" aria-current="${state.page === p ? 'page' : 'false'}" onclick="go('${p}')">
          <span class="nav-icon">${entregadorNavIcon(p)}</span>
          <span>${l}</span>
        </button>
      `).join('')}
    </nav>
  `;

  if (window.RaizDB && window.RaizDB.renderAuthTopbar) {
    window.RaizDB.renderAuthTopbar(document.getElementById('topAuthContainer'), { role: 'entregador' });
  }

  renderPage();
  window.RaizPartnerDesign?.prepare();
}

function renderPage() {
  const c = document.getElementById('pageContent');
  if (!c) return;

  if (state.page === 'home') {
    const user = window.RaizDB?.auth?.getCurrentUser() || { nome: 'Lucas Motoboy' };
    c.innerHTML = `
      <div class="page-title">
        <div>
          <h1>Olá, ${user.nome ? user.nome.split(' ')[0] : 'Entregador'}!</h1>
          <p>Você está ${state.courierOnline ? 'online e apto a receber novas chamadas de entrega.' : 'offline no momento. Fique online para visualizar corridas.'}</p>
        </div>
      </div>

      <section class="partner-hero" aria-labelledby="courier-welcome">
        <div class="partner-hero-copy">
        <span class="eyebrow">Conectando jardins e pessoas</span><br>
        <span class="badge ${state.courierOnline ? 'green' : 'orange'}">
          ${state.courierOnline ? '● Conectado à Rede' : '○ Disponibilidade Pausada'}
        </span>
        <h2 id="courier-welcome">
          ${state.courierOnline ? 'Novas entregas disponíveis na sua área!' : 'Conecte-se para começar a faturar'}
        </h2>
        <p>
          ${state.courierOnline ? 'Consulte as rotas botânicas disponíveis e escolha as melhores oportunidades de Cáceres - MT.' : 'Ative seu status para receber oportunidades próximas com cuidados especiais de plantas.'}
        </p>
        <button class="btn btn-primary" onclick="${state.courierOnline ? "go('deliveries')" : 'toggleCourier(true)'}">
          ${state.courierOnline ? 'Ver entregas disponíveis' : '✓ Ficar online agora'}
        </button>
        </div>
        <img src="../assets/vitrine-botanica.webp" alt="Composição ilustrativa de plantas prontas para um novo lar" width="720" height="640">
      </section>

      <div class="grid-3" style="margin-top:18px">
        <div class="card metric">
          <div class="label">Entregas Realizadas Hoje</div>
          <div class="value">${state.todayDeliveries}</div>
          <div class="small muted" style="margin-top:4px">Meta diária: 5 entregas</div>
        </div>
        <div class="card metric">
          <div class="label">Ganhos de Hoje</div>
          <div class="value" style="color:var(--green)">${money(state.todayEarnings)}</div>
          <div class="small muted" style="margin-top:4px">Sem taxas ocultas</div>
        </div>
        <div class="card metric">
          <div class="label">Saldo em Carteira</div>
          <div class="value">${money(state.wallet)}</div>
          <button class="small" style="background:none;border:none;color:var(--deep);font-weight:bold;padding:0;margin-top:4px;cursor:pointer" onclick="go('wallet')">
            Ver detalhes da carteira
          </button>
        </div>
      </div>

      ${state.currentDelivery ? `
        <div class="card" style="margin-top:18px;border-color:var(--sage);background:linear-gradient(180deg,#fff,#F4FBF6)">
          <div class="row space">
            <div>
              <span class="badge blue">Corrida em Andamento</span>
              <h3 style="margin:8px 0 2px">Entrega #${state.currentDelivery.id} — ${money(state.currentDelivery.value)}</h3>
              <div class="small muted">Item: ${state.currentDelivery.item} (${state.currentDelivery.pickup} ➔ ${state.currentDelivery.drop})</div>
            </div>
            <button class="btn btn-primary" onclick="go('activeDelivery')">Acessar rota ativa</button>
          </div>
        </div>
      ` : ''}
    `;
    return;
  }

  if (state.page === 'deliveries') {
    c.innerHTML = deliveriesPage();
    return;
  }

  if (state.page === 'activeDelivery') {
    c.innerHTML = activeDeliveryPage();
    return;
  }

  if (state.page === 'history') {
    c.innerHTML = historyPage();
    return;
  }

  if (state.page === 'wallet') {
    c.innerHTML = walletPage();
    return;
  }
}

function toggleCourier(v) {
  state.courierOnline = typeof v === 'boolean' ? v : !state.courierOnline;
  setStorage('courier_online', state.courierOnline);
  if (state.courierOnline && state.page === 'home') {
    state.page = 'deliveries';
  }
  renderApp();
  toast(state.courierOnline ? 'Você está ONLINE e recebendo entregas' : 'Você ficou OFFLINE');
}

function deliveriesPage() {
  if (!state.courierOnline) {
    return `
      <div class="empty">
        <div class="big">🛵</div>
        <h3>Você está offline</h3>
        <p>Ative sua disponibilidade para receber corridas botânicas e visualizar o valor de cada entrega.</p>
        <button class="btn btn-primary" onclick="toggleCourier(true)" style="margin-top:10px">Ficar online agora</button>
      </div>
    `;
  }

  let list = state.deliveries;
  if (state.deliveryFilter === 'proximas') {
    list = [...state.deliveries].sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
  } else if (state.deliveryFilter === 'melhor_valor') {
    list = [...state.deliveries].sort((a, b) => b.value - a.value);
  }

  return `
    <div class="page-title">
      <div>
        <h1>Entregas Disponíveis</h1>
        <p>Confira distância, valor do frete, cuidados botânicos e pontos de coleta.</p>
      </div>
      <span class="badge green">● Conectado em Cáceres - MT</span>
    </div>

    <div class="filter-line">
      <button class="chip ${state.deliveryFilter === 'todas' ? 'active' : ''}" onclick="setDeliveryFilter('todas')">
        Todas (${state.deliveries.length})
      </button>
      <button class="chip ${state.deliveryFilter === 'proximas' ? 'active' : ''}" onclick="setDeliveryFilter('proximas')">
        Mais próximas
      </button>
      <button class="chip ${state.deliveryFilter === 'melhor_valor' ? 'active' : ''}" onclick="setDeliveryFilter('melhor_valor')">
        Melhor valor
      </button>
    </div>

    ${list.length ? `
      <div class="grid-2">
        ${list.map(d => `
          <div class="card">
            <div class="row space">
              <strong>📍 Distância total: ${d.distance}</strong>
              <strong class="money" style="font-size:1.25rem">${money(d.value)}</strong>
            </div>
            <div class="divider"></div>
            <div class="small">
              <strong style="color:var(--deep)">🟢 Coleta: ${d.pickup}</strong>
              <div class="muted">${d.pickupAddress}</div>
            </div>
            <div class="small" style="margin-top:10px">
              <strong style="color:#C62828">🔴 Entrega: ${d.drop}</strong>
              <div class="muted">${d.dropAddress}</div>
            </div>
            <div class="row wrap" style="margin-top:14px">
              <span class="badge gray">📦 ${d.item}</span>
              ${d.fragile ? '<span class="badge orange">⚠ Espécie Frágil</span>' : ''}
              <span class="badge gray">${d.size}</span>
            </div>
            <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="openDeliveryDetail(${d.id})">
              Ver detalhes e rota
            </button>
          </div>
        `).join('')}
      </div>
    ` : `
      <div class="empty">
        <div class="big">📦</div>
        <h3>Nenhuma entrega disponível no momento</h3>
        <p>Aguarde novos pedidos de clientes ou volte ao painel inicial.</p>
      </div>
    `}
  `;
}

function setDeliveryFilter(f) {
  state.deliveryFilter = f;
  renderPage();
}

function openDeliveryDetail(id) {
  const d = state.deliveries.find(x => x.id === id);
  if (!d) return;

  const prod = productById(d.productId);

  openModal(`
    <div class="modal-head">
      <div>
        <h2>Detalhes da Entrega</h2>
        <div class="small muted">Corrida #${d.id} • ${d.distance}</div>
      </div>
      <button class="icon-btn" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="row space">
        <strong>Remuneração da Corrida</strong>
        <strong class="money" style="font-size:1.4rem;color:var(--green)">${money(d.value)}</strong>
      </div>
      <div class="divider"></div>
      
      <div class="timeline">
        <div class="timeline-step current">
          <div class="timeline-marker">
            <div class="timeline-dot">1</div>
            <div class="timeline-line"></div>
          </div>
          <div class="timeline-copy">
            <strong>Coleta: ${d.pickup}</strong>
            <small>${d.pickupAddress}</small>
          </div>
        </div>
        <div class="timeline-step">
          <div class="timeline-marker">
            <div class="timeline-dot">2</div>
            <div class="timeline-line"></div>
          </div>
          <div class="timeline-copy">
            <strong>Destino do Cliente: ${d.drop}</strong>
            <small>${d.dropAddress}</small>
          </div>
        </div>
      </div>

      <h3 style="margin:16px 0 8px">Item para Transporte</h3>
      <div class="list-item">
        <div class="thumb">${prod.emoji}</div>
        <div class="list-main">
          <strong>${d.item}</strong>
          <small>Volume: 1 unidade • ${d.size}</small>
        </div>
        ${d.fragile ? '<span class="badge orange">⚠ Cuidado com Folhas e Vasos</span>' : ''}
      </div>

      <h3 style="margin:16px 0 8px">Instruções de Transporte Seguro</h3>
      <div class="card soft">
        <div class="small">🌱 <strong>Orientações:</strong> ${d.note}</div>
      </div>

      <button class="btn btn-primary btn-block" style="margin-top:20px" onclick="acceptDelivery(${d.id})">
        Aceitar esta entrega por ${money(d.value)}
      </button>
    </div>
  `);
}

function acceptDelivery(id) {
  state.deliveries=getStorage('deliveries',state.deliveries);
  const d = state.deliveries.find(x => x.id === id);
  if (!d) return;
  const order=getStorage('orders',[]).find(o=>o.id===id);
  if(order?.paymentId && (RaizPaymentFlow.transaction(id)?.state!=='paid' || order.status!=='Em preparo')) {
    toast('Pagamento e preparo precisam estar confirmados para esta entrega.');return;
  }

  state.currentDelivery = d;
  state.deliveryStep = 0;
  state.deliveries = state.deliveries.filter(x => x.id !== id);

  setStorage('current_delivery', state.currentDelivery);
  setStorage('delivery_step', 0);
  setStorage('deliveries', state.deliveries);

  closeModal();
  state.page = 'activeDelivery';
  renderApp();
  toast('Corrida aceita! Siga para o ponto de coleta.');
}

function activeDeliveryPage() {
  const d = state.currentDelivery;
  if (!d) {
    return `
      <div class="empty">
        <div class="big">🗺️</div>
        <h3>Nenhuma entrega em andamento</h3>
        <p>Aceite uma oportunidade disponível para acompanhar o trajeto no mapa.</p>
        <button class="btn btn-primary" onclick="go('deliveries')" style="margin-top:12px">
          Ver entregas disponíveis
        </button>
      </div>
    `;
  }

  const prod = productById(d.productId);
  const stepTitles = [
    'Siga para o ponto de coleta na floricultura.',
    'Item coletado com sucesso. Siga para a entrega do cliente.',
    'Entrega finalizada com sucesso! Ganhos creditados.'
  ];

  return `
    <div class="page-title">
      <div>
        <h1>Entrega em Rota #${d.id}</h1>
        <p>${stepTitles[state.deliveryStep] || 'Acompanhe as instruções.'}</p>
      </div>
      <strong class="money" style="font-size:1.35rem;color:var(--green)">${money(d.value)}</strong>
    </div>

    <div class="grid-2">
      <div class="card">
        ${RaizMaps.panel(d.pickupAddress,d.dropAddress,state.deliveryStep)}
      </div>

      <div class="card">
        <h3 style="margin-top:0">Progresso da Rota</h3>
        ${deliveryTimeline(d)}

        <div class="divider"></div>

        <div class="small muted" style="margin-bottom:12px">
          Item: <strong>${d.item}</strong> (${d.fragile ? '⚠ Item frágil' : 'Padrão'})
        </div>

        ${state.deliveryStep === 0 ? `
          <button class="btn btn-primary btn-block" onclick="confirmPickup()">
            Confirmar coleta na loja
          </button>
        ` : state.deliveryStep === 1 ? `
          <button class="btn btn-primary btn-block" onclick="confirmDropoff()">
            Confirmar entrega ao cliente
          </button>
        ` : `
          <div class="card soft" style="text-align:center">
            <div class="success-icon" style="width:55px;height:55px;font-size:1.4rem">✓</div>
            <strong>Entrega Concluída com Sucesso!</strong>
            <div class="money" style="font-size:1.3rem;margin-top:7px;color:var(--green)">+ ${money(d.value)}</div>
            <button class="btn btn-outline btn-block" style="margin-top:12px" onclick="clearCurrentDelivery()">
              Voltar para novas entregas
            </button>
          </div>
        `}
      </div>
    </div>
  `;
}

function deliveryTimeline(d) {
  const labels = [
    ['Ponto de Coleta', `${d.pickup} • ${d.pickupAddress}`],
    ['Em Deslocamento', 'Em trânsito com segurança botânica até o destino'],
    ['Destino do Cliente', `${d.drop} • ${d.dropAddress}`]
  ];
  return `
    <div class="timeline">
      ${labels.map((x, i) => `
        <div class="timeline-step ${i < state.deliveryStep ? 'done' : i === state.deliveryStep ? 'current' : ''}">
          <div class="timeline-marker">
            <div class="timeline-dot">${i < state.deliveryStep ? '✓' : ''}</div>
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

function confirmPickup() {
  const d = state.currentDelivery;
  const prod = productById(d.productId);

  openModal(`
    <div class="modal-head">
      <h2>Confirmação de Coleta na Loja</h2>
      <button class="icon-btn" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="card" style="height:150px;background:linear-gradient(150deg,#EBF7EE,#D8EBDD);display:grid;place-items:center;font-size:4rem">
        🏪
      </div>
      <h3 style="margin:12px 0 2px">${d.pickup}</h3>
      <div class="small muted">${d.pickupAddress}</div>

      <h3 style="margin:16px 0 6px">Itens para Coletar</h3>
      <div class="list-item">
        <div class="thumb">${prod.emoji}</div>
        <div class="list-main">
          <strong>${d.item}</strong>
          <small>Volume: 1 unidade • ${d.size}</small>
        </div>
        ${d.fragile ? '<span class="badge orange">⚠ Frágil</span>' : ''}
      </div>

      <div class="card soft" style="margin-top:14px">
        <label class="row" style="cursor:pointer">
          <input id="pickupCheck" type="checkbox" style="width:20px;height:20px">
          <span class="small"><strong>Checklist:</strong> Confirmo que conferi o vaso/planta e que o item está íntegro e embalado adequadamente.</span>
        </label>
      </div>

      <button class="btn btn-primary btn-block" style="margin-top:18px" onclick="finishPickup()">
        Confirmar coleta e iniciar rota
      </button>
    </div>
  `);
}

function finishPickup() {
  const chk = document.getElementById('pickupCheck');
  if (!chk || !chk.checked) {
    toast('Marque a confirmação de conferência das plantas');
    return;
  }

  state.deliveryStep = 1;
  setStorage('delivery_step', 1);

  updateDemoOrder(state.currentDelivery?.id, 2, 'Em transporte', 'Enviado');

  closeModal();
  renderPage();
  toast('Coleta confirmada! Siga com cuidado para o cliente.');
}

function confirmDropoff() {
  const d = state.currentDelivery;
  const prod = productById(d.productId);

  openModal(`
    <div class="modal-head">
      <h2>Confirmação de Entrega ao Cliente</h2>
      <button class="icon-btn" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="card soft">
        <strong>🔴 Destino: ${d.drop}</strong>
        <div class="small muted" style="margin-top:3px">${d.dropAddress}</div>
      </div>

      <h3 style="margin:16px 0 6px">Item Entregue</h3>
      <div class="list-item">
        <div class="thumb">${prod.emoji}</div>
        <div class="list-main">
          <strong>${d.item}</strong>
          <small>1 unidade entregue</small>
        </div>
      </div>

      <div class="card soft" style="margin-top:14px">
        <label class="row" style="cursor:pointer">
          <input id="dropCheck" type="checkbox" style="width:20px;height:20px">
          <span class="small"><strong>Checklist:</strong> Confirmo que o cliente ou responsável recebeu o pedido botânico em mãos.</span>
        </label>
      </div>

      <button class="btn btn-primary btn-block" style="margin-top:18px" onclick="finishDropoff()">
        Finalizar entrega e receber ${money(d.value)}
      </button>
    </div>
  `);
}

function finishDropoff() {
  if (!state.currentDelivery || state.deliveryStep !== 1) {
    toast('Confirme a coleta antes da entrega. Uma entrega só pode ser concluída uma vez.');
    return;
  }
  const chk = document.getElementById('dropCheck');
  if (!chk || !chk.checked) {
    toast('Marque a confirmação de recebimento do cliente');
    return;
  }

  const d = state.currentDelivery;
  state.deliveryStep = 2;
  state.wallet += d.value;
  state.todayDeliveries += 1;
  state.todayEarnings += d.value;

  state.deliveryHistory.unshift({
    id: d.id,
    value: d.value,
    status: 'Concluída',
    date: 'Hoje, agora'
  });

  setStorage('delivery_step', 2);
  setStorage('courier_wallet', state.wallet);
  setStorage('today_deliveries', state.todayDeliveries);
  setStorage('today_earnings', state.todayEarnings);
  setStorage('delivery_history', state.deliveryHistory);

  updateDemoOrder(d.id, 3, 'Entregue', 'Entregue');

  closeModal();
  renderPage();
  toast(`Entrega simulada concluída. + ${money(d.value)} no saldo demonstrativo.`);
}

function updateDemoOrder(id, step, clientStatus, sellerStatus) {
  if (!id) return;
  const activeOrder = getStorage('client_active_order', null);
  if (activeOrder?.id === id) {
    setStorage('client_active_order', { ...activeOrder, step, status: clientStatus });
  }
  const orders = getStorage('orders', []);
  const sellerOrder = orders.find(order => order.id === id);
  if (sellerOrder) {
    sellerOrder.status = sellerStatus;
    sellerOrder.step = step;
    setStorage('orders', orders);
  }
}

function clearCurrentDelivery() {
  state.currentDelivery = null;
  state.deliveryStep = 0;
  setStorage('current_delivery', null);
  setStorage('delivery_step', 0);
  go('deliveries');
}

function historyPage() {
  let list = state.deliveryHistory;
  if (state.historyFilter === 'concluidas') list = state.deliveryHistory.filter(x => x.status === 'Concluída');
  if (state.historyFilter === 'canceladas') list = state.deliveryHistory.filter(x => x.status === 'Cancelada');

  return `
    <div class="page-title">
      <div>
        <h1>Histórico de Entregas</h1>
        <p>Acompanhe todos os serviços finalizados e cancelados na sua conta.</p>
      </div>
    </div>

    <div class="filter-line">
      <button class="chip ${state.historyFilter === 'todas' ? 'active' : ''}" onclick="setHistoryFilter('todas')">
        Todas (${state.deliveryHistory.length})
      </button>
      <button class="chip ${state.historyFilter === 'concluidas' ? 'active' : ''}" onclick="setHistoryFilter('concluidas')">
        Concluídas (${state.deliveryHistory.filter(x => x.status === 'Concluída').length})
      </button>
      <button class="chip ${state.historyFilter === 'canceladas' ? 'active' : ''}" onclick="setHistoryFilter('canceladas')">
        Canceladas (${state.deliveryHistory.filter(x => x.status === 'Cancelada').length})
      </button>
    </div>

    <div class="card">
      <div class="list">
        ${list.length ? list.map(x => `
          <div class="list-item">
            <div class="thumb" style="color:var(--deep)">🛵</div>
            <div class="list-main">
              <strong>Corrida #${x.id}</strong>
              <small>${x.date}</small>
            </div>
            <strong class="money">${money(x.value)}</strong>
            <span class="badge ${x.status === 'Concluída' ? 'green' : 'red'}">${x.status}</span>
          </div>
        `).join('') : `
          <div class="empty">
            <div class="big">📋</div>
            Nenhum registro encontrado no histórico.
          </div>
        `}
      </div>
    </div>
  `;
}

function setHistoryFilter(f) {
  state.historyFilter = f;
  renderPage();
}

function walletPage() {
  if (window.RaizPresentation?.source === 'real') {
    return `<div class="page-title"><div><h1>Minha Carteira</h1><p>Consulta consolidada dos saldos e do histórico no Supabase. Sem operações financeiras.</p></div></div>
      <div class="card metric"><div class="label">Saldos registrados</div><div class="value">${money(state.wallet)}</div></div>
      <div class="card" style="margin-top:18px"><h3>Histórico consultado</h3>${state.deliveryHistory.map(h => `<p>Entrega #${Number(h.id)} · ${money(h.value)} · ${String(h.status).replace(/[<>]/g,'')}</p>`).join('') || '<p>Nenhuma entrega registrada.</p>'}</div>`;
  }
  const vals = [24, 42, 35, 58, 48, 70, 62];
  const completed = state.deliveryHistory.filter(x => x.status === 'Concluída');

  return `
    <div class="page-title">
      <div>
        <h1>Minha Carteira</h1>
        <p>Saldo e preferências de exemplo neste navegador. Nenhuma operação bancária.</p>
      </div>
    </div>

    <div class="grid-2">
      <div class="card" style="background:linear-gradient(135deg,var(--deep),#40916C);color:white">
        <div class="small" style="color:#D8F3DC">Saldo demonstrativo</div>
        <div style="font-size:2.3rem;font-weight:950;margin-top:6px">${money(state.wallet)}</div>
        <p class="small" style="color:#E8F5E9;margin-top:6px">Somente exemplos. Nenhuma transferência bancária é realizada.</p>
        ${RaizPresentation.source==='local'?`<label for="withdrawAmount">Valor do saque de exemplo</label><input id="withdrawAmount" class="input" inputmode="decimal" placeholder="0,00" autocomplete="off"><button class="btn" style="background:#fff;color:var(--deep);margin-top:14px" onclick="simulateWithdrawal()">Simular saque Pix</button>`:''}
      </div>

      <div class="card">
        <div class="row space">
          <h3 style="margin:0">Ganhos da Semana (exemplo)</h3>
          <span class="money" style="color:var(--green)">R$ 98,40</span>
        </div>
        <div class="stat-bars">
          ${vals.map((v, i) => `
            <div class="bar-col" title="Ganhos: R$ ${(v * 2.2).toFixed(2)}">
              <div class="bar" style="height:${v}px"></div>
              <span>${['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][i]}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    ${RaizPresentation.source==='local'?RaizPayments.pixForm('entregador'):''}

    ${RaizPresentation.source==='local'?`<section class="card payment-settings"><h3>Saques demonstrativos registrados</h3>${getStorage('courier_withdrawals',[]).map(w=>`<p>${money(w.amount)} · ${String(w.date).slice(0,10)} · Simulado, sem transferência</p>`).join('') || '<p>Nenhum saque de exemplo registrado.</p>'}</section>`:''}

    <div class="card" style="margin-top:18px">
      <h3 style="margin-top:0">Últimas Transações Recebidas</h3>
      <div class="list">
        ${completed.length ? completed.map(x => `
          <div class="list-item">
            <div class="thumb" style="color:var(--green)">✓</div>
            <div class="list-main">
              <strong>Pagamento por Entrega #${x.id}</strong>
              <small>${x.date} • Crédito demonstrativo, sem transferência bancária</small>
            </div>
            <strong style="color:var(--green);font-size:1.1rem">+ ${money(x.value)}</strong>
          </div>
        `).join('') : `
          <div class="empty">Nenhuma transação concluída ainda.</div>
        `}
      </div>
    </div>
  `;
}

function savePixPreference() {try {RaizPayments.savePix('entregador',document.getElementById('pixType').value,document.getElementById('pixValue').value);renderApp();toast('Chave de exemplo salva localmente.');}catch(error){toast(error.message);}}
function removePixPreference() {try {RaizPayments.removePix('entregador');renderApp();toast('Chave de exemplo removida.');}catch(error){toast(error.message);}}
function simulateWithdrawal() {
  try {
    if(RaizPresentation.source!=='local') throw new Error('Saque demonstrativo disponível somente nos exemplos locais.');
    const key=RaizPayments.pix('entregador');
    if(!key) throw new Error('Cadastre uma chave Pix de exemplo antes de simular.');
    RaizPayments.validatePix(key.type,key.value);
    const text=document.getElementById('withdrawAmount').value.trim();
    if(!/^\d+(?:[.,]\d{1,2})?$/.test(text)) throw new Error('Informe um valor positivo com até duas casas decimais.');
    const cents=Math.round(Number(text.replace(',','.'))*100);
    const balance=Math.round(state.wallet*100);
    if(!Number.isSafeInteger(cents) || cents<=0 || cents>balance) throw new Error('Valor inválido ou superior ao saldo demonstrativo.');
    state.wallet=(balance-cents)/100;
    const withdrawals=getStorage('courier_withdrawals',[]);
    withdrawals.unshift({id:crypto.randomUUID(),amount:cents/100,date:new Date().toISOString(),simulated:true});
    setStorage('courier_wallet',state.wallet);
    setStorage('courier_withdrawals',withdrawals);
    renderApp();toast('Saque de exemplo registrado. Nenhum dinheiro foi transferido.');
  } catch(error) {toast(error.message);}
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
