"""Gera documentos públicos, recuperação de senha, favicon e headers da versão web."""
from pathlib import Path
from html.parser import HTMLParser
import hashlib, base64, json

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'web'
TEAM=['ALAN BOTELHO MAGALHÃES','EMANUEL FARIA DE SOUZA','YURI SARDINHA MILANI','GABRIEL OLIVEIRA NEVES','VITOR JESUS GAMA DA SILVA','ANDRÉ SOARES BARROS']
CONTACT='suporteraiz.mkt@hotmail.com'
from support_layout import page

privacy='''<p class="legal-date">Versão de 23 de novembro de 2026</p><p>A RAIZ é um projeto acadêmico de marketplace de plantas e jardinagem. Esta política explica os dados usados pela versão web e como falar com a equipe.</p>
<h2>Responsáveis e contato</h2><p>Equipe responsável pelo projeto:</p><ul>'''+''.join('<li>'+name+'</li>' for name in TEAM)+'''</ul><p>Contato de suporte e privacidade: <a href="mailto:'''+CONTACT+'''">'''+CONTACT+'''</a>.</p>
<h2>Dados usados e finalidade</h2><p>Nome, e-mail e credenciais de autenticação permitem criar e acessar a conta. Telefone e endereço são usados para contato e entrega. Produtos, carrinho, favoritos, pedidos, avaliações e confirmações permitem operar o marketplace. A finalidade é executar os serviços solicitados e proteger a operação; usos adicionais que precisem de consentimento serão apresentados separadamente.</p>
<h2>Quem acessa os dados</h2><p>O cliente acessa sua conta e seus pedidos. A loja acessa informações necessárias aos pedidos de sua loja. O entregador acessa endereços das entregas atribuídas a ele. Administradores autorizados atendem solicitações e operam o serviço. A infraestrutura de autenticação e banco utiliza Supabase e a hospedagem do site utiliza Render. As fontes de texto são carregadas do Google Fonts, que recebe informações técnicas da conexão, como endereço IP. Abrir uma rota no Google Maps envia o endereço ao serviço externo, por escolha do usuário, sujeito à política desse serviço.</p>
<h2>Armazenamento no navegador</h2><p>A sessão de autenticação é mantida em sessionStorage para permitir recarregar a página e renovar o acesso durante a navegação na aba. Tokens de sessão podem ser lidos por scripts autorizados do site; não compartilhe dispositivos ou sessões. O IndexedDB guarda somente páginas do catálogo público, com validade de até 24 horas. A versão autenticada não guarda endereço, telefone, pedidos ou chave Pix em cache offline. Preferências antigas da demonstração, se usadas anteriormente, podem continuar no armazenamento do navegador até serem removidas nas configurações do site.</p>
<h2>Registros operacionais</h2><p>Eventos de acesso, pedido e entrega e referências de falha ajudam a equipe a identificar problemas. Não enviamos senhas, textos de avaliações ou endereços nesses eventos. Os registros de operação são mantidos por até 30 dias; a rotina de limpeza deve ser executada diariamente pela operação. Não há publicidade comportamental nesta versão.</p>
<h2>Exclusão e outros pedidos</h2><p>Na seção “Privacidade e termos” da sua conta, você pode solicitar exclusão e acompanhar o protocolo. Também pode enviar um pedido para o e-mail de suporte, inclusive sem acesso à conta. A equipe confirma a identidade antes de atender, sem solicitar senha. Você pode pedir acesso, correção e esclarecimento sobre os dados.</p>
<p>A exclusão remove a identidade de autenticação, cadastro de contato, favoritos, carrinho e identificadores pessoais dos pedidos. Produtos da loja são desativados; dados pessoais de perfil são removidos. Pedidos e entregas em andamento precisam ser encerrados antes do processamento. Informações numéricas de operações concluídas podem permanecer sem o cadastro associado. Não há promessa de apagamento de backups fora de seus ciclos de retenção: a equipe deve aplicar as mesmas exclusões ao restaurá-los.</p>
<h2>Segurança e atualizações</h2><p>O acesso depende de autenticação e permissões por persona. Nenhuma proteção elimina todos os riscos. Avise o suporte se identificar um acesso indevido. Alterações relevantes nesta política serão disponibilizadas nesta página.</p>'''
terms='''<p class="legal-date">Versão de 23 de novembro de 2026</p><p>Estes termos regem o uso da versão acadêmica web da RAIZ. Ao criar a conta e registrar o aceite, você declara que leu os termos e tomou ciência da <a href="/privacidade.html">política de privacidade</a>.</p>
<h2>Contas e perfis</h2><p>Use informações corretas e proteja sua senha. O cadastro público dá acesso de cliente. Vendedor, entregador e administrador dependem de vínculo concedido pela equipe; selecionar um perfil no login não concede permissões.</p>
<h2>Produtos e pedidos</h2><p>Vendedores são responsáveis pelas informações do anúncio e estoque. O pedido usa o preço vigente conferido pelo banco no momento do registro. O frete desta versão é fixo em R$ 15,00 por pedido. Registre um pedido por loja.</p>
<h2>Pagamento</h2><p>Esta versão registra pedidos e pagamentos acadêmicos simulados por Pix, boleto, crédito em até três parcelas ou débito, sem cobrança, transferência ou processamento bancário. Não informe número completo de cartão, código de segurança ou senha bancária. Não há reembolso financeiro a executar nesta versão, porque não há cobrança integrada.</p>
<h2>Entrega e recebimento</h2><p>A loja inicia o preparo e um entregador disponível pode aceitar a entrega. O entregador registra coleta e conclusão; depois o cliente confirma que recebeu os produtos. A avaliação da loja só é liberada após essa confirmação e pode ser atualizada pelo comprador.</p>
<h2>Cancelamento</h2><p>O cliente pode cancelar antes do início do preparo. A loja ou a administração pode cancelar antes de a entrega ser atribuída a um entregador. Após atribuição, contate o suporte para analisar a situação. Cancelamentos permitidos devolvem o estoque uma única vez. O motivo tem de ser informado.</p>
<h2>Uso permitido</h2><p>Não publique conteúdo ilícito ou enganoso, tente acessar dados de outras pessoas, manipule preços ou use o serviço para fraude. A administração pode desativar anúncios e restringir contas para proteger usuários e a operação.</p>
<h2>Atendimento e encerramento da conta</h2><p>Solicite ajuda ou análise de problemas em <a href="mailto:'''+CONTACT+'''">'''+CONTACT+'''</a>. A exclusão pode ser solicitada na conta ou na <a href="/excluir-conta.html">página de exclusão</a>. A política de privacidade detalha o tratamento dos dados. Estes termos não afastam direitos aplicáveis ao usuário.</p>'''
deletion='''<p>Você pode solicitar a exclusão da sua conta RAIZ sem instalar um aplicativo.</p><ol><li>Entre na sua conta pelo navegador.</li><li>Abra “Privacidade e termos” na sua área de cliente, vendedor ou entregador.</li><li>Escolha “Solicitar exclusão da minha conta”, digite a confirmação e guarde o protocolo.</li></ol>
<p><a class="raiz-button" href="/login.html">Entrar e solicitar exclusão</a></p><h2>Sem acesso à conta?</h2><p>Envie a solicitação para <a href="mailto:'''+CONTACT+'''?subject=Exclus%C3%A3o%20de%20conta%20RAIZ">'''+CONTACT+'''</a> informando o e-mail da conta. Não envie senha, documento completo ou dados de cartão. A equipe fará a verificação de identidade necessária.</p><h2>O que acontece com os dados</h2><p>A identidade de autenticação e os dados pessoais de cadastro são excluídos ou removidos. Favoritos e carrinho são apagados. Pedidos concluídos têm os identificadores pessoais removidos; registros numéricos da operação podem ser preservados. Pedidos e entregas em andamento precisam ser encerrados. Confira a <a href="/privacidade.html">política de privacidade</a> para detalhes.</p>'''
recovery='''<p>Use o e-mail da sua conta. O link de recuperação permite definir uma nova senha.</p>
<form id="recoveryRequest"><label>E-mail<input id="recoveryEmail" type="email" autocomplete="email" required maxlength="254"></label><button class="raiz-button" type="submit">Enviar link de recuperação</button></form>
<form id="recoveryUpdate" hidden><label>Nova senha<input id="newPassword" type="password" autocomplete="new-password" minlength="12" required></label><label>Repita a nova senha<input id="confirmPassword" type="password" autocomplete="new-password" minlength="12" required></label><p>Use pelo menos 12 caracteres, incluindo letras e números.</p><button class="raiz-button" type="submit">Salvar nova senha</button></form>
<p id="recoveryMessage" role="status" aria-live="polite"></p><a href="/login.html">Voltar ao login</a>'''
for name,title,body in [('privacidade','Política de privacidade',privacy),('termos','Termos de uso',terms),('excluir-conta','Excluir conta e dados',deletion),('recuperar-senha','Recuperar senha',recovery),('404','Página não encontrada','<p>O endereço não corresponde a uma página da RAIZ.</p><a class="raiz-button" href="/index.html">Voltar ao início</a>')]:
    scripts=''.join('<script src="/config/'+s+'"></script>' for s in ['environment.js','supabase-client.js','web-access.js','recovery.js']) if name=='recuperar-senha' else ''
    (DIST/(name+'.html')).write_text(page(title,body,scripts),encoding='utf-8')
