"""Build reproduzível: web/ é a fonte; dist/ é gerado sem acesso ao banco."""
from pathlib import Path
import hashlib
import json
import re
import runpy
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'web'
DIST = ROOT / 'dist'
for file in sorted(SOURCE.rglob('*')):
    if not file.is_file():
        continue
    name = file.relative_to(SOURCE)
    if file.suffix not in {'.html','.js','.css','.json','.webp','.svg','.png'} and name.as_posix() != '_headers':
        raise SystemExit('Arquivo não publicável na fonte web/: ' + str(name))
    target = DIST / name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(file, target)
previous = sys.argv[:]
sys.argv = [str(ROOT / 'scripts/configure.py'), 'production']
try:
    runpy.run_path(sys.argv[0], run_name='__main__')
finally:
    sys.argv = previous

required = ['index.html', 'produto.html', 'carrinho.html', 'sobre.html', 'login.html', 'recuperar-senha.html', '404.html',
            'cliente/index.html', 'vendedor/index.html', 'entregador/index.html',
            'admin/index.html', 'config/environment.js', '_headers']
for name in required:
    if not (ROOT / 'dist' / name).is_file():
        raise SystemExit('Arquivo obrigatório ausente: ' + name)
for file in (ROOT / 'dist').rglob('*'):
    if file.is_file() and file.suffix in ('.js', '.json', '.html'):
        content = file.read_text(encoding='utf-8')
        if re.search(r'sb_secret_[A-Za-z0-9]+|-----BEGIN (?:RSA )?PRIVATE KEY-----', content):
            raise SystemExit('Credencial privada no bundle: ' + str(file.relative_to(ROOT)))

hashes = {p.relative_to(DIST).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
          for p in sorted(DIST.rglob('*')) if p.is_file() and p.name != 'release.json'}
release = hashlib.sha256(json.dumps(hashes, sort_keys=True).encode()).hexdigest()
(DIST / 'release.json').write_text(json.dumps({'release':release,'files':hashes},indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'publishPath':'dist','source':'web','release':release,'files':len(hashes),
                  'supabaseMigrations':'não executadas'},ensure_ascii=True))
