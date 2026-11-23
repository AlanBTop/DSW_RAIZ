"""Apresentação das páginas de suporte. Os textos e os fluxos vêm de prepare_site.py."""
import re
from html import escape,unescape

CONTACT='suporteraiz.mkt@hotmail.com'
ICONS={
    'mail':'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
    'shield':'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8.5 11.5 2.5 2.5 4.5-5"/>',
    'document':'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    'user':'<circle cx="10" cy="8" r="4"/><path d="M3 21v-2a7 7 0 0 1 11-5M17 14l5 5m0-5-5 5"/>',
    'lock':'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    'leaf':'<path d="M20 4C8 2 2 8 5 15c3 7 15 5 15-11Z"/><path d="M4 21 15 10"/>',
    'support':'<path d="M4 13v-1a8 8 0 0 1 16 0v1M4 12h2v7H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2Zm16 0h-2v7h2a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2ZM18 19c0 2-3 3-6 3"/>',
    'check':'<path d="m5 12 4 4L19 6"/>',
    'calendar':'<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16M8 15h3"/>',
    'login':'<path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5M3 12h12m-4-4 4 4-4 4"/>',
}
def icon(name):
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICONS[name]+'</svg>'

LEAF='''<svg class="support-logo" viewBox="0 0 64 64" aria-hidden="true"><path d="M31 51C22 37 15 28 5 18c11-2 22 1 28 9 2 4 2 9-2 24Z" fill="#2D6A4F"/><path d="M33 50c1-19 5-31 20-39 3 13 0 24-7 30-4 4-8 6-13 9Z" fill="#52B788"/><path d="M31 27v29" stroke="#1B4332" stroke-width="3.4" stroke-linecap="round"/></svg>'''
PAGES=[('privacidade','Privacidade','shield'),('termos','Termos de uso','document')]
SLUGS={'Recuperar senha':'recuperar-senha','Política de privacidade':'privacidade','Termos de uso':'termos','Excluir conta e dados':'excluir-conta'}

def navigation(slug):
    if slug not in ('privacidade','termos'):
        return ''
    return '<nav class="support-tabs" aria-label="Documentos da RAIZ">'+''.join(
        '<a href="/'+key+'.html"'+(' aria-current="page"' if key==slug else '')+'>'+icon(sym)+'<span>'+label+'</span></a>' for key,label,sym in PAGES)+'</nav>'

def contact_box(title='A gente pode ajudar.'):
    return '<aside class="support-contact"><span class="support-icon">'+icon('support')+'</span><h2>'+title+'</h2><p>Fale com a equipe RAIZ pelo e-mail de suporte.</p><a href="mailto:'+CONTACT+'">'+CONTACT+'</a></aside>'

