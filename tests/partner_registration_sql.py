"""Solicitações, isolamento e decisões concorrentes em PostgreSQL descartável."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import os,socket,subprocess,tempfile,json,uuid
ROOT=Path(__file__).resolve().parents[1];PG=Path(os.environ.get('RAIZ_PG_BIN',r'C:\Program Files\PostgreSQL\18\bin'));TMP=Path(tempfile.mkdtemp(prefix='raiz-cadastro-'))
with socket.socket() as sock:sock.bind(('127.0.0.1',0));PORT=sock.getsockname()[1]
def cmd(name,*args,input=None,check=True):
    with tempfile.TemporaryFile(mode='w+',encoding='utf-8') as output:
        r=subprocess.run([str(PG/(name+'.exe')),*map(str,args)],input=input,stdout=output,stderr=subprocess.STDOUT,encoding='utf-8',errors='replace',creationflags=subprocess.CREATE_NO_WINDOW,timeout=90);output.seek(0);r.stdout=output.read()
    if check and r.returncode:raise RuntimeError(r.stdout)
    return r
def sql(text,check=True):return cmd('psql','-h','127.0.0.1','-p',PORT,'-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-X','-q','-t','-A',input=text,check=check)
def actor(uid,text,check=True):return sql("begin;set local role authenticated;set local request.jwt.claim.sub='"+uid+"';"+text+';commit;',check)
def value(uid,text):
    result=actor(uid,'select '+text).stdout.strip().splitlines()
    return result[-1] if result else 'null'
def denied(uid,text):assert actor(uid,text,False).returncode!=0,text
ids={key:str(uuid.uuid4()) for key in ('admin','admin2','seller','courier','other','buyer')}
seller={'nome':'Vendedora QA','telefone':'65999990000','loja':'Loja QA','endereco':'Rua de teste, 123, Cáceres - MT','horario':'8h às 18h'}
courier={'nome':'Entregador QA','telefone':'65999991111','veiculo':'Bicicleta'}
def send(uid,role,data):return value(uid,"public.raiz_cadastro_enviar('"+role+"','"+json.dumps(data,ensure_ascii=True)+"'::jsonb,'2026-11-23')")
started=False
try:
    cmd('initdb','-D',TMP/'pg','-U','postgres','-A','trust','-E','UTF8','--no-locale');cmd('pg_ctl','-D',TMP/'pg','-l',TMP/'log','-o',f'-p {PORT} -h 127.0.0.1','-w','start');started=True
    sql('''create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
    create table auth.users(id uuid primary key,email varchar(255),raw_user_meta_data jsonb default '{}',is_anonymous boolean default false,created_at timestamptz default now());
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select '{"is_anonymous":false}'::jsonb$$;
    grant usage on schema auth to anon,authenticated;grant execute on function auth.uid(),auth.jwt() to anon,authenticated;''')
    files=sorted((ROOT/'supabase/migrations').glob('*.sql'))
    for file in files:
        if 'cadastro_parceiros' in file.name:
            sql("insert into vendedor.lojas(id,nome) values(92002,'Loja anterior');insert into entregador.perfil(id,nome) values(92002,'Entregador anterior');")
        sql(file.read_text(encoding='utf-8'))
    for key,uid in ids.items():sql("insert into auth.users(id,email,raw_user_meta_data) values('"+uid+"','"+key+"@teste.invalid','{\"role\":\"admin\"}');")
    for key in ('admin','admin2'):sql("insert into public.raiz_vinculos(usuario_id,perfil) values('"+ids[key]+"','admin');")
    assert sql('set role anon;select public.raiz_cadastro_config();').returncode==0
    assert sql('set role anon;select public.raiz_cadastro_status();',False).returncode!=0
    assert sql('set role anon;select * from public.raiz_candidaturas;',False).returncode!=0
    denied(ids['seller'],'select * from public.raiz_candidaturas')
    denied(ids['seller'],"select public.raiz_cadastros_listar('Pendente',0)")
    denied(ids['seller'],"select public.raiz_cadastro_enviar('admin','{}','2026-11-23')")
    denied(ids['seller'],"select public.raiz_cadastro_enviar('vendedor','{}','2026-11-23')")
    sid=send(ids['seller'],'vendedor',seller);cid=send(ids['courier'],'entregador',courier)
    assert send(ids['seller'],'vendedor',seller)==sid
    assert value(ids['seller'],'public.raiz_acesso()')=='cliente'
    assert json.loads(value(ids['other'],'public.raiz_cadastro_status()')) is None
    denied(ids['seller'],"select public.raiz_cadastro_decidir('"+sid+"',true,null)")
    denied(ids['admin'],"select public.raiz_cadastro_decidir('"+cid+"',false,'não')")
    assert value(ids['admin'],"public.raiz_cadastro_decidir('"+cid+"',false,'Informe corretamente seu veículo.')")=='Recusado'
    own=json.loads(value(ids['courier'],'public.raiz_cadastro_status()'));assert own['status']=='Recusado' and own['motivo']
    assert value(ids['courier'],'public.raiz_acesso()')=='cliente'
    cid2=send(ids['courier'],'entregador',courier);assert cid2!=cid
    def approve(admin):return value(ids[admin],"public.raiz_cadastro_decidir('"+sid+"',true,null)")
    with ThreadPoolExecutor(max_workers=2) as pool:assert list(pool.map(approve,['admin','admin2']))==['Aprovado','Aprovado']
    assert sql("select count(*) from vendedor.lojas where nome='Loja QA';").stdout.strip()=='1'
    assert value(ids['seller'],'public.raiz_acesso()')=='vendedor'
    assert int(value(ids['seller'],'public.raiz_loja()'))>92002
    assert value(ids['admin'],"public.raiz_cadastro_decidir('"+cid2+"',true,null)")=='Aprovado'
    assert value(ids['courier'],'public.raiz_acesso()')=='entregador'
    assert int(value(ids['courier'],'public.raiz_entregador()'))>92002
    assert value(ids['courier'],'(select online from public.entregador_perfil)')=='f'
    denied(ids['admin'],"select public.raiz_cadastro_decidir('"+sid+"',false,'Não pode mudar decisão')")
    assert value(ids['other'],'(select count(*) from public.entregador_perfil)')=='0'
    actor(ids['buyer'],"select public.raiz_endereco('Endereço do cliente QA')")
    denied(ids['buyer'],"select public.raiz_cadastro_enviar('entregador','"+json.dumps(courier)+"','2026-11-23')")
    result={'migrations':len(files),'pending_without_access':True,'administrator_only':True,'rejection_and_resubmission':True,'concurrent_approval_single_profile':True,'rls_isolation':True,'customer_preserved':True,'remote_writes':0}
    (ROOT/'tests/resultado_partner_registration_sql.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result))
finally:
    if started:cmd('pg_ctl','-D',TMP/'pg','-m','fast','-w','stop')
