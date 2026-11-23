-- O perfil e seu vínculo operacional precisam usar a mesma fonte de vínculos.
-- Não altera contas, vínculos, políticas ou privilégios existentes.
begin;
create or replace function public.raiz_loja()
returns integer language sql stable security definer set search_path = '' as $$
  select v.loja_id from public.raiz_vinculos v
  where v.usuario_id = auth.uid() and v.ativo and v.perfil = 'vendedor'
    and public.raiz_acesso() = 'vendedor'
$$;
create or replace function public.raiz_entregador()
returns integer language sql stable security definer set search_path = '' as $$
  select v.entregador_id from public.raiz_vinculos v
  where v.usuario_id = auth.uid() and v.ativo and v.perfil = 'entregador'
    and public.raiz_acesso() = 'entregador'
$$;
commit;
