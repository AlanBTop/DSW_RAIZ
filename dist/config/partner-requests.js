/* Fila administrativa: os dados só são retornados por RPC autorizada no servidor. */
(() => {
  let filter='Pendente',page=0;
  const roleLabel={vendedor:'Vendedor',entregador:'Entregador'};
  function el(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;}
  async function render({db,section,action,button,reload}){
    let result;
    try{result=await RaizApi.rpc(db,'cadastros_listar',{p_status:filter,p_pagina:page});}
    catch(error){if(['PGRST202','42883'].includes(error?.code))return;throw error;}
    if(!result)return;
    const area=section('Cadastros de parceiros','cadastros','Cadastros de parceiros');area.classList.add('partner-request-area');
    area.append(el('p',result.pendentes+' solicitação(ões) aguardando análise. O acesso só é liberado após sua aprovação.','partner-request-intro'));
    const nav=document.querySelector('.raiz-section-nav a[href="#cadastros"]');if(nav&&result.pendentes)nav.append(el('span',result.pendentes,'partner-request-count'));
    const toolbar=el('div',null,'partner-request-toolbar'),label=el('label','Situação do cadastro'),select=el('select');
    for(const[value,text]of [['Pendente','Aguardando análise'],['Aprovado','Aprovados'],['Recusado','Recusados'],['','Todas as situações']]){const o=el('option',text);o.value=value;select.append(o);}select.value=filter;select.onchange=()=>{filter=select.value;page=0;reload();};label.append(select);toolbar.append(label);area.append(toolbar);
    if(!result.itens.length)area.append(el('p','Nenhum cadastro nesta seleção.','raiz-empty'));
    for(const r of result.itens){
      const card=el('article',null,'partner-request-card');const head=el('div',null,'partner-request-head');head.append(el('h3',r.dados.nome),el('span',r.status,'raiz-status'));card.append(head,el('p',roleLabel[r.perfil]+' · '+r.email),el('p','Enviado em '+new Date(r.criado_em).toLocaleString('pt-BR'),'partner-request-date'));
      const fields=el('dl',null,'partner-request-data');for(const[label,value]of [['Telefone',r.dados.telefone],...(r.perfil==='vendedor'?[['Loja',r.dados.loja],['Coleta',r.dados.endereco],['Funcionamento',r.dados.horario||'Não informado']]:[['Veículo',r.dados.veiculo]]),['Protocolo',r.id]]){const row=el('div');row.append(el('dt',label),el('dd',value));fields.append(row);}card.append(fields);
      if(r.status==='Pendente'){
        const actions=el('div',null,'partner-request-actions');actions.append(action('Aprovar cadastro',()=>RaizApi.rpc(db,'cadastro_decidir',{p_id:r.id,p_aprovar:true,p_motivo:null}),'Cadastro aprovado. Acesso do parceiro liberado.'));
        const refuse=el('details');refuse.append(el('summary','Recusar cadastro'));const reasonLabel=el('label','Motivo da recusa'),reason=el('textarea');reason.minLength=5;reason.maxLength=500;reason.required=true;reason.placeholder='Explique o que precisa ser corrigido. O candidato verá este motivo.';reasonLabel.append(reason);refuse.append(reasonLabel,action('Confirmar recusa',()=>{if(reason.value.trim().length<5)throw {code:'P0001',message:'Informe o motivo da recusa, com 5 a 500 caracteres.'};return RaizApi.rpc(db,'cadastro_decidir',{p_id:r.id,p_aprovar:false,p_motivo:reason.value.trim()});},'Cadastro recusado. O candidato pode consultar o motivo.'));actions.append(refuse);card.append(actions);
      }else{card.append(el('p','Analisado em '+new Date(r.analisado_em).toLocaleString('pt-BR'),'partner-request-date'));if(r.motivo)card.append(el('p',r.motivo,'partner-request-reason'));}
      area.append(card);
    }
    const pagination=el('nav',null,'partner-request-pagination');pagination.setAttribute('aria-label','Páginas dos cadastros');const prev=button('Anterior',()=>{page--;reload();});prev.disabled=page===0;const next=button('Próxima',()=>{page++;reload();});next.disabled=(page+1)*12>=result.total;pagination.append(prev,el('span',result.total+' cadastro(s) · página '+(page+1)),next);area.append(pagination);
  }
  window.RaizPartnerRequests={render};
})();