(DIST/'favicon.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="#1B4332"/><path d="M30 47C11 43 10 20 12 17c19-1 25 12 18 30Zm5-7c-2-18 7-26 19-27 1 16-6 26-19 27Z" fill="#74C69D"/><path d="M31 31v23" stroke="#FFF" stroke-width="3" stroke-linecap="round"/></svg>''',encoding='utf-8')
(DIST/'config/legal.css').write_text((ROOT/'scripts/legal.css').read_text(encoding='utf-8'),encoding='utf-8')
# Otimiza o ativo existente, sem alterar o conteúdo visual.
from PIL import Image
image=Image.open(ROOT/'assets/source/vitrine-botanica.png')
image.save(DIST/'assets/vitrine-botanica.webp','WEBP',quality=82,method=6)
for p in list(DIST.rglob('*.html'))+list(DIST.rglob('*.js'))+list(DIST.rglob('*.css')):
    if 'vendor' in p.parts:continue
    text=p.read_text(encoding='utf-8').replace('vitrine-botanica.png','vitrine-botanica.webp')
    if p.suffix=='.html' and 'rel="icon"' not in text:
        text=text.replace('</head>','<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n<link rel="stylesheet" href="/config/legal.css">\n</head>')
    if p==DIST/'index.html' and 'href="privacidade.html"' not in text:
        text=text.replace('<nav aria-label="Rodapé">','<nav aria-label="Rodapé"><a href="privacidade.html">Privacidade</a><a href="termos.html">Termos</a><a href="excluir-conta.html">Excluir conta</a><a href="mailto:'+CONTACT+'">Suporte</a>')
    p.write_text(text,encoding='utf-8')
