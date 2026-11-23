/**
 * RAIZ — Cliente de Integração com PostgreSQL Online (Supabase)
 * Gerencia a conexão com o banco de dados online para Cliente, Vendedor e Entregador.
 */

(function (window) {
  const environment = window.RaizEnvironment || {};
  const sdkUrl = new URL('vendor/supabase-2.119.2.js',document.currentScript.src).href;
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(window.location.hostname);
  const presentationAllowed = environment.allowPresentation === true &&
    (loopback || window.location.protocol === 'file:');
  // Em publicação, parâmetros de URL nunca habilitam apresentação sem login.
  const demo = presentationAllowed && environment.mode === 'presentation' &&
    new URLSearchParams(window.location.search).get('modo') !== 'online';
  const pageRole = window.location.pathname.match(/\/(cliente|vendedor|entregador|admin)\/(?:index\.html)?$/)?.[1];
  const config = Object.freeze({
    url: environment.supabaseUrl || '',
    anonKey: environment.publishableKey || ''
  });
  const STORAGE_KEY_USER = 'raiz_demo_user';
  try { const ref=new URL(config.url).hostname.split('.')[0];localStorage.removeItem('sb-'+ref+'-auth-token'); } catch(_) {}

  let supabaseClient = null;

  async function timedFetch(input, init={}) {
    const controller=new AbortController();
    const forward=()=>controller.abort();
    if(init.signal?.aborted)controller.abort();
    else init.signal?.addEventListener('abort',forward,{once:true});
    const timer=setTimeout(()=>controller.abort(),15000);
    try{return await fetch(input,{...init,signal:controller.signal});}
    finally{clearTimeout(timer);init.signal?.removeEventListener('abort',forward);}
  }

  // Usuários padrão para demonstração instantânea (Mock)
  const DEMO_USERS = {
    cliente: {
      id: 'a0000000-0000-0000-0000-000000000001',
      email: 'ana.beatriz@email.com',
      nome: 'Ana Beatriz',
      role: 'cliente',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&h=120&q=80',
      telefone: '(65) 99654-3210',
      endereco: 'Rua das Flores, 123 • Cáceres - MT'
    },
    vendedor: {
      id: 'b0000000-0000-0000-0000-000000000002',
      email: 'contato@floraverde.com',
      nome: 'Flora Verde (Lojista)',
      role: 'vendedor',
      avatar_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=120&h=120&q=80',
      telefone: '(65) 99888-1122',
      loja_nome: 'Flora Verde Cáceres'
    },
    admin: {
      id: 'd0000000-0000-0000-0000-000000000004',
      email: 'admin@raizmarketplace.com',
      nome: 'Helena Martins',
      role: 'admin',
      telefone: '(65) 99900-0001'
    },
    entregador: {
      id: 'c0000000-0000-0000-0000-000000000003',
      email: 'lucas.motoboy@email.com',
      nome: 'Lucas Motoboy',
      role: 'entregador',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80',
      telefone: '(65) 99876-5432',
      veiculo: 'Honda CG 160 Fan - Placa QRA-4210'
    }
  };

  function isConfigured() {
    // A conexão com o banco independe de exigir login nas telas.
    if (environment.localOnly === true && !loopback) return false;
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url)) return false;
    if (config.anonKey.startsWith('sb_publishable_')) return true;
    // Compatibilidade apenas com JWT público anon; rejeita service_role.
    try {
      const payload = JSON.parse(atob(config.anonKey.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.role === 'anon';
    } catch (_) { return false; }
  }

  function getClient() {
    if (!isConfigured()) return null;
    if (supabaseClient) return supabaseClient;

    if (window.supabase && typeof window.supabase.createClient === 'function') {
      supabaseClient = window.supabase.createClient(config.url, config.anonKey, {global:{fetch:timedFetch},auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:window.sessionStorage,storageKey:'raiz_auth_v4'}});
      return supabaseClient;
    }
    return null;
  }

  function getCurrentUser() {
    if (!demo) return null;
    // O perfil pertence à página, permitindo abrir vários perfis em abas distintas.
    return DEMO_USERS[pageRole] || null;
  }

  async function signOut() {
    sessionStorage.removeItem(STORAGE_KEY_USER);
    if (!demo && getClient()) return getClient().auth.signOut();
    return { error: null };
  }

  async function getClienteProdutos() {
    await window.RaizDB.ready;
    const client = getClient();
    if (!client) return null;
    try {
      const { data, error } = await client
        .from('cliente_produtos')
        .select('*')
        .eq('ativo', true)
        .order('id', { ascending: true })
        .limit(24);
      if (error) {
        console.warn('Erro ao carregar produtos do PostgreSQL:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('Falha na requisição ao Supabase:', err);
      return null;
    }
  }

  function renderDbStatusUI(products) {
    const header = document.getElementById('btnPgHeader');
    if (!header) return;
    header.textContent = products === null ? 'Supabase indisponível' : 'Supabase conectado';
  }

  window.RaizDB = {
    config, isDemo: demo, presentationAllowed, isConfigured, getClient, renderDbStatusUI, renderAuthTopbar,
    get isLocal() { return false; },
    get backendLabel() { return 'Supabase'; },
    auth: { getCurrentUser, signOut },
    cliente: { getProdutos: getClienteProdutos },
  };

  function renderAuthTopbar(container, options = {}) {
    if (!container) return;
    const user = getCurrentUser();
    const role = options.role || (user ? user.role : 'cliente');
    const roleEmoji = { cliente: '🪴', vendedor: '🏪', entregador: '🛵', admin: '⚡' }[role] || '👤';
    const roleLabel = { cliente: 'Cliente', vendedor: 'Lojista', entregador: 'Entregador', admin: 'Admin' }[role] || role;

    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'raiz-auth-widget';
    wrapper.style.cssText = 'display:inline-flex;align-items:center;gap:8px;position:relative;font-family:Inter,system-ui,sans-serif';

    if (user) {
      const avatarHtml = user.avatar_url 
        ? `<img src="${user.avatar_url}" alt="${user.nome}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:2px solid #52B788" />`
        : `<div style="width:34px;height:34px;border-radius:50%;background:#1B4332;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2px solid #52B788">${(user.nome || user.email || 'U').charAt(0).toUpperCase()}</div>`;

      wrapper.innerHTML = `
        <button id="raiz-btn-user-profile" style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.9);border:1px solid #D8E2DC;padding:4px 10px 4px 6px;border-radius:999px;cursor:pointer;transition:all .2s ease;font-size:12px;font-weight:600;color:#1A261E">
          ${avatarHtml}
          <div style="text-align:left;display:flex;flex-direction:column;line-height:1.2">
            <span style="max-width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${user.nome ? user.nome.split(' ')[0] : 'Usuário'}</span>
            <span style="font-size:10px;color:#52B788;font-weight:700">${roleEmoji} ${roleLabel}</span>
          </div>
          <span style="font-size:10px;color:#888;margin-left:2px">▼</span>
        </button>
      `;

      wrapper.querySelector('#raiz-btn-user-profile').onclick = () => showUserModal(user, options.onLogout);
    } else {
      const loginUrl = (options.pathPrefix || '../') + 'login.html?role=' + role;
      wrapper.innerHTML = `
        <a href="${loginUrl}" style="display:inline-flex;align-items:center;gap:6px;background:#1B4332;color:#FFF;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:600;text-decoration:none;box-shadow:0 2px 6px rgba(0,0,0,0.1);transition:background .2s ease">
          <span>🔐</span>
          <span>Entrar / Login</span>
        </a>
      `;
    }

    container.appendChild(wrapper);
  }

  function showUserModal(user, onLogout) {
    const existing = document.getElementById('raiz-user-modal');
    if (existing) existing.remove();

    const roleName = { cliente: 'Cliente Botânico (UC)', vendedor: 'Vendedor / Produtor (UP)', entregador: 'Entregador Parceiro (UE)', admin: 'Administrador (UA)' }[user.role] || user.role;
    const roleEmoji = { cliente: '🪴', vendedor: '🏪', entregador: '🛵', admin: '🛡️' }[user.role] || '👤';

    const modal = document.createElement('div');
    modal.id = 'raiz-user-modal';
    modal.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(3px);
      z-index: 100001;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      font-family: Inter, system-ui, sans-serif;
    `;

    modal.innerHTML = `
      <div style="background:#fff;border-radius:24px;max-width:440px;width:100%;padding:28px;box-shadow:0 24px 48px rgba(0,0,0,0.2);position:relative">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:22px">👤</span>
            <h3 style="margin:0;font-size:18px;color:#1A261E">Conta do Usuário</h3>
          </div>
          <button id="raiz-user-close" style="border:0;background:transparent;font-size:22px;cursor:pointer;color:#888">&times;</button>
        </div>

        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:18px;border-bottom:1px solid #EDF2F7">
          ${user.avatar_url 
            ? `<img src="${user.avatar_url}" alt="${user.nome}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid #52B788" />`
            : `<div style="width:64px;height:64px;border-radius:50%;background:#1B4332;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;border:3px solid #52B788">${(user.nome || 'U').charAt(0).toUpperCase()}</div>`
          }
          <div>
            <h4 style="margin:0 0 4px;font-size:16px;color:#1A261E">${user.nome || 'Usuário RAIZ'}</h4>
            <div style="font-size:12px;color:#718096;margin-bottom:6px">${user.email}</div>
            <span style="display:inline-block;background:#E8F5E9;color:#1B4332;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700">
              ${roleEmoji} ${roleName}
            </span>
          </div>
        </div>

        <div style="margin-bottom:20px;font-size:13px;color:#4A5568;display:grid;gap:8px">
          <div><strong>ID:</strong> <code style="font-size:11px;background:#F7FAFC;padding:2px 6px;border-radius:4px">${user.id ? user.id.substring(0, 18) + '...' : 'Local'}</code></div>
          ${user.telefone ? `<div><strong>Telefone:</strong> ${user.telefone}</div>` : ''}
          ${user.endereco ? `<div><strong>Endereço:</strong> ${user.endereco}</div>` : ''}
          ${user.loja_nome ? `<div><strong>Loja Vinculada:</strong> ${user.loja_nome}</div>` : ''}
          ${user.veiculo ? `<div><strong>Veículo:</strong> ${user.veiculo}</div>` : ''}
          <div><strong>Status:</strong> <span style="color:#38A169;font-weight:600">● Apresentação sem login</span></div>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button id="raiz-user-logout" style="flex:1;padding:12px;border:1px solid #FEB2B2;background:#FFF5F5;color:#E53E3E;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer">
            🚪 Sair / Desconectar
          </button>
          <a href="../index.html" style="padding:12px 18px;border:1px solid #CBD5E0;background:#F7FAFC;color:#4A5568;border-radius:12px;font-size:13px;font-weight:600;text-decoration:none;display:inline-flex;align-items:center">
            Central de Apps
          </a>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('raiz-user-close').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    document.getElementById('raiz-user-logout').onclick = async () => {
      await signOut();
      modal.remove();
      if (typeof onLogout === 'function') {
        onLogout();
      } else {
        window.location.href = '../index.html';
      }
    };
  }

  // O Supabase permanece conectado também durante a apresentação sem login.
  window.RaizDB.ready = (async () => {
    // A apresentação local independe do SDK externo e nunca envia seus exemplos.
    const source = new URLSearchParams(location.search).get('fonte') || localStorage.getItem('raiz_fonte') || 'local';
    if (demo && source === 'local') return null;
    if (!isConfigured()) return null;
    if (window.supabase) return getClient();
    return new Promise(resolve => {
      const script = document.createElement('script');
      script.src = sdkUrl;
      script.onload = () => resolve(getClient());
      script.onerror = () => resolve(null);
      document.head.append(script);
    });
  })();

})(window);
