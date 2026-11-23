/* Fluxo financeiro acadêmico local: nenhuma operação bancária ou banco de dados. */
(() => {
  const STATUS={pending:'Aguardando pagamento',paid:'Aprovado (simulado)',rejected:'Recusado (simulado)',expired:'Expirado',cancelled:'Cancelado',refunded:'Estornado (simulado)'};
  const read=(key,fallback=[])=>RaizPresentation.get(key,fallback);
  const copy=v=>structuredClone(v);
  const money=cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
  let queue=Promise.resolve();
  function local() {if(!RaizDB.isDemo || !['local','apresentacao'].includes(RaizPresentation.source)) throw new Error('Use Exemplos locais ou Apresentação no Supabase para simular pagamentos.');}
  async function locked(task) {
    local();
    const run=()=>RaizPresentation.atomic(task);
    if(navigator.locks?.request) return navigator.locks.request('raiz-payment-local',run);
    const next=queue.then(run); queue=next.catch(()=>{}); return next;
  }
  function plan(amount,count,type) {
    if(!Number.isSafeInteger(amount) || amount<1) throw new Error('Total inválido.');
    if(!Number.isInteger(count) || count<1 || count>3 || type!=='credit' && count!==1) throw new Error('Parcelamento inválido. Crédito permite 1 a 3 parcelas; demais formas são à vista.');
    return Array.from({length:count},(_,i)=>Math.floor(amount/count)+(i<amount%count?1:0));
  }
  function draft(order,method,count,now=Date.now()) {
    const id=crypto.randomUUID();
    return {id,orderId:order.id,method:copy(method),amountCents:Math.round(order.total*100),
      installments:plan(Math.round(order.total*100),count,method.type),state:'pending',
      createdAt:now,updatedAt:now,expiresAt:now+(method.type==='pix'?15*60e3:method.type==='boleto'?3*864e5:30*60e3),
      reference:`RAIZ-DEMO-${method.type.toUpperCase()}-${id}`,events:[{action:'created',at:now}],simulated:true};
  }
  function stamp(tx,state,action) {tx.state=state;tx.updatedAt=Date.now();tx.events.push({action,at:tx.updatedAt});}
  function sync(order,tx) {order.paymentId=tx.id;order.payment=copy(tx.method);order.paymentMethod=tx.method.label;order.paymentStatus=STATUS[tx.state];}
  function snapshot() {return {orders:read('orders'),products:read('products'),transactions:read('payment_transactions'),deliveries:read('deliveries')};}
  function save(s) {
    const active=read('client_active_order',null);
    const patch={orders:s.orders,products:s.products,payment_transactions:s.transactions,deliveries:s.deliveries};
    if(active && s.orders.some(o=>o.id===active.id)) patch.client_active_order=s.orders.find(o=>o.id===active.id);
    return RaizPresentation.commitLocal(patch);
  }
  function release(s,order) {
    if(order.inventoryReserved) {
      for(const item of order.items) {const p=s.products.find(p=>p.id===item.productId);if(p){p.stock+=item.qty;const v=p.variants?.find(v=>v.name===item.variant);if(v)v.stock+=item.qty;}}
      order.inventoryReserved=false;
    }
    order.status='Cancelado';order.step=0;
    s.deliveries=s.deliveries.filter(d=>d.id!==order.id);
  }
  function expireIn(s,now=Date.now()) {
    let changed=false;
    for(const tx of s.transactions) {
      const order=s.orders.find(o=>o.id===tx.orderId && o.paymentId===tx.id);
      if(order && ['pending','rejected'].includes(tx.state) && tx.expiresAt<=now) {
        stamp(tx,'expired','expired'); release(s,order);sync(order,tx);changed=true;
      }
    }
    return changed;
  }
  async function reconcile() {return locked(()=>{const s=snapshot();if(expireIn(s))save(s);});}
  async function checkout(input) {
    return locked(()=>{
      const s=snapshot();
      if(!input.requestId || !/^[a-f0-9-]{36}$/i.test(input.requestId)) throw new Error('Requisição de checkout inválida.');
      const existing=s.orders.find(o=>o.checkoutRequestId===input.requestId);
      if(existing) return copy(existing);
      const cart=read('client_cart');
      if(!cart.length) throw new Error('O carrinho está vazio ou este checkout já foi concluído.');
      if(!s.products.length) s.products=copy(input.products || []);
      const quantities=new Map();
      for(const line of cart) {
        if(!Number.isSafeInteger(line.qty) || line.qty<1 || line.qty>99) throw new Error('Quantidade inválida.');
        const key=String(line.id)+'|'+String(line.variant||'');
        const prior=quantities.get(key);quantities.set(key,{id:line.id,variant:line.variant||'',qty:(prior?.qty||0)+line.qty});
      }
      let subtotalCents=0;
      const items=[];
      for(const {id,qty,variant} of quantities.values()) {
        const product=s.products.find(p=>p.id===id);
        const choice=product?.variants?.find(v=>v.name===variant);
        if(variant && !choice)throw new Error('Variação indisponível. Atualize o carrinho.');
        if(choice && (!Number.isSafeInteger(choice.stock) || choice.stock<qty))throw new Error('Estoque da variação insuficiente.');
        const price=product?Math.round(Number(product.price)*100)+(choice?.extraCents||0):NaN;
        if(!product || product.active===false || !Number.isSafeInteger(product.stock) || product.stock<qty || qty>99) throw new Error('Produto indisponível ou estoque insuficiente.');
        if(!Number.isSafeInteger(price) || price<0) throw new Error('Preço inválido.');
        subtotalCents+=price*qty;
        items.push({productId:id,qty,unitPriceCents:price,name:product.name,variant});
      }
      if(!Number.isSafeInteger(subtotalCents) || subtotalCents>1e10) throw new Error('Total fora do limite da demonstração.');
      if(typeof input.address!=='string' || input.address.trim().length<5) throw new Error('Salve o endereço de entrega antes de continuar.');
      const method=RaizPayments.selection(input.methodId);
      const count=Number(input.installments || 1);
      const cep=String(input.cep||'78200000').replace(/\D/g,'');
      if(!/^\d{8}$/.test(cep) || /^0{8}$/.test(cep))throw new Error('Informe um CEP válido com oito dígitos.');
      const shippingCents=cep.startsWith('782')?1590:cep.startsWith('78')?2490:3990;
      const totals=new Map();for(const i of items)totals.set(i.productId,(totals.get(i.productId)||0)+i.qty);
      for(const [id,qty] of totals)if(s.products.find(p=>p.id===id).stock<qty)throw new Error('Estoque total insuficiente.');
      plan(subtotalCents+shippingCents,count,method.type);
      let id=Date.now();while(s.orders.some(o=>o.id===id))id++;
      const store=read('store_info',{});
      const first=s.products.find(p=>p.id===items[0].productId);
      const order={id,checkoutRequestId:input.requestId,customer:input.customer || 'Cliente de exemplo',customerEmail:input.email || '',
        date:new Date().toLocaleString('pt-BR'),items,status:'Aguardando pagamento',step:0,
        subtotal:subtotalCents/100,total:(subtotalCents+shippingCents)/100,shippingCents,cep,address:input.address.trim(),inventoryReserved:true,
        delivery:{id,distance:'Não calculada',value:shippingCents/100,pickup:[...new Set(items.map(i=>s.products.find(p=>p.id===i.productId).seller))].join(' / ') || store.name || 'Loja de exemplo',
          pickupAddress:store.address || 'Rua das Acácias, 45 • Cáceres - MT',drop:'Cliente de exemplo',dropAddress:input.address.trim(),
          item:first.name,productId:first.id,fragile:items.some(i=>s.products.find(p=>p.id===i.productId)?.fragile),size:first.size || '',note:'Pedido de demonstração. Não representa uma cobrança.'}};
      const tx=draft(order,method,count);sync(order,tx);
      for(const item of items){const p=s.products.find(p=>p.id===item.productId);p.stock-=item.qty;const v=p.variants?.find(v=>v.name===item.variant);if(v)v.stock-=item.qty;}
      s.orders.unshift(order);s.transactions.unshift(tx);
      RaizPresentation.commitLocal({orders:s.orders,products:s.products,payment_transactions:s.transactions,
        deliveries:s.deliveries,client_cart:[],client_active_order:order});
      return copy(order);
    });
  }
  async function act(id,action,options={}) {
    return locked(()=>{
      const s=snapshot();const expired=expireIn(s);if(expired)save(s);
      const order=s.orders.find(o=>o.id===Number(id));
      const tx=order && s.transactions.find(t=>t.id===order.paymentId);
      if(!order || !tx) throw new Error('Pagamento não encontrado.');
      if(action==='approve') {
        if(tx.state==='paid')return copy(order);
        if(tx.state!=='pending')throw new Error('Este pagamento não pode mais ser aprovado.');
        stamp(tx,'paid','approved_simulation');tx.paidAt=Date.now();order.status='Pendente';
      } else if(action==='reject') {
        if(tx.state==='rejected')return copy(order);
        if(tx.state!=='pending' || !['credit','debit'].includes(tx.method.type))throw new Error('Recusa demonstrativa disponível para cartões aguardando pagamento.');
        stamp(tx,'rejected','rejected_simulation');
      } else if(action==='retry') {
        if(tx.state!=='rejected')throw new Error('Nova tentativa disponível somente após recusa, antes do prazo.');
        const method=RaizPayments.selection(options.methodId);
        const next=draft(order,method,Number(options.installments || 1));
        s.transactions.unshift(next);sync(order,next);save(s);return copy(order);
      } else if(action==='cancel') {
        if(['cancelled','expired','refunded'].includes(tx.state))return copy(order);
        if(tx.state==='paid')throw new Error('Use estorno para um pagamento já aprovado.');
        stamp(tx,'cancelled','cancelled');release(s,order);
      } else if(action==='refund') {
        if(tx.state==='refunded')return copy(order);
        if(tx.state!=='paid' || order.status!=='Pendente' || order.step!==0 || read('current_delivery',null)?.id===order.id) throw new Error('O estorno local está disponível somente antes do início do preparo.');
        stamp(tx,'refunded','refund_simulation');tx.refundedAt=Date.now();tx.refundedCents=tx.amountCents;release(s,order);
      } else throw new Error('Ação de pagamento inválida.');
      sync(order,tx);save(s);return copy(order);
    });
  }
  async function prepare(id) {
    return locked(()=>{
      const s=snapshot();const order=s.orders.find(o=>o.id===Number(id));
      const tx=order && s.transactions.find(t=>t.id===order.paymentId);
      if(!tx || tx.state!=='paid')throw new Error('Aprove o pagamento de exemplo antes de iniciar o preparo.');
      if(order.status==='Em preparo')return copy(order);
      if(order.status!=='Pendente')throw new Error('Pedido indisponível para preparo.');
      order.status='Em preparo';order.step=1;
      if(!s.deliveries.some(d=>d.id===order.id) && read('current_delivery',null)?.id!==order.id) s.deliveries.unshift(copy(order.delivery));
      save(s);return copy(order);
    });
  }
  function transaction(orderId) {const order=read('orders').find(o=>o.id===Number(orderId));return order?read('payment_transactions').find(tx=>tx.id===order.paymentId) || null:null;}
  function summary() {
    const orders=read('orders');const transactions=read('payment_transactions');
    const latest=transactions.filter(t=>orders.some(o=>o.paymentId===t.id));
    const sum=state=>latest.filter(t=>t.state===state).reduce((s,t)=>s+t.amountCents,0);
    return {paidCents:sum('paid'),pendingCents:sum('pending')+sum('rejected'),refundedCents:sum('refunded'),count:transactions.length,transactions};
  }
  function documentText(orderId) {
    const order=read('orders').find(o=>o.id===Number(orderId));const tx=transaction(orderId);
    if(!order || !tx)throw new Error('Registro não encontrado.');
    return ['RAIZ - DOCUMENTO DE DEMONSTRAÇÃO','SEM VALOR FISCAL OU BANCÁRIO','NENHUM DINHEIRO FOI COBRADO OU TRANSFERIDO',
      `Pedido: ${order.id}`,`Referência local: ${tx.reference}`,`Forma: ${tx.method.label}`,`Situação: ${STATUS[tx.state]}`,
      `Total: ${money(tx.amountCents)}`,`Parcelas: ${tx.installments.map(money).join(' + ')}`,
      `Criado: ${new Date(tx.createdAt).toLocaleString('pt-BR')}`,`Prazo: ${new Date(tx.expiresAt).toLocaleString('pt-BR')}`,
      ...(tx.paidAt?[`Aprovação simulada: ${new Date(tx.paidAt).toLocaleString('pt-BR')}`]:[]),
      ...(tx.refundedAt?[`Estorno simulado: ${new Date(tx.refundedAt).toLocaleString('pt-BR')}`]:[]),
      'A referência acima não é um Pix Copia e Cola nem uma linha digitável de boleto.'].join('\n');
  }
  function download(orderId) {
    const blob=new Blob([documentText(orderId)],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`RAIZ_DEMONSTRACAO_${Number(orderId)}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function panel() {
    const data=summary();const esc=RaizPayments.escape;
    return `<section class="card payment-settings"><h3>Pagamentos locais de demonstração</h3><p class="payment-notice">${RaizPresentation.source==='apresentacao'?'Simulações salvas no Supabase.':'Registros deste navegador.'} Sem cobrança bancária ou gateway. Pedidos antigos sem transação não compõem estes totais.</p>
      <div class="grid-3"><p><strong>Aprovados:</strong> ${money(data.paidCents)}</p><p><strong>Aguardando:</strong> ${money(data.pendingCents)}</p><p><strong>Estornados:</strong> ${money(data.refundedCents)}</p></div>
      <div class="payment-list">${data.transactions.map(t=>`<article class="card soft"><strong>Pedido #${Number(t.orderId)} · ${esc(STATUS[t.state])}</strong><p>${esc(t.method.label)} · ${money(t.amountCents)}</p><p class="small muted">${esc(t.reference)}</p></article>`).join('') || '<p>Nenhuma transação local registrada.</p>'}</div></section>`;
  }
  window.RaizPaymentFlow={STATUS,money,plan,checkout,act,prepare,reconcile,transaction,summary,documentText,download,panel};
})();
