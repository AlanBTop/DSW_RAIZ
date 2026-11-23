begin;
create or replace function public.raiz_ofertas_pagina(p_pagina integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare resultado jsonb;
begin
  if public.raiz_entregador() is null then raise exception 'Acesso negado' using errcode='42501'; end if;
  if p_pagina is null or p_pagina<0 or p_pagina>100000 then raise exception 'Página inválida'; end if;
  with ofertas as (
    select c.id,c.coleta_loja,c.item_descricao,c.fragil,c.valor from entregador.corridas c join vendedor.pedidos p on p.id=c.id
    where c.status='Disponível' and c.entregador_id is null and p.status='Em preparo'
    and exists(select 1 from entregador.perfil e where e.id=public.raiz_entregador() and e.online)
  ), pagina as (select * from ofertas order by id limit 12 offset p_pagina*12)
  select jsonb_build_object('itens',coalesce((select jsonb_agg(pagina) from pagina),'[]'::jsonb),'total',(select count(*) from ofertas)) into resultado;
  return resultado;
end $$;
revoke all on function public.raiz_ofertas_pagina(integer) from public,anon;
grant execute on function public.raiz_ofertas_pagina(integer) to authenticated;

-- O cliente não escolhe preço, frete, proprietário ou status do pedido.
alter function public.raiz_checkout(uuid) rename to raiz_checkout_interno_v3;
revoke all on function public.raiz_checkout_interno_v3(uuid) from public,anon,authenticated;
create function public.raiz_checkout(p_requisicao uuid)
returns bigint language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.raiz_aceites where usuario_id=auth.uid() and versao='2026-11-23')
    then raise exception 'Leia e aceite os termos na seção Privacidade e termos antes de registrar o pedido'; end if;
  return public.raiz_checkout_interno_v3(p_requisicao);
end $$;
revoke all on function public.raiz_checkout(uuid) from public,anon;
grant execute on function public.raiz_checkout(uuid) to authenticated;

-- Exclusão em duas etapas: anonimiza no banco, depois Edge Function elimina Supabase Auth.
-- Somente service_role executa estas rotinas; nunca são chamadas com chave pública.
create function public.raiz_preparar_exclusao(p_protocolo uuid,p_operador uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare solicitacao public.raiz_solicitacoes_privacidade; vinculo public.raiz_vinculos; alvo uuid;
begin
  if not exists(select 1 from public.raiz_vinculos where usuario_id=p_operador and perfil='admin' and ativo)
    then raise exception 'Administrador ativo necessário' using errcode='42501'; end if;
  select * into solicitacao from public.raiz_solicitacoes_privacidade where id=p_protocolo for update;
  if not found or solicitacao.usuario_id is null or solicitacao.status='Concluída' then raise exception 'Solicitação indisponível'; end if;
  alvo:=solicitacao.usuario_id;
  if alvo=p_operador then raise exception 'Outro administrador precisa processar sua solicitação'; end if;
  -- Serializa com checkout, que também trava o cadastro do cliente.
  perform id from cliente.usuarios where id=alvo for update;
  select * into vinculo from public.raiz_vinculos where usuario_id=alvo for update;
  if exists(select 1 from cliente.pedidos where cliente_id=alvo and status not in ('Entregue','Cancelado'))
    or exists(select 1 from vendedor.pedidos where loja_id=vinculo.loja_id and status not in ('Entregue','Cancelado'))
    or exists(select 1 from entregador.corridas where entregador_id=vinculo.entregador_id and status='Em andamento')
    then raise exception 'Encerre os pedidos e entregas em andamento antes da exclusão'; end if;
  update public.raiz_solicitacoes_privacidade set status='Em processamento' where id=p_protocolo;
  update vendedor.pedidos v set cliente_nome='Conta excluída',endereco_entrega='Removido por exclusão',updated_at=now()
    where exists(select 1 from cliente.pedidos p where p.id=v.id and p.cliente_id=alvo);
  update entregador.corridas c set entrega_destino='Conta excluída',entrega_endereco='Removido por exclusão',nota_instrucao=null,updated_at=now()
    where exists(select 1 from cliente.pedidos p where p.id=c.id and p.cliente_id=alvo);
  update cliente.pedidos set cliente_nome='Conta excluída',endereco_entrega='Removido por exclusão',avaliacao_comentario=null,motivo_cancelamento=null,updated_at=now() where cliente_id=alvo;
  if vinculo.loja_id is not null then
    update entregador.corridas c set coleta_loja='Loja encerrada',coleta_endereco='Removido por exclusão',updated_at=now()
      where exists(select 1 from vendedor.pedidos v where v.id=c.id and v.loja_id=vinculo.loja_id);
    update vendedor.lojas set nome='Loja encerrada',endereco=null,cnpj=null,tagline=null,descricao=null,horario_funcionamento=null,updated_at=now() where id=vinculo.loja_id;
    update vendedor.produtos set ativo=false,descricao=null,updated_at=now() where loja_id=vinculo.loja_id;
  end if;
  if vinculo.entregador_id is not null then
    update entregador.perfil set nome='Conta excluída',telefone=null,veiculo=null,chave_pix=null,online=false,updated_at=now() where id=vinculo.entregador_id;
  end if;
  delete from cliente.usuarios where id=alvo;
  delete from public.raiz_eventos_operacao where usuario_id=alvo;
  delete from public.raiz_aceites where usuario_id=alvo;
  insert into public.raiz_vinculos(usuario_id,perfil,ativo) values(alvo,'cliente',false)
    on conflict(usuario_id) do update set ativo=false;
  -- FKs de pedidos definem cliente_id=NULL; o histórico numérico fica sem cadastro associado.
  return alvo;
end $$;
create function public.raiz_concluir_exclusao(p_protocolo uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.raiz_solicitacoes_privacidade s join auth.users u on u.id=s.usuario_id where s.id=p_protocolo)
    then raise exception 'Exclua a identidade Auth antes de concluir'; end if;
  update public.raiz_solicitacoes_privacidade set status='Concluída',concluida_em=now(),usuario_id=null where id=p_protocolo and status='Em processamento';
  if not found then raise exception 'Solicitação não está em processamento'; end if;
end $$;
revoke all on function public.raiz_preparar_exclusao(uuid,uuid),public.raiz_concluir_exclusao(uuid) from public,anon,authenticated;
grant execute on function public.raiz_preparar_exclusao(uuid,uuid),public.raiz_concluir_exclusao(uuid) to service_role;
notify pgrst,'reload schema';
commit;
