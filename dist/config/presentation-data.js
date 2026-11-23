/* Conexão da apresentação: consulta real ou edição de exemplos no Supabase. */
(() => {
  if (!window.RaizDB.isDemo) {
    window.RaizPresentation = Object.freeze({source: 'disabled', init: async () => false});
    return;
  }
  const params = new URLSearchParams(location.search);
  let source = params.get('fonte');
  if (!['real', 'apresentacao', 'local'].includes(source)) source = localStorage.getItem('raiz_fonte') || 'local';
  if (!['real', 'apresentacao', 'local'].includes(source)) source = 'local';
  localStorage.setItem('raiz_fonte', source);
  let values = {};
  let connected = false;
  let queue = Promise.resolve();
  let feedback;
  let dirty = false;
  const prefix = source === 'local' ? 'raiz_local_' : 'raiz_demo_';
  const LOCAL_STATE='raiz_local_state_v2';
  function localSnapshot() {
    const raw=localStorage.getItem(LOCAL_STATE);
    if(raw!==null) {
      let data;
      try {data=JSON.parse(raw);} catch(_) {throw new Error('Os dados locais estão corrompidos. Restaure a demonstração no portal antes de continuar.');}
      if(!data || typeof data!=='object' || Array.isArray(data)) throw new Error('Estado local inválido. Restaure a demonstração no portal.');
      return data;
    }
    const data={};
    for(const key of Object.keys(localStorage).filter(k=>k.startsWith('raiz_local_') && k!==LOCAL_STATE && k!=='raiz_local_payment_preferences_v1')) {
      try {data[key.slice('raiz_local_'.length)]=JSON.parse(localStorage.getItem(key));} catch(_) {}
    }
    return data;
  }
  function commitLocal(patch) {
    if(source!=='local') throw new Error('Este pagamento funciona somente nos exemplos locais, sem banco.');
    const next={...localSnapshot(),...structuredClone(patch)};
    // Uma única escrita mantém pedido, estoque e pagamento na mesma fotografia local.
    localStorage.setItem(LOCAL_STATE,JSON.stringify(next));
    values=next;
    return structuredClone(next);
  }
  const session = localStorage.getItem('raiz_apresentacao_sessao') || crypto.randomUUID();
  localStorage.setItem('raiz_apresentacao_sessao', session);

  function status(text) {
    if (feedback) feedback.textContent = text;
  }

  async function rpc(name, body) {
    body.p_sessao = session;
    const { config } = RaizDB;
    const response = await fetch(config.url + '/rest/v1/rpc/' + name, {
      method: 'POST', keepalive: true,
      headers: { apikey: config.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const content = await response.text();
    const result = content ? JSON.parse(content) : null;
    if (!response.ok) throw new Error(result?.message || 'HTTP ' + response.status);
    return result;
  }

  async function init(banner) {
    const label = document.createElement('label');
    label.textContent = 'Dados: ';
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Fonte dos dados');
    for (const [value, text] of [['local', 'Exemplos locais — sem envio ao Supabase'], ['apresentacao', 'Apresentação — gravação no Supabase'], ['real', 'Dados reais — consulta']]) {
      const option = document.createElement('option');
      option.value = value; option.textContent = text; select.append(option);
    }
    select.value = source;
    select.onchange = async () => {
      select.disabled = true;
      await queue;
      if (dirty) {
        status('Há alterações sem salvar. Use “Tentar sincronizar” antes de trocar.');
        select.value = source; select.disabled = false; return;
      }
      localStorage.setItem('raiz_fonte', select.value);
      const url = new URL(location.href);
      url.searchParams.set('fonte', select.value);
      location.href = url.href;
    };
    label.append(select);
    feedback = document.createElement('span');
    feedback.setAttribute('role', 'status');
    feedback.id = 'presentationStatus';
    const retry = document.createElement('button');
    retry.className = 'raiz-button'; retry.textContent = 'Tentar sincronizar';
    retry.onclick = async () => {
      if (!dirty) { location.reload(); return; }
      for (const [key, value] of Object.entries(values)) set(key, value);
      await queue;
      if (!dirty) status('Apresentação salva no Supabase.');
    };
    banner.append(label, feedback, retry);
    if (source === 'local') {
      values=localSnapshot();
      status('Exemplos fictícios locais • persistência neste navegador • sem autenticação.');
      retry.textContent = 'Recarregar exemplos locais';
      return true;
    }
    status('Conectando ao Supabase…');
    try {
      const data = await rpc('raiz_apresentacao_ler', { p_fonte: source });
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Resposta inválida.');
      values = data;
      connected = true;
      status(source === 'real' ? 'Supabase conectado • consulta real com dados pessoais ocultos.' : 'Supabase conectado • alterações salvas na apresentação.');
    } catch (error) {
      if (source === 'real') {
        status('Consulta real não liberada. Verifique conexão, permissões e configuração com o responsável.');
        return false;
      }
      status('Configuração de apresentação pendente • alterações somente neste navegador.');
      // As telas continuam disponíveis, com o catálogo público realmente conectado.
      const products = await RaizDB.cliente.getProdutos();
      if (products !== null) {
        values.products = products.map(product);
        status('Catálogo conectado ao Supabase • demais dados locais até executar o SQL.');
      }
    }
    if (source === 'apresentacao') {
      // O snapshot remoto prevalece. Cache local serve apenas antes da ativação.
      if (!connected) for (const key of Object.keys(localStorage).filter(key => key.startsWith(prefix) && key !== prefix + 'products')) {
        try { values[key.slice(prefix.length)] = JSON.parse(localStorage.getItem(key)); } catch (error) { /* Ignora cache inválido. */ }
      }
    }
    return true;
  }

  function product(p) {
    return { id:p.id, name:p.nome, category:p.categoria, seller:p.vendedor_nome || 'Flora Verde', price:Number(p.preco),
      emoji:p.emoji, tag:p.tag, rating:Number(p.rating), reviews:p.reviews, stock:p.estoque, active:p.ativo,
      description:p.descricao, care:p.cuidados, size:p.porte, fragile:p.fragil };
  }

  function get(key, fallback) {
    if(source==='local') {const latest=localSnapshot(); return structuredClone(Object.hasOwn(latest,key)?latest[key]:fallback);}
    if (Object.hasOwn(values, key)) return structuredClone(values[key]);
    if (source === 'real') return structuredClone(fallback);
    if (connected) set(key, fallback);
    return structuredClone(fallback);
  }

  const pending = new Map();
  function set(key, value) {
    if (source === 'real') return;
    if(source==='local') {commitLocal({[key]:value});return;}
    values[key] = structuredClone(value);
    try { localStorage.setItem(prefix + key, JSON.stringify(value)); } catch (error) { /* A conexão permanece utilizável. */ }
    if (!connected) return;
    pending.set(key, structuredClone(value));
    dirty = true;
    status('Salvando no Supabase…');
    queue = queue.then(async () => {
      for (const [name, item] of [...pending]) {
        try {
          await rpc('raiz_apresentacao_salvar', { p_chave: name, p_valor: item });
          if (JSON.stringify(pending.get(name)) === JSON.stringify(item)) pending.delete(name);
        } catch (error) {
          status('Falha ao salvar no Supabase. Use “Tentar sincronizar”.');
          return;
        }
      }
      dirty = pending.size > 0;
      if (!dirty) status('Apresentação salva no Supabase.');
    });
  }

  function guardActions() {
    if (source !== 'real') return;
    for (const name of ['saveProduct', 'toggleProduct', 'deleteProductItem', 'advanceSellerOrder', 'saveStoreInfo',
      'confirmOrder', 'advanceClientOrder', 'submitRating', 'toggleCourier', 'acceptDelivery', 'finishPickup', 'finishDropoff',
      'clearCurrentDelivery', 'saveUser', 'deleteUser', 'toggleProductModeration', 'saveDispute', 'deleteDispute', 'simularTesteSeguranca']) {
      if (typeof window[name] === 'function') window[name] = event => {
        event?.preventDefault?.();
        window.toast?.('Dados reais em consulta. Troque para Apresentação para gravar exemplos.');
      };
    }
  }
  window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  document.addEventListener('click', async event => {
    const anchor = event.target.closest('a[href]');
    if (!anchor || !dirty || anchor.target === '_blank' || event.ctrlKey || event.metaKey) return;
    const url = new URL(anchor.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
    event.preventDefault();
    await queue;
    if (!dirty) location.href = url.href;
  });
  window.RaizPresentation = { init, get, set, commitLocal, guardActions, get source() { return source; }, get connected() { return connected; }, flush: () => queue };
})();
