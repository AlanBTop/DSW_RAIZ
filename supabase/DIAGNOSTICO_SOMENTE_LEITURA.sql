-- Execute antes de planejar migrations em base existente. Não altera objetos ou dados.
select n.nspname as schema,c.relname as tabela,c.relrowsecurity as rls
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('cliente','vendedor','entregador','public') and c.relkind in ('r','p') order by 1,2;
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies
where schemaname in ('cliente','vendedor','entregador','public') order by 1,2,3;
select n.nspname,p.proname,p.prosecdef,p.proconfig,pg_get_function_identity_arguments(p.oid)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('cliente','vendedor','entregador','public') and p.prosecdef order by 1,2;
select schemaname,tablename,indexname,indexdef from pg_indexes
where schemaname in ('cliente','vendedor','entregador','public') order by 1,2,3;
select table_schema,table_name,grantee,privilege_type from information_schema.table_privileges
where table_schema in ('cliente','vendedor','entregador','public') and grantee in ('anon','authenticated','PUBLIC') order by 1,2,3;
select n.nspname,c.relname,c.reloptions from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='v' order by 2;
-- No Supabase real, conferir também storage.buckets, políticas storage.objects,
-- histórico supabase_migrations.schema_migrations, SMTP, confirmação de e-mail e backups.
