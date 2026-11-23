    document.getElementById('fileNotice').hidden=location.protocol!=='file:';
    const presentation = window.RaizEnvironment?.mode==='presentation' && window.RaizEnvironment?.allowPresentation===true && (['localhost','127.0.0.1','[::1]'].includes(location.hostname)||location.protocol==='file:');
    if (!presentation) {
      document.querySelectorAll('a[href*="fonte=local"]').forEach(link=>{
        const url=new URL(link.href);url.searchParams.delete('fonte');url.searchParams.set('modo','online');
        link.href=url.href;
        if(link.getAttribute('aria-label')?.includes('demonstração')) link.setAttribute('aria-label',link.getAttribute('aria-label').replace('demonstração','área'));
      });
      document.querySelector('#perfis > p').textContent='Entre com sua conta para acessar os recursos disponíveis para o seu perfil.';
      document.querySelector('.market-demo').hidden=true;
      document.querySelector('.about-state > div').innerHTML='<span class="about-eyebrow">Marketplace RAIZ</span><h2 id="stateTitle">Seu próximo cultivo começa aqui.</h2><p>Explore o catálogo sem login. Entre na sua conta ao comprar e para acompanhar seus pedidos.</p><p>Projeto acadêmico. O registro de pedidos não realiza cobrança ou transferência bancária.</p><a class="raiz-button" href="index.html">Explorar produtos</a>';
      document.querySelector('.market-footer .market-wrap > span').textContent='Projeto acadêmico RAIZ';
      document.querySelectorAll('.market-footer a').forEach(link=>{
        if(link.textContent.includes('Perfis da demonstração')) link.textContent='Acessar perfis';
        if(link.href.includes('login.html')) link.textContent='Entrar na sua conta';
      });
    }
    function simulateFullOrder(){if(presentation)location.href='cliente/index.html?fonte=local&acao=checkout';}
    function resetDemoData(){if(!presentation)return;if(!confirm('Apagar os dados fictícios desta demonstração no navegador? Esta ação não pode ser desfeita.'))return;Object.keys(localStorage).filter(k=>k.startsWith('raiz_demo_')||k.startsWith('raiz_local_')).forEach(k=>localStorage.removeItem(k));localStorage.removeItem('raiz_apresentacao_sessao');localStorage.setItem('raiz_fonte','local');location.reload();}
