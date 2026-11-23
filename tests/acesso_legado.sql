-- Execute somente no PostgreSQL local descartável, com bootstrap de Auth simulado.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('10000000-0000-0000-0000-000000000001','comprador@teste.invalid','{"role":"admin"}'),
 ('10000000-0000-0000-0000-000000000002','outro@teste.invalid','{}'),
 ('10000000-0000-0000-0000-000000000003','loja@teste.invalid','{}'),
 ('10000000-0000-0000-0000-000000000004','outraloja@teste.invalid','{}'),
 ('10000000-0000-0000-0000-000000000005','entrega@teste.invalid','{}'),
 ('10000000-0000-0000-0000-000000000006','outraentrega@teste.invalid','{}'),
 ('10000000-0000-0000-0000-000000000007','admin@teste.invalid','{}');
insert into vendedor.lojas(id,nome) values(92001,'Loja de teste'),(92002,'Outra loja de teste');
insert into entregador.perfil(id,nome,online) values(92001,'Entregador A',true),(92002,'Entregador B',true);
insert into public.raiz_vinculos(usuario_id,perfil,loja_id,entregador_id) values
 ('10000000-0000-0000-0000-000000000003','vendedor',92001,null),
 ('10000000-0000-0000-0000-000000000004','vendedor',92002,null),
 ('10000000-0000-0000-0000-000000000005','entregador',null,92001),
 ('10000000-0000-0000-0000-000000000006','entregador',null,92002),
 ('10000000-0000-0000-0000-000000000007','admin',null,null);

set local role anon;
do $$ begin
  if not exists(select id, loja_id from public.cliente_produtos) then raise exception 'Catálogo público indisponível'; end if;
  begin perform id from public.cliente_usuarios; raise exception 'Dados pessoais públicos';
  exception when insufficient_privilege then null; end;
  begin perform id from public.entregador_corridas; raise exception 'Corridas públicas';
  exception when insufficient_privilege then null; end;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select set_config('raiz.test_produto',public.raiz_produto(null,'Muda de teste','plantas',35,4,true,'Teste')::text,true);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ begin
  if public.raiz_acesso() <> 'cliente' then raise exception 'Metadados concederam acesso'; end if;
  begin perform * from public.raiz_usuarios(); raise exception 'RPC administrativa aberta';
  exception when insufficient_privilege then null; end;
  begin perform public.raiz_moderar_produto(current_setting('raiz.test_produto')::int); raise exception 'Moderação aberta';
  exception when insufficient_privilege then null; end;
  begin update public.raiz_vinculos set perfil='admin'; raise exception 'Alteração direta de perfil permitida';
  exception when insufficient_privilege then null; end;
end $$;
select public.raiz_endereco('Endereço de teste, 100');
select public.raiz_item_cliente(current_setting('raiz.test_produto')::int,2,null);
select public.raiz_item_cliente(current_setting('raiz.test_produto')::int,0,true);
select set_config('raiz.test_pedido',public.raiz_checkout('20000000-0000-0000-0000-000000000001')::text,true);
do $$ begin
  if public.raiz_checkout('20000000-0000-0000-0000-000000000001')::text <> current_setting('raiz.test_pedido') then
    raise exception 'Checkout duplicado';
  end if;
  if not exists(select 1 from public.cliente_pedidos where id=current_setting('raiz.test_pedido')::bigint and total=85) then
    raise exception 'Pedido ausente ou total incorreto';
  end if;
  if exists(select 1 from public.cliente_carrinho) then raise exception 'Carrinho não foi limpo'; end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$ begin
  if exists(select 1 from public.cliente_pedidos) or exists(select 1 from public.cliente_usuarios)
     or exists(select 1 from public.cliente_favoritos) then raise exception 'Dados visíveis a outro cliente'; end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
do $$ begin
  if exists(select 1 from public.vendedor_pedidos) or exists(select 1 from public.vendedor_produtos) then
    raise exception 'Dados visíveis a outra loja';
  end if;
  begin
    perform public.raiz_produto(current_setting('raiz.test_produto')::int,'Outro','plantas',1,1,true,'');
    raise exception 'Outra loja alterou produto' using errcode='XX000';
  exception when raise_exception then null; end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select public.raiz_preparo(current_setting('raiz.test_pedido')::bigint);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
do $$ begin
  if not exists(select 1 from public.raiz_ofertas() where id=current_setting('raiz.test_pedido')::bigint)
     or exists(select 1 from public.entregador_corridas) then raise exception 'Oferta ou privacidade incorreta'; end if;
end $$;
select public.raiz_etapa(current_setting('raiz.test_pedido')::bigint,1,false,false,false);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000006',true);
do $$ begin
  if exists(select 1 from public.entregador_corridas) then raise exception 'Corrida visível a outro entregador'; end if;
  begin
    perform public.raiz_etapa(current_setting('raiz.test_pedido')::bigint,1,false,false,false);
    raise exception 'Corrida atribuída duas vezes' using errcode='XX000';
  exception when raise_exception then null; end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
select public.raiz_etapa(current_setting('raiz.test_pedido')::bigint,2,true,true,false);
select public.raiz_etapa(current_setting('raiz.test_pedido')::bigint,3,false,false,true);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ begin
  if not exists(select 1 from public.cliente_pedidos where id=current_setting('raiz.test_pedido')::bigint and status='Entregue') then
    raise exception 'Status final do pedido incorreto';
  end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000007',true);
do $$ begin
  if (select count(*) from public.raiz_usuarios()) < 7 then raise exception 'Admin sem acesso à listagem'; end if;
end $$;
select public.raiz_moderar_produto(current_setting('raiz.test_produto')::int);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select public.raiz_produto(current_setting('raiz.test_produto')::int,'Muda de teste','plantas',35,4,true,'Teste');
set local role anon;
do $$ begin
  if exists(select 1 from public.cliente_produtos where id=current_setting('raiz.test_produto')::int) then
    raise exception 'Produto moderado permanece visível';
  end if;
end $$;
rollback;
select 'Cenários de acesso e fluxo de pedido aprovados.' as resultado;
