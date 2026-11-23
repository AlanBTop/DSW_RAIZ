// Testa as barreiras da Edge Function com clientes simulados, sem rede ou exclusões.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const source = fs.readFileSync(path.join(__dirname, '../supabase/functions/processar-exclusao/index.ts'), 'utf8');
const code = stripTypeScriptTypes(source).replace(/^import .*;\r?\n/, '');
const origin = 'https://dsw-raiz.onrender.com';
let handler, calls = 0, deletions = 0;
let role = 'admin', authenticated = true, queryError = true;
const user = {
  auth: { getUser: async () => ({ data: { user: authenticated ? { id: 'operador' } : null }, error: null }) },
  rpc: async () => ({ data: role, error: null }),
};
const admin = {
  from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: queryError ? { message: 'detalhe privado do banco' } : null }) }) }) }),
  auth: { admin: { deleteUser: async () => { deletions++; throw new Error('Exclusão inesperada'); } } },
};
vm.runInNewContext(code, {
  Deno: { env: { get: key => key === 'RAIZ_WEB_ORIGIN' ? origin : 'fixture' }, serve: fn => { handler = fn; } },
  Response,
  createClient: () => (++calls % 2 ? user : admin),
});
async function check(status, method, requestOrigin, token, body) {
  calls = 0;
  const headers = {};
  if (requestOrigin) headers.origin = requestOrigin;
  if (token) headers.authorization = 'Bearer fixture';
  const response = await handler(new Request(origin + '/processar-exclusao', {
    method, headers, ...(method === 'POST' ? { body: JSON.stringify(body || {}) } : {}),
  }));
  assert.equal(response.status, status);
  return response;
}
(async () => {
  await check(403, 'OPTIONS', 'https://origem-invalida.invalid');
  const preflight = await check(204, 'OPTIONS', origin);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
  await check(405, 'GET', origin);
  await check(401, 'POST', origin);
  authenticated = false;
  await check(401, 'POST', origin, true);
  authenticated = true; role = 'cliente';
  await check(403, 'POST', origin, true);
  role = 'admin';
  await check(400, 'POST', origin, true, { protocolo: 'invalido' });
  const unavailable = await check(503, 'POST', origin, true, { protocolo: '00000000-0000-4000-8000-000000000000' });
  assert(!JSON.stringify(await unavailable.json()).includes('detalhe privado'));
  queryError = false;
  await check(404, 'POST', origin, true, { protocolo: '00000000-0000-4000-8000-000000000000' });
  assert.equal(deletions, 0);
  console.log(JSON.stringify({ checks: 9, securityGates: 'aprovadas', databaseUnavailable: 503, deletions: 0 }));
})().catch(error => { console.error(error); process.exitCode = 1; });
