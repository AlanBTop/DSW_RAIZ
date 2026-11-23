(() => {
  const accessScript = document.currentScript.src;
  const demoRoles = ['cliente', 'vendedor', 'entregador', 'admin'];
  const labels = { cliente: 'Cliente', vendedor: 'Vendedor', entregador: 'Entregador', admin: 'Administrador' };
  const file = role => role + '/index.html?modo=online';
  const login = role => '../login.html?role=' + role + '&modo=online';

  function client() {
    if (location.protocol === 'file:') throw new Error('Inicie o site pelo INICIAR_PROJETO.bat e acesse http://localhost:3000/.');
    const db = window.RaizDB.getClient();
    if (!db) throw new Error('O serviço de autenticação está indisponível. Verifique a conexão.');
    return db;
  }

  function callback(role) {
    if (!Object.hasOwn(labels, role)) throw new Error('Perfil inválido.');
    return new URL('login.html?role=' + role + '&modo=online', new URL('../',accessScript)).href;
  }

  function authError(error) {
    if(!navigator.onLine) return 'Sem conexão. Confira sua internet e tente novamente.';
    if(error?.name==='AbortError' || /timeout|abort/i.test(error?.message || ''))return 'A conexão demorou. Tente novamente.';
    if(error?.status===429 || /rate_limit/.test(error?.code || ''))return 'Aguarde um momento antes de tentar novamente.';
    return 'Não foi possível entrar ou concluir esta solicitação. Confira os dados e, se necessário, use a recuperação de senha.';
  }

  async function session() {
    await window.RaizDB.ready;
    const db = client();
    const { data, error } = await db.auth.getUser();
    if (error?.name === 'AuthSessionMissingError' || [401, 403].includes(error?.status)) return null;
    if (error) throw error;
    if (!data.user) return null;
    const { data: role, error: roleError } = await db.rpc('raiz_acesso');
    if (roleError) {
      if (['PGRST202', '42883', '42501'].includes(roleError.code)) {
        throw new Error('Sessão autenticada. As áreas privadas aguardam a migração de permissões do RAIZ.');
      }
      throw new Error('Não foi possível verificar as permissões da sua conta.');
    }
    if (!Object.hasOwn(labels, role)) throw new Error('Esta conta não tem um perfil ativo no RAIZ.');
    return { user: data.user, role };
  }

  function link(label, href) {
    const element = document.createElement('a');
    element.className = 'raiz-button';
    element.textContent = label;
    element.href = href;
    return element;
  }

  function message(text) {
    const panel = document.getElementById('accessMessage');
    panel.replaceChildren(document.createTextNode(text));
    panel.focus();
    return panel;
  }

  function switchAccount(destination, notify) {
    const button = document.createElement('button');
    button.className = 'raiz-button';
    button.textContent = 'Trocar de conta';
    button.onclick = async () => {
      button.disabled = true;
      try {
        const { error } = await client().auth.signOut({ scope: 'local' });
        if (error) throw error;
        location.replace(destination);
      } catch (error) {
        notify(authError(error));
        button.disabled = false;
      }
    };
    return button;
  }

  async function restoreLogin(requestedRole) {
    if (window.RaizDB.isDemo) {
      const panel = message('Apresentação disponível sem e-mail ou senha. ');
      for (const role of demoRoles) panel.append(link('Abrir ' + labels[role], role + '/index.html'));
      return;
    }
    const search = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.slice(1));
    const callbackError = search.get('error_description') || hash.get('error_description');
    if (callbackError) {
      message('Falha no retorno da autenticação. Tente entrar novamente. ' + callbackError);
      return;
    }
    try {
      const active = await session();
      if (!active) {
        if (search.has('expirada')) message('Entre com sua conta para acessar esta área.');
        return;
      }
      if (active.role === requestedRole) {
        location.replace(file(active.role));
        return;
      }
      message('Sua conta tem acesso ao perfil ' + labels[active.role] + '.').append(
        link('Abrir minha área', file(active.role)), switchAccount('login.html?role=' + requestedRole + '&modo=online', message)
      );
    } catch (error) {
      message(authError(error)).append(switchAccount('login.html?role=' + requestedRole + '&modo=online', message));
    }
  }

  async function open(role) {
    const demo = window.RaizDB.isDemo;
    if (navigator.serviceWorker && location.protocol !== 'file:') {
      navigator.serviceWorker.getRegistration().then(registration => registration?.update()).catch(() => {});
    }
    try {
      if (demo) {
        if (!demoRoles.includes(role)) throw new Error('Perfil de apresentação inválido.');
        const banner = document.createElement('div');
        banner.className = 'raiz-demo';
        banner.textContent = 'Apresentação sem login. ';
        banner.append(link('Portal', '../index.html'));
        for (const profile of demoRoles) {
          const shortcut = link(labels[profile], '../' + profile + '/index.html');
          if (profile === role) shortcut.setAttribute('aria-current', 'page');
          banner.append(shortcut);
        }
        document.body.prepend(banner);
        if (!await window.RaizPresentation.init(banner)) {
          document.body.classList.remove('raiz-pending');
          return;
        }
        if(['local','apresentacao'].includes(window.RaizPresentation.source) && window.RaizPaymentFlow) await window.RaizPaymentFlow.reconcile();
        const app = document.createElement('script');
        app.src = 'app.js';
        app.onload = () => {
          window.RaizPresentation.guardActions();
          document.body.classList.remove('raiz-pending');
        };
        app.onerror = () => deny(role, 'Falha ao carregar a demonstração.');
        document.body.append(app);
        return;
      }
      const active = await session();
      if (!active) {
        location.replace(login(role) + '&expirada=1');
        return;
      }
      if (active.role !== role) {
        deny(role, 'Sua conta tem acesso ao perfil ' + labels[active.role] + '.', active.role);
        return;
      }
      const db = client();
      db.auth.onAuthStateChange?.((event, session) => {
        if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session) || (session && session.user.id !== active.user.id)) {
          location.replace(login(role));
        }
      });
      window.addEventListener('pageshow', event => {
        if (event.persisted) location.reload();
      });
      await window.RaizPerfil.render(db, active, switchAccount);
    } catch (error) {
      deny(role, authError(error));
    }
  }

  function deny(role, text, allowedRole) {
    const panel = document.createElement('main');
    panel.className = 'raiz-page';
    const title = document.createElement('h1');
    title.textContent = 'Acesso à área de ' + labels[role];
    const feedback = document.createElement('p');
    feedback.setAttribute('role', 'alert');
    feedback.textContent = text;
    panel.append(title, feedback, link('Voltar ao portal', '../index.html'), link('Tela de login', login(role)));
    if (allowedRole) panel.append(link('Abrir minha área', '../' + file(allowedRole)));
    if (RaizDB.isConfigured()) panel.append(switchAccount(login(role), value => feedback.textContent = value));
    document.body.replaceChildren(panel);
    document.body.classList.remove('raiz-pending');
  }

  window.RaizAccess = { demoRoles, labels, client, callback, authError, message, restoreLogin, open };
})();
