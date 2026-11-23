# Integração mobile em 5 passos

Use o mesmo Supabase da web. Não replique regras de preço, estoque, status ou permissões no Flutter. Essas regras ficam nas RPCs e no RLS.

## 1. Configurar e entrar

Passe `SUPABASE_URL` e a chave pública por `--dart-define-from-file` de um arquivo local ignorado. Nunca use service_role. Inicialize `supabase_flutter`, autentique e consulte `raiz_acesso`. O retorno é `cliente`, `vendedor`, `entregador`, `admin` ou `inativo`. Metadados de cadastro e a tela selecionada não concedem papel. Vendedor/entregador precisam de vínculo administrativo.

```dart
final db = Supabase.instance.client;
await db.auth.signInWithPassword(email: email, password: senha);
final perfil = await db.rpc('raiz_acesso');
final recursos = await db.rpc('raiz_recursos');
```

Login, logout e recuperação usam Supabase Auth. Para recuperação configure o deep link do app no Supabase; aguarde `AuthChangeEvent.passwordRecovery`, mostre nova senha e chame `updateUser`. Não navegue para a home antes de tratar esse evento. Não armazene senha; use armazenamento seguro para sessão. Não mostre mensagens que identifiquem se um e-mail existe.

## 2. Ler dados

Use as views do schema `public`; o RLS limita cada usuário. Paginação: 12 registros, `range(pagina * 12, pagina * 12 + 11)`, ordenados por `id`. Faça filtros no servidor antes de `range`.

| Persona | Views |
|---|---|
| Cliente | `cliente_produtos`, `cliente_usuarios`, `cliente_favoritos`, `cliente_carrinho`, `cliente_pedidos`, `cliente_itens_pedido` |
| Vendedor | `vendedor_lojas`, `vendedor_produtos`, `vendedor_pedidos`, `vendedor_itens_pedido` |
| Entregador | `entregador_perfil`, `entregador_corridas`, `entregador_historico` |

Busque itens apenas dos pedidos da página com `inFilter('pedido_id', ids)`. Nunca consulte todos os pedidos para filtrar no telefone. SQLite pode guardar catálogo público; não grave tokens, CPF, telefone ou endereço em banco local sem proteção e uma necessidade documentada. Não faça checkout ou altere estoque offline.

## 3. Chamar as operações

| Operação | RPC e parâmetros |
|---|---|
| Registrar aceite | `raiz_aceitar_termos(p_versao: '2026-11-23')` após aceite explícito |
| Endereço | `raiz_endereco(p_endereco)` |
| Carrinho | `raiz_item_cliente(p_produto, p_quantidade, p_favorito: null)`; quantidade zero remove |
| Favorito | `raiz_item_cliente(p_produto, p_quantidade: 0, p_favorito: true/false)` |
| Comprar sem cobrança | `raiz_checkout(p_requisicao: UUID)`; guarde e repita o mesmo UUID em timeout |
| Produto | `raiz_produto(p_id: null ou id, p_nome, p_categoria, p_preco, p_estoque, p_ativo, p_descricao)` |
| Preparar | `raiz_preparo(p_pedido)` |
| Disponibilidade | `raiz_disponibilidade(p_online)` |
| Ofertas paginadas | `raiz_ofertas_pagina(p_pagina)` retorna `{itens, total}` sem endereço do cliente |
| Aceitar entrega | `raiz_etapa(p_pedido, p_etapa: 1, p_vaso: false, p_folhagem: false, p_entrega: false)` |
| Coletar | Mesma RPC, etapa 2, `p_vaso` e `p_folhagem` verdadeiros |
| Entregar | Mesma RPC, etapa 3, `p_entrega` verdadeiro |
| Confirmar recebimento | `raiz_confirmar_recebimento(p_pedido)` pelo cliente comprador |
| Avaliar loja | `raiz_avaliar_pedido(p_pedido, p_nota: 1..5, p_comentario: até 1000 caracteres)` |
| Cancelar | `raiz_cancelar_pedido(p_pedido, p_motivo: 3..300 caracteres)` |
| Solicitar exclusão | `raiz_solicitar_exclusao(p_confirmacao: 'EXCLUIR MINHA CONTA')` retorna UUID do protocolo |

```dart
// Gere UUID uma vez por tentativa lógica; não gere outro a cada retry de rede.
final pedido = await db.rpc('raiz_checkout', params: {'p_requisicao': requisicaoId});
await db.rpc('raiz_confirmar_recebimento', params: {'p_pedido': pedido});
```

Categorias: `plantas`, `vasos`, `insumos`, `ferramentas`. Valores monetários no banco são numeric; prefira centavos inteiros para somar na UI. O servidor calcula o total e cobra frete fixo de R$ 15 no registro, sem movimentar dinheiro. Não envie preço, usuário, loja, saldo ou status arbitrário no checkout.

## 4. Mostrar o estado correto

Cliente: `Confirmado` → `Em preparação` → `Em transporte` → `Entregue`; `Cancelado` é terminal. `Entregue` registra a conclusão do entregador. O campo `recebimento_confirmado_em` registra a confirmação posterior do comprador e libera avaliação. Não avance estado por temporizador nem por escrita direta.

Cancelamento: cliente antes do preparo; vendedor/admin antes da atribuição a entregador. A RPC devolve estoque uma única vez. Não existe reembolso monetário, pois não há pagamento integrado.

## 5. Validar antes de publicar

Teste duas contas da mesma persona, acesso cruzado e sessão expirada. Execute a jornada completa entre as três contas, última unidade concorrente e retry com o mesmo UUID. Abra termos, privacidade e exclusão em links HTTPS da web; contato `suporteraiz.mkt@hotmail.com`. Teste aparelho físico e release assinado. Não altere RLS para fazer uma tela funcionar: corrija a chamada ou solicite o vínculo correto.
