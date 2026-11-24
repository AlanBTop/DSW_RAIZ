begin;

-- Bases antigas inseriram IDs explícitos; preserve o avanço das sequências.
lock table vendedor.lojas,entregador.perfil in share row exclusive mode;
select setval(pg_get_serial_sequence('vendedor.lojas','id'),greatest(coalesce(pg_sequence_last_value(pg_get_serial_sequence('vendedor.lojas','id')::regclass),1),coalesce(max(id),1)),true) from vendedor.lojas;
select setval(pg_get_serial_sequence('entregador.perfil','id'),greatest(coalesce(pg_sequence_last_value(pg_get_serial_sequence('entregador.perfil','id')::regclass),1),coalesce(max(id),1)),true) from entregador.perfil;

-- Solicitações não concedem acesso. Só a decisão de um administrador cria o vínculo.
create table public.raiz_candidaturas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  perfil text not null check(perfil in ('vendedor','entregador')),
  dados jsonb not null check(jsonb_typeof(dados)='object'),
  termos_versao text not null,
  status text not null default 'Pendente' check(status in ('Pendente','Aprovado','Recusado')),
  motivo text,
  analisado_por uuid references auth.users(id) on delete set null,
  analisado_em timestamptz,
  criado_em timestamptz not null default now(),
  check((status='Pendente' and analisado_em is null) or (status<>'Pendente' and analisado_em is not null)),
  check(status<>'Recusado' or length(btrim(motivo)) between 5 and 500)
);
create unique index raiz_candidatura_aberta on public.raiz_candidaturas(usuario_id) where status in ('Pendente','Aprovado');
create index raiz_candidaturas_fila on public.raiz_candidaturas(status,criado_em,id);
alter table public.raiz_candidaturas enable row level security;
revoke all on public.raiz_candidaturas from public,anon,authenticated;

create function public.raiz_cadastro_config()
returns jsonb language sql stable set search_path='' as $$select '{"versao":1,"aprovacao_administrativa":true}'::jsonb$$;

create function public.raiz_cadastro_status()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false')<>'false' then raise exception 'Entre na sua conta.' using errcode='42501'; end if;
  return (select to_jsonb(c) from public.raiz_candidaturas c where c.usuario_id=auth.uid() order by c.criado_em desc,c.id desc limit 1);
end $$;

create function public.raiz_cadastro_enviar(p_perfil text,p_dados jsonb,p_termos text)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); aberto public.raiz_candidaturas; nome text; telefone text; dados jsonb; codigo uuid;
begin
  if uid is null or coalesce(auth.jwt()->>'is_anonymous','false')<>'false' then raise exception 'Entre na sua conta.' using errcode='42501'; end if;
  -- Todas as operações desta jornada travam a identidade antes da solicitação.
  perform 1 from auth.users where id=uid and not coalesce(is_anonymous,false) for update;
  if not found then raise exception 'Conta não encontrada.' using errcode='42501'; end if;
  if public.raiz_acesso() is distinct from 'cliente' then raise exception 'Esta conta já possui um perfil ou está desativada.' using errcode='P0001'; end if;
  if exists(select 1 from cliente.usuarios where id=uid) then raise exception 'Sua conta já possui cadastro de cliente. Use outro e-mail para cadastrar seu perfil de parceiro.' using errcode='P0001'; end if;
  if p_perfil is null or p_perfil not in ('vendedor','entregador') or jsonb_typeof(p_dados) is distinct from 'object' or p_termos is distinct from '2026-11-23' then raise exception 'Confira o perfil, os dados e o aceite dos termos.' using errcode='P0001'; end if;
  nome:=btrim(p_dados->>'nome');telefone:=regexp_replace(coalesce(p_dados->>'telefone',''),'[^0-9]','','g');
  if nome is null or length(nome) not between 3 and 150 or length(telefone) not in (10,11) then raise exception 'Informe nome completo e telefone com DDD.' using errcode='P0001'; end if;
  dados:=jsonb_build_object('nome',nome,'telefone',telefone);
  if p_perfil='vendedor' then
    if length(btrim(coalesce(p_dados->>'loja',''))) not between 3 and 150 or length(btrim(coalesce(p_dados->>'endereco',''))) not between 10 and 500 or length(coalesce(p_dados->>'horario',''))>100 then raise exception 'Informe o nome da loja e o endereço completo de coleta.' using errcode='P0001'; end if;
    dados:=dados||jsonb_build_object('loja',btrim(p_dados->>'loja'),'endereco',btrim(p_dados->>'endereco'),'horario',btrim(coalesce(p_dados->>'horario','')));
  else
    if coalesce(p_dados->>'veiculo','') not in ('Bicicleta','Motocicleta','Carro','Utilitário') then raise exception 'Selecione o veículo para as entregas.' using errcode='P0001'; end if;
    dados:=dados||jsonb_build_object('veiculo',p_dados->>'veiculo');
  end if;
  select * into aberto from public.raiz_candidaturas where usuario_id=uid and status in ('Pendente','Aprovado') for update;
  if found then
    if aberto.status='Pendente' and aberto.perfil=p_perfil and aberto.dados=dados then return aberto.id; end if;
    raise exception 'Sua conta já possui uma solicitação em análise ou aprovada.' using errcode='P0001';
  end if;
  insert into public.raiz_candidaturas(usuario_id,perfil,dados,termos_versao) values(uid,p_perfil,dados,p_termos) returning id into codigo;
  return codigo;
