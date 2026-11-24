# Vendas e pagamentos

Página compartilhada: `/financeiro/index.html?modo=online`. Acesso por “Vendas e pagamentos” nas áreas de vendedor e administrador. Login preserva o destino. A sessão e o perfil são verificados no Supabase; consultas continuam sujeitas às permissões do servidor.

## Navegação e componentes

Quatro módulos: Pedidos e status, Meios de pagamento, Conciliação e repasses, Segurança e disputas. Reutiliza os tokens de `site-theme.css`, tipografia, botões de 44px, cards, campos e raios da área do vendedor. Componentes compartilhados na página: indicador, badge com símbolo/texto/cor, tabela rolável, paginação, filtros, estado vazio/erro, diálogo de detalhe, confirmação e calculadora.

Os indicadores mostram a área inteira autorizada. As tabelas e os relatórios usam a seleção aplicada. Pedidos são lidos em lotes de 200 (limite de segurança de 10 mil); `raiz_pagamentos` atualmente retorna até 100 pagamentos recentes. Esse limite aparece na página e nos relatórios. Pedidos sem pagamento retornado ficam como **Sem registro**, nunca como pendentes ou pagos.

## Estados e operações

- Acesso: verificação, login, perfil não autorizado e falha com nova tentativa.
- Pedidos: carregamento, vazio, seleção vazia, falha independente da consulta de pagamentos, paginação, histórico dos eventos efetivamente retornados. Datas indisponíveis não são inventadas. O andamento atual da entrega é separado do status financeiro; a API não oferece histórico operacional completo.
- Preparo: apenas vendedor, pedido pendente e pagamento aprovado; confirmação, bloqueio de repetição, RPC `raiz_preparo`, recarga e mensagem de erro ou sucesso real.
- Meios: disponibilidade informativa do simulador, gateway não conectado e calculadora de política sem persistência. O checkout mantém suas regras atuais (até três parcelas). Nenhuma chave é coletada ou armazenada pelo navegador.
- Conciliação: bruto aprovado/estornos retornados; taxas, líquido e agenda ficam indisponíveis até integração. Exportação de **todos os pedidos filtrados** em CSV, XLSX OpenXML sem biblioteca externa e impressão para salvar como PDF. Valores desconhecidos são identificados; CPF e endereço não entram nos relatórios. CSV trata prefixos de fórmula; XLSX usa texto literal para células textuais.
- Segurança: integração ausente é distinta de fila vazia/risco baixo. CPF mascarado e IP/score indisponíveis. Endereço oculto por padrão, com revelação apenas dentro de detalhe já autorizado. Envio de anexos/disputas permanece indisponível sem armazenamento privado e provedor.

## Limites atuais

Não há gateway real, taxas contratuais, agenda de repasses, antifraude, chargebacks ou armazenamento de evidências. A API de estorno existente é exclusiva do cliente no simulador, antes do preparo; não é chamada com privilégios de lojista. Não há controles que indiquem salvar configuração, testar conexão, estornar ou enviar disputa sem executar uma operação autorizada no servidor. Ao implementar essas integrações, desativação de meio, estorno e envio de resposta deverão ter confirmação e autorização no servidor.

Validação direcionada: `tests/finance_console.py` (perfis, filtros, lote além da primeira página, confirmação do preparo, exportação/ZIP, calculadora, indisponibilidade e três larguras); `tests/static.cjs` (sintaxe, referências locais e segredos). Não cria pedidos nem movimenta dados de produção.
