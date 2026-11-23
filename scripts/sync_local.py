"""Sincroniza web/ com a cópia local, com detecção de conflitos e backup."""
from pathlib import Path
import argparse, datetime, hashlib, json, shutil, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
SKIP = {'config/environment.js', '_headers', 'release.json'}
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--local', type=Path, default=ROOT.parent/'RAIZOTIMIZADO')
    parser.add_argument('--export', dest='export', action='store_true', help='Leva a fonte do repositório para a cópia local')
    parser.add_argument('--publish', action='store_true', help='Valida, cria commit e envia para main; o Render publica automaticamente')
    args = parser.parse_args()
    if args.export and args.publish:raise SystemExit('--export não pode ser combinado com --publish')
    local = args.local.resolve()/'web'
    if not (local/'index.html').is_file():raise SystemExit('A pasta local não contém web/index.html')
    state_path = ROOT/'environments/sync.local.json'
    state = json.loads(state_path.read_text()) if state_path.exists() else {}
    if state and state['local'] != str(local):raise SystemExit('Outro destino local registrado; confira environments/sync.local.json')
    names = sorted(p.relative_to(ROOT/'web').as_posix() for p in (ROOT/'web').rglob('*') if p.is_file())
    changes = []
    baseline = state.get('files', {})
    for name in names:
        if name in SKIP:continue
        repo_file, local_file = ROOT/'web'/name, local/name
        a, b = digest(repo_file), digest(local_file)
        if a == b:continue
        if not args.export and name not in baseline:raise SystemExit('Sem base comum para '+name+'. Revise antes de sincronizar.')
        if name in baseline and a != baseline[name] and b != baseline[name]:raise SystemExit('Conflito: '+name+' mudou nos dois lados; nenhuma cópia foi iniciada.')
        if name in baseline and not args.export and b == baseline[name] and a != baseline[name]:raise SystemExit('O repositório mudou: execute --export antes de importar '+name)
        if name in baseline and args.export and a == baseline[name] and b != baseline[name]:raise SystemExit('A cópia local mudou: importe antes de exportar '+name)
        if not args.export and b is None:raise SystemExit('Arquivo local removido: '+name+'. Revise a remoção no repositório.')
        changes.append((name, repo_file if args.export else local_file, local_file if args.export else repo_file))
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    for name, source, target in changes:
        if target.exists():
            backup = ROOT/'artifacts/sync-backups'/stamp/name;backup.parent.mkdir(parents=True, exist_ok=True);shutil.copy2(target, backup)
        target.parent.mkdir(parents=True, exist_ok=True);shutil.copy2(source, target)
    state_path.write_text(json.dumps({'local':str(local),'files':{n:digest(ROOT/'web'/n) for n in names if n not in SKIP}},indent=2),encoding='utf-8')
    print(json.dumps({'direction':'repo_to_local' if args.export else 'local_to_repo','changed':[n for n,_,_ in changes]},ensure_ascii=True))
    if args.publish:
        branch=subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip()
        if branch != 'main':raise SystemExit('Publicação exige a branch main')
        unrelated=subprocess.check_output(['git','status','--porcelain','--untracked-files=no'],cwd=ROOT,text=True)
        if any(not line[3:].startswith(('web/','dist/')) for line in unrelated.splitlines()):raise SystemExit('Há alterações fora de web/dist; revise antes de publicar')
        subprocess.run([sys.executable,str(ROOT/'scripts/build_render.py')],cwd=ROOT,check=True)
        subprocess.run([sys.executable,str(ROOT/'tests/parity.py'),'--local',str(args.local)],cwd=ROOT,check=True)
        subprocess.run(['git','add','--','web','dist'],cwd=ROOT,check=True)
        if subprocess.run(['git','diff','--cached','--quiet'],cwd=ROOT).returncode:subprocess.run(['git','commit','-m','Sync local RAIZ web updates'],cwd=ROOT,check=True)
        subprocess.run(['git','push','origin','main'],cwd=ROOT,check=True)

if __name__ == '__main__':main()
