-- Incremental: requer as migrações 001, 002 e 003. Não apaga schemas ou dados.
begin;
do $$ begin
  if to_regprocedure('public.raiz_checkout(uuid)') is null then
    raise exception 'Aplique e confira a base RAIZ antes desta migração incremental';
  end if;
end $$;

alter table cliente.pedidos add column if not exists recebimento_confirmado_em timestamptz;
alter table cliente.pedidos add column if not exists estoque_devolvido_em timestamptz;
alter table cliente.pedidos add column if not exists motivo_cancelamento text;
alter table vendedor.lojas add column if not exists rating numeric(3,2) not null default 0 check(rating between 0 and 5);
create or replace view public.vendedor_lojas with (security_invoker=true) as select * from vendedor.lojas;
create or replace view public.cliente_pedidos with (security_invoker=true) as select * from cliente.pedidos;

create index if not exists raiz_produtos_categoria_id on cliente.produtos(categoria,id) where ativo;
create index if not exists raiz_pedidos_cliente_data on cliente.pedidos(cliente_id,created_at desc,id desc);
create index if not exists raiz_pedidos_loja_data on vendedor.pedidos(loja_id,created_at desc,id desc);
create index if not exists raiz_corridas_entregador_status on entregador.corridas(entregador_id,status,id);
create index if not exists raiz_itens_cliente_pedido on cliente.itens_pedido(pedido_id);
create index if not exists raiz_itens_vendedor_pedido on vendedor.itens_pedido(pedido_id);

create table public.raiz_solicitacoes_privacidade (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users(id) on delete set null,
  status text not null default 'Pendente' check(status in ('Pendente','Em processamento','Concluída')),
  created_at timestamptz not null default now(),
  concluida_em timestamptz
);
create unique index raiz_exclusao_aberta on public.raiz_solicitacoes_privacidade(usuario_id)
  where status <> 'Concluída';
alter table public.raiz_solicitacoes_privacidade enable row level security;
revoke all on public.raiz_solicitacoes_privacidade from public,anon,authenticated;
grant select on public.raiz_solicitacoes_privacidade to authenticated;
create policy raiz_privacidade_ler on public.raiz_solicitacoes_privacidade for select to authenticated
  using(usuario_id=(select auth.uid()) or (select public.raiz_acesso())='admin');

create table public.raiz_eventos_operacao (
  id bigint generated always as identity primary key,
  usuario_id uuid references auth.users(id) on delete set null,
  evento text not null check(evento in ('login','cadastro','pedido','cancelamento','coleta','entrega','recebimento','avaliacao','erro')),
  area text not null check(area in ('auth','cliente','vendedor','entregador','admin','web')),
  referencia uuid not null,
  created_at timestamptz not null default now()
);
create index raiz_eventos_usuario_data on public.raiz_eventos_operacao(usuario_id,created_at);
alter table public.raiz_eventos_operacao enable row level security;
revoke all on public.raiz_eventos_operacao from public,anon,authenticated;
grant select on public.raiz_eventos_operacao to authenticated;
create policy raiz_eventos_admin on public.raiz_eventos_operacao for select to authenticated
  using((select public.raiz_acesso())='admin');

create table public.raiz_aceites (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  versao text not null check(versao='2026-11-23'),
  aceito_em timestamptz not null default now()
);
alter table public.raiz_aceites enable row level security;
revoke all on public.raiz_aceites from public,anon,authenticated;
grant select on public.raiz_aceites to authenticated;
create policy raiz_aceites_ler on public.raiz_aceites for select to authenticated
  using(usuario_id=(select auth.uid()) or (select public.raiz_acesso())='admin');

create or replace function public.raiz_recursos()
returns jsonb language sql stable security definer set search_path='' as $$
  select case when public.raiz_acesso() in ('cliente','vendedor','entregador','admin') then
    jsonb_build_object('versao',4,'recebimento',true,'cancelamento',true,'avaliacao',true,'privacidade',true,'eventos',true,'aceites',true)
  else '{}'::jsonb end
$$;

