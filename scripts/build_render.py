"""Build estático do Render, sem dependências e sem alterar o Supabase."""
from pathlib import Path
import json
import re
import runpy
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.argv = [str(ROOT / 'scripts/configure.py'), 'production']
runpy.run_path(sys.argv[0], run_name='__main__')

required = ['index.html', 'login.html', 'recuperar-senha.html', '404.html',
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

print(json.dumps({'publishPath': 'dist', 'requiredFiles': len(required),
                  'supabaseMigrations': 'não executadas'}, ensure_ascii=False))
