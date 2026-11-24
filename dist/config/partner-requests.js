/* Fila administrativa: leitura e decisões dependem de RPC autorizada no servidor. */
(() => {
  let filter='Pendente',page=0;
  const roleLabel={vendedor:'Vendedor',entregador:'Entregador'};
  const statuses={Pendente:['◷','Aguardando análise'],Aprovado:['✓','Aprovado'],Recusado:['×','Recusado']};
  const date=value=>{const d=value?new Date(value):null;return d&&!Number.isNaN(d.getTime())?d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'Data não informada';};
  function el(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;}
  function badge(status){return el('span',(statuses[status]||['○',status||'Não informado']).join(' '),'partner-request-status '+(status||'').toLowerCase());}
  async function render({db,section,action,button}) {
    const area=section('Cadastros de parceiros','cadastros','Cadastros de parceiros');area.classList.add('partner-request-area');
    area.append(el('p','Confira os dados de vendedores e entregadores e decida quem pode fazer parte da RAIZ.','partner-request-intro'));
    const stats=el('div',null,'partner-request-metrics'),content=el('div',null,'partner-request-layout');area.append(stats,content);
    const dialog=el('dialog',null,'partner-request-dialog');dialog.setAttribute('aria-labelledby','partner-request-dialog-title');area.append(dialog);
    let submitting=false,request=0,opener;
    const setDisabled=value=>{submitting=value;dialog.querySelectorAll('button,textarea').forEach(n=>n.disabled=value);dialog.setAttribute('aria-busy',String(value));};
    dialog.addEventListener('cancel',e=>{if(submitting)e.preventDefault();});
    dialog.addEventListener('close',()=>{if(opener?.isConnected)opener.focus();});
    const close=()=>{if(!submitting)dialog.close();};
    function dialogHeading(text,r) {
      dialog.replaceChildren();
      const top=el('div',null,'partner-request-dialog-top');top.append(el('span',roleLabel[r.perfil]||'Parceiro','partner-request-eyebrow'),button('Fechar',close));
      const heading=el('h2',text);heading.id='partner-request-dialog-title';
      dialog.append(top,heading,el('p',r.dados?.nome||'Nome não informado','partner-request-candidate'),el('p',r.email||'E-mail não informado','partner-request-email'));
    }
    function feedback() {const p=el('p','','partner-request-dialog-feedback');p.setAttribute('role','alert');dialog.append(p);return p;}
    function confirmation(r,approve) {
      dialogHeading(approve?'Aprovar este cadastro?':'Recusar este cadastro?',r);
      dialog.append(el('p',approve?(r.perfil==='vendedor'?'A aprovação cria a loja e libera o acesso de vendedor para esta conta.':'A aprovação cria o perfil de entregador e libera o acesso à central de entregas.'):'Explique o que precisa ser corrigido. O candidato poderá consultar o motivo e enviar uma nova solicitação.','partner-request-decision-note'));
      let reason;
      if(!approve){const label=el('label','Motivo da recusa');reason=el('textarea');reason.minLength=5;reason.maxLength=500;reason.required=true;reason.rows=4;reason.placeholder='Descreva o que o candidato precisa revisar.';label.append(reason);dialog.append(label,el('p','De 5 a 500 caracteres. A mensagem será exibida ao candidato.','partner-request-hint'));}
      const error=feedback(),actions=el('div',null,'partner-request-dialog-actions');
      const back=button('Voltar à análise',()=>details(r));
      const commit=action(approve?'Confirmar aprovação':'Confirmar recusa',async()=>{
        const message=reason?.value.trim();
        if(!approve&&(!message||message.length<5||message.length>500)){const text='Informe o motivo da recusa, com 5 a 500 caracteres.';error.textContent=text;reason.focus();throw {code:'P0001',message:text};}
        if(submitting)throw {code:'P0001',message:'Aguarde a decisão em andamento.'};
        error.textContent='';setDisabled(true);
        try{const result=await RaizApi.rpc(db,'cadastro_decidir',{p_id:r.id,p_aprovar:approve,p_motivo:approve?null:message});dialog.close();return result;}
        catch(e){error.textContent=RaizApi.errorText(e);throw e;}
        finally{setDisabled(false);}
      },approve?'Cadastro aprovado. Acesso do parceiro liberado.':'Cadastro recusado. O candidato pode consultar o motivo.');
      commit.classList.add(approve?'partner-request-primary':'partner-request-danger');actions.append(back,commit);dialog.append(actions);
      if(reason)reason.focus();else back.focus();
    }
    function details(r) {
      dialogHeading(r.status==='Pendente'?'Analisar cadastro':'Detalhes do cadastro',r);dialog.append(badge(r.status));
      const fields=el('dl',null,'partner-request-data'),data=r.dados||{};
      for(const[label,value]of [['Telefone',data.telefone],...(r.perfil==='vendedor'?[['Nome da loja',data.loja],['Endereço de coleta',data.endereco],['Funcionamento',data.horario]]:[['Veículo de entrega',data.veiculo]]),['Enviado em',date(r.criado_em)],['Protocolo',r.id]]){const row=el('div');row.append(el('dt',label),el('dd',value||'Não informado'));fields.append(row);}dialog.append(fields);
      if(r.status==='Pendente'){
        const note=el('div',null,'partner-request-check');note.append(el('h3','Antes de decidir'),el('p',r.perfil==='vendedor'?'Confira nome, contato, loja e endereço de coleta. A liberação do acesso acontece somente após sua confirmação.':'Confira nome, contato e veículo informado. A liberação do acesso acontece somente após sua confirmação.'));dialog.append(note);
        const actions=el('div',null,'partner-request-dialog-actions');actions.append(button('Recusar cadastro',()=>confirmation(r,false)),button('Aprovar cadastro',()=>confirmation(r,true)));actions.lastChild.classList.add('partner-request-primary');dialog.append(actions);
      }else{dialog.append(el('p','Analisado em '+date(r.analisado_em),'partner-request-hint'));if(r.motivo){const note=el('div',null,'partner-request-reason');note.append(el('h3','Motivo da recusa'),el('p',r.motivo));dialog.append(note);}}
    }
    function help() {
      const aside=el('aside',null,'partner-request-guide');aside.setAttribute('aria-label','Como funciona a análise');aside.append(el('span','ACESSO COM APROVAÇÃO','partner-request-eyebrow'),el('h3','Cada parceiro passa por você.'));
      const steps=el('ol');for(const[title,text]of [['Cadastro enviado','O candidato informa seus dados e confirma o e-mail.'],['Sua análise','Confira as informações e aprove ou explique a recusa.'],['Acesso liberado','A aprovação libera a área do perfil solicitado.']]){const li=el('li');li.append(el('strong',title),el('p',text));steps.append(li);}aside.append(steps,el('p','O resultado fica disponível na página de acompanhamento do candidato.','partner-request-hint'));return aside;
    }
    function metrics(result) {
      stats.replaceChildren();
      for(const[label,value,note]of [['Aguardando sua análise',result?.pendentes??'—','Pendências de todos os perfis'],['Cadastros na seleção',result?.total??'—','Total do filtro de situação']]){const c=el('div',null,'partner-request-metric');c.append(el('span',label),el('strong',String(value)),el('small',note));stats.append(c);}
      const rule=el('div',null,'partner-request-policy');rule.append(el('span','◇','partner-request-policy-icon'),el('strong','Você autoriza o acesso'),el('small','Nenhum parceiro entra na operação antes da aprovação.'));stats.append(rule);
    }
    function toolbar() {
      const bar=el('div',null,'partner-request-toolbar'),label=el('label','Situação do cadastro'),select=el('select');
      for(const[value,text]of [['Pendente','Aguardando análise'],['Aprovado','Aprovados'],['Recusado','Recusados'],['','Todas as situações']]){const o=el('option',text);o.value=value;select.append(o);}select.value=filter;select.onchange=()=>{filter=select.value;page=0;load();};label.append(select);bar.append(label,el('span','Mais recentes primeiro','partner-request-hint'),button('Atualizar solicitações',load));return bar;
    }
    async function load() {
      const current=++request;area.setAttribute('aria-busy','true');metrics();content.replaceChildren(el('p','Carregando solicitações…','partner-request-loading'));
      try {
        let result=await RaizApi.rpc(db,'cadastros_listar',{p_status:filter,p_pagina:page});
        if(!result||!Array.isArray(result.itens)||!Number.isFinite(Number(result.total))||!Number.isFinite(Number(result.pendentes)))throw {code:'INVALID_RESPONSE'};
        const last=Math.max(0,Math.ceil(Number(result.total)/12)-1);
        if(page>last){page=last;result=await RaizApi.rpc(db,'cadastros_listar',{p_status:filter,p_pagina:page});if(!result||!Array.isArray(result.itens))throw {code:'INVALID_RESPONSE'};}
        if(current!==request||!area.isConnected)return;
        metrics(result);content.replaceChildren();
        const nav=document.querySelector('.raiz-section-nav a[data-section="cadastros"]');nav?.querySelector('.partner-request-count')?.remove();if(nav&&result.pendentes)nav.append(el('span',result.pendentes,'partner-request-count'));
        const queue=el('div',null,'partner-request-queue');const title=el('div',null,'partner-request-queue-title');title.append(el('h3',filter==='Pendente'?'Fila de análise':filter==='Aprovado'?'Cadastros aprovados':filter==='Recusado'?'Cadastros recusados':'Todos os cadastros'),el('p','Abra uma solicitação para conferir os dados e registrar sua decisão.'));queue.append(title,toolbar());
        if(!result.itens.length){const empty=el('div',null,'partner-request-empty');empty.append(el('span','✓','partner-request-empty-icon'),el('h3',filter==='Pendente'?'Nenhum cadastro aguardando análise':'Nenhum cadastro nesta seleção'),el('p',filter==='Pendente'?'Novas solicitações de vendedores e entregadores aparecerão aqui.':'Escolha outra situação para consultar os cadastros.'));queue.append(empty);}
        const list=el('div',null,'partner-request-list');
        for(const r of result.itens){
          const card=el('article',null,'partner-request-card'),identity=el('div',null,'partner-request-identity'),avatar=el('span',(r.dados?.nome||'P').trim().charAt(0).toLocaleUpperCase('pt-BR'),'partner-request-avatar');avatar.setAttribute('aria-hidden','true');const copy=el('div');copy.append(el('h4',r.dados?.nome||'Nome não informado'),el('p',r.email||'E-mail não informado'));identity.append(avatar,copy);
          const meta=el('div',null,'partner-request-meta');meta.append(el('span',roleLabel[r.perfil]||'Parceiro','partner-request-role'),badge(r.status),el('time','Enviado em '+date(r.criado_em)));
          const open=button(r.status==='Pendente'?'Analisar cadastro':'Ver detalhes',()=>{opener=open;details(r);dialog.showModal();});open.classList.add('partner-request-review');open.setAttribute('aria-label',(r.status==='Pendente'?'Analisar cadastro de ':'Ver cadastro de ')+(r.dados?.nome||r.email));card.append(identity,meta,open);list.append(card);
        }
        queue.append(list);
        const pagination=el('nav',null,'partner-request-pagination');pagination.setAttribute('aria-label','Páginas dos cadastros');const prev=button('Anterior',()=>{page--;load();}),next=button('Próxima',()=>{page++;load();});prev.disabled=page===0;next.disabled=(page+1)*12>=result.total;pagination.append(prev,el('span',result.total+' cadastro(s) · página '+(page+1)+' de '+Math.max(1,Math.ceil(result.total/12))),next);queue.append(pagination);content.append(queue,help());
      } catch(error){
        if(current!==request||!area.isConnected)return;
        content.replaceChildren();const box=el('div',null,'partner-request-error');box.setAttribute('role','alert');box.append(el('h3','Não foi possível carregar os cadastros'),el('p',['PGRST202','42883'].includes(error?.code)?'A consulta de cadastros está indisponível no momento. Tente novamente mais tarde.':RaizApi.errorText(error)),button('Tentar novamente',load));content.append(box);
      } finally{if(current===request)area.removeAttribute('aria-busy');}
    }
    await load();
  }
  window.RaizPartnerRequests={render};
})();
