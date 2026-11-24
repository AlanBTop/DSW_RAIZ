# Cadastro de vendedores e entregadores

O cadastro de clientes continua em `login.html`. O botão de cadastro dos perfis Vendedor e Entregador leva a `cadastro-parceiro.html?perfil=vendedor` ou `?perfil=entregador`.

## Jornada

1. **Dados pessoais:** nome e telefone com DDD.
2. **Dados do perfil:** nome, endereço de coleta e funcionamento da loja; ou veículo do entregador.
3. **Revisão e envio:** conferência dos dados, e-mail/senha e aceite dos documentos.
4. **Confirmação do e-mail:** Supabase Auth confirma a identidade. Os dados da candidatura ficam nos metadados privados da própria identidade até o retorno autenticado. Esses metadados nunca autorizam um perfil.
5. **Análise:** a solicitação recebe protocolo e fica Pendente. O candidato acompanha a situação na mesma página, inclusive após entrar novamente.
6. **Decisão administrativa:** no painel `admin/index.html?modo=online#cadastros`, o administrador aprova ou informa um motivo de recusa. A aprovação cria a loja/perfil e o vínculo em uma transação. Uma solicitação recusada pode ser revisada e reenviada, criando outro protocolo e preservando a decisão anterior.

A fila mostra o número de solicitações pendentes, filtro por situação e paginação. Não há envio de e-mail administrativo; as solicitações são recebidas no painel. O candidato consulta o resultado pela página de acompanhamento. Vendedores e entregadores existentes mantêm seus vínculos. Uma conta que já tenha cadastro de cliente deve usar outro e-mail para o perfil de parceiro, preservando o acesso às compras.

## Ativação no Supabase

A alteração do banco é necessária antes de publicar os novos botões. A conexão administrativa usada para aplicar o SQL precisa apontar para o projeto `rlftmxxqlfyvfsgjtsdd`.

1. Confirme a definição publicada de `public.raiz_acesso()` e das funções `raiz_loja()`/`raiz_entregador()`. O acesso deve reconhecer os vínculos de `public.raiz_vinculos`; não substitua uma função publicada diferente sem revisar sua compatibilidade.
2. Aplique **somente** `supabase/migrations/20261124000800_cadastro_parceiros_aprovacao.sql` sobre a base existente, por uma conexão de migrações ou pelo SQL Editor. Não execute novamente as migrations de criação da base e não recarregue seeds.
3. Confira `select public.raiz_cadastro_config();` e os privilégios das novas funções. A tabela `raiz_candidaturas` tem RLS habilitada e nenhum acesso direto concedido a `anon`/`authenticated`. As funções de análise verificam o perfil administrativo no servidor.
4. Mantenha a confirmação de e-mail do Auth. A confirmação reutiliza os retornos de login existentes: `https://dsw-raiz.onrender.com/login.html?role=vendedor&modo=online` ou o equivalente de entregador. Após autenticar, o login encaminha à candidatura. Não é necessário ampliar os retornos OAuth para a página nova.
5. Publique a fonte `web/` pelo build `python scripts/build_render.py` e confira o manifesto remoto.

Sem as novas funções, a página apresenta uma mensagem de preparação e não promete registrar solicitações. A configuração pública continua sem credenciais administrativas. A alteração não cria administradores nem altera o cadastro de clientes.

## Verificações

- `python tests/partner_registration.py`: formulário em etapas, retorno após confirmação, pendência, recusa, reenvio, fila administrativa e cadastro de cliente preservado em 1440, 390 e 320 pixels, com API de teste.
- `python tests/partner_registration_sql.py`: oito migrations em PostgreSQL temporário, isolamento, bloqueio de autoaprovação, recusa/reenvio, aprovação simultânea por dois administradores criando uma única loja, veículo inicialmente offline e preservação dos clientes.
- `python tests/browser.py`: regressão de autenticação, recuperação de senha e operações existentes em Edge e Chrome.

Essas verificações não criam contas nem candidaturas no projeto Supabase publicado. Testes locais não comprovam a aplicação da migration remota.
