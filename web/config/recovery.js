(() => {
  async function ready() {
    const request=document.getElementById('recoveryRequest');
    const update=document.getElementById('recoveryUpdate');
    if(!request || !update) return;
    const feedback=document.getElementById('recoveryMessage');
    const heading=document.querySelector('h1');
    const lead=document.querySelector('.support-recovery-card .support-lead');
    let db;
    let allowed=false;
    function unlock(session) {
      allowed=Boolean(session);
      update.hidden=!allowed;request.hidden=allowed;
      feedback.textContent=allowed?'Defina sua nova senha.':'Peça um novo link usando seu e-mail.';
      if(allowed){
        heading.textContent='Crie sua nova senha.';
        if(lead)lead.textContent='Escolha uma senha segura para continuar sua jornada na RAIZ.';
      }
    }
    try {
      await RaizDB.ready;db=RaizAccess.client();
      // Recuperação tem rota própria; nunca passa por restoreLogin.
      db.auth.onAuthStateChange((event,session)=>{
        if(event==='PASSWORD_RECOVERY') unlock(session);
        if(event==='SIGNED_OUT') unlock(null);
      });
      const hash=new URLSearchParams(location.hash.slice(1));
      const params=new URLSearchParams(location.search);
      if(hash.has('error') || params.has('error')) feedback.textContent='Link inválido ou expirado. Solicite outro link.';
      const {data,error}=await db.auth.getSession();
      if(error) throw error;
      // A rota é dedicada à recuperação; getUser valida também a sessão após recarga.
      if(data.session) {
        const verified=await db.auth.getUser();
        if(!verified.error) unlock(data.session);
      }
      if(location.hash || params.has('code')) history.replaceState(null,'',location.pathname);
    } catch(error) {feedback.textContent=RaizAccess.authError(error);}
    request.onsubmit=async event=>{
      event.preventDefault();
      const button=request.querySelector('button');button.disabled=true;
      try {
        if(!db) throw new Error('Serviço indisponível');
        const email=document.getElementById('recoveryEmail').value.trim().toLowerCase();
        if(!request.reportValidity()) return;
        const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:new URL('recuperar-senha.html',location.href).href});
        if(error && /fetch|network/i.test(error.message || '')) throw error;
        // Mesma resposta para conta existente, ausente, limitada ou não confirmada.
        feedback.textContent='Se houver uma conta elegível, você receberá um link para redefinir a senha. Confira também o spam.';
      } catch(error) {feedback.textContent=RaizAccess.authError(error);}
      finally {button.disabled=false;}
    };
    update.onsubmit=async event=>{
      event.preventDefault();
      const button=update.querySelector('button');button.disabled=true;
      try {
        const password=document.getElementById('newPassword').value;
        const confirm=document.getElementById('confirmPassword').value;
        if(!allowed || !db) throw new Error('Link inválido');
        if(password!==confirm || password.length<12 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
          feedback.textContent='Use pelo menos 12 caracteres, com letras e números, e repita a mesma senha.';return;
        }
        const {error}=await db.auth.updateUser({password});if(error) throw error;
        const out=await db.auth.signOut();if(out.error) throw out.error;
        update.reset();update.hidden=true;request.hidden=true;
        feedback.textContent='Senha atualizada. Entre novamente com sua nova senha.';
        heading.textContent='Tudo certo por aqui.';
        if(lead)lead.textContent='Sua nova senha já está pronta para usar. Volte ao login para acessar sua conta.';
      } catch(error) {feedback.textContent=RaizAccess.authError(error);}
      finally {button.disabled=false;}
    };
  }
  document.addEventListener('DOMContentLoaded',ready);
})();
