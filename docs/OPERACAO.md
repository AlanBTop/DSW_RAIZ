# Operação da web RAIZ

## O que foi implementado

Recuperação de senha, erros externos de autenticação genéricos, paginação de catálogo/pedidos/estoque/histórico, confirmação do cliente, cancelamento atômico, avaliações de compras confirmadas, aceite versionado, protocolo de exclusão, processamento administrativo e eventos operacionais. O cache IndexedDB aceita apenas catálogo público. A sessão usa sessionStorage; ao fechar a aba é necessário entrar novamente. Não há cobrança integrada.

## Preparar o Supabase

Identifique o projeto, ambiente e histórico de migrations antes de executar SQL. Faça backup verificável de base existente. As migrations 001–003 vieram das fontes locais do RAIZ. A 001 é exclusivamente para banco vazio e recusa estrutura existente. Não reaplique a base em produção. Em base existente, compare estrutura e histórico e aplique apenas incrementais compatíveis, 004–006, após ensaio em homologação. Não use reset nem seeds remotos.

As novas operações dependem das migrations 004–006. A web consulta `raiz_recursos` e mantém o acesso básico quando a extensão ainda não foi aplicada. Isso é compatibilidade de publicação, não prova de backend atualizado. Sem a extensão, exclusão continua disponível pelo e-mail de suporte; confirmação/avaliação/cancelamento novos não ficam habilitados.

No Supabase Auth: configure a origem publicada como Site URL, permita retornos exatos para `/login.html` e `/recuperar-senha.html`, habilite confirmação de e-mail, configure SMTP, limites e teste e-mails reais. Não habilite URLs curinga desnecessárias. A chave pública pode estar no bundle; chaves privadas só no servidor.

## Exclusão de conta

Publique a Edge Function `supabase/functions/processar-exclusao/index.ts` com verificação de JWT habilitada. Configure `RAIZ_WEB_ORIGIN` com a origem HTTPS exata do site. A função usa segredos de servidor fornecidos pelo Supabase, nunca pelo navegador. Somente admin autenticado processa solicitações. Ela anonimiza dados de negócio, desativa acesso e depois elimina Auth; repetir o mesmo protocolo retoma falhas parciais.

Antes de processar, a equipe precisa encerrar pedidos/entregas pendentes. O operador não pode excluir a própria conta. A interface registra pedido de exclusão; não anuncia exclusão concluída antes da resposta da função. Pedidos por e-mail exigem verificação de identidade pelo responsável. Não peça senha ou documento completo.

## Ambientes

`environments/production.public.json` contém somente configuração pública. Crie `development.local.json` e `staging.local.json` a partir do exemplo, usando projetos distintos. Gere com `python scripts/configure.py staging`. Não reutilize o projeto de produção em desenvolvimento. O script recusa configuração vazia, chave secreta, modo de demonstração ou ambiente de teste com o mesmo endpoint de produção. Nunca publique arquivos `.env`, keystores ou bancos locais.

## Publicar e conferir

1. Execute os testes de SQL, navegador e arquivos estáticos do README.
2. Gere a configuração de produção e regenere documentos/headers com `python scripts/prepare_site.py` (Pillow necessário).
3. Execute `python scripts/build_render.py`: a fonte `web/` gera `dist/` e `release.json`. Envie a branch `main` ao GitHub; o Render publica `dist/` automaticamente. Veja `EMPARELHAMENTO.md` para sincronizar a cópia local.
4. Confira HTTPS, redirecionamento HTTP, 404 real, CSP e acesso de visitantes em https://dsw-raiz.onrender.com. Compare todos os arquivos com `python tests/parity.py --remote https://dsw-raiz.onrender.com`.
5. Homologue contas fictícias no Supabase remoto, sem usar dados pessoais reais em QA.

## Monitoramento e retenção

O perfil público da loja fica em `loja.html?id=<loja_id>`, com abas Produtos e Sobre a loja. O acesso “Ver perfil do vendedor” aparece somente em `produto.html`, sem links novos nos cartões do catálogo. A página consulta apenas anúncios ativos de `cliente_produtos`, filtrados pelo identificador da loja; nome, categorias e contagens vêm desses anúncios públicos. A apresentação não expõe endereço de coleta, documentos ou dados privados do vendedor. Valide esse fluxo com `python tests/shop_profile.py` (Edge/Chrome, desktop e celular).

Eventos em `public.raiz_eventos_operacao`, visíveis só ao admin. Capturam categoria, área, referência, usuário autenticado e horário; sem payload livre. Há cota de 60 eventos/minuto por usuário. A rotina de inserção limpa registros com mais de 30 dias. Configure também tarefa diária `delete from public.raiz_eventos_operacao where created_at < now() - interval '30 days'` no agendador administrativo para cumprir retenção mesmo sem tráfego. Confira falhas de envio e não trate a tabela como prova de auditoria: os eventos são enviados por clientes autenticados e podem ser omitidos ou forjados por eles.

Backup: conferir plano e retenção no Supabase e ensaiar restauração em homologação. Uma restauração deve reaplicar solicitações de exclusão posteriores ao backup antes de voltar ao ar. Nunca publique dados ou sessões de testes.

## Rollback

Registre a versão Sites anterior e seu commit antes da publicação. Para falha visual, republique essa versão mantendo a audiência. Prefira migrações corretivas incrementais no banco; não apague colunas com dados. Como checkout agora exige aceite no servidor, uma UI anterior sem a seção de aceite pode não concluir pedidos: mantenha o checkout suspenso até restaurar uma UI compatível. Use backup apenas conforme plano validado e reconcilie pedidos/exclusões posteriores.

## Carga de lançamento

Planejamento mínimo: ensaiar em homologação catálogo com 10 mil produtos, 20 usuários concorrentes durante 10 minutos e disputa pela última unidade. Medir p95, erros, conexões e locks; aceitar apenas ausência de estoque negativo e de pedidos duplicados. A suíte local já disputa a última unidade entre duas sessões e cancela simultaneamente; isso não substitui teste de carga remoto. Não faça carga em produção sem janela e limites definidos.

## Pendências externas

Aplicação no Supabase, deploy da Edge Function, configuração de e-mail, limpeza agendada, backup/restauração, teste Auth real, DNS/domínio customizado se desejado e revisão jurídica dos documentos pela equipe. Os nomes e contato públicos foram informados pelo responsável nesta conversa. As páginas não substituem avaliação das bases legais e obrigações reais da operação.
