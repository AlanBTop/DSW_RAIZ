begin;
create or replace function public.raiz_etapa(p_pedido bigint,p_etapa integer,p_vaso boolean,p_folhagem boolean,p_entrega boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare courier integer:=public.raiz_entregador();
begin
  perform id from cliente.pedidos where id=p_pedido for update;
  perform id from vendedor.pedidos where id=p_pedido for update;
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


commit;