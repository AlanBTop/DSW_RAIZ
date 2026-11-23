/* Exclusivo de testes: substitui o SDK pela rota do navegador, nunca entra em dist/. */
(() => {
  const role=()=>sessionStorage.getItem('qaRole');
  const user=()=>role()?{id:role()==='cliente'?'buyer':role(),email:role()+'@teste.invalid'}:null;
  const state={cart:[{id:1,produto_id:137,quantidade:1}],accepted:[],requests:[],events:[],queries:[],rpc:[],orders:[
    {id:900,status:'Entregue',total:35.50,frete:15,forma_pagamento:'Sem pagamento integrado',data_formatada:'23/11/2026',recebimento_confirmado_em:null},
    {id:901,status:'Confirmado',total:25.25,frete:15,forma_pagamento:'Sem pagamento integrado',data_formatada:'23/11/2026'}
  ]};window.__qa=state;
  const products=Array.from({length:150},(_,i)=>({id:i+1,nome:i===136?'Cacto fora dos cem':'Planta '+String(i+1).padStart(3,'0'),categoria:'plantas',vendedor_nome:'Loja QA',preco:10.25,estoque:5,descricao:'Descrição de teste',loja_id:1,emoji:'🌿',ativo:true}));
  function data(view){return ({cliente_produtos:products,cliente_usuarios:sessionStorage.getItem('qaNewCustomer')?[]:[{id:'buyer',nome:'Cliente QA',telefone:'Telefone fictício',endereco:'Endereço fictício'}],cliente_favoritos:[{id:1,produto_id:137}],cliente_carrinho:state.cart,cliente_pedidos:state.orders,cliente_itens_pedido:[{id:1,pedido_id:900,produto_nome:'Cacto fora dos cem',produto_id:137,quantidade:2,preco_unitario:10.25}],vendedor_lojas:[{id:1,nome:'Loja QA',endereco:'Coleta fictícia',rating:5}],vendedor_produtos:products,vendedor_pedidos:[{id:900,status:'Pendente',total:35.5,data_pedido:'hoje',cliente_nome:'Cliente QA'}],vendedor_itens_pedido:[],entregador_perfil:[{id:1,nome:'Entregador QA',veiculo:'Bicicleta',online:true}],entregador_corridas:[{id:900,status:'Em andamento',etapa_atual:1,coleta_loja:'Loja QA',coleta_endereco:'Coleta fictícia',entrega_endereco:'Destino fictício',item_descricao:'Plantas',valor:15,fragil:true}],entregador_historico:[],raiz_aceites:state.accepted,raiz_solicitacoes_privacidade:state.requests,raiz_eventos_operacao:state.events})[view]||[];}
  const views=new Set(['cliente_produtos','cliente_usuarios','cliente_favoritos','cliente_carrinho','cliente_pedidos','cliente_itens_pedido','vendedor_lojas','vendedor_produtos','vendedor_pedidos','vendedor_itens_pedido','vendedor_vendas_diarias','entregador_perfil','entregador_corridas','entregador_historico','entregador_extrato','raiz_aceites','raiz_solicitacoes_privacidade','raiz_eventos_operacao']);
  function query(view){let filters=[],start=0,end=1000,sort='id',ascending=true;return {
    select(){return this;},eq(k,v){filters.push(r=>r[k]===v);return this;},in(k,vs){filters.push(r=>vs.includes(r[k]));return this;},
    or(text){const matches=[...text.matchAll(/(\w+)\.ilike\.%([^%]*)%/g)];filters.push(r=>matches.some(m=>String(r[m[1]]||'').toLowerCase().includes(m[2].toLowerCase())));return this;},
    order(key,options={}){sort=key;ascending=options.ascending!==false;return this;},range(a,b){start=a;end=b;return this;},limit(n){end=start+n-1;return this;},abortSignal(){return this;},
    then(resolve,reject){if(!views.has(view))return Promise.resolve({data:null,error:{code:'PGRST205',message:'View inexistente'}}).then(resolve,reject);let result=data(view).filter(r=>filters.every(fn=>fn(r)));result=[...result].sort((a,b)=>(a[sort]>b[sort]?1:a[sort]<b[sort]?-1:0)*(ascending?1:-1));state.queries.push({view,start,end,filtered:result.length});return Promise.resolve({data:result.slice(start,end+1),count:result.length,error:null}).then(resolve,reject);}
  };}
  async function rpc(name,args={}){
    state.rpc.push({name,args});let result=null;
    if(name==='raiz_acesso')result=role();
    else if(name==='raiz_recursos')result={versao:4,recebimento:true,cancelamento:true,avaliacao:true,privacidade:true,eventos:true,aceites:true};
    else if(name==='raiz_confirmar_recebimento')state.orders.find(o=>o.id===args.p_pedido).recebimento_confirmado_em=new Date().toISOString();
    else if(name==='raiz_avaliar_pedido')Object.assign(state.orders.find(o=>o.id===args.p_pedido),{avaliacao_nota:args.p_nota,avaliacao_comentario:args.p_comentario});
    else if(name==='raiz_cancelar_pedido')state.orders.find(o=>o.id===args.p_pedido).status='Cancelado';
    else if(name==='raiz_aceitar_termos')state.accepted.push({usuario_id:user().id,versao:args.p_versao,aceito_em:new Date().toISOString()});
    else if(name==='raiz_solicitar_exclusao'){if(args.p_confirmacao!=='EXCLUIR MINHA CONTA')return {data:null,error:{code:'P0001',message:'Confirme a solicitação'}};result='00000000-0000-4000-8000-000000000001';state.requests.push({id:result,usuario_id:user().id,status:'Pendente',created_at:new Date().toISOString()});}
    else if(name==='raiz_evento')state.events.push({id:state.events.length+1,evento:args.p_evento,area:args.p_area,referencia:args.p_referencia,created_at:new Date().toISOString()});
    else if(name==='raiz_usuarios_pagina')result={itens:[{id:'buyer',email:'cliente@teste.invalid',perfil:'cliente',ativo:true}],total:1};
    else if(name==='raiz_ofertas_pagina')result={itens:[],total:0};
    else if(name==='raiz_pagamentos') {
      if(!sessionStorage.getItem('qaPayments'))return {data:null,error:{code:'PGRST202'}};
      result=state.payments || [];
    }
    else if(name==='raiz_checkout_pagamento'){
      result=902;
      state.orders.unshift({id:902,status:'Confirmado',total:25.25,forma_pagamento:'Cartão (simulado)',data_formatada:'23/11/2026'});
      state.payments=[{pedido_id:902,metodo:args.p_metodo,parcelas:args.p_parcelas,estado:'pending',valor_centavos:2525,expira_em:new Date(Date.now()+900000).toISOString(),referencia:'QA-902',eventos:[]}];
    }
    else if(name==='raiz_pagamento_acao'){
      const tx=state.payments.find(t=>t.pedido_id===args.p_pedido);
      tx.estado={approve:'paid',reject:'rejected',retry:'pending',cancel:'cancelled',refund:'refunded'}[args.p_acao] || tx.estado;
      tx.eventos.push({em:new Date().toISOString(),acao:args.p_acao});
    }
    else if(name==='raiz_endereco')sessionStorage.removeItem('qaNewCustomer');
    else if(name==='raiz_item_cliente'){
      const row=state.cart.find(r=>r.produto_id===args.p_produto);
      if(row)row.quantidade=args.p_quantidade;
      else state.cart.push({id:state.cart.length+1,produto_id:args.p_produto,quantidade:args.p_quantidade});
    }
    else if(name==='raiz_checkout')result=902;
    return {data:result,error:null};
  }
  window.supabase={createClient:()=>({from:query,rpc,auth:{
    getUser:async()=>({data:{user:user()},error:null}),getSession:async()=>({data:{session:user()?{user:user()}:null},error:null}),
    onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
    signInWithPassword:async({email})=>{if(email.startsWith('bloqueado'))return {error:{code:'email_not_confirmed'}};if(email.startsWith('errado'))return {error:{code:'invalid_credentials'}};sessionStorage.setItem('qaRole',email.split('@')[0]);return {data:{user:user()},error:null};},
    signInWithOAuth:async(options)=>{state.oauth=options;return {data:{provider:options.provider},error:null};},
    signUp:async()=>({data:{session:null},error:null}),signOut:async()=>{sessionStorage.removeItem('qaRole');return {error:null};},resetPasswordForEmail:async()=>({data:{},error:null}),updateUser:async()=>({data:{user:user()},error:null})
  },functions:{invoke:async()=>({data:{concluida:true},error:null})}})};
})();
