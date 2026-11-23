/* Mantém as opções de demonstração acessíveis sem ocupar o painel. */
window.RaizPartnerDesign = {
  prepare() {
    const banner = document.querySelector('.raiz-demo');
    if (!banner || banner.querySelector('.demo-controls')) return;
    const details = document.createElement('details');
    details.className = 'demo-controls';
    const summary = document.createElement('summary');
    const title = document.createElement('span');
    title.textContent = window.RaizPresentation?.source === 'local' ? 'Apresentação local' : 'Modo de apresentação';
    const hint = document.createElement('span');
    hint.className = 'demo-controls-hint';
    hint.textContent = 'Opções de dados e perfis';
    summary.append(title, hint);
    const content = document.createElement('div');
    content.className = 'demo-controls-content';
    while (banner.firstChild) content.append(banner.firstChild);
    details.append(summary, content);
    banner.append(details);
  }
};
