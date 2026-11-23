/* Google Maps URLs: navegação oficial sem chave. Não é rastreamento GPS. */
(() => {
  const escape = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  function address(value) {
    const text=String(value || '').trim();
    if(text.length<5 || /ocult[oa]|disponível após|não informad/i.test(text)) return '';
    return text;
  }
  function search(value) {
    const query=address(value);
    if(!query) return '';
    return 'https://www.google.com/maps/search/?'+new URLSearchParams({api:'1',query}).toString();
  }
  function route(origin,destination) {
    const target=address(destination);
    if(!target) return '';
    const params=new URLSearchParams({api:'1',destination:target,travelmode:'driving'});
    if(address(origin)) params.set('origin',address(origin));
    return 'https://www.google.com/maps/dir/?'+params.toString();
  }
  function link(url,label,kind='btn btn-outline') {
    return url ? `<a class="${escape(kind)}" href="${escape(url)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${escape(label)} ↗</a>` : '';
  }
  function panel(origin,destination,step=0) {
    return `<section class="raiz-route-panel" aria-label="Navegação Google Maps">
      <h3>Rota no Google Maps</h3>
      <p><strong>Coleta:</strong> ${escape(origin || 'Endereço indisponível')}</p>
      <p><strong>Entrega:</strong> ${escape(destination || 'Endereço indisponível')}</p>
      <div class="raiz-route-actions">
        ${link(route(step===0?'':origin,step===0?origin:destination),step===0?'Ir até a coleta':'Ir até a entrega','btn btn-primary')}
        ${link(route(origin,destination),'Ver rota completa')}
        ${link(search(destination),'Ver destino no mapa')}
      </div>
      <p class="small muted">Abre o Google Maps em outra aba ou no aplicativo, sem login no RAIZ. A posição inicial pode ser escolhida no Maps. Não há localização ou trânsito em tempo real neste portal.</p>
    </section>`;
  }
  window.RaizMaps={address,search,route,link,panel};
})();