create or replace function public.raiz_aceitar_termos(p_versao text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if public.raiz_acesso() not in ('cliente','vendedor','entregador','admin') or auth.uid() is null
    then raise exception 'Autenticação necessária' using errcode='42501'; end if;
  if p_versao is distinct from '2026-11-23' then raise exception 'Versão de termos inválida'; end if;
  insert into public.raiz_aceites(usuario_id,versao) values(auth.uid(),p_versao)
    on conflict(usuario_id) do update set versao=excluded.versao,aceito_em=now();
end $$;

create or replace function public.raiz_confirmar_recebimento(p_pedido bigint)
returns void language plpgsql security definer set search_path='' as $$
declare p cliente.pedidos;
begin
  if public.raiz_acesso() is distinct from 'cliente' then raise exception 'Acesso negado' using errcode='42501'; end if;
  select * into p from cliente.pedidos where id=p_pedido and cliente_id=auth.uid() for update;
  if not found or p.status <> 'Entregue' or not exists(
    select 1 from entregador.corridas where id=p_pedido and status='Concluída')
    then raise exception 'Pedido ainda não entregue'; end if;
  update cliente.pedidos set recebimento_confirmado_em=coalesce(recebimento_confirmado_em,now()),updated_at=now() where id=p_pedido;
end $$;

create or replace function public.raiz_cancelar_pedido(p_pedido bigint,p_motivo text)
returns void language plpgsql security definer set search_path='' as $$
declare p cliente.pedidos; v vendedor.pedidos; c entregador.corridas; item record; perfil text:=public.raiz_acesso();
begin
  -- Ordem de bloqueio compartilhada por preparo/entrega/cancelamento: pedido, loja, corrida, produtos.
  select * into p from cliente.pedidos where id=p_pedido for update;
  select * into v from vendedor.pedidos where id=p_pedido for update;
  if p.id is null or v.id is null or not (
    (perfil='cliente' and p.cliente_id=auth.uid()) or
    (perfil='vendedor' and v.loja_id=public.raiz_loja()) or perfil='admin')
    then raise exception 'Pedido indisponível' using errcode='42501'; end if;
  if p.status='Cancelado' and p.estoque_devolvido_em is not null then return; end if;
  if p_motivo is null or length(btrim(p_motivo)) not between 3 and 300 then raise exception 'Informe um motivo entre 3 e 300 caracteres'; end if;
  if perfil='cliente' and p.status<>'Confirmado' then raise exception 'Solicite à loja o cancelamento de um pedido em preparo'; end if;
  select * into c from entregador.corridas where id=p_pedido for update;
  if p.status not in ('Confirmado','Em preparação') or c.entregador_id is not null or c.status not in ('Disponível','Cancelada') then
    raise exception 'Pedido já está em entrega ou encerrado';
  end if;
  for item in select i.produto_id,i.quantidade from vendedor.itens_pedido i where i.pedido_id=p_pedido order by i.produto_id loop
    update vendedor.produtos set estoque=estoque+item.quantidade,updated_at=now() where id=item.produto_id;
    if not found then raise exception 'Produto do pedido não está disponível para devolução de estoque'; end if;
  end loop;
  update cliente.pedidos set status='Cancelado',estoque_devolvido_em=now(),motivo_cancelamento=btrim(p_motivo),updated_at=now() where id=p_pedido;
  update vendedor.pedidos set status='Cancelado',updated_at=now() where id=p_pedido;
  update entregador.corridas set status='Cancelada',updated_at=now() where id=p_pedido;
end $$;

create or replace function public.raiz_avaliar_pedido(p_pedido bigint,p_nota integer,p_comentario text)
returns void language plpgsql security definer set search_path='' as $$
declare p cliente.pedidos; loja integer;
begin
  if public.raiz_acesso() is distinct from 'cliente' then raise exception 'Acesso negado' using errcode='42501'; end if;
  if p_nota is null or p_nota not between 1 and 5 or length(coalesce(p_comentario,''))>1000 then raise exception 'Avaliação inválida'; end if;
  select * into p from cliente.pedidos where id=p_pedido and cliente_id=auth.uid() for update;
  if not found or p.status<>'Entregue' or p.recebimento_confirmado_em is null then raise exception 'Confirme o recebimento antes de avaliar'; end if;
  select loja_id into loja from vendedor.pedidos where id=p_pedido;
  -- Serializa avaliações da mesma loja para evitar média desatualizada em concorrência.
  perform id from vendedor.lojas where id=loja for update;
  update cliente.pedidos set avaliacao_nota=p_nota,avaliacao_comentario=nullif(btrim(p_comentario),''),updated_at=now() where id=p_pedido;
  update vendedor.lojas set rating=(select round(avg(c.avaliacao_nota)::numeric,2) from cliente.pedidos c
    join vendedor.pedidos v on v.id=c.id where v.loja_id=loja and c.recebimento_confirmado_em is not null),updated_at=now() where id=loja;
end $$;

create or replace function public.raiz_solicitar_exclusao(p_confirmacao text)
returns uuid language plpgsql security definer set search_path='' as $$
declare protocolo uuid;
begin
  if auth.uid() is null or public.raiz_acesso() not in ('cliente','vendedor','entregador','admin') then raise exception 'Autenticação necessária' using errcode='42501'; end if;
  if p_confirmacao is distinct from 'EXCLUIR MINHA CONTA' then raise exception 'Confirme a solicitação'; end if;
  -- Uma solicitação aberta por conta, inclusive em cliques concorrentes.
  insert into public.raiz_solicitacoes_privacidade(usuario_id) values(auth.uid())
    on conflict(usuario_id) where status<>'Concluída' do update set usuario_id=excluded.usuario_id returning id into protocolo;
  return protocolo;
end $$;

create or replace function public.raiz_evento(p_evento text,p_area text,p_referencia uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or public.raiz_acesso() not in ('cliente','vendedor','entregador','admin') then raise exception 'Autenticação necessária' using errcode='42501'; end if;
  if p_referencia is null or p_evento is null or p_area is null or
    p_evento not in ('login','cadastro','pedido','cancelamento','coleta','entrega','recebimento','avaliacao','erro') or
    p_area not in ('auth','cliente','vendedor','entregador','admin','web') then raise exception 'Evento inválido'; end if;
  -- Serializa a cota por usuário, sem guardar payloads ou mensagens que possam conter dados pessoais.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,49));
  if (select count(*) from public.raiz_eventos_operacao where usuario_id=auth.uid() and created_at>now()-interval '1 minute')>=60 then return; end if;
  delete from public.raiz_eventos_operacao where created_at<now()-interval '30 days';
  insert into public.raiz_eventos_operacao(usuario_id,evento,area,referencia) values(auth.uid(),p_evento,p_area,p_referencia);
