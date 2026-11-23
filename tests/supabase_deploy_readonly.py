"""Verifica somente CORS e bloqueio sem autenticação; nunca exclui contas."""
import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError

URL = 'https://rlftmxxqlfyvfsgjtsdd.supabase.co/functions/v1/processar-exclusao'
ORIGIN = 'https://dsw-raiz.onrender.com'

def check(method, origin, expected):
    headers = {'Origin': origin}
    if method == 'OPTIONS':
        headers.update({'Access-Control-Request-Method': 'POST',
                        'Access-Control-Request-Headers': 'authorization,apikey,content-type,x-client-info'})
    request = Request(URL, method=method, headers=headers,
                      data=b'{}' if method == 'POST' else None)
    try:
        response = urlopen(request, timeout=30)
    except HTTPError as error:
        response = error
    with response:
        assert response.status == expected, (method, origin, response.status, response.read().decode())
        if origin == ORIGIN and method == 'OPTIONS':
            assert response.headers.get('Access-Control-Allow-Origin') == ORIGIN
            assert 'POST' in response.headers.get('Access-Control-Allow-Methods', '')
        if origin != ORIGIN:
            assert response.headers.get('Access-Control-Allow-Origin') != origin
        return {'method': method, 'origin': origin, 'status': response.status}

results = [check('OPTIONS', ORIGIN, 204),
           check('OPTIONS', 'https://origem-invalida.invalid', 403),
           check('POST', ORIGIN, 401)]
print(json.dumps({'checks': results, 'accountDeletions': 0, 'authenticatedFlow': 'não executado'}, ensure_ascii=False))
