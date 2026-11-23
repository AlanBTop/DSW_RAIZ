begin;

-- Execute sobre a estrutura cliente/vendedor/entregador existente, sem recarregar seeds.
-- Os privilégios antigos são removidos apenas dos objetos RAIZ listados.
create table if not exists public.raiz_vinculos (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  perfil text not null check (perfil in ('cliente','vendedor','entregador','admin')),
  loja_id integer references vendedor.lojas(id),
  entregador_id integer unique references entregador.perfil(id),
  ativo boolean not null default true,
  check ((perfil = 'vendedor') = (loja_id is not null)),
  check ((perfil = 'entregador') = (entregador_id is not null))
);
alter table public.raiz_vinculos enable row level security;
revoke all on public.raiz_vinculos from public, anon, authenticated;

create or replace function public.raiz_acesso()
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select case when ativo then perfil else 'inativo' end
     from public.raiz_vinculos where usuario_id = auth.uid()),
    case when auth.uid() is not null and coalesce(auth.jwt()->>'is_anonymous', 'false') = 'false'
         then 'cliente' end
  )
$$;

create or replace function public.raiz_loja()
returns integer language sql stable security definer set search_path = '' as $$
  select loja_id from public.raiz_vinculos where usuario_id = auth.uid() and ativo and perfil = 'vendedor'
$$;

create or replace function public.raiz_entregador()
returns integer language sql stable security definer set search_path = '' as $$
  select entregador_id from public.raiz_vinculos where usuario_id = auth.uid() and ativo and perfil = 'entregador'
$$;

revoke all on function public.raiz_acesso(), public.raiz_loja(), public.raiz_entregador() from public, anon;
grant execute on function public.raiz_acesso(), public.raiz_loja(), public.raiz_entregador() to authenticated;

-- Desativa o provisionamento antigo que copiava role de metadados editáveis.
drop trigger if exists trg_on_auth_user_created on auth.users;
do $$
declare
  name text;
  routine regprocedure;
begin
  foreach name in array array['perfis_usuarios','vw_perfis_usuarios','disputas','logs_seguranca'] loop
    if to_regclass('public.' || name) is not null then
      execute format('revoke all on public.%I from public, anon, authenticated', name);
    end if;
  end loop;
  for routine in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('cliente','vendedor','entregador')
       or (n.nspname='public' and p.proname in
         ('get_current_role','is_cliente','is_vendedor','is_entregador','handle_new_auth_user',
          'fn_sync_novo_pedido_cliente','fn_sync_itens_pedido_cliente','fn_sync_status_vendedor',
          'fn_sync_etapa_entregador','fn_sync_produto_vendedor_cliente'))
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', routine);
  end loop;
end $$;

do $$
declare
  entry text[];
  schema_name text;
  table_name text;
  view_name text;
begin
  foreach entry slice 1 in array array[
    ['cliente','usuarios','cliente_usuarios'],['cliente','produtos','cliente_produtos'],
    ['cliente','favoritos','cliente_favoritos'],['cliente','carrinho','cliente_carrinho'],
    ['cliente','pedidos','cliente_pedidos'],['cliente','itens_pedido','cliente_itens_pedido'],
    ['vendedor','lojas','vendedor_lojas'],['vendedor','produtos','vendedor_produtos'],
    ['vendedor','pedidos','vendedor_pedidos'],['vendedor','itens_pedido','vendedor_itens_pedido'],
    ['vendedor','vendas_diarias','vendedor_vendas_diarias'],['entregador','perfil','entregador_perfil'],
    ['entregador','corridas','entregador_corridas'],['entregador','historico_corridas','entregador_historico'],
    ['entregador','extrato_carteira','entregador_extrato']
  ] loop
    schema_name := entry[1]; table_name := entry[2]; view_name := entry[3];
    execute format('alter table %I.%I enable row level security', schema_name, table_name);
    execute format('revoke all on %I.%I from public, anon, authenticated', schema_name, table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', view_name);
    execute format('alter view public.%I set (security_invoker = true)', view_name);
    execute format('grant select on %I.%I, public.%I to authenticated', schema_name, table_name, view_name);
    -- Uma política legada permissiva não pode liberar linhas além do limite novo.
    execute format('create policy raiz_admin_read on %I.%I for select to authenticated using ((select public.raiz_acesso()) = ''admin'')', schema_name, table_name);
  end loop;
end $$;
grant usage on schema cliente, vendedor, entregador to authenticated;
grant usage on schema cliente to anon;
grant select on cliente.produtos, public.cliente_produtos to anon;

-- Políticas restritivas aplicam o limite mesmo na presença de policies antigas.
do $$
declare
  item text[];
  rule text;
begin
  foreach item slice 1 in array array[
    ['cliente','usuarios','id = (select auth.uid()) and (select public.raiz_acesso()) = ''cliente'''],
    ['cliente','favoritos','cliente_id = (select auth.uid()) and (select public.raiz_acesso()) = ''cliente'''],
    ['cliente','carrinho','cliente_id = (select auth.uid()) and (select public.raiz_acesso()) = ''cliente'''],
    ['cliente','pedidos','cliente_id = (select auth.uid()) and (select public.raiz_acesso()) = ''cliente'''],
    ['cliente','itens_pedido','exists (select 1 from cliente.pedidos p where p.id = pedido_id and p.cliente_id = (select auth.uid()))'],
    ['vendedor','lojas','id = (select public.raiz_loja())'],
    ['vendedor','produtos','loja_id = (select public.raiz_loja())'],
    ['vendedor','pedidos','loja_id = (select public.raiz_loja())'],
    ['vendedor','itens_pedido','exists (select 1 from vendedor.pedidos p where p.id = pedido_id and p.loja_id = (select public.raiz_loja()))'],
    ['vendedor','vendas_diarias','loja_id = (select public.raiz_loja())'],
    ['entregador','perfil','id = (select public.raiz_entregador())'],
    ['entregador','corridas','entregador_id = (select public.raiz_entregador())'],
    ['entregador','historico_corridas','entregador_id = (select public.raiz_entregador())'],
    ['entregador','extrato_carteira','entregador_id = (select public.raiz_entregador())']
  ] loop
    rule := format('((select public.raiz_acesso()) = ''admin'' or (%s))', item[3]);
    execute format('create policy raiz_proprietario on %I.%I for select to authenticated using (%s)', item[1], item[2], rule);
    execute format('create policy raiz_limite on %I.%I as restrictive for select to authenticated using (%s)', item[1], item[2], rule);
  end loop;
end $$;
create policy raiz_catalogo on cliente.produtos for select to anon, authenticated using (ativo);
create policy raiz_catalogo_limite on cliente.produtos as restrictive for select to anon using (ativo);
create policy raiz_catalogo_limite_auth on cliente.produtos as restrictive for select to authenticated
  using (ativo or (select public.raiz_acesso()) = 'admin');

create or replace function public.raiz_usuarios()
returns table(id uuid, email varchar, perfil text, ativo boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.raiz_acesso() is distinct from 'admin' then
    raise exception 'Acesso administrativo necessário' using errcode = '42501';
  end if;
  return query select u.id, u.email, coalesce(v.perfil, 'cliente'), coalesce(v.ativo,true)
    from auth.users u left join public.raiz_vinculos v on v.usuario_id = u.id
    where not u.is_anonymous
    order by u.created_at desc limit 100;
end $$;
revoke all on function public.raiz_usuarios() from public, anon;
grant execute on function public.raiz_usuarios() to authenticated;

commit;
