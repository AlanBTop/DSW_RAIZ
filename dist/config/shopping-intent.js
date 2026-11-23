/* Somente IDs e quantidades no carrinho visitante; preços e pedidos são validados no servidor. */
(() => {
  const CART='raiz_public_cart_v1', INTENT='raiz_purchase_intent_v1';
  function items(value) {
    if(!Array.isArray(value))return [];
    const unique=new Map();
    for(const row of value.slice(0,50)) {
      const id=Number(row?.id),quantity=Number(row?.quantity);
      if(Number.isSafeInteger(id)&&id>0&&Number.isInteger(quantity)&&quantity>0&&quantity<=99)unique.set(id,{id,quantity});
    }
    return [...unique.values()];
  }
  function cart() {try{return items(JSON.parse(localStorage.getItem(CART)));}catch(_){return [];}}
  function save(value) {const rows=items(value);localStorage.setItem(CART,JSON.stringify(rows));window.dispatchEvent(new Event('raiz-cart-updated'));return rows;}
  function add(id,quantity=1) {
    const incoming=items([{id,quantity}])[0];if(!incoming)throw new Error('Confira a quantidade.');
    const rows=cart(),current=rows.find(r=>r.id===incoming.id);
    if(current){if(current.quantity+incoming.quantity>99)throw new Error('O limite é de 99 unidades por produto.');current.quantity+=incoming.quantity;}
    else {if(rows.length>=50)throw new Error('O carrinho comporta até 50 produtos.');rows.push(incoming);}
    return save(rows);
  }
  function setIntent(value,source='direct') {
    const rows=items(value);if(!rows.length)throw new Error('Escolha um produto para continuar.');
    sessionStorage.setItem(INTENT,JSON.stringify({items:rows,source:source==='cart'?'cart':'direct',at:Date.now()}));
  }
  function intent() {
    try {
      const value=JSON.parse(sessionStorage.getItem(INTENT));
      if(!value||Date.now()-value.at>3600000||!Number.isFinite(value.at))return null;
      const rows=items(value.items);if(!rows.length)return null;
      return {...value,items:rows};
    }catch(_){return null;}
  }
  function clear(){sessionStorage.removeItem(INTENT);}
  async function resume(db,currentCart) {
    const pending=intent();if(!pending)return false;
    const products=await RaizApi.related(db,'cliente_produtos','id,nome,estoque,loja_id,ativo','id',pending.items.map(r=>r.id));
    const stores=new Set(products.map(p=>p.loja_id));
    if(products.length!==pending.items.length||stores.size!==1||!products.every(p=>p.ativo&&p.loja_id)) {
      clear();throw {code:'P0001',message:'A seleção mudou ou contém lojas diferentes. Revise o carrinho no marketplace.'};
    }
    // Quantidades finais persistidas tornam uma repetição após falha de rede idempotente.
    if(!pending.targets) {
      pending.targets=pending.items.map(row=>({id:row.id,quantity:row.quantity+Number(currentCart.find(c=>c.produto_id===row.id)?.quantidade||0)}));
      sessionStorage.setItem(INTENT,JSON.stringify(pending));
    }
    const targets=items(pending.targets);
    if(targets.length!==pending.items.length||targets.some(row=>!pending.items.some(i=>i.id===row.id)||!products.some(p=>p.id===row.id&&row.quantity<=p.estoque))) {
      clear();throw {code:'P0001',message:'A quantidade selecionada excede o estoque disponível. Revise o carrinho.'};
    }
    for(const row of targets)await RaizApi.rpc(db,'item_cliente',{p_produto:row.id,p_quantidade:row.quantity,p_favorito:null});
    if(pending.source==='cart')save(cart().map(row=>({...row,quantity:row.quantity-(pending.items.find(i=>i.id===row.id)?.quantity||0)})));
    clear();return true;
  }
  window.RaizShopping={cart,save,add,setIntent,intent,clear,resume};
})();