end $$;

create or replace function public.raiz_preparo(p_pedido bigint)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform id from cliente.pedidos where id=p_pedido for update;
  update vendedor.pedidos set status='Em preparo',updated_at=now() where id=p_pedido and loja_id=public.raiz_loja() and status='Pendente';
  if not found then raise exception 'Pedido indisponível para preparo'; end if;
  update cliente.pedidos set status='Em preparação',timeline_step=1,updated_at=now() where id=p_pedido;
end $$;

-- Endurece validação de valores que não passam pelo formulário web.
create or replace function public.raiz_produto(p_id integer,p_nome text,p_categoria text,p_preco numeric,p_estoque integer,p_ativo boolean,p_descricao text)
returns integer language plpgsql security definer set search_path='' as $$
declare loja integer:=public.raiz_loja(); produto integer;
begin
  if loja is null then raise exception 'Loja não vinculada' using errcode='42501'; end if;
  if p_nome is null or length(btrim(p_nome)) not between 2 and 200 or p_preco is null or
    p_preco::text in ('NaN','Infinity','-Infinity') or p_preco<0 or p_preco>99999999.99 or
    p_preco<>round(p_preco,2) or p_estoque is null or p_estoque<0 or p_ativo is null or
    p_categoria is null or p_categoria not in ('plantas','vasos','insumos','ferramentas') or length(coalesce(p_descricao,''))>5000
    then raise exception 'Confira nome, categoria, preço, estoque e descrição'; end if;
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

-- Lista administrativa paginada, sem o corte silencioso de 100 usuários.
create or replace function public.raiz_usuarios_pagina(p_busca text default '',p_pagina integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare resultado jsonb;
begin
  if public.raiz_acesso() is distinct from 'admin' then raise exception 'Acesso negado' using errcode='42501'; end if;
  if p_pagina is null or p_pagina<0 or p_pagina>100000 or length(coalesce(p_busca,''))>120 then raise exception 'Filtro inválido'; end if;
  with contas as (select u.id,u.email,coalesce(v.perfil,'cliente') as perfil,coalesce(v.ativo,true) as ativo,u.created_at
    from auth.users u left join public.raiz_vinculos v on v.usuario_id=u.id where not coalesce(u.is_anonymous,false)
      and strpos(lower(coalesce(u.email,'')||' '||coalesce(v.perfil,'cliente')),lower(coalesce(p_busca,'')))>0),
  pagina as (select id,email,perfil,ativo from contas order by created_at desc,id limit 12 offset p_pagina*12)
  select jsonb_build_object('itens',coalesce((select jsonb_agg(pagina) from pagina),'[]'::jsonb),'total',(select count(*) from contas)) into resultado;
  return resultado;
end $$;

do $$ declare f regprocedure; begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
    and p.proname in ('raiz_recursos','raiz_aceitar_termos','raiz_confirmar_recebimento','raiz_cancelar_pedido','raiz_avaliar_pedido',
      'raiz_solicitar_exclusao','raiz_evento','raiz_preparo','raiz_produto','raiz_usuarios_pagina') loop
    execute format('revoke all on function %s from public,anon,authenticated',f);
    execute format('grant execute on function %s to authenticated',f);
  end loop;
end $$;
notify pgrst,'reload schema';
commit;
