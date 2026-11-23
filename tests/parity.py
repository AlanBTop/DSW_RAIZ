"""Compara bytes das fontes locais, do pacote e, opcionalmente, do Render."""
from pathlib import Path
import argparse, concurrent.futures, hashlib, json, urllib.request

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--local',type=Path,default=ROOT.parent/'RAIZOTIMIZADO')
parser.add_argument('--remote',help='Origem HTTPS a comparar sem autenticação')
args=parser.parse_args()
release=json.loads((ROOT/'dist/release.json').read_text())
issues=[];shared=0
for name,sha in release['files'].items():
    if hashlib.sha256((ROOT/'dist'/name).read_bytes()).hexdigest()!=sha:issues.append('Bundle alterado: '+name)
    if name not in ('config/environment.js','_headers'):
        source=ROOT/'web'/name; local=args.local/'web'/name
        if not source.is_file() or source.read_bytes()!=(ROOT/'dist'/name).read_bytes():issues.append('Fonte diverge: '+name)
        if not local.is_file() or local.read_bytes()!=source.read_bytes():issues.append('Local diverge: '+name)
        shared+=1
if args.remote:
    def check(entry):
        name,sha=entry
        with urllib.request.urlopen(args.remote.rstrip('/')+'/'+name+'?release='+release['release'],timeout=45) as response:body=response.read()
        return None if hashlib.sha256(body).hexdigest()==sha else 'Render diverge: '+name
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:issues.extend(item for item in pool.map(check,release['files'].items()) if item)
    with urllib.request.urlopen(args.remote.rstrip('/')+'/release.json',timeout=30) as response:
        if json.load(response)['release']!=release['release']:issues.append('Manifesto remoto diverge')
print(json.dumps({'release':release['release'],'shared_files':shared,'remote_files':len(release['files']) if args.remote else 0,'differences':issues},ensure_ascii=True,indent=2))
if issues:raise SystemExit(1)
