/* Contrato compartilhável com mobile: consultas com RLS e mutações somente por RPC. */
(() => {
  const PAGE = 12;
  const version = '2026-11-23';
  const missing = error => ['PGRST202','42883'].includes(error?.code) || (window.RaizDB?.isLocal && error?.status === 404);
  const cleanSearch = value => String(value || '').trim().slice(0,120).replace(/[,%()"'\\_*]/g,' ');
  const moneyCents = value => Math.round(Number(value) * 100);
  let capabilities = {};

  function errorText(error) {
    if (!navigator.onLine) return 'Sem conexão. Confira sua internet e tente novamente.';
    if (error?.name === 'AbortError' || /abort|timeout/i.test(error?.message || '')) return 'A conexão demorou mais que o esperado. Tente novamente.';
    if (missing(error)) return 'Esta ação está temporariamente indisponível. Tente mais tarde.';
    if (['42501','PGRST301'].includes(error?.code) || [401,403].includes(error?.status)) return 'Sua sessão ou permissão precisa ser verificada. Entre novamente.';
    if (error?.code === 'P0001' && error.message && error.message.length <= 200) return error.message;
    return 'Não foi possível concluir. Atualize os dados e tente novamente.';
  }

  async function execute(builder) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(),15000);
    try {
      const result = await (builder.abortSignal ? builder.abortSignal(controller.signal) : builder);
      if (result.error) throw result.error;
      return result;
    } finally { clearTimeout(timer); }
  }
  const rpc = async (db,name,args) => (await execute(db.rpc('raiz_'+name,args))).data;
  async function initialize(db) {
    try { capabilities = await rpc(db,'recursos') || {}; }
    catch(error) { if (!missing(error)) throw error; capabilities = {}; }
    return capabilities;
  }
  async function localRows(db,view,columns,options={}) {
    let rows=(await execute(db.from(view).select(columns).limit(100))).data || [];
    if(options.active!==undefined)rows=rows.filter(r=>r.ativo===options.active);
    if(options.category)rows=rows.filter(r=>r.categoria===options.category);
    if(options.status)rows=rows.filter(r=>r.status===options.status);
    if(options.stock!==undefined)rows=rows.filter(r=>r.estoque===options.stock);
    if(options.storeId!==undefined)rows=rows.filter(r=>r.loja_id===options.storeId);
    if(options.ids)rows=rows.filter(r=>options.ids.includes(r[options.idColumn || 'id']));
    const term=cleanSearch(options.search).toLocaleLowerCase('pt-BR');
    if(term)rows=rows.filter(r=>(options.searchColumns || ['nome']).some(k=>String(r[k] || '').toLocaleLowerCase('pt-BR').includes(term)));
    if(options.order)rows=[...rows].sort((a,b)=>(a[options.order]>b[options.order]?1:a[options.order]<b[options.order]?-1:0)*(options.ascending===false?-1:1));
    return rows;
  }
  async function page(db,view,columns,options={}) {
    if(window.RaizDB.isLocal && !options.publicCatalog){
      const rows=await localRows(db,view,columns,options),number=Math.max(0,Number(options.page)||0);
      return {rows:rows.slice(number*PAGE,(number+1)*PAGE),total:rows.length,page:number};
    }
    const number = Math.max(0,Number(options.page)||0);
    let request = db.from(view).select(columns,{count:'exact'});
    if (options.active!==undefined) request=request.eq('ativo',options.active);
    if (options.category) request=request.eq('categoria',options.category);
    if (options.status) request=request.eq('status',options.status);
    if (options.stock!==undefined) request=request.eq('estoque',options.stock);
    if (options.storeId!==undefined) request=request.eq('loja_id',options.storeId);
    if (options.ids) {
      if (!options.ids.length) return {rows:[],total:0,page:number};
      request=request.in(options.idColumn || 'id',options.ids);
    }
    const term=cleanSearch(options.search);
    if(term) request=request.or((options.searchColumns || ['nome']).map(column=>column+'.ilike.%'+term+'%').join(','));
    request=request.order(options.order || 'id',{ascending:options.ascending !== false}).range(number*PAGE,number*PAGE+PAGE-1);
    const result=await execute(request);
    if (result.count == null) throw new Error('Contagem indisponível');
    return {rows:result.data || [],total:result.count,page:number};
  }
  // Somente dados relacionais necessários ao carrinho/favoritos da própria conta.
  async function all(db,view,columns,order='id') {
    if(window.RaizDB.isLocal)return localRows(db,view,columns);
    const rows=[];
    for(let offset=0;offset<10000;offset+=200) {
      const result=await execute(db.from(view).select(columns).order(order).range(offset,offset+199));
      rows.push(...(result.data || []));
      if((result.data || []).length<200) return rows;
    }
    throw new Error('Limite de segurança da consulta atingido');
  }
  async function related(db,view,columns,key,ids) {
    if(window.RaizDB.isLocal)return (await localRows(db,view,columns)).filter(r=>ids.includes(r[key]));
    const result=[];
    const unique=[...new Set(ids)];
    for(let i=0;i<unique.length;i+=50) {
      const group=unique.slice(i,i+50);
      for(let offset=0;offset<10000;offset+=200) {
        const batch=await execute(db.from(view).select(columns).in(key,group).order('id').range(offset,offset+199));
        result.push(...(batch.data || []));
        if((batch.data || []).length<200) break;
        if(offset===9800) throw new Error('Consulta muito extensa');
      }
    }
    return result;
  }
  async function event(db,event,area,reference=crypto.randomUUID()) {
    if(!capabilities.eventos) return;
    try { await rpc(db,'evento',{p_evento:event,p_area:area,p_referencia:reference}); }
    catch(_) { /* Falha de telemetria não repete uma operação de negócio. */ }
  }

  // Cache exclusivo do catálogo público. Nunca recebe sessão, endereço, pedidos ou favoritos.
  let cacheDb;
  async function database() {
    if(!window.indexedDB) return null;
    if(cacheDb) return cacheDb;
    cacheDb=await new Promise((resolve,reject)=>{
      const open=indexedDB.open('raiz_catalogo_publico_v1',1);
      open.onupgradeneeded=()=>open.result.createObjectStore('paginas');
      open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);
    });
    return cacheDb;
  }
  async function cache(key,value) {
    try {
      const db=await database();if(!db) return null;
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction('paginas',value?'readwrite':'readonly');
        const store=tx.objectStore('paginas');
        const req=value?store.put({at:Date.now(),data:value},key):store.get(key);
        if(value){
          const keys=store.getAllKeys(), entries=store.getAll();
          entries.onsuccess=()=>{
            entries.result.map((entry,i)=>({key:keys.result[i],at:entry.at})).sort((a,b)=>b.at-a.at).forEach((entry,i)=>{
              if(i>=40 || Date.now()-entry.at>86400000)store.delete(entry.key);
            });
          };
        }
        let read;
        req.onsuccess=()=>{read=req.result;};
        tx.oncomplete=()=>resolve(value?value:(read && Date.now()-read.at<86400000?read.data:null));
        tx.onerror=()=>reject(tx.error);
      });
    } catch(_) { return null; }
  }
  async function catalog(db,options) {
    const cacheable=!options.ids;
    const key=JSON.stringify({page:options.page || 0,search:cleanSearch(options.search),category:options.category || '',order:options.order||'id',ascending:options.ascending!==false});
    try {
      const result=await page(db,'cliente_produtos','id,nome,categoria,vendedor_nome,preco,estoque,descricao,cuidados,loja_id,emoji',{
        ...options,searchColumns:['nome','vendedor_nome']
      });
      if(cacheable) {
        const safe={...result,rows:result.rows.map(p=>({id:p.id,nome:p.nome,categoria:p.categoria,vendedor_nome:p.vendedor_nome,preco:p.preco,estoque:p.estoque,emoji:p.emoji}))};
        await cache(key,safe);
      }
      return {...result,offline:false};
    } catch(error) {
      // Nunca transforma erro de autorização/SQL em sucesso de cache.
      if(cacheable && (!navigator.onLine || /fetch|network|abort|timeout/i.test(error?.message || ''))) {
        const stored=await cache(key);if(stored) return {...stored,offline:true};
      }
      throw error;
    }
  }
  window.RaizApi={PAGE,version,initialize,rpc,page,all,related,event,errorText,moneyCents,catalog,get capabilities(){return capabilities;}};
})();
