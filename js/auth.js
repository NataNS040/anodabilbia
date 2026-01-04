/**
 * Ano da Bíblia - Autenticação
 * Gerenciamento de login e cadastro com Supabase Auth
 */

// ============================
// FUNÇÕES DE ALTERNÂNCIA UI
// ============================

function mostrarLogin() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('cadastro-form').classList.add('hidden');
    limparMensagens();
}

function mostrarCadastro() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('cadastro-form').classList.remove('hidden');
    limparMensagens();
}

function limparMensagens() {
    var loginMsg = document.getElementById('login-message');
    var cadastroMsg = document.getElementById('cadastro-message');
    if (loginMsg) {
        loginMsg.className = 'form-message';
        loginMsg.textContent = '';
    }
    if (cadastroMsg) {
        cadastroMsg.className = 'form-message';
        cadastroMsg.textContent = '';
    }
}

// Mostrar/ocultar senha
function toggleSenha(inputId, button) {
    var input = document.getElementById(inputId);
    
    if (input.type === 'password') {
        input.type = 'text';
        button.innerHTML = '<i data-lucide="eye-off"></i>';
    } else {
        input.type = 'password';
        button.innerHTML = '<i data-lucide="eye"></i>';
    }
    
    lucide.createIcons();
}

// ============================
// FUNÇÕES DE AUTENTICAÇÃO
// ============================

/**
 * Realizar cadastro com Supabase
 */
