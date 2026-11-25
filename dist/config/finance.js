'use strict';

function createFinance(root = document, embedded = false) {
  const $=id=>root.getElementById(id);
  let currentModule='pedidos';
  const money=value=>Number.isFinite(value)?value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'Não disponível';
  const date=value=>{const d=value?new Date(value):null;return d&&!Number.isNaN(d.getTime())?d:null;};
  const stamp=value=>date(value)?.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})||'Data não disponível';
  const day=value=>{const d=date(value);return d?[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'):'';};
  const methods={pix:'Pix',credit:'Cartão de crédito',debit:'Cartão de débito',boleto:'Boleto'};
  const states={pending:['◷','Aguardando pagamento'],review:['◇','Em análise'],paid:['✓','Aprovado / pago'],cancelled:['×','Cancelado'],rejected:['×','Recusado'],expired:['×','Expirado'],refunded:['↶','Reembolsado / estornado'],unknown:['○','Sem registro']};
  const events={created:'Pagamento criado',approved_simulation:'Pagamento aprovado (simulado)',rejected_simulation:'Pagamento recusado (simulado)',refund_simulation:'Pagamento estornado (simulado)',cancelled:'Pagamento cancelado',expired:'Pagamento expirado'};
  let active,db,orders=[],payments=[],payState='loading',orderError=null,paymentError=null,busy=false,page=0,loaded=false;
  let filters={from:'',to:'',status:'',method:'',min:'',max:''};
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined&&text!==null)n.textContent=text;if(cls)n.className=cls;return n;};
  const button=(text,fn,cls)=>{const b=el('button',text,cls);b.type='button';b.onclick=fn;return b;};
  const card=(title,text)=>{const c=el('div',null,'fin-card');c.append(el('h3',title));if(text)c.append(el('p',text));return c;};
  const empty=(title,text)=>{const n=el('div',null,'fin-empty');n.append(el('h3',title),el('p',text));return n;};
  const badge=state=>{const s=states[state]||states.unknown;return el('span',s.join(' '),'fin-badge '+(state==='rejected'||state==='expired'?'cancelled':states[state]?state:'unknown'));};
  const group=state=>['rejected','expired','cancelled'].includes(state)?'cancelled':states[state]?state:'unknown';
  const paymentMap=()=>new Map(payments.map(p=>[String(p.pedido_id),p]));
  const rows=()=>{const map=paymentMap();return orders.map(o=>({...o,payment:map.get(String(o.id))}));};
  const missing=error=>['PGRST202','42883'].includes(error?.code);
  function table(head,body,label) {
    const wrap=el('div',null,'fin-table-wrap');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',label+'; tabela com rolagem horizontal');
    const t=el('table'),caption=el('caption',label);caption.hidden=true;
    const tr=el('tr');head.forEach(h=>{const th=el('th',h);th.scope='col';tr.append(th);});const thead=el('thead');thead.append(tr);const tbody=el('tbody');
    body.forEach(cells=>{const row=el('tr');cells.forEach(value=>{const td=el('td');td.append(value instanceof Node?value:document.createTextNode(String(value??'—')));row.append(td);});tbody.append(row);});
    t.append(caption,thead,tbody);wrap.append(t);return wrap;
  }
  function errorBox(text) {const n=el('div',null,'fin-error');n.setAttribute('role','alert');n.append(el('p',text),button('Tentar novamente',load));return n;}
  function filtered() {
    return rows().filter(o=>{
      const created=day(o.created_at||o.payment?.criado_em||o.data_pedido),p=o.payment;
      return (!filters.from||(created&&created>=filters.from))&&(!filters.to||(created&&created<=filters.to))&&
        (!filters.status||group(p?.estado)===filters.status)&&(!filters.method||p?.metodo===filters.method)&&
        (filters.min===''||Number(o.total)>=Number(filters.min))&&(filters.max===''||Number(o.total)<=Number(filters.max));
    });
  }
  function metrics() {
    const m=$('metrics');m.replaceChildren();const today=day(new Date()),all=rows();
    const paid=payments.filter(p=>p.estado==='paid'),pending=payments.filter(p=>['pending','review'].includes(p.estado));
    const available=payState==='ready';
    const items=[['Pedidos de hoje',String(all.filter(o=>day(o.created_at||o.payment?.criado_em||o.data_pedido)===today).length),'Data de criação do pedido'],['Aprovados registrados',available?money(paid.reduce((n,p)=>n+Number(p.valor_centavos||0),0)/100):'—',available?paid.length+' pagamentos simulados':'Pagamento indisponível'],['Pendentes registrados',available?money(pending.reduce((n,p)=>n+Number(p.valor_centavos||0),0)/100):'—',available?pending.length+' aguardando / em análise':'Pagamento indisponível'],['A receber','—','Repasses sem integração']];
    if(orderError||!loaded)items[0][1]='—';
    for(const [title,value,note] of items){const c=el('div',null,'fin-metric');c.append(el('span',title),el('strong',value),el('small',note));m.append(c);}
    const unmatched=all.filter(o=>!o.payment).length;
    $('coverage').textContent=available?'A API retorna até 100 pagamentos recentes. Os indicadores financeiros somam apenas os '+payments.length+' registros retornados.'+(unmatched?' '+unmatched+' pedidos sem pagamento retornado; não são tratados como pendentes.':''):'Não foi possível obter os pagamentos. Valores financeiros não foram calculados.';
  }
  function showOrders() {
    const target=$('orderContent');target.replaceChildren();$('orderCount').textContent='';
    if(orderError){target.append(errorBox('Não foi possível carregar os pedidos. '+RaizApi.errorText(orderError)));return;}
    if(!loaded){target.append(el('div','Carregando pedidos…','fin-loading'));return;}
    const list=filtered();$('orderCount').textContent=list.length+' pedidos nesta seleção';
    if(!list.length){target.append(empty(orders.length?'Nenhum pedido com estes filtros':'Seus pedidos aparecerão aqui',orders.length?'Ajuste o período, o status ou os valores.':'Quando uma compra for registrada, você poderá acompanhar o pagamento e a entrega.'));return;}
    const count=Math.ceil(list.length/15);page=Math.min(page,count-1);
    target.append(table(['Pedido','Criado em','Valor do pedido','Pagamento','Meio','Andamento','Ação'],list.slice(page*15,page*15+15).map(o=>[
      '#'+o.id,stamp(o.created_at||o.payment?.criado_em||o.data_pedido),money(Number(o.total)),badge(o.payment?.estado),methods[o.payment?.metodo]||'Não disponível',o.status,button('Ver #'+o.id,()=>detail(o))
    ]),'Lista de pedidos'));
    if(count>1){const pager=el('div',null,'fin-pager');const prev=button('← Anterior',()=>{page--;showOrders();}),next=button('Próxima →',()=>{page++;showOrders();});prev.disabled=page===0;next.disabled=page===count-1;pager.append(prev,el('span',(page+1)+' de '+count),next);target.append(pager);}
  }
  function detail(o) {
    const body=$('detailBody');body.replaceChildren();const h=el('h2','Pedido #'+o.id);h.id='detailTitle';body.append(h,badge(o.payment?.estado));
    const dl=el('dl',null,'fin-detail-grid'),p=o.payment;
    for(const [name,value] of [['Andamento',o.status],['Valor do pedido',money(Number(o.total))],['Pagamento registrado',p?money(Number(p.valor_centavos)/100):'Não disponível'],['Forma',methods[p?.metodo]||'Não disponível'],['Parcelas',p?.parcelas||'Não disponível'],['Referência',p?.referencia||'Não disponível']]){const pair=el('div');pair.append(el('dt',name),el('dd',String(value)));dl.append(pair);}body.append(dl);
    if(p)body.append(el('p','Pagamento simulado. Não corresponde a uma cobrança real.','fin-muted'));
    body.append(el('h3','Histórico do pagamento'));
    if(p?.eventos?.length){const timeline=el('ol',null,'fin-timeline');[...p.eventos].sort((a,b)=>(date(a.em)?.getTime()||0)-(date(b.em)?.getTime()||0)).forEach(e=>{const li=el('li',events[e.acao]||'Evento registrado');const t=el('time',stamp(e.em));if(date(e.em))t.dateTime=date(e.em).toISOString();li.append(t);timeline.append(li);});body.append(timeline);}
    else body.append(el('p','Não há eventos de pagamento retornados para este pedido.'));
    body.append(el('p','O histórico detalhado de mudanças da entrega ainda não é fornecido pela API. Andamento atual: '+o.status+'.','fin-muted'));
    if(active.role==='vendedor'&&o.status==='Pendente'&&p?.estado==='paid')body.append(button('Separar produtos / iniciar preparo',()=>prepare(o),'fin-primary'));
    if(p?.estado==='paid')body.append(el('p','Estorno: a API atual permite a simulação apenas na conta do cliente, antes do preparo. O estorno pelo lojista depende de uma operação autorizada no servidor.','fin-muted'));
    body.append(el('h3','Dados para conferência'));
    const address=el('p','Endereço de entrega: ••••••••','fin-address');
    if(o.endereco_entrega){const reveal=button('Mostrar endereço',()=>{const shown=reveal.getAttribute('aria-pressed')==='true';address.textContent='Endereço de entrega: '+(shown?'••••••••':o.endereco_entrega);reveal.textContent=shown?'Mostrar endereço':'Ocultar endereço';reveal.setAttribute('aria-pressed',String(!shown));});reveal.setAttribute('aria-pressed','false');body.append(address,reveal);}else body.append(el('p','Endereço não disponível nesta consulta.'));
    body.append(el('p','CPF: •••.•••.•••-•• · não fornecido. IP e score de risco: não fornecidos.','fin-muted'));
    if(o.status==='Entregue')body.append(el('p','Pedido marcado como entregue. Anexar um comprovante exige armazenamento e registro no servidor.','fin-muted'));
    $('detail').showModal();
  }
  async function prepare(o) {
    $('detail').close();$('confirm').returnValue='';$('confirm').showModal();
    const accepted=await new Promise(resolve=>$('confirm').addEventListener('close',()=>resolve($('confirm').returnValue==='confirm'),{once:true}));
    if(!accepted||busy)return;
    busy=true;$('refresh').disabled=true;$('feedback').textContent='Registrando preparo…';
    try {await RaizApi.rpc(db,'preparo',{p_pedido:o.id});await load();$('feedback').textContent='Pedido #'+o.id+' marcado como em preparo.';}
    catch(e){$('feedback').textContent=RaizApi.errorText(e);}finally{busy=false;$('refresh').disabled=false;}
  }
  function exportRows(list) {
    return [['RAIZ — pagamentos simulados; sem movimentação financeira'],['Gerado em',new Date().toLocaleString('pt-BR')],['Período de criação',filters.from||'Início',filters.to||'Hoje'],['Cobertura','Até 100 pagamentos recentes da área; taxas e repasses não integrados'],[],['Pedido','Criação do pedido','Valor do pedido (BRL)','Valor do pagamento (BRL)','Status do pagamento','Meio','Parcelas','Andamento','Taxas','Líquido','Repasse'],...list.map(o=>[o.id,stamp(o.created_at||o.payment?.criado_em||o.data_pedido),Number(o.total),o.payment?Number(o.payment.valor_centavos)/100:'Não disponível',(states[o.payment?.estado]||states.unknown)[1],methods[o.payment?.metodo]||'Não disponível',o.payment?.parcelas||'Não disponível',o.status,'Não disponível','Não disponível','Não disponível'])];
  }
  function print(list) {
    const report=$('printReport');report.replaceChildren(el('h1','Vendas e pagamentos · RAIZ'),el('p','Pagamentos simulados. Sem movimentação de dinheiro.'),el('p','Período: '+(filters.from||'Início')+' a '+(filters.to||'Hoje')+' · Gerado em '+new Date().toLocaleString('pt-BR')),el('p','Até 100 pagamentos recentes. Taxas, líquido e repasses não estão integrados.'));
    const data=exportRows(list);report.append(table(data[5],data.slice(6),'Relatório de pagamentos'));
    if(!embedded){window.print();return;}
    const printable=report.cloneNode(true);
    document.body.append(printable);
    window.addEventListener('afterprint',()=>printable.remove(),{once:true});
    window.print();
  }
  function settlement() {
    const target=$('settlement');target.replaceChildren();
    if(!loaded){target.append(el('div','Carregando registros…','fin-loading'));return;}
    const list=filtered(),available=payState==='ready'&&!orderError,paid=list.filter(o=>o.payment?.estado==='paid');
    const summary=el('div',null,'fin-metrics');
    for(const [label,value,note] of [['Bruto aprovado registrado',available?money(paid.reduce((n,o)=>n+Number(o.payment.valor_centavos),0)/100):'—','Somente pagamentos retornados, após filtros'],['Taxas descontadas','—','Sem dados de gateway'],['Valor líquido','—','Não calculado sem taxas'],['Estornos registrados',available?money(list.filter(o=>o.payment?.estado==='refunded').reduce((n,o)=>n+Number(o.payment.valor_centavos),0)/100):'—','Estornos simulados, após filtros']]){const c=el('div',null,'fin-metric');c.append(el('span',label),el('strong',value),el('small',note));summary.append(c);}target.append(summary);
    const schedule=card('Agenda de recebíveis','Nenhuma agenda de repasses está conectada. Aprovação no simulador não gera saldo a receber.');schedule.append(el('p','Prazos como Pix imediato ou cartão em 14 / 30 dias dependem do contrato com o provedor. Não foram atribuídos prazos aos seus pedidos.','fin-muted'));target.append(schedule);
    if(payState==='error'||payState==='missing')target.append(errorBox('Pagamentos indisponíveis. '+(payState==='missing'?'O serviço de pagamentos não está habilitado.':RaizApi.errorText(paymentError))));
    if(orderError){target.append(errorBox('Os pedidos não puderam ser carregados.'));return;}
    const report=card('Relatórios da seleção','Exporte os pedidos filtrados. Taxas, antecipação, valor líquido e repasse permanecem identificados como não disponíveis.');
    const actions=el('div',null,'fin-actions');for(const [label,fn] of [['↓ CSV',()=>RaizFinanceExport.csv(exportRows(list))],['↓ Excel (.xlsx)',()=>RaizFinanceExport.excel(exportRows(list))],['PDF / imprimir',()=>print(list)]]){const b=button(label,fn);b.disabled=!list.length;actions.append(b);}report.append(actions);target.append(report);
    if(!list.length){target.append(empty('Nenhuma transação nesta seleção','Ajuste os filtros ou aguarde um novo pedido.'));return;}
    // O detalhe acompanha o filtro inteiro, com a mesma paginação dos pedidos.
    const transactionRows=list.filter(o=>o.payment).slice(0,15);
    if(!transactionRows.length){
      target.append(empty('Nenhum pagamento retornado','Os pedidos selecionados continuam disponíveis no relatório.'));
      return;
    }
    target.append(table(['Pedido','Bruto do pagamento','Taxa','Antecipação','Líquido','Recebimento'],transactionRows.map(o=>['#'+o.id,o.payment?money(Number(o.payment.valor_centavos)/100):'Não disponível','Não disponível','Não disponível','Não disponível','Sem integração']),'Conciliação por transação'));
    if(list.length>transactionRows.length)target.append(el('p','A tabela mostra até 15 pagamentos registrados. As exportações incluem todos os '+list.length+' pedidos filtrados.','fin-muted'));
  }
  function security() {
    const target=$('security');target.replaceChildren();
    const columns=el('div',null,'fin-columns');columns.append(card('Antifraude sem integração','Score de risco, CPF e IP do comprador não são fornecidos pela API atual. A ausência de score não significa baixo risco.'),card('Disputas e chargebacks','Sem conexão com um provedor de disputas. Não é possível determinar a quantidade de casos ou os prazos de resposta.'));target.append(columns);
    const evidence=card('Comprovantes e resposta a disputas','O envio de entrega, assinatura, fotos e rastreio exige uma disputa registrada, armazenamento privado e um destinatário no provedor. Esses recursos ainda não estão conectados.');evidence.append(el('p','Quando houver integração, cada caso deverá apresentar motivo, status, prazo de resposta e confirmação antes do envio.','fin-muted'));target.append(evidence);
    if(!loaded){target.append(el('div','Carregando pedidos para conferência…','fin-loading'));return;}
    if(orderError){target.append(errorBox('Não foi possível carregar os pedidos para conferência.'));return;}
    const list=filtered();if(!list.length){target.append(empty('Nenhum pedido para conferir','Os pedidos disponíveis para sua conta aparecerão aqui.'));return;}
    target.append(table(['Pedido','Andamento','Risco','CPF','IP','Conferência'],list.slice(0,15).map(o=>['#'+o.id,o.status,'Não avaliado','•••.•••.•••-••','Não fornecido',button('Conferir #'+o.id,()=>detail(o))]),'Pedidos para conferência'));
    if(list.length>15)target.append(el('p','Mostrando os 15 primeiros. Use Pedidos e status para percorrer toda a seleção.','fin-muted'));
  }
  function render(){metrics();showOrders();settlement();security();}
  async function load() {
    if($('app').hidden)return;
    $('refresh').disabled=true;$('workspace').setAttribute('aria-busy','true');$('feedback').textContent='Carregando dados…';loaded=false;payState='loading';render();
    const result=await Promise.allSettled([
      RaizApi.all(db,active.role==='vendedor'?'vendedor_pedidos':'cliente_pedidos','*'),
      RaizApi.rpc(db,'pagamentos')
    ]);
    if($('app').hidden)return;
    orders=result[0].status==='fulfilled'?[...result[0].value].reverse():[];orderError=result[0].status==='rejected'?result[0].reason:null;
    payments=result[1].status==='fulfilled'&&Array.isArray(result[1].value)?result[1].value:[];
    paymentError=result[1].status==='rejected'?result[1].reason:result[1].value!==null&&!Array.isArray(result[1].value)?{code:'INVALID_RESPONSE'}:null;
    payState=paymentError?(missing(paymentError)?'missing':'error'):result[1].value===null?'missing':'ready';
    loaded=true;page=0;render();$('workspace').removeAttribute('aria-busy');$('refresh').disabled=false;
    $('feedback').textContent=orderError?'Falha ao carregar pedidos. Tente novamente.':payState!=='ready'?'Pedidos carregados. Pagamentos indisponíveis; nenhum valor financeiro foi estimado.':'Dados atualizados às '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'.';
  }
  function navigate(focus=false) {
    const modules=['pedidos','meios','repasses','seguranca'],requested=embedded?currentModule:location.hash.slice(1),selected=modules.includes(requested)?requested:'pedidos';
    for(const id of modules)$(id).hidden=id!==selected;
    root.querySelectorAll('[data-module]').forEach(a=>{if(a.dataset.module===selected)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    $('filters').hidden=selected==='meios';
    if(focus){const heading=$(selected).querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true});}
  }
  function calculator() {
    const price=Number($('price').value),minimum=Number($('minimum').value),limit=Number($('installments').value),rate=$('interestMode').value==='customer'?Number($('interest').value)/100:0;
    let n=limit,part=0;
    for(;n>=1;n--){part=rate?price*rate/(1-Math.pow(1+rate,-n)):price/n;if(part>=minimum||n===1)break;}
    const total=Math.round(part*100)*n/100;
    const credit=$('method-credit').checked?n+'× de '+money(Math.round(part*100)/100)+' · Total aproximado: '+money(total)+'.'+(part<minimum?' O preço é inferior ao mínimo por parcela.':''):'Crédito desativado na prévia.';
    const pix=$('method-pix').checked?'Pix com desconto: '+money(Math.round(price*(1-Number($('discount').value)/100)*100)/100)+'.':'Pix desativado na prévia.';
    $('preview').textContent=credit+' '+pix+' Prévia de planejamento.';
  }
  function setupMethods() {
    const admin=active.role==='admin';
    if(admin)$('methodsHelp').textContent='Marque os meios para comparar uma configuração. As alterações valem apenas para esta prévia.';
    for(const [method,label] of Object.entries(methods)){
      const item=el('div',null,'fin-method'),field=el('label',label),toggle=el('input'),status=el('small','Disponível no simulador');
      toggle.id='method-'+method;
      toggle.type='checkbox';
      toggle.checked=true;
      toggle.disabled=!admin;
      if(admin){
        status.textContent='Ativo na prévia';
        toggle.onchange=()=>{
          status.textContent=toggle.checked?'Ativo na prévia':'Desativado na prévia';
          if($('calculator').checkValidity())calculator();
        };
      }
      field.append(toggle);
      item.append(field,status);
      $('methods').append(item);
    }
    $('calculator').onsubmit=e=>{e.preventDefault();calculator();};
    calculator();
  }
  function setupSettlementPlanner() {
    $('settlementPlanner').hidden=false;
    $('approvalDate').value=day(new Date());
    $('settlementCalculator').onsubmit=e=>{
      e.preventDefault();
      const gross=Math.round(Number($('grossAmount').value)*100);
      const fee=Math.round(gross*Number($('transactionRate').value)/100);
      const advance=Math.round((gross-fee)*Number($('advanceRate').value)/100);
      const available=new Date($('approvalDate').value+'T12:00:00');
      available.setDate(available.getDate()+Number($('settlementDays').value));
      const output=$('settlementPreview');
      output.hidden=false;
      output.textContent='Tarifa: '+money(fee/100)+' · Antecipação: '+money(advance/100)+' · Líquido simulado: '+money((gross-fee-advance)/100)+' · Disponibilidade simulada: '+available.toLocaleDateString('pt-BR');
    };
  }
  async function boot(profile, client) {
    try {
      if(embedded){
        active=profile;
        db=client;
        $('scope').textContent='ADMINISTRAÇÃO · TODAS AS LOJAS';
        root.querySelectorAll('[data-module]').forEach(link=>link.onclick=event=>{
          event.preventDefault();
          currentModule=link.dataset.module;
          navigate(true);
        });
      }else{
      active=await RaizAccess.session();const requested=new URLSearchParams(location.search).get('role')==='admin'?'admin':'vendedor';
      if(!active){location.replace('../login.html?modo=online&role='+requested+'&destino=financeiro');return;}
      if(!['admin','vendedor'].includes(active.role)){$('gate').replaceChildren(el('h1','Acesso restrito'),el('p','Esta área está disponível para administradores e vendedores aprovados.'));const a=el('a','Voltar à minha área');a.href='../'+active.role+'/index.html?modo=online';$('gate').append(a);return;}
      db=RaizAccess.client();$('back').href='../'+active.role+'/index.html?modo=online';$('back').textContent=active.role==='admin'?'Painel administrativo':'Minha loja';$('scope').textContent=active.role==='admin'?'ADMINISTRAÇÃO · TODAS AS LOJAS':'PAINEL DO VENDEDOR · SUA LOJA';
      $('gate').hidden=true;
      db.auth.onAuthStateChange(event=>{if(['SIGNED_OUT','USER_DELETED'].includes(event)){$('app').hidden=true;$('detail').close();$('confirm').close();orders=[];payments=[];location.replace('../login.html?modo=online&role='+active.role+'&destino=financeiro');}});
      window.addEventListener('hashchange',()=>navigate(true));
      }
      $('app').hidden=false;navigate();
      $('refresh').onclick=()=>{if(!busy)load();};
      $('filterForm').onsubmit=e=>{e.preventDefault();if($('from').value&&$('to').value&&$('from').value>$('to').value){$('feedback').textContent='A data inicial deve ser anterior à final.';return;}if($('min').value!==''&&$('max').value!==''&&Number($('min').value)>Number($('max').value)){$('feedback').textContent='O valor mínimo deve ser menor ou igual ao máximo.';return;}for(const key of Object.keys(filters))filters[key]=$(key).value;page=0;render();$('feedback').textContent='Filtros aplicados: '+filtered().length+' pedidos.';};
      $('clear').onclick=()=>{$('filterForm').reset();for(const key of Object.keys(filters))filters[key]='';page=0;render();$('feedback').textContent='Filtros removidos.';};
      setupMethods();
      if(active.role==='admin')setupSettlementPlanner();
      await load();
    } catch(error){if(embedded)throw error;$('app').hidden=true;$('gate').hidden=false;$('gate').replaceChildren(el('h1','Não foi possível abrir o painel'),el('p',error instanceof Error?error.message:RaizApi.errorText(error)),button('Tentar novamente',()=>location.reload()));}
  }
  return {boot};
}

if(document.getElementById('gate') && document.getElementById('settlement'))createFinance().boot();