# CSP cobre scripts inline e handlers estáticos existentes sem liberar eval ou scripts arbitrários.
hashes=set()
class Scripts(HTMLParser):
    def __init__(self):super().__init__(convert_charrefs=False);self.inside=False;self.parts=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        for key,val in attrs.items():
            if key.startswith('on') and val:hashes.add(base64.b64encode(hashlib.sha256(val.encode()).digest()).decode())
        if tag=='script' and 'src' not in attrs:self.inside=True;self.parts=[]
    def handle_data(self,data):
        if self.inside:self.parts.append(data)
    def handle_endtag(self,tag):
        if tag=='script' and self.inside:
            hashes.add(base64.b64encode(hashlib.sha256(''.join(self.parts).encode()).digest()).decode());self.inside=False
for p in DIST.rglob('*.html'):Scripts().feed(p.read_text(encoding='utf-8'))
script="'self' 'unsafe-hashes' "+' '.join("'sha256-"+h+"'" for h in sorted(hashes))
headers="""/*
  Cache-Control: no-store
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=31536000
  Content-Security-Policy: default-src 'self'; script-src SCRIPT; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://images.unsplash.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'
""".replace('SCRIPT',script)
(DIST/'_headers').write_text(headers,encoding='utf-8')
print('Documentos públicos, recuperação, favicon, WebP e CSP gerados.')