end $$;

create function public.raiz_cadastros_listar(p_status text default 'Pendente',p_pagina integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare resultado jsonb;
begin
  if public.raiz_acesso() is distinct from 'admin' then raise exception 'Acesso administrativo necessário.' using errcode='42501'; end if;
  if p_status is null or p_status not in ('','Pendente','Aprovado','Recusado') or p_pagina is null or p_pagina<0 or p_pagina>100000 then raise exception 'Filtro inválido.' using errcode='P0001'; end if;
  with filtrados as (select c.*,u.email from public.raiz_candidaturas c join auth.users u on u.id=c.usuario_id where p_status='' or c.status=p_status),
  pagina as (select * from filtrados order by criado_em desc,id desc limit 12 offset p_pagina*12)
  select jsonb_build_object('itens',coalesce((select jsonb_agg(pagina) from pagina),'[]'::jsonb),'total',(select count(*) from filtrados),'pendentes',(select count(*) from public.raiz_candidaturas where status='Pendente')) into resultado;
  return resultado;
end $$;

create function public.raiz_cadastro_decidir(p_id uuid,p_aprovar boolean,p_motivo text default null)
returns text language plpgsql security definer set search_path='' as $$
declare candidato uuid; pedido public.raiz_candidaturas; vinculo public.raiz_vinculos; novo integer;
begin
  if public.raiz_acesso() is distinct from 'admin' then raise exception 'Acesso administrativo necessário.' using errcode='42501'; end if;
  if p_aprovar is null then raise exception 'Escolha aprovar ou recusar.' using errcode='P0001'; end if;
  select usuario_id into candidato from public.raiz_candidaturas where id=p_id;
  if candidato is null then raise exception 'Solicitação não encontrada.' using errcode='P0001'; end if;
  if candidato=auth.uid() then raise exception 'Você não pode analisar seu próprio cadastro.' using errcode='42501'; end if;
  perform 1 from auth.users where id=candidato for update;
  select * into strict pedido from public.raiz_candidaturas where id=p_id for update;
  if pedido.status<>'Pendente' then
    if pedido.status=(case when p_aprovar then 'Aprovado' else 'Recusado' end) then return pedido.status; end if;
    raise exception 'Esta solicitação já foi analisada.' using errcode='P0001';
  end if;
  if not p_aprovar then
    if length(btrim(coalesce(p_motivo,''))) not between 5 and 500 then raise exception 'Informe o motivo da recusa, com 5 a 500 caracteres.' using errcode='P0001'; end if;
  else
    select * into vinculo from public.raiz_vinculos where usuario_id=candidato for update;
    if found and (not vinculo.ativo or vinculo.perfil<>'cliente') then raise exception 'A conta já possui outro perfil ou foi desativada.' using errcode='P0001'; end if;
    if exists(select 1 from cliente.usuarios where id=candidato) or exists(select 1 from cliente.pedidos where cliente_id=candidato) then raise exception 'A conta já possui cadastro de cliente. Solicite uma conta exclusiva para o perfil de parceiro.' using errcode='P0001'; end if;
    if pedido.perfil='vendedor' then
      insert into vendedor.lojas(nome,endereco,horario_funcionamento) values(pedido.dados->>'loja',pedido.dados->>'endereco',nullif(pedido.dados->>'horario','')) returning id into novo;
      insert into public.raiz_vinculos(usuario_id,perfil,loja_id) values(candidato,'vendedor',novo)
      on conflict(usuario_id) do update set perfil='vendedor',loja_id=excluded.loja_id,entregador_id=null;
    else
      insert into entregador.perfil(nome,telefone,veiculo,online) values(pedido.dados->>'nome',pedido.dados->>'telefone',pedido.dados->>'veiculo',false) returning id into novo;
      insert into public.raiz_vinculos(usuario_id,perfil,entregador_id) values(candidato,'entregador',novo)
      on conflict(usuario_id) do update set perfil='entregador',entregador_id=excluded.entregador_id,loja_id=null;
    end if;
  end if;
  update public.raiz_candidaturas set status=case when p_aprovar then 'Aprovado' else 'Recusado' end,
    motivo=case when p_aprovar then null else btrim(p_motivo) end,analisado_por=auth.uid(),analisado_em=now() where id=p_id returning status into pedido.status;
  return pedido.status;
end $$;

revoke all on function public.raiz_cadastro_config(), public.raiz_cadastro_status(), public.raiz_cadastro_enviar(text,jsonb,text),public.raiz_cadastros_listar(text,integer),public.raiz_cadastro_decidir(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.raiz_cadastro_config() to anon,authenticated;
grant execute on function public.raiz_cadastro_status(),public.raiz_cadastro_enviar(text,jsonb,text),public.raiz_cadastros_listar(text,integer),public.raiz_cadastro_decidir(uuid,boolean,text) to authenticated;
notify pgrst,'reload schema';
commit;
