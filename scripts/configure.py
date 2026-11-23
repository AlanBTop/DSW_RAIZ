"""Somente configuração pública. Ex.: python scripts/configure.py production"""
from pathlib import Path
import json, re, sys
ROOT=Path(__file__).resolve().parents[1]
name=sys.argv[1] if len(sys.argv)>1 else 'production'
if name not in ('production','staging','development'):raise SystemExit('Ambiente inválido')
file=ROOT/'environments'/('production.public.json' if name=='production' else name+'.local.json')
data=json.loads(file.read_text(encoding='utf-8'))
url=data.get('supabaseUrl','');key=data.get('publishableKey','')
if not re.fullmatch(r'https://[a-z0-9-]+\.supabase\.co',url) or not key.startswith('sb_publishable_'):
    raise SystemExit('Informe URL Supabase e chave pública publishable válidas; segredos são proibidos')
if set(data)-{'supabaseUrl','publishableKey','googleOAuth'}:raise SystemExit('Campos inesperados; não coloque segredos na configuração pública')
if name!='production':
    prod=json.loads((ROOT/'environments/production.public.json').read_text(encoding='utf-8'))
    if url==prod['supabaseUrl']:raise SystemExit('Use um projeto distinto do de produção')
output={'mode':'online','localOnly':False,'allowPresentation':False,'allowLocalAdapter':False,'googleOAuth':data.get('googleOAuth') is True,**data}
(ROOT/'dist/config/environment.js').write_text('// Configuração pública gerada; nunca inclua segredos.\nwindow.RaizEnvironment=Object.freeze('+json.dumps(output,ensure_ascii=False,indent=2)+');\n',encoding='utf-8',newline='\n')
print('Configuração pública gerada para '+name)
