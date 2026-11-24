/* Navegação compartilhada entre vitrine, conta e páginas institucionais. */
(() => {
  const root = new URL('../', document.currentScript.src);
  const url = path => new URL(path, root).href;
  const logo = `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M31 51C22 37 15 28 5 18c11-2 22 1 28 9 2 4 2 9-2 24Z" fill="#2D6A4F"/><path d="M33 50c1-19 5-31 20-39 3 13 0 24-7 30-4 4-8 6-13 9Z" fill="#52B788"/><path d="M31 27v29" stroke="#1B4332" stroke-width="3.4" stroke-linecap="round"/></svg>`;
  let activeRole = null;
  function mount({ role = null, search, category, cartCount = 0 } = {}) {
    activeRole = role;
    document.body.classList.add('raiz-site');
    let header = document.querySelector('#storeHeader, body > .support-header, body > .market-header, body > .site-header');
    if (!header) { header = document.createElement('header'); document.body.prepend(header); }
    header.id = 'storeHeader';
    header.className = 'site-header';
    const catalog = role === 'cliente' && search;
    const categoryLink = value => catalog ? '#catalogo' : url('index.html' + (value ? '?categoria=' + value : ''));
    header.innerHTML = `<div class="site-wrap site-header-row"><a class="site-brand" href="${url('index.html')}" aria-label="RAIZ, início">${logo}<span>RAIZ</span></a><form class="site-search" id="storeSearch" role="search"><label class="raiz-sr" for="storeQuery">Buscar produtos</label><input id="storeQuery" type="search" maxlength="120" placeholder="Busque plantas, vasos e tudo para cultivar"><button type="submit">Buscar</button></form><nav class="site-account" aria-label="Sua conta"><a id="storeAccount" href="${url(role ? role + '/index.html?modo=online#conta' : 'login.html?role=cliente&modo=online')}">${role ? 'Minha conta' : 'Entrar / Cadastrar'}</a><a id="siteCart" class="site-cart" href="${catalog ? '#carrinho' : url('carrinho.html')}">Carrinho <span id="storeCartCount">${Number(cartCount) || 0}</span></a></nav></div><nav class="site-wrap site-categories" aria-label="Categorias">${[['','Todos os produtos'],['plantas','Plantas'],['vasos','Vasos'],['insumos','Insumos'],['ferramentas','Ferramentas']].map(([value,label]) => `<a href="${categoryLink(value)}" data-category="${value}">${label}</a>`).join('')}<a class="site-about" href="${url('sobre.html')}">Sobre a RAIZ</a></nav>`;
    const input = header.querySelector('#storeQuery');
    input.value = new URLSearchParams(location.search).get('busca') || '';
    header.querySelector('form').onsubmit = event => {
      event.preventDefault();
      if (search) search(input.value.trim());
      else { const target = new URL('index.html', root); if (input.value.trim()) target.searchParams.set('busca', input.value.trim()); location.href = target.href; }
    };
    if (catalog && category) header.querySelectorAll('[data-category]').forEach(link => {
      link.onclick = event => { event.preventDefault(); category(link.dataset.category); };
    });
    let footer = document.querySelector('#storeFooter, body > .support-footer, body > .market-footer, body > .site-footer');
    if (!footer) { footer = document.createElement('footer'); document.body.append(footer); }
    footer.id = 'storeFooter'; footer.className = 'site-footer';
    footer.innerHTML = `<div class="site-wrap site-footer-row"><div><a class="site-brand" href="${url('index.html')}">${logo}<span>RAIZ</span></a><p>Plantas, pessoas e cuidado.</p></div><nav aria-label="Informações e parceiros"><a href="${url('sobre.html')}">Sobre a RAIZ</a><a href="${url('login.html?role=vendedor&modo=online')}">Área do vendedor</a><a href="${url('login.html?role=entregador&modo=online')}">Área do entregador</a><a href="${url('privacidade.html')}">Privacidade</a><a href="${url('termos.html')}">Termos</a><a href="mailto:suporteraiz.mkt@hotmail.com">Suporte</a></nav><p>Projeto acadêmico. Pagamentos simulados, sem cobrança bancária.</p></div>`;
    return { header, footer };
  }
  function updateCart(total) { const count = document.getElementById('storeCartCount'); if (count) count.textContent = String(total); }
  async function restoreAccount() {
    if (activeRole || !window.RaizDB) return;
    try {
      await RaizDB.ready;
      const db = RaizDB.getClient();
      const { data } = await db.auth.getUser();
      if (!data?.user) return;
      const { data: role } = await db.rpc('raiz_acesso');
      if (!['cliente','vendedor','entregador','admin'].includes(role)) return;
      const account = document.getElementById('storeAccount');
      if (account) { account.textContent = 'Minha conta'; account.href = url(role + '/index.html?modo=online'); }
    } catch (_) { /* O catálogo público continua disponível sem sessão. */ }
  }
  window.RaizShell = { mount, updateCart };
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body.classList.contains('raiz-pending') || document.querySelector('.raiz-dashboard')) return;
    if (!document.getElementById('storeHeader')) mount();
    if (window.RaizShopping) updateCart(RaizShopping.cart().reduce((sum,item) => sum + item.quantity, 0));
    void restoreAccount();
  });
})();