def sectionize(body):
    parts=re.split(r'<h2>(.*?)</h2>',body,flags=re.S)
    sections=[]
    for i in range(1,len(parts),2):
        title=parts[i];slug='secao-'+str((i+1)//2)
        content=parts[i+1]
        if 'Responsáveis e contato' in title:
            def namecase(m):
                name=m[1].title()
                name=re.sub(r'\b(De|Da|Do|Das|Dos)\b',lambda x:x[1].lower(),name)
                return '<li>'+name+'</li>'
            content=re.sub(r'<li>(.*?)</li>',namecase,content)
            content=content.replace('<ul>','<ul class="support-team">')
        sections.append((slug,title,'<section class="support-section" id="'+slug+'"><h2>'+title+'</h2>'+content+'</section>'))
    return parts[0],sections

def document(title,body,slug):
    body=re.sub(r'<p class="legal-date">.*?</p>','',body,flags=re.S).strip()
    intro=re.match(r'<p>(.*?)</p>',body,re.S)
    lead=intro[1] if intro else ''
    if intro:body=body[intro.end():]
    preamble,sections=sectionize(body)
    toc='<aside class="support-toc"><p class="support-kicker">Neste documento</p><nav aria-label="Seções do documento">'+''.join('<a href="#'+sid+'">'+heading+'</a>' for sid,heading,_ in sections)+'</nav>'+contact_box()+'</aside>'
    hero='<header class="support-heading"><span class="support-kicker">Transparência em cada etapa</span><h1>'+title+'</h1><p class="support-lead">'+lead+'</p><div class="support-meta">'+icon('calendar')+'<span>Versão de 23 de novembro de 2026</span></div></header>'
    return hero+'<div class="support-document-layout">'+toc+'<article class="support-document">'+preamble+''.join(section for _,_,section in sections)+'<div class="support-document-end">'+icon('leaf')+'<p>Plantas, pessoas e cuidado.<br><span>Uma relação que começa com transparência.</span></p></div></article></div>'

def recovery(body):
    forms=''.join(re.findall(r'<form\b.*?</form>',body,re.S))
    forms=forms.replace('<label>E-mail<input id="recoveryEmail"','<label for="recoveryEmail">E-mail da sua conta</label><div class="support-input">'+icon('mail')+'<input placeholder="voce@exemplo.com" id="recoveryEmail"').replace('maxlength="254"></label>','maxlength="254"></div>')
    forms=forms.replace('class="raiz-button"','class="support-button support-primary"')
    forms=forms.replace('<label>Nova senha<input','<label class="support-password-field">Nova senha<input').replace('<label>Repita a nova senha<input','<label class="support-password-field">Repita a nova senha<input')
    forms=forms.replace('<p>Use pelo menos 12 caracteres, incluindo letras e números.</p>','<p class="support-field-hint">Use pelo menos 12 caracteres, incluindo letras e números.</p>')
    form_panel='''<section class="support-recovery-card"><span class="support-icon support-icon-large">'''+icon('lock')+'''</span><span class="support-kicker">Acesso à sua conta</span><h1>Esqueceu<br>a senha?</h1><p class="support-lead">Sem problema. Informe seu e-mail para receber um link e criar uma nova senha.</p>'''+forms+'''<p id="recoveryMessage" class="support-feedback" role="status" aria-live="polite"></p><a class="support-back" href="/login.html">Voltar ao login</a><div class="support-recovery-help">'''+icon('support')+'''<p>Precisa de uma mão?<br><a href="mailto:'''+CONTACT+'''">Fale com o suporte RAIZ</a></p></div></section>'''
    photo='''<aside class="support-botanical"><img src="/assets/vitrine-botanica.webp" alt="Plantas em vasos em um ambiente iluminado" width="960" height="960"><span class="support-photo-badge">'''+icon('leaf')+'''Plantas, pessoas e cuidado</span><div class="support-photo-copy"><span>Seu espaço na RAIZ</span><h2>O cuidado<br> continua.</h2><p>Recupere seu acesso e volte a cultivar boas escolhas.</p></div></aside>'''
    return '<div class="support-recovery-layout">'+form_panel+photo+'</div>'

def deletion(body):
    _,sections=sectionize(body)
    steps=re.search(r'<ol>(.*?)</ol>',body,re.S)[1]
    texts=re.findall(r'<li>(.*?)</li>',steps,re.S)
    labels=['Acesse sua conta','Abra a área de privacidade','Envie e acompanhe o pedido']
    symbols=['login','shield','check']
    steps=''.join('<li><span class="support-step-icon">'+icon(symbols[i])+'</span><div><h3>'+labels[i]+'</h3><p>'+text+'</p></div></li>' for i,text in enumerate(texts))
    access=next(content for _,heading,content in sections if 'Sem acesso' in heading)
    data=next(content for _,heading,content in sections if 'acontece' in heading)
    # Preserva instruções e informações sobre os dados; reorganiza somente a apresentação.
    access=re.sub(r'<h2>.*?</h2>','<h2>Está sem acesso à conta?</h2>',access,count=1)
    return '''<header class="support-heading"><span class="support-kicker">Você no controle</span><h1>Excluir conta e dados</h1><p class="support-lead">Se a sua jornada por aqui chegou ao fim, você pode solicitar a exclusão da conta de forma simples, pelo navegador.</p></header><div class="support-deletion-layout"><section class="support-process"><span class="support-icon">'''+icon('user')+'''</span><h2>Como solicitar a exclusão</h2><p>O pedido é feito na sua conta, e você recebe um protocolo para acompanhar.</p><ol class="support-steps">'''+steps+'''</ol><a class="support-button support-primary" href="/login.html">Entrar e solicitar exclusão</a><p class="support-field-hint">O envio da solicitação não exclui sua conta imediatamente.</p></section><aside class="support-deletion-help">'''+access+'''<div class="support-safety">'''+icon('shield')+'''<p>Para sua segurança, nunca envie sua senha ao suporte.</p></div></aside></div><article class="support-data-note">'''+icon('document')+'<div>'+data+'</div></article>'

def page(title,body,scripts=''):
    slug=SLUGS.get(title,'404')
    path_label='Privacidade e termos' if slug in ('privacidade','termos') else title
    if slug=='recuperar-senha':content=recovery(body)
    elif slug in ('privacidade','termos'):content=document(title,body,slug)
    elif slug=='excluir-conta':content=deletion(body)
    else:content='<section class="support-not-found"><span class="support-kicker">Vamos encontrar o caminho</span><h1>'+title+'</h1>'+body+'</section>'
    return '''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>'''+title+''' · RAIZ</title><meta name="description" content="Ajuda, privacidade e informações da sua conta no marketplace RAIZ.">
<meta name="theme-color" content="#1B4332"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/config/raiz-web.css"><link rel="stylesheet" href="/config/legal.css"></head>
<body class="support-page"><a class="support-skip" href="#conteudo">Ir para o conteúdo</a>
<header class="support-header"><div class="support-header-inner"><a class="support-brand" href="/index.html" aria-label="RAIZ, página inicial">'''+LEAF+'''<span>RAIZ<small>Plantas, pessoas e cuidado</small></span></a><div class="support-header-actions"><a class="support-home" href="/index.html">Conheça a RAIZ</a><a class="support-button support-outline" href="/login.html">Minha conta</a></div></div></header>
<div class="support-shell"><div class="support-path"><a href="/index.html">Início</a><span aria-hidden="true">/</span><span>'''+escape(path_label)+'''</span></div>'''+navigation(slug)+'''<main id="conteudo">'''+content+'''</main></div>
<footer class="support-footer"><div><a href="/index.html" class="support-footer-brand">'''+LEAF+'''<strong>RAIZ</strong></a><span>Mais cuidado em cada conexão.</span></div><nav aria-label="Informações da RAIZ"><a href="/privacidade.html">Privacidade</a><a href="/termos.html">Termos de uso</a><a href="mailto:'''+CONTACT+'''">Fale com a gente</a></nav></footer>'''+scripts+'''</body></html>'''
