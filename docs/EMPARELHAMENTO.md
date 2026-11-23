# Versão compartilhada entre local, GitHub e Render

A fonte de publicação é `web/`. O build `python scripts/build_render.py` copia essa fonte para `dist/`, gera apenas a configuração pública de produção e registra os hashes em `dist/release.json`. O Render acompanha `main` de AlanBTop/DSW_RAIZ, executa esse build e publica `dist/`.

A cópia `../RAIZOTIMIZADO/web/` usa os mesmos HTML, CSS, JavaScript, imagens e SDK. O arquivo `config/environment.js` mantém os exemplos habilitados apenas em loopback; `config/local-client.js` e o servidor Python são exclusivos da execução autenticada local. No Render, os quatro perfis exigem login e parâmetros de demonstração não liberam acesso.

## Integração de atualização automática

Em 23/11/2026, a instalação Render no GitHub foi autorizada também para `AlanBTop/DSW_RAIZ`, preservando a autorização existente do RADACHE. O serviço `dsw-raiz` foi vinculado ao repositório por Git Provider, na branch `main`, com build `python3 scripts/build_render.py` e publicação de `dist/`. Antes dessa correção, o repositório era lido como público e os pushes não iniciavam os deploys, apesar da indicação de Auto-Deploy. A publicação deve ser acompanhada no histórico do Render até o estado `live`.

## Atualizar após editar localmente

Execute `ATUALIZAR_RENDER.bat` em RAIZOTIMIZADO ou, neste repositório:

```powershell
python scripts/sync_local.py --publish
```

O comando importa os arquivos conhecidos de `RAIZOTIMIZADO/web`, cria backup dos arquivos substituídos em `artifacts/sync-backups/`, valida a paridade, cria o commit e envia a `main`. O deploy é automático. Uma falha no push interrompe a publicação e preserva o commit para nova tentativa. Acompanhe o deploy no painel do Render; o envio ao GitHub sozinho não comprova que o site já foi atualizado.

Sem `--publish`, o script apenas sincroniza os arquivos. Se houver mudanças independentes nos dois lados, ele interrompe antes da cópia. Para levar alterações do repositório à cópia local, use `python scripts/sync_local.py --export`. Novos arquivos devem ser adicionados explicitamente a `web/` no repositório; remoções também precisam de revisão. O script não importa SQL, relatórios, bancos locais, credenciais ou arquivos de ambiente.

## Conferir a versão

```powershell
python tests/parity.py
python tests/parity.py --remote https://dsw-raiz.onrender.com
```

A segunda conferência baixa todos os arquivos públicos do manifesto e compara SHA-256. `release.json` identifica a versão por conteúdo. A configuração de produção e os headers são específicos da hospedagem; os demais arquivos devem ser idênticos.

## Funcionalidades reunidas

A primeira página agora é a vitrine pública, com busca, categorias, ordenação e paginação. `produto.html?id=…` mostra descrição, cuidados, preço e estoque sem login. `sobre.html` reúne a apresentação institucional. O visitante pode montar e revisar o carrinho; a autenticação só é solicitada ao continuar a compra. A seleção é retomada na área do cliente para revisão, sem criar pedido automaticamente. Clientes novos informam o endereço antes de transferir a seleção ao carrinho autenticado.

O botão Google foi habilitado na configuração pública após confirmar que o provedor já estava ativo no Supabase. `tests/storefront.py` cobre a navegação e a retomada com fixtures; `tests/storefront_live.py` verifica anonimamente o catálogo real, os detalhes, o carrinho e a autorização que redireciona ao Google, sem entrar em uma conta nem escrever no banco. O carrinho visitante armazena apenas IDs e quantidades em localStorage, e a seleção de compra expira após uma hora em sessionStorage.

Os pagamentos acadêmicos existentes na versão local foram incorporados à interface autenticada, com Pix, boleto, crédito em até três parcelas e débito, histórico, nova tentativa, comprovante e estorno simulado. Não há cobrança bancária. O preparo respeita o pagamento aprovado. Paginação, layout dos perfis, recuperação de senha, permissões e recursos de privacidade do repositório foram preservados.

`raiz_pagamentos` já existe no projeto Supabase informado. `raiz_recursos` não existe na conferência anônima de 23/11/2026. A interface preserva a compatibilidade com essa base, sem habilitar os recursos de extensão ausentes. Nenhuma migração, conta ou dado remoto foi alterado neste emparelhamento. Os testes de negócio usam banco temporário local; fixtures de navegador não comprovam login remoto de uma conta real.
