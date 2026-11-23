begin;

-- O checkout passa a gravar todas as tabelas na mesma transação.
drop trigger if exists trg_novo_pedido_cliente on cliente.pedidos;
drop trigger if exists trg_itens_pedido_cliente on cliente.itens_pedido;
drop trigger if exists trg_status_vendedor on vendedor.pedidos;
drop trigger if exists trg_etapa_entregador on entregador.corridas;

alter table cliente.pedidos add column if not exists chave_requisicao uuid;
create unique index if not exists raiz_pedido_requisicao on cliente.pedidos(cliente_id, chave_requisicao);
create sequence if not exists cliente.raiz_pedido_id as bigint;
select setval('cliente.raiz_pedido_id', greatest(
  coalesce((select max(id) from cliente.pedidos),0),
  coalesce((select max(id) from vendedor.pedidos),0),
  coalesce((select max(id) from entregador.corridas),0), 1));
alter table cliente.produtos add column if not exists loja_id integer references vendedor.lojas(id);
alter table vendedor.produtos add column if not exists moderado boolean not null default false;
create or replace view public.cliente_produtos with (security_invoker = true) as select * from cliente.produtos;
-- O esquema legado espelhava os produtos do vendedor com o mesmo ID.
update cliente.produtos c set loja_id = v.loja_id
  from vendedor.produtos v where v.id = c.id and v.nome = c.nome and c.loja_id is null;
select setval(pg_get_serial_sequence('vendedor.produtos','id'), greatest(
  coalesce((select max(id) from cliente.produtos),0),
  coalesce((select max(id) from vendedor.produtos),0),1));

create or replace function public.fn_sync_produto_vendedor_cliente()
returns trigger language plpgsql set search_path = '' as $$
begin
  insert into cliente.produtos(id, loja_id, nome, categoria, vendedor_nome, preco, emoji, tag, rating, reviews,
    estoque, ativo, descricao, cuidados, porte, fragil)
  select new.id, new.loja_id, new.nome, new.categoria, l.nome, new.preco, new.emoji, new.tag, new.rating, new.reviews,
    new.estoque, (new.ativo and not new.moderado), new.descricao, new.cuidados, new.porte, new.fragil
  from vendedor.lojas l where l.id = new.loja_id
  on conflict(id) do update set loja_id=excluded.loja_id, nome=excluded.nome, categoria=excluded.categoria,
    vendedor_nome=excluded.vendedor_nome, preco=excluded.preco, emoji=excluded.emoji, tag=excluded.tag,
    estoque=excluded.estoque, ativo=excluded.ativo, descricao=excluded.descricao, cuidados=excluded.cuidados,
    porte=excluded.porte, fragil=excluded.fragil, updated_at=now();
  return new;
end $$;
drop trigger if exists trg_produto_vendedor on vendedor.produtos;
create trigger trg_produto_vendedor after insert or update on vendedor.produtos
for each row execute function public.fn_sync_produto_vendedor_cliente();

create or replace function public.raiz_endereco(p_endereco text)
returns void language plpgsql security definer set search_path = '' as $$
declare u auth.users;
begin
  if public.raiz_acesso() is distinct from 'cliente' then raise exception 'Acesso de cliente necessário'; end if;
  if p_endereco is null or length(btrim(p_endereco)) not between 5 and 300 then raise exception 'Informe um endereço completo'; end if;
  select * into strict u from auth.users where id=auth.uid();
  insert into cliente.usuarios(id,nome,email,telefone,endereco,bairro,cidade,estado,cep)
  values(u.id,left(coalesce(u.raw_user_meta_data->>'full_name',split_part(u.email,'@',1),'Cliente'),150),
    left(u.email,150),left(u.raw_user_meta_data->>'telefone',30),btrim(p_endereco),'','','',null)
  on conflict(id) do update set endereco=excluded.endereco,updated_at=now();
end $$;