async function realizarCadastro(event) {
    event.preventDefault();
    
    var nome = document.getElementById('cadastro-nome').value.trim();
    var email = document.getElementById('cadastro-email').value.trim().toLowerCase();
    var senha = document.getElementById('cadastro-senha').value;
    var confirmar = document.getElementById('cadastro-confirmar').value;
    var msgElement = document.getElementById('cadastro-message');
    var btnSubmit = event.target.querySelector('button[type="submit"]');
    
    // Validações locais
    if (nome.length < 2) {
        mostrarMensagem(msgElement, 'Por favor, insira seu nome completo.', 'error');
        return;
    }
    
    if (senha.length < 6) {
        mostrarMensagem(msgElement, 'A senha deve ter pelo menos 6 caracteres.', 'error');
        return;
    }
    
    if (senha !== confirmar) {
        mostrarMensagem(msgElement, 'As senhas não coincidem.', 'error');
        return;
    }

    // Desabilitar botão durante o processo
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Criando conta...';
    lucide.createIcons();

    try {
        // Verificar se Supabase está disponível
        if (window.SupabaseConfig && window.SupabaseConfig.isReady()) {
            // Cadastro com Supabase
            var resultado = await window.SupabaseConfig.cadastrar(email, senha, nome);
            
            if (resultado.success) {
                mostrarMensagem(msgElement, 'Conta criada com sucesso! Redirecionando...', 'success');
                
                // Salvar dados do usuário localmente
                salvarUsuarioLogado({
                    id: resultado.data.user?.id,
                    nome: nome,
                    email: email
                });
                
                setTimeout(function() {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                mostrarMensagem(msgElement, resultado.error, 'error');
                resetarBotao(btnSubmit, '<i data-lucide="user-plus"></i> Criar conta');
            }
        } else {
            // Fallback para localStorage se Supabase não estiver disponível
            cadastroLocalStorage(nome, email, senha, msgElement, btnSubmit);
        }
    } catch (error) {
        console.error('Erro no cadastro:', error);
        mostrarMensagem(msgElement, 'Ocorreu um erro. Tente novamente.', 'error');
        resetarBotao(btnSubmit, '<i data-lucide="user-plus"></i> Criar conta');
    }
}

/**
 * Realizar login com Supabase
 */
async function realizarLogin(event) {
    event.preventDefault();
    
    var email = document.getElementById('login-email').value.trim().toLowerCase();
    var senha = document.getElementById('login-senha').value;
    var msgElement = document.getElementById('login-message');
    var btnSubmit = event.target.querySelector('button[type="submit"]');
    
    // Desabilitar botão durante o processo
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Entrando...';
    lucide.createIcons();

    try {
        // Verificar se Supabase está disponível
        if (window.SupabaseConfig && window.SupabaseConfig.isReady()) {
            // Login com Supabase
            var resultado = await window.SupabaseConfig.login(email, senha);
            
            if (resultado.success) {
                var usuario = resultado.data.user;
                var nome = usuario.user_metadata?.full_name || email.split('@')[0];
                
                mostrarMensagem(msgElement, 'Login realizado com sucesso! Redirecionando...', 'success');
                
                // Salvar dados do usuário localmente
                salvarUsuarioLogado({
                    id: usuario.id,
                    nome: nome,
                    email: usuario.email
                });
                
                setTimeout(function() {
                    window.location.href = 'index.html';
                }, 1000);
            } else {
                mostrarMensagem(msgElement, resultado.error, 'error');
                resetarBotao(btnSubmit, '<i data-lucide="log-in"></i> Entrar');
            }
        } else {
            // Fallback para localStorage se Supabase não estiver disponível
            loginLocalStorage(email, senha, msgElement, btnSubmit);
        }
    } catch (error) {
        console.error('Erro no login:', error);
        mostrarMensagem(msgElement, 'Ocorreu um erro. Tente novamente.', 'error');
        resetarBotao(btnSubmit, '<i data-lucide="log-in"></i> Entrar');
    }
}

/**
 * Fazer logout
 */
async function fazerLogout() {
    try {
        if (window.SupabaseConfig && window.SupabaseConfig.isReady()) {
            await window.SupabaseConfig.logout();
        }
        localStorage.removeItem('bibliaagora_usuario_logado');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Erro no logout:', error);
        localStorage.removeItem('bibliaagora_usuario_logado');
        window.location.href = 'index.html';
    }
}

// ============================
// FUNÇÕES AUXILIARES
// ============================

function resetarBotao(btn, html) {
    btn.disabled = false;
    btn.innerHTML = html;
    lucide.createIcons();
}

function mostrarMensagem(element, texto, tipo) {
    element.textContent = texto;
    element.className = 'form-message ' + tipo;
}

// Obter usuário logado do localStorage
function getUsuarioLogado() {
    return JSON.parse(localStorage.getItem('bibliaagora_usuario_logado') || 'null');
}

// Salvar usuário logado no localStorage
function salvarUsuarioLogado(usuario) {
    localStorage.setItem('bibliaagora_usuario_logado', JSON.stringify(usuario));
}

// Verificar se usuário está logado
function verificarLogin() {
    return getUsuarioLogado() !== null;
}

// ============================
// FALLBACK LOCALSTORAGE
// ============================

function getUsuarios() {
    return JSON.parse(localStorage.getItem('bibliaagora_usuarios') || '[]');
}

function salvarUsuarios(usuarios) {
    localStorage.setItem('bibliaagora_usuarios', JSON.stringify(usuarios));
}

function cadastroLocalStorage(nome, email, senha, msgElement, btnSubmit) {
    var usuarios = getUsuarios();
    
    var emailExiste = usuarios.some(function(u) {
        return u.email === email;
    });
    
    if (emailExiste) {
        mostrarMensagem(msgElement, 'Este e-mail já está cadastrado.', 'error');
        resetarBotao(btnSubmit, '<i data-lucide="user-plus"></i> Criar conta');
        return;
    }
    
    var novoUsuario = {
        id: Date.now().toString(),
        nome: nome,
        email: email,
        senha: senha,
        dataCadastro: new Date().toISOString()
    };
    
    usuarios.push(novoUsuario);
    salvarUsuarios(usuarios);
    
    mostrarMensagem(msgElement, 'Conta criada com sucesso! Redirecionando...', 'success');
    
    setTimeout(function() {
        salvarUsuarioLogado({
            id: novoUsuario.id,
            nome: novoUsuario.nome,
            email: novoUsuario.email
        });
        window.location.href = 'index.html';
    }, 1500);
}

function loginLocalStorage(email, senha, msgElement, btnSubmit) {
    var usuarios = getUsuarios();
    
    var usuario = usuarios.find(function(u) {
        return u.email === email && u.senha === senha;
    });
    
    if (!usuario) {
        mostrarMensagem(msgElement, 'E-mail ou senha incorretos.', 'error');
        resetarBotao(btnSubmit, '<i data-lucide="log-in"></i> Entrar');
        return;
    }
    
    salvarUsuarioLogado({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
    });
    
    mostrarMensagem(msgElement, 'Login realizado com sucesso! Redirecionando...', 'success');
    
    setTimeout(function() {
        window.location.href = 'index.html';
    }, 1000);
}

// ============================
// ATUALIZAÇÃO DA UI
// ============================

async function atualizarUILogin() {
    var headerNav = document.querySelector('.nav-links');
    if (!headerNav) return;
    
    // Remover elementos existentes
    var loginLink = headerNav.querySelector('.nav-login');
    if (loginLink) loginLink.remove();
    
    var userMenu = headerNav.querySelector('.nav-user');
    if (userMenu) userMenu.remove();

    var usuario = null;

    // Tentar obter usuário do Supabase primeiro
    if (window.SupabaseConfig && window.SupabaseConfig.isReady()) {
        usuario = await window.SupabaseConfig.getUsuario();
    }
    
    // Fallback para localStorage
    if (!usuario) {
        var localUser = getUsuarioLogado();
        if (localUser) {
            usuario = localUser;
        }
    }
    
    if (usuario) {
        // Usuário logado - mostrar nome e logout
        var li = document.createElement('li');
        li.className = 'nav-user';
        var nomeExibicao = usuario.nome ? usuario.nome.split(' ')[0] : 'Usuário';
        li.innerHTML = 
            '<div class="user-menu">' +
                '<span class="user-name"><i data-lucide="user"></i>' + nomeExibicao + '</span>' +
                '<a href="#" onclick="fazerLogout(); return false;" class="user-logout">Sair</a>' +
            '</div>';
        headerNav.appendChild(li);
    } else {
        // Usuário não logado - mostrar link de login
        var li = document.createElement('li');
        li.className = 'nav-login';
        li.innerHTML = '<a href="login.html"><i data-lucide="log-in"></i> Entrar</a>';
        headerNav.appendChild(li);
    }
    
    lucide.createIcons();
}

// ============================
// INICIALIZAÇÃO
// ============================

// Adicionar estilo do spinner
(function() {
    var style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .spin {
            animation: spin 1s linear infinite;
        }
    `;
    document.head.appendChild(style);
})();
