# DSW_RAIZ

# RAIZ Web

Versão web autenticada para cliente, vendedor, entregador e administrador. Backend compartilhado em Supabase; os aplicativos mobile podem usar o mesmo contrato sem um segundo backend.

1. Leia [o guia de operação](docs/OPERACAO.md).
2. Gere a configuração pública com `python scripts/configure.py production`.
3. Sirva `dist/`: `python scripts/serve.py` e abra `http://127.0.0.1:3080/`.
4. Antes de usar as novas operações, aplique as migrations corretas ao ambiente e publique a função de exclusão, conforme o guia.
5. Para mobile, comece por [MOBILE.md](docs/MOBILE.md).

O site não processa cobranças. Frete fixo de R$ 15 por pedido, um pedido por loja. Não existe integração bancária ou estorno financeiro nesta versão.

Contato: suporteraiz.mkt@hotmail.com. Equipe: Alan Botelho Magalhães, Emanuel Faria de Souza, Yuri Sardinha Milani, Gabriel Oliveira Neves, Vitor Jesus Gama da Silva e André Soares Barros.

Testes: `python tests/database.py` (PostgreSQL 15+; padrão Windows PostgreSQL 18), `python tests/browser.py` (Playwright e Edge/Chrome) e `node tests/static.cjs`. Os testes de banco usam Auth simulado em cluster descartável; os de navegador usam respostas de API de teste. Não comprovam configuração ou aplicação no Supabase remoto.
