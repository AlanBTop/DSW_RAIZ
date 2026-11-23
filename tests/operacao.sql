set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select set_config('raiz.qa.product',public.raiz_produto(null,'Produto operação','plantas',10.25,8,true,'Teste')::text,true);
do $$ begin
  begin perform public.raiz_produto(null,'Inválido','plantas','NaN',1,true,'');raise exception 'Preço NaN aceito' using errcode='XX000';exception when raise_exception then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select public.raiz_endereco('Endereço fictício, 100');
do $$ begin
  begin perform public.raiz_checkout(gen_random_uuid());raise exception 'Checkout sem aceite' using errcode='XX000';exception when raise_exception then null;end;
end $$;
select public.raiz_aceitar_termos('2026-11-23');
select public.raiz_item_cliente(current_setting('raiz.qa.product')::int,2,null);
select set_config('raiz.qa.cancel',public.raiz_checkout('30000000-0000-4000-8000-000000000001')::text,true);
do $$ begin
  if (select total from public.cliente_pedidos where id=current_setting('raiz.qa.cancel')::bigint)<>35.50 then raise exception 'Total divergente';end if;
end $$;
select public.raiz_cancelar_pedido(current_setting('raiz.qa.cancel')::bigint,'Solicitação de teste');
select public.raiz_cancelar_pedido(current_setting('raiz.qa.cancel')::bigint,'Solicitação repetida');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
do $$ begin if (select estoque from public.vendedor_produtos where id=current_setting('raiz.qa.product')::int)<>8 then raise exception 'Estoque devolvido incorretamente';end if;end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select public.raiz_item_cliente(current_setting('raiz.qa.product')::int,1,null);
select set_config('raiz.qa.order',public.raiz_checkout('30000000-0000-4000-8000-000000000002')::text,true);
do $$ begin
  begin perform public.raiz_avaliar_pedido(current_setting('raiz.qa.order')::bigint,5,'');raise exception 'Avaliação antes de entrega' using errcode='XX000';exception when raise_exception then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select public.raiz_preparo(current_setting('raiz.qa.order')::bigint);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ begin
  begin perform public.raiz_cancelar_pedido(current_setting('raiz.qa.order')::bigint,'Cliente em preparo');raise exception 'Cliente cancelou em preparo' using errcode='XX000';exception when raise_exception then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
do $$ begin if (public.raiz_ofertas_pagina(0)->>'total')::int<>1 then raise exception 'Ofertas inválidas';end if;end $$;
select public.raiz_etapa(current_setting('raiz.qa.order')::bigint,1,false,false,false);
select public.raiz_etapa(current_setting('raiz.qa.order')::bigint,2,true,true,false);
select public.raiz_etapa(current_setting('raiz.qa.order')::bigint,3,false,false,true);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ begin
  begin perform public.raiz_avaliar_pedido(current_setting('raiz.qa.order')::bigint,5,'');raise exception 'Avaliação sem confirmação' using errcode='XX000';exception when raise_exception then null;end;
end $$;
select public.raiz_confirmar_recebimento(current_setting('raiz.qa.order')::bigint);
select public.raiz_confirmar_recebimento(current_setting('raiz.qa.order')::bigint);
select public.raiz_avaliar_pedido(current_setting('raiz.qa.order')::bigint,4,'Pedido recebido');
select public.raiz_avaliar_pedido(current_setting('raiz.qa.order')::bigint,5,'Comentário atualizado');
select set_config('raiz.qa.request',public.raiz_solicitar_exclusao('EXCLUIR MINHA CONTA')::text,true);
do $$ begin
  if public.raiz_solicitar_exclusao('EXCLUIR MINHA CONTA')::text<>current_setting('raiz.qa.request') then raise exception 'Solicitação duplicada';end if;
  begin perform public.raiz_preparar_exclusao(current_setting('raiz.qa.request')::uuid,'10000000-0000-0000-0000-000000000007');raise exception 'Exclusão administrativa acessível' using errcode='XX000';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$ begin
  if exists(select 1 from public.raiz_solicitacoes_privacidade) then raise exception 'Protocolo visível a outro cliente';end if;
  begin perform public.raiz_confirmar_recebimento(current_setting('raiz.qa.order')::bigint);raise exception 'Outro cliente confirmou recebimento' using errcode='XX000';exception when raise_exception then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000007',true);
do $$ begin
  if (public.raiz_usuarios_pagina('',0)->>'total')::int<>7 then raise exception 'Página de usuários inválida';end if;
  if (select rating from public.vendedor_lojas where id=92001)<>5 then raise exception 'Média de avaliações inválida';end if;
end $$;
set local role service_role;
select public.raiz_preparar_exclusao(current_setting('raiz.qa.request')::uuid,'10000000-0000-0000-0000-000000000007');
do $$ begin
  begin perform public.raiz_concluir_exclusao(current_setting('raiz.qa.request')::uuid);raise exception 'Concluiu antes de remover Auth' using errcode='XX000';exception when raise_exception then null;end;
end $$;
reset role;
do $$ begin
  if exists(select 1 from cliente.usuarios where id='10000000-0000-0000-0000-000000000001') then raise exception 'Cadastro pessoal preservado';end if;
  if exists(select 1 from cliente.pedidos where id=current_setting('raiz.qa.order')::bigint and (cliente_id is not null or endereco_entrega<>'Removido por exclusão')) then raise exception 'Identificadores do pedido preservados';end if;
end $$;
-- Apenas o bootstrap de Auth simulado é removido diretamente neste teste local.
delete from auth.users where id='10000000-0000-0000-0000-000000000001';
set local role service_role;
select public.raiz_concluir_exclusao(current_setting('raiz.qa.request')::uuid);
reset role;
do $$ begin
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('cliente','vendedor','entregador') and c.relkind='r' and not c.relrowsecurity) then raise exception 'Tabela sem RLS';end if;
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'raiz_%' and p.prosecdef and not coalesce(array_to_string(p.proconfig,','),'') like '%search_path=%') then raise exception 'Definer sem search_path';end if;
end $$;
commit;
