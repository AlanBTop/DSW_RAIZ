"""Teste real em PostgreSQL descartável. Auth local simulado, sem conexão ao Supabase."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import os, socket, subprocess, tempfile, json, uuid

ROOT=Path(__file__).resolve().parents[1]
PG=Path(os.environ.get('RAIZ_PG_BIN',r'C:\Program Files\PostgreSQL\18\bin'))
TMP=Path(tempfile.mkdtemp(prefix='raiz-web-qa-'))
with socket.socket() as s:s.bind(('127.0.0.1',0));PORT=s.getsockname()[1]
def command(name,*args,input=None,check=True):
    # pg_ctl deixa descendentes ativos; pipe herdado impediria capture_output de encerrar.
    with tempfile.TemporaryFile(mode='w+',encoding='utf-8') as output:
        r=subprocess.run([str(PG/(name+'.exe')),*map(str,args)],input=input,stdout=output,stderr=subprocess.STDOUT,encoding='utf-8',errors='replace',creationflags=subprocess.CREATE_NO_WINDOW,timeout=90)
        output.seek(0);r.stdout=output.read();r.stderr=''
    if check and r.returncode:raise RuntimeError(r.stdout+r.stderr)
    return r
def sql(text,check=True):return command('psql','-h','127.0.0.1','-p',PORT,'-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-X','-q','-t','-A',input=text,check=check)
def identity(uid,body):return "begin;set local role authenticated;select set_config('request.jwt.claim.sub','"+uid+"',true);"+body+';commit;'
started=False
try:
    command('initdb','-D',TMP/'pg','-U','postgres','-A','trust','-E','UTF8','--no-locale')
    command('pg_ctl','-D',TMP/'pg','-l',TMP/'server.log','-o',f'-p {PORT} -h 127.0.0.1','-w','start');started=True
    sql('''create role anon;create role authenticated;create role service_role bypassrls;
      create schema auth;create table auth.users(id uuid primary key,email varchar(255),raw_user_meta_data jsonb default '{}',is_anonymous boolean default false,created_at timestamptz default now());
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql stable as $$select '{"is_anonymous":false}'::jsonb$$;
      grant usage on schema auth to anon,authenticated;grant execute on function auth.uid(),auth.jwt() to anon,authenticated;''')
    migrations=sorted((ROOT/'supabase/migrations').glob('*.sql'))
    for p in migrations:sql(p.read_text(encoding='utf-8'))
    sql("insert into vendedor.lojas(id,nome) values(1,'Loja QA');insert into vendedor.produtos(id,loja_id,nome,categoria,preco,estoque) values(1,1,'Produto QA','plantas',10,5);select setval(pg_get_serial_sequence('vendedor.produtos','id'),1);")
    legacy=(ROOT/'tests/acesso_legado.sql').read_text(encoding='utf-8')
    legacy=legacy.replace("select public.raiz_endereco('Endereço de teste, 100');","select public.raiz_aceitar_termos('2026-11-23');select public.raiz_endereco('Endereço de teste, 100');")
    sql(legacy)
    setup=legacy[:legacy.index('set local role anon;')]
    tests=(ROOT/'tests/operacao.sql').read_text(encoding='utf-8')
    sql(setup+tests)
    buyer2='10000000-0000-0000-0000-000000000002';buyer3='10000000-0000-0000-0000-000000000008'
    product=sql("select id from vendedor.produtos where nome='Produto operação' order by id desc limit 1;").stdout.strip()
    sql("insert into auth.users(id,email) values('"+buyer3+"','concorrencia@teste.invalid');update vendedor.produtos set estoque=1 where id="+product+';')
    for uid in [buyer2,buyer3]:sql(identity(uid,"select public.raiz_aceitar_termos('2026-11-23');select public.raiz_endereco('Endereço fictício QA');select public.raiz_item_cliente("+product+",1,null)"))
    def purchase(uid):return sql(identity(uid,"select public.raiz_checkout('"+str(uuid.uuid4())+"')"),check=False)
    with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(purchase,[buyer2,buyer3]))
    assert sum(r.returncode==0 for r in results)==1,[r.stderr for r in results]
    assert sql('select estoque from vendedor.produtos where id='+product+';').stdout.strip()=='0'
    winner=buyer2 if results[0].returncode==0 else buyer3
    order=sql("select id from cliente.pedidos where cliente_id='"+winner+"' and status='Confirmado' order by id desc limit 1;").stdout.strip()
    def cancel(_):return sql(identity(winner,"select public.raiz_cancelar_pedido("+order+",'Teste concorrente')"))
    with ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(cancel,[0,1]))
    assert sql('select estoque from vendedor.produtos where id='+product+';').stdout.strip()=='1'
    report={'migrations':len(migrations),'sql':'aprovado','estoque_concorrente':'1 compra de 2 para a última unidade','cancelamento_concorrente':'estoque devolvido uma única vez','auth':'simulado localmente','supabase_remoto':'não testado'}
    (ROOT/'tests/resultado_sql.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))
finally:
    if started:command('pg_ctl','-D',TMP/'pg','-m','fast','-w','stop')
