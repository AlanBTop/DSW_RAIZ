/* Preferências LOCAIS de apresentação. Nunca armazena PAN, CVV ou senha de banco. */
(() => {
  const TYPES={pix:'Pix',credit:'Cartão de crédito',debit:'Cartão de débito',boleto:'Boleto'};
  const KEY='raiz_local_payment_preferences_v1';
  const validType=value=>Object.hasOwn(TYPES,value);
  const uuid=value=>typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  const currentMonth=()=>{const now=new Date();return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;};
  const escape=value=>String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  function read() {
    try {const v=JSON.parse(localStorage.getItem(KEY)); return v && !Array.isArray(v) && typeof v==='object'?v:{};}
    catch (_) {return {};}
  }
  function writable() {
    if(!window.RaizDB?.isDemo || window.RaizPresentation?.source!=='local') throw new Error('Cadastros de pagamento disponíveis somente nos exemplos locais. Nenhum dado financeiro é enviado ao Supabase.');
  }
  function write(data) {writable(); localStorage.setItem(KEY,JSON.stringify(data));}
  function methods() {const data=read(); return Array.isArray(data.methods)?data.methods.filter(m=>m && validType(m.type) && uuid(m.id)):[];}
  function label(method) {
    return method.last4 ? `${TYPES[method.type]} · ${method.brand} final ${method.last4}` : TYPES[method.type] || '';
  }
  function saveMethod(values) {
    writable();
    if(!validType(values.type)) throw new Error('Selecione uma forma de pagamento válida.');
    const cards=['credit','debit'].includes(values.type);
    const last4=String(values.last4 || '').trim();
    const brand=String(values.brand || '').trim();
    const expiry=String(values.expiry || '');
    if(cards) {
      if(!/^[0-9]{4}$/.test(last4)) throw new Error('Informe somente os quatro últimos dígitos do cartão de exemplo.');
      if(!['Visa','Mastercard','Elo','Amex','Outra'].includes(brand)) throw new Error('Selecione a bandeira.');
      if(!/^\d{4}-\d{2}$/.test(expiry) || Number(expiry.slice(5))<1 || Number(expiry.slice(5))>12) throw new Error('Informe uma validade válida.');
      const now=new Date(); const month=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      if(expiry<month || Number(expiry.slice(0,4))>now.getFullYear()+25) throw new Error('Confira a validade: ela não pode estar vencida.');
    }
    const data=read(); const list=methods();
    if(values.id && !list.some(m=>m.id===values.id)) throw new Error('Cadastro não encontrado.');
    const duplicate=list.find(m=>m.id!==values.id && m.type===values.type && (!cards || m.last4===last4 && m.brand===brand));
    if(duplicate) throw new Error('Esta forma de pagamento já está cadastrada.');
    if(list.length>=12 && !values.id) throw new Error('Limite de 12 formas de pagamento de exemplo.');
    const entry={id:values.id || crypto.randomUUID(),type:values.type,...(cards?{last4,brand,expiry}:{})};
    data.methods=values.id?list.map(m=>m.id===values.id?entry:m):[...list,entry];
    data.defaultId=values.preferred || !list.length ? entry.id : data.defaultId;
    write(data); return entry;
  }
  function remove(id) {const data=read(); data.methods=methods().filter(m=>m.id!==id); if(data.defaultId===id) data.defaultId=data.methods[0]?.id || null; write(data);}
  function prefer(id) {if(!methods().some(m=>m.id===id)) throw new Error('Forma não encontrada.'); const data=read(); data.defaultId=id; write(data);}
  function accepted() {const list=read().accepted; return Array.isArray(list)?list.filter(validType):Object.keys(TYPES);}
  function saveAccepted(list) {if(!Array.isArray(list) || !list.length || list.some(t=>!validType(t))) throw new Error('Selecione pelo menos uma forma aceita.'); const data=read(); data.accepted=[...new Set(list)]; write(data);}
  function options() {
    const data=read(); const allowed=accepted();
    const saved=methods().filter(m=>allowed.includes(m.type));
    const list=[...saved.map(m=>({value:m.id,type:m.type,label:label(m),expired:m.expiry && m.expiry<currentMonth()})),
      ...['pix','boleto'].filter(t=>allowed.includes(t) && !saved.some(m=>m.type===t)).map(t=>({value:t,type:t,label:TYPES[t]}))].filter(m=>!m.expired);
    const preferred=list.find(o=>o.value===data.defaultId)?.value || list[0]?.value || '';
    return {list,preferred};
  }
  function selection(value) {const item=options().list.find(m=>m.value===value); if(!item) throw new Error('Selecione uma forma disponível. Para cartão, cadastre os dados de exemplo no perfil.'); return {type:item.type,label:item.label,simulated:true};}
  function cpfCnpj(value,kind) {
    if(!/^[\d.\-/\s]+$/.test(value)) return '';
    const n=value.replace(/\D/g,'');
    if(/^(\d)\1+$/.test(n)) return '';
    if(kind==='cpf') {
      if(n.length!==11) return '';
      for(let size=9;size<11;size++) {let sum=0;for(let i=0;i<size;i++) sum+=Number(n[i])*(size+1-i); const d=(sum*10)%11; if(Number(n[size])!==(d===10?0:d)) return '';}
    } else {
      if(n.length!==14) return '';
      for(let size=12;size<14;size++) {let sum=0;for(let i=0;i<size;i++) sum+=Number(n[i])*(2+(size-1-i)%8);const r=sum%11;if(Number(n[size])!==(r<2?0:11-r)) return '';}
    }
    return n;
  }
  function validatePix(type,value) {
    const v=String(value || '').trim(); let result='';
    if(type==='email' && v.length<=77 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) result=v.toLowerCase();
    if(type==='phone' && /^[+\d\s()\-]+$/.test(v)) {const n=v.replace(/\D/g,'').replace(/^55(?=\d{11}$)/,''); if(/^[1-9]\d9\d{8}$/.test(n)) result='+55'+n;}
    if(type==='random' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) result=v.toLowerCase();
    if(['cpf','cnpj'].includes(type)) result=cpfCnpj(v,type);
    if(!result) throw new Error('Chave Pix inválida para o tipo selecionado. A validação é de formato, não de cadastro bancário ou titularidade.');
    return result;
  }
  function savePix(role,type,value) {if(!['vendedor','entregador'].includes(role)) throw new Error('Perfil inválido.'); const data=read(); data['pix_'+role]={type,value:validatePix(type,value)}; write(data);}
  function pix(role) {return read()['pix_'+role] || null;}
  function removePix(role) {const data=read(); delete data['pix_'+role]; write(data);}
  function profile() {return {...(window.RaizDB?.auth?.getCurrentUser() || {}),...(read().profile || {})};}
  function saveProfile(patch) {const data=read(); data.profile={...(data.profile || {}),...patch}; write(data);}
  function pixForm(role) {
    const current=pix(role);
    return `<section class="card payment-settings"><h3>Chave Pix de exemplo para recebimento</h3>
      <p class="small muted">Somente exemplos locais. Não cadastra uma chave no banco nem executa transferências. Use dados fictícios.</p>
      <label class="field">Tipo da chave<select id="pixType" class="input">${[['email','E-mail'],['phone','Celular com DDD'],['cpf','CPF'],['cnpj','CNPJ'],['random','Aleatória (UUID)']].map(([v,t])=>`<option value="${v}" ${current?.type===v?'selected':''}>${t}</option>`).join('')}</select></label>
      <label class="field">Chave Pix<input id="pixValue" class="input" maxlength="100" value="${escape(current?.value || '')}" autocomplete="off"></label>
      <div class="raiz-route-actions"><button class="btn btn-primary" onclick="savePixPreference()">Salvar chave Pix de exemplo</button>${current?'<button class="btn btn-outline" onclick="removePixPreference()">Remover chave Pix</button>':''}</div>
    </section>`;
  }
  window.RaizPayments={TYPES,escape,read,methods,label,saveMethod,remove,prefer,accepted,saveAccepted,options,selection,validatePix,savePix,pix,removePix,profile,saveProfile,pixForm};
})();