create or replace function public.raiz_item_cliente(p_produto integer, p_quantidade integer, p_favorito boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.raiz_acesso() is distinct from 'cliente' then raise exception 'Acesso de cliente necessário'; end if;
  perform id from cliente.usuarios where id=auth.uid() for update;
  if not found then raise exception 'Cadastre seu endereço antes de continuar'; end if;
  if p_favorito is not null then
    if p_favorito then
      insert into cliente.favoritos(cliente_id,produto_id)
      select auth.uid(),id from cliente.produtos where id=p_produto and ativo on conflict do nothing;
    else delete from cliente.favoritos where cliente_id=auth.uid() and produto_id=p_produto;
    end if;
  elsif p_quantidade=0 then
    delete from cliente.carrinho where cliente_id=auth.uid() and produto_id=p_produto;
  elsif p_quantidade between 1 and 99 then
    insert into cliente.carrinho(cliente_id,produto_id,quantidade)
      select auth.uid(),id,p_quantidade from cliente.produtos where id=p_produto and ativo and estoque>=p_quantidade
      on conflict(cliente_id,produto_id) do update set quantidade=excluded.quantidade,updated_at=now();
    if not found then raise exception 'Produto indisponível ou estoque insuficiente'; end if;
  else raise exception 'Quantidade inválida';
  end if;
end $$;

create or replace function public.raiz_checkout(p_requisicao uuid)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  pedido bigint; endereco text; cliente_nome text; loja integer; subtotal numeric := 0;
  frete constant numeric := 15; item record; itens integer := 0; primeiro record;
  loja_info vendedor.lojas; momento text := to_char(now() at time zone 'America/Cuiaba','DD/MM/YYYY HH24:MI');
begin
  if public.raiz_acesso() is distinct from 'cliente' or p_requisicao is null then raise exception 'Checkout inválido'; end if;
  select u.endereco,u.nome into strict endereco,cliente_nome from cliente.usuarios u where u.id=auth.uid() for update;
  select id into pedido from cliente.pedidos where cliente_id=auth.uid() and chave_requisicao=p_requisicao;
  if found then return pedido; end if;
  if length(btrim(endereco)) < 5 then raise exception 'Cadastre o endereço de entrega'; end if;
  -- Trava os itens e o estoque na mesma ordem em todo checkout.
  for item in
    select c.produto_id,c.quantidade,v.loja_id,v.estoque,(v.ativo and not v.moderado) as ativo,v.nome,v.preco,v.emoji,v.fragil,v.porte
    from cliente.carrinho c join vendedor.produtos v on v.id=c.produto_id
    join cliente.produtos p on p.id=v.id and p.loja_id=v.loja_id
    where c.cliente_id=auth.uid() order by v.id for update of c,v
  loop
    if not item.ativo or item.estoque < item.quantidade or item.loja_id is null then
      raise exception 'Estoque insuficiente ou produto indisponível';
    end if;
    if loja is null then loja:=item.loja_id; primeiro:=item; end if;
    if loja <> item.loja_id then raise exception 'Finalize um pedido por loja'; end if;
    subtotal:=subtotal+item.preco*item.quantidade; itens:=itens+1;
  end loop;
  if itens=0 or itens<>(select count(*) from cliente.carrinho where cliente_id=auth.uid()) then
    raise exception 'O carrinho está vazio ou contém produtos sem loja vinculada';
  end if;
  select * into strict loja_info from vendedor.lojas where id=loja;
  pedido:=nextval('cliente.raiz_pedido_id');
  insert into cliente.pedidos(id,cliente_id,cliente_nome,data_formatada,subtotal,frete,total,forma_pagamento,endereco_entrega,chave_requisicao)
  values(pedido,auth.uid(),cliente_nome,momento,subtotal,frete,subtotal+frete,'Sem pagamento integrado',endereco,p_requisicao);
  insert into vendedor.pedidos(id,loja_id,cliente_nome,data_pedido,subtotal,total,endereco_entrega)
  values(pedido,loja,cliente_nome,momento,subtotal,subtotal+frete,endereco);
  for item in select v.*,c.quantidade from cliente.carrinho c join vendedor.produtos v on v.id=c.produto_id
    where c.cliente_id=auth.uid() order by v.id
  loop
    insert into cliente.itens_pedido(pedido_id,produto_id,produto_nome,quantidade,preco_unitario,emoji)
    values(pedido,item.id,item.nome,item.quantidade,item.preco,item.emoji);
    insert into vendedor.itens_pedido(pedido_id,produto_id,produto_nome,quantidade,preco_unitario,emoji)
    values(pedido,item.id,item.nome,item.quantidade,item.preco,item.emoji);
    update vendedor.produtos set estoque=estoque-item.quantidade,updated_at=now() where id=item.id;
  end loop;
  insert into entregador.corridas(id,valor,coleta_loja,coleta_endereco,entrega_destino,entrega_endereco,item_descricao,produto_id,fragil,porte,distancia)
  values(pedido,frete,loja_info.nome,coalesce(loja_info.endereco,''),'Endereço disponível após aceitar',endereco,
    primeiro.nome,primeiro.produto_id,
    exists(select 1 from vendedor.itens_pedido i join vendedor.produtos p on p.id=i.produto_id where i.pedido_id=pedido and p.fragil),
    primeiro.porte,null);
  delete from cliente.carrinho where cliente_id=auth.uid();
  return pedido;
end $$;

create or replace function public.raiz_produto(p_id integer,p_nome text,p_categoria text,p_preco numeric,p_estoque integer,p_ativo boolean,p_descricao text)
returns integer language plpgsql security definer set search_path = '' as $$
declare loja integer:=public.raiz_loja(); produto integer;
begin
  if loja is null then raise exception 'Loja não vinculada'; end if;
  if p_nome is null or length(btrim(p_nome)) not between 2 and 200 or p_preco < 0 or p_estoque < 0 then
    raise exception 'Confira nome, preço e estoque';
  end if;
  if p_id is null then
    insert into vendedor.produtos(loja_id,nome,categoria,preco,estoque,ativo,descricao)
      values(loja,btrim(p_nome),p_categoria,p_preco,p_estoque,p_ativo,p_descricao) returning id into produto;
  else
    update vendedor.produtos set nome=btrim(p_nome),categoria=p_categoria,preco=p_preco,estoque=p_estoque,
      ativo=(p_ativo and not moderado),descricao=p_descricao,updated_at=now() where id=p_id and loja_id=loja returning id into produto;
    if not found then raise exception 'Produto fora da sua loja'; end if;
  end if;
  return produto;
end $$;

create or replace function public.raiz_preparo(p_pedido bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update vendedor.pedidos set status='Em preparo',updated_at=now()
    where id=p_pedido and loja_id=public.raiz_loja() and status='Pendente';
  if not found then raise exception 'Pedido indisponível para preparo'; end if;
  update cliente.pedidos set status='Em preparação',timeline_step=1,updated_at=now() where id=p_pedido;
end $$;

create or replace function public.raiz_ofertas()
returns table(id bigint, coleta_loja varchar, item_descricao varchar, fragil boolean, valor numeric)
language sql stable security definer set search_path = '' as $$
  select c.id,c.coleta_loja,c.item_descricao,c.fragil,c.valor
    from entregador.corridas c join vendedor.pedidos p on p.id=c.id
    where c.status='Disponível' and c.entregador_id is null and p.status='Em preparo'
      and exists(select 1 from entregador.perfil e where e.id=public.raiz_entregador() and e.online)
    order by c.id limit 100
$$;

create or replace function public.raiz_disponibilidade(p_online boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update entregador.perfil set online=p_online,updated_at=now() where id=public.raiz_entregador();
  if not found then raise exception 'Entregador sem vínculo'; end if;
end $$;

create or replace function public.raiz_etapa(p_pedido bigint,p_etapa integer,p_vaso boolean,p_folhagem boolean,p_entrega boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare courier integer:=public.raiz_entregador();
begin
  if courier is null then raise exception 'Entregador sem vínculo'; end if;
  if p_etapa=1 then
    update entregador.corridas c set entregador_id=courier,etapa_atual=1,status='Em andamento',updated_at=now()
      where c.id=p_pedido and c.status='Disponível' and c.entregador_id is null
        and exists(select 1 from vendedor.pedidos p where p.id=c.id and p.status='Em preparo')
        and exists(select 1 from entregador.perfil e where e.id=courier and e.online);
    if not found then raise exception 'Entrega já atribuída ou indisponível'; end if;
  elsif p_etapa=2 and p_vaso and p_folhagem then
    update entregador.corridas set etapa_atual=2,checklist_vaso_ok=true,checklist_folhagem_ok=true,updated_at=now()
      where id=p_pedido and entregador_id=courier and etapa_atual=1 and status='Em andamento';
    if not found then raise exception 'Coleta indisponível'; end if;
    update vendedor.pedidos set status='Enviado',updated_at=now() where id=p_pedido;
    update cliente.pedidos set status='Em transporte',timeline_step=2,updated_at=now() where id=p_pedido;
  elsif p_etapa=3 and p_entrega then
    update entregador.corridas set etapa_atual=3,status='Concluída',checklist_entrega_ok=true,updated_at=now()
      where id=p_pedido and entregador_id=courier and etapa_atual=2 and status='Em andamento';
    if not found then raise exception 'Entrega indisponível para conclusão'; end if;
    update vendedor.pedidos set status='Entregue',updated_at=now() where id=p_pedido;
    update cliente.pedidos set status='Entregue',timeline_step=3,updated_at=now() where id=p_pedido;
    insert into entregador.historico_corridas(corrida_id,entregador_id,valor,status,data_formatada)
      select id,courier,valor,status,to_char(now() at time zone 'America/Cuiaba','DD/MM/YYYY HH24:MI')
      from entregador.corridas where id=p_pedido;
  else raise exception 'Confirme o checklist da etapa';
  end if;
end $$;

create or replace function public.raiz_moderar_produto(p_produto integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.raiz_acesso() is distinct from 'admin' then
    raise exception 'Acesso administrativo necessário' using errcode = '42501';
  end if;
  update vendedor.produtos v set ativo=false,moderado=true,updated_at=now()
    where v.id=p_produto and exists(select 1 from cliente.produtos c where c.id=v.id and c.loja_id=v.loja_id);
  update cliente.produtos set ativo=false,updated_at=now() where id=p_produto;
  if not found then raise exception 'Produto não encontrado'; end if;
end $$;

do $$
declare routine regprocedure;
begin
  for routine in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in
      ('raiz_endereco','raiz_item_cliente','raiz_checkout','raiz_produto','raiz_preparo','raiz_ofertas','raiz_disponibilidade','raiz_etapa','raiz_moderar_produto')
  loop
    execute format('revoke all on function %s from public, anon',routine);
    execute format('grant execute on function %s to authenticated',routine);
  end loop;
end $$;

commit;
