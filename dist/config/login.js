    let currentRole = 'cliente';
    let isRegisterMode = false;

    // Elementos do DOM
    const emailInput = document.getElementById('inputEmail');
    const senhaInput = document.getElementById('inputSenha');
    const confirmInput = document.getElementById('inputConfirmSenha');
    const nomeInput = document.getElementById('inputNome');
    const telInput = document.getElementById('inputTelefone');

    // Inicialização ao Carregar
    document.addEventListener('DOMContentLoaded', () => {
      // 1. Detecta parâmetro de query ?role= na URL
      const urlParams = new URLSearchParams(window.location.search);
      if (!RaizDB.presentationAllowed) {
        document.querySelector('.demo-box').hidden = true;
      }
      if (!window.RaizEnvironment?.googleOAuth || RaizDB.isDemo) document.getElementById('btnGoogle').hidden = true;
      const queryRole = urlParams.get('role');
      if (queryRole && ['cliente', 'vendedor', 'entregador', 'admin'].includes(queryRole)) {
        const cards = document.querySelectorAll('.role-card');
        const roleIndex = { cliente: 0, vendedor: 1, entregador: 2, admin: 3 }[queryRole];
        if (cards[roleIndex]) selectRole(queryRole, cards[roleIndex]);
      }

      if (urlParams.has("cadastro") && currentRole !== "admin") toggleAuthMode();
      if (window.RaizShopping?.intent()) RaizAccess.message('Entre ou crie sua conta para continuar a compra. Sua seleção está salva neste navegador para revisão.');
      RaizAccess.restoreLogin(currentRole);
      RaizDB.ready.then(() => {
        if (!RaizDB.isLocal) return;
        document.getElementById('btnGoogle').hidden = true;
        document.getElementById('toggleLink').hidden = true;
        const notice = document.createElement('p');
        notice.className = 'raiz-notice';
        notice.textContent = 'Ambiente autenticado local: contas fictícias configuradas pelo responsável. Sem envio ao Supabase.';
        document.getElementById('accessMessage').before(notice);
      });

      // 3. Configura listeners de validação em tempo real
      setupValidationListeners();
    });

    // Trata mensagens de erro ou sucesso no retorno do Google OAuth
    function selectRole(role, cardElement) {
      if (role === "admin" && isRegisterMode) toggleAuthMode();
      currentRole = role;
      document.querySelectorAll('.role-card').forEach(card => {
        const selected = card === cardElement;
        card.classList.toggle('active', selected);
        card.setAttribute('aria-pressed', String(selected));
      });

      const labels = {
        cliente: '🪴 Cliente (UC)',
        vendedor: '🏪 Produtor (UP)',
        entregador: '🛵 Entregador (UE)',
        admin: '🛡️ Admin (UA)'
      };

      document.getElementById('roleBadge').textContent = labels[role];
      document.getElementById('googleBtnText').textContent = 'Continuar com o Google';
    }

    // Alternar entre Login e Cadastro
    function toggleAuthMode() {
      if (!isRegisterMode && currentRole === "admin") {
        showToast("O perfil administrativo é concedido pela equipe responsável.");
        return;
      }
      isRegisterMode = !isRegisterMode;
      document.getElementById('termsAcceptance').hidden=!isRegisterMode;
      document.getElementById('loginTitle').textContent = isRegisterMode ? 'Crie sua conta' : 'Entre na sua conta';
      const regFields = document.getElementById('registerFields');
      const confirmGroup = document.getElementById('confirmPassGroup');
      const strengthBox = document.getElementById('strengthMeterBox');
      const submitBtn = document.getElementById('btnSubmit');
      const toggleText = document.getElementById('toggleText');
      const toggleLink = document.getElementById('toggleLink');
      const passReqLabel = document.getElementById('passReqLabel');

      clearAllErrors();

      if (isRegisterMode) {
        regFields.style.display = 'block';
        confirmGroup.style.display = 'block';
        strengthBox.style.display = 'block';
        passReqLabel.textContent = 'Senha Forte Obrigatória';
        submitBtn.textContent = 'Criar Minha Conta no RAIZ';
        toggleText.textContent = 'Já possui uma conta cadastrada?';
        toggleLink.textContent = 'Fazer Login';
        validatePasswordStrength(senhaInput.value);
      } else {
        regFields.style.display = 'none';
        confirmGroup.style.display = 'none';
        strengthBox.style.display = 'none';
        passReqLabel.textContent = 'Mínimo 8 caracteres';
        submitBtn.textContent = 'Entrar na Plataforma';
        toggleText.textContent = 'Ainda não tem uma conta?';
        toggleLink.textContent = 'Cadastre-se';
      }
    }

    // Olho Mostrar / Ocultar Senha
    function togglePassVisibility(inputId, btn) {
      const input = document.getElementById(inputId);
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🔒';
      } else {
        input.type = 'password';
        btn.textContent = '👁️';
      }
    }

    // ==========================================
    // MÁSCARA E VALIDAÇÕES EM TEMPO REAL
    // ==========================================

    function setupValidationListeners() {
      // 1. Validação de E-mail
      emailInput.addEventListener('input', () => {
        validateEmailField();
      });

      emailInput.addEventListener('blur', () => {
        validateEmailField(true);
      });

      // 2. Máscara de Telefone Brasileira
      telInput.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 11) v = v.substring(0, 11);

        if (v.length > 10) {
          v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
        } else if (v.length > 6) {
          v = v.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
        } else if (v.length > 2) {
          v = v.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
        } else if (v.length > 0) {
          v = v.replace(/^(\d{0,2})$/, '($1');
        }
        e.target.value = v;
        validatePhoneField();
      });

      // 3. Força da Senha
      senhaInput.addEventListener('input', () => {
        if (isRegisterMode) {
          validatePasswordStrength(senhaInput.value);
          validatePasswordMatch();
        } else {
          document.getElementById('senhaError').style.display = 'none';
          senhaInput.classList.remove('is-invalid');
        }
      });

      // 4. Confirmação de Senha
      confirmInput.addEventListener('input', () => {
        if (isRegisterMode) validatePasswordMatch();
      });
    }

    function isValidEmail(email) {
      const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
      return re.test(String(email).trim().toLowerCase());
    }

    function validateEmailField(isBlur = false) {
      const email = emailInput.value.trim();
      const errEl = document.getElementById('emailError');
      if (!email) {
        if (isBlur) {
          showError(emailInput, errEl, 'O e-mail é obrigatório.');
          return false;
        }
        clearField(emailInput, errEl);
        return false;
      }
      if (!isValidEmail(email)) {
        showError(emailInput, errEl, 'Informe um e-mail válido (ex: seu.nome@gmail.com).');
        return false;
      }
      showSuccess(emailInput, errEl);
      return true;
    }

    function validatePhoneField(isBlur = false) {
      if (!isRegisterMode) return true;
      const raw = telInput.value.replace(/\D/g, '');
      const errEl = document.getElementById('telError');

      if (!raw) {
        if (isBlur) {
          showError(telInput, errEl, 'O telefone para contato é obrigatório.');
          return false;
        }
        clearField(telInput, errEl);
        return false;
      }

      const ddd = parseInt(raw.substring(0, 2), 10);
      const validDdd = ddd >= 11 && ddd <= 99;

      if (!validDdd || raw.length < 10) {
        showError(telInput, errEl, 'Informe um telefone completo com DDD válido (ex: (65) 99654-3210).');
        return false;
      }

      showSuccess(telInput, errEl);
      return true;
    }

    function validatePasswordStrength(pwd) {
      const hasLength = pwd.length >= 8;
      const hasCase = /[A-Z]/.test(pwd) && /[a-z]/.test(pwd);
      const hasNum = /[0-9]/.test(pwd);
      const hasSpec = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?~`\\/]/.test(pwd);

      updateChecklist('reqLen', hasLength);
      updateChecklist('reqCase', hasCase);
      updateChecklist('reqNum', hasNum);
      updateChecklist('reqSpec', hasSpec);

      const score = [hasLength, hasCase, hasNum, hasSpec].filter(Boolean).length;
      updateStrengthBars(score);

      const errEl = document.getElementById('senhaError');
      if (score < 4 && pwd.length > 0) {
        errEl.style.display = 'block';
        errEl.textContent = 'A senha precisa atender a todos os 4 requisitos de segurança.';
        senhaInput.classList.add('is-invalid');
        senhaInput.classList.remove('is-valid');
        return false;
      } else if (score === 4) {
        errEl.style.display = 'none';
        senhaInput.classList.remove('is-invalid');
        senhaInput.classList.add('is-valid');
        return true;
      }
      return false;
    }

    function updateChecklist(id, isValid) {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle('valid', isValid);
      const icon = el.querySelector('.check-icon');
      if (icon) icon.textContent = isValid ? '✓' : '○';
    }

    function updateStrengthBars(score) {
      const colors = ['#E53E3E', '#DD6B20', '#D69E2E', '#38A169'];
      const texts = ['Muito Fraca', 'Fraca', 'Média', 'Forte e Segura ✨'];

      for (let i = 1; i <= 4; i++) {
        const seg = document.getElementById('seg' + i);
        if (seg) {
          seg.style.background = i <= score ? colors[score - 1] : '#E2E8F0';
        }
      }

      const txtEl = document.getElementById('strengthText');
      if (txtEl) {
        txtEl.textContent = texts[Math.max(0, score - 1)] || 'Muito Fraca';
        txtEl.style.color = colors[Math.max(0, score - 1)] || '#E53E3E';
      }
    }

    function validatePasswordMatch() {
      const p1 = senhaInput.value;
      const p2 = confirmInput.value;
      const errEl = document.getElementById('confirmSenhaError');

      if (!p2) {
        clearField(confirmInput, errEl);
        return false;
      }
      if (p1 !== p2) {
        showError(confirmInput, errEl, 'As senhas não coincidem. Digite exatamente a mesma senha.');
        return false;
      }
      showSuccess(confirmInput, errEl);
      return true;
    }

    function showError(input, errEl, msg) {
      input.classList.add('is-invalid');
      input.classList.remove('is-valid');
      if (errEl) {
        errEl.style.display = 'block';
        errEl.textContent = msg;
      }
    }

    function showSuccess(input, errEl) {
      input.classList.remove('is-invalid');
      input.classList.add('is-valid');
      if (errEl) errEl.style.display = 'none';
    }

    function clearField(input, errEl) {
      input.classList.remove('is-invalid');
      input.classList.remove('is-valid');
      if (errEl) errEl.style.display = 'none';
    }

    function clearAllErrors() {
      document.querySelectorAll('.form-input').forEach(i => i.classList.remove('is-invalid', 'is-valid'));
      document.querySelectorAll('.field-error').forEach(e => e.style.display = 'none');
    }

    // ==========================================
    // ENVIO DO FORMULÁRIO COM TRATAMENTO DE RATE LIMIT
    // ==========================================

    async function handleFormSubmit(e) {
      e.preventDefault();
      if (RaizDB.isDemo) { quickDemoLogin(currentRole); return; }

      const email = emailInput.value.trim().toLowerCase();
      const senha = senhaInput.value;
      const nome = nomeInput.value.trim();
      const telefone = telInput.value.trim();

      if (!validateEmailField(true)) {
        emailInput.focus();
        return;
      }

      if (isRegisterMode) {
        if(!document.getElementById('acceptTerms').checked){RaizAccess.message('Leia os termos e marque o aceite para criar a conta.');return;}
        if (nome.length < 3) {
          showError(nomeInput, document.getElementById('nomeError'), 'Por favor, informe seu nome completo.');
          nomeInput.focus();
          return;
        }

        if (!validatePhoneField(true)) {
          telInput.focus();
          return;
        }

        const passOk = validatePasswordStrength(senha);
        if (!passOk) {
          senhaInput.focus();
          showToast('A senha precisa cumprir todos os critérios de segurança.');
          return;
        }

        if (!validatePasswordMatch()) {
          confirmInput.focus();
          return;
        }

      }
      if (!senha) {
        showToast('Informe sua senha.');
        return;
      }

      const submitBtn = document.getElementById('btnSubmit');
      const label = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Aguarde…';
      try {
        await RaizDB.ready;
        const client = RaizAccess.client();
        if (isRegisterMode) {
          if (currentRole === 'admin') throw new Error('Cadastro administrativo indisponível.');
          const { data, error } = await client.auth.signUp({
            email, password: senha,
            options: {
              emailRedirectTo: RaizAccess.callback(currentRole),
              data: { full_name: nome, telefone, perfil_solicitado: currentRole, termos_versao:'2026-11-23' }
            }
          });
          if (error) throw error;
          if (!data.session) {
            RaizAccess.message('Confira seu e-mail para confirmar a conta. O cadastro público dá acesso de cliente. Perfis de vendedor e entregador precisam de aprovação.');
            return;
          }
        } else {
          const { error } = await client.auth.signInWithPassword({ email, password: senha });
          if (error) throw error;
        }
        try { await RaizApi.initialize(client); void RaizApi.event(client,isRegisterMode?'cadastro':'login','auth'); } catch(_) {}
        await RaizAccess.restoreLogin(currentRole);
      } catch (error) {
        RaizAccess.message(RaizAccess.authError(error));
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = label;
      }
    }

    async function handleGoogleLogin() {
      if (!window.RaizEnvironment?.googleOAuth) {
        RaizAccess.message('Login com Google indisponível neste ambiente. Use e-mail e senha.');
        return;
      }
      if (RaizDB.isDemo) return;
      const button = document.getElementById('btnGoogle');
      button.disabled = true;
      try {
        await RaizDB.ready;
        const { error } = await RaizAccess.client().auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: RaizAccess.callback(currentRole) }
        });
        if (error) throw error;
      } catch (error) {
        RaizAccess.message(RaizAccess.authError(error));
      } finally {
        button.disabled = false;
      }
    }

    function quickDemoLogin(role) {
      if (!RaizDB.presentationAllowed) return;
      if (!RaizAccess.demoRoles.includes(role)) return;
      location.href = role + '/index.html?modo=demo';
    }

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 3500);
    }
