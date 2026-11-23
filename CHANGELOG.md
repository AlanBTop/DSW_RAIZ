# Alterações

## 2026-11-23 — páginas independentes

- Recuperação de senha e exclusão de conta isoladas, sem navegação entre esses fluxos.
- Apenas Privacidade e Termos compartilham abas; atalhos do login separados por finalidade.

## 2026-11-23 — design da central de ajuda

- Recuperação de senha, privacidade, termos e exclusão com identidade visual da RAIZ.
- Navegação compartilhada, índice dos documentos, etapas de exclusão e formulário com estados visuais de recuperação.
- Atalhos de ajuda do login reorganizados; layouts conferidos em 320, 360, 768 e 1440 pixels.

## 2026-11-23 — revisão web

- Recuperação de senha por Supabase Auth em rota dedicada.
- Política de privacidade, termos, exclusão, contato e aceite versionado.
- Busca no servidor e paginação; carrinho busca os produtos por ID independentemente da página do catálogo.
- Confirmação de recebimento, avaliações, cancelamento com estoque atômico e idempotente.
- Protocolo de exclusão e função administrativa para anonimização/remoção de Auth.
- Eventos operacionais restritos ao admin, limite de frequência e retenção documentada.
- Sessão limitada à aba; IndexedDB apenas para catálogo público.
- SDK fixado e servido localmente, CSP, favicon, 404 e imagem WebP.
- Migrations, testes de permissões/concorrência e guia curto para mobile.

Aplicação das migrations e configurações do Supabase remoto não é comprovada por testes locais. A nova sessão exige entrar novamente após atualização.
# Emparelhamento local e Render — 23/11/2026

- Fonte compartilhada em `web/`, build reproduzível e manifesto de hashes para conferir o conteúdo publicado.
- Fluxo autenticado de pagamentos acadêmicos integrado às funções existentes do Supabase, mantendo paginação, recuperação de senha e permissões.
- Sincronização com a cópia RAIZOTIMIZADO com backup e recusa de conflitos. Nenhuma migração ou escrita de dados remotos.
