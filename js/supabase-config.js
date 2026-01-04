/**
 * Ano da Bíblia - Configuração do Supabase
 * Inicialização e funções de conexão com o Supabase
 */

(function() {
    'use strict';

    // Configuração do Supabase - CREDENCIAIS ATUALIZADAS
    var SUPABASE_URL = 'https://nkhbyyxwhgtedvbsjjvw.supabase.co';
    var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5raGJ5eXh3aGd0ZWR2YnNqanZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MzYyODAsImV4cCI6MjA4MzExMjI4MH0.PjKcu0qdcGLmcYteXR27rw7Hn03wSzgwq2TBx1PISJg';

    // Cliente Supabase
    var supabaseClient = null;

    /**
     * Inicializa o cliente Supabase
     */
    function initSupabase() {
        try {
            if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
                supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                console.log('✅ Supabase inicializado com sucesso');
                console.log('URL:', SUPABASE_URL);
                return true;
            } else {
                console.error('❌ SDK do Supabase não encontrado');
                return false;
            }
        } catch (error) {
            console.error('❌ Erro ao inicializar Supabase:', error);
            return false;
        }
    }

    /**
     * Retorna o cliente Supabase
     */
    function getSupabaseClient() {
        if (!supabaseClient) {
            initSupabase();
        }
        return supabaseClient;
    }

    /**
     * Verifica se o Supabase está disponível
     */
    function isSupabaseReady() {
        return supabaseClient !== null;
    }

    // ============================
    // FUNÇÕES DE AUTENTICAÇÃO
    // ============================

    /**
     * Cadastra um novo usuário no Supabase
     */
    async function cadastrarUsuarioSupabase(email, senha, nome) {
        try {
            var client = getSupabaseClient();
            if (!client) {
                throw new Error('Supabase não inicializado');
            }

            console.log('📝 Iniciando cadastro:', email);

            // 1. Criar usuário no Auth
            var authResult = await client.auth.signUp({
                email: email,
                password: senha,
                options: {
                    data: {
                        full_name: nome
                    }
                }
            });

            if (authResult.error) {
                console.error('❌ Erro no Auth:', authResult.error);
                throw authResult.error;
            }

            console.log('✅ Usuário criado no Auth:', authResult.data.user?.id);

            // 2. Fazer login automático para obter sessão
            var signInResult = await client.auth.signInWithPassword({
                email: email,
                password: senha
            });

            if (signInResult.error) {
                console.warn('⚠️ Erro ao fazer login automático:', signInResult.error.message);
            } else {
                console.log('✅ Login automático realizado');
            }

            // 3. Aguardar um pouco
            await new Promise(function(resolve) { setTimeout(resolve, 1000); });

            // 4. Criar perfil na tabela user_profile
            if (authResult.data.user) {
                var profileData = {
                    user_id: authResult.data.user.id,
                    full_name: nome,
                    email: email
                };

                console.log('📤 Tentando criar perfil:', profileData);

                var profileResult = await client
                    .from('user_profile')
                    .insert(profileData)
                    .select()
                    .single();

                if (profileResult.error) {
                    console.error('❌ Erro ao criar perfil:', profileResult.error);
                    console.error('Detalhes:', {
                        code: profileResult.error.code,
                        message: profileResult.error.message,
                        details: profileResult.error.details,
                        hint: profileResult.error.hint
                    });
                } else {
                    console.log('✅ Perfil criado com sucesso:', profileResult.data);
                }
            }

            return { success: true, data: authResult.data };

        } catch (error) {
            console.error('❌ Erro no cadastro:', error);
            return { success: false, error: traduzirErroSupabase(error.message) };
        }
    }

    /**
     * Realiza login do usuário
     */
    async function loginSupabase(email, senha) {
        try {
            var client = getSupabaseClient();
            if (!client) {
                throw new Error('Supabase não inicializado');
            }

            var result = await client.auth.signInWithPassword({
                email: email,
                password: senha
            });

            if (result.error) {
                throw result.error;
            }

            // Após login, sincronizar progresso
            if (result.data.user) {
                await sincronizarProgressoAposLogin(result.data.user.id);
            }

            return { success: true, data: result.data };

        } catch (error) {
            console.error('Erro no login:', error);
            return { success: false, error: traduzirErroSupabase(error.message) };
        }
    }

    /**
     * Realiza logout do usuário
     */
    async function logoutSupabase() {
        try {
            var client = getSupabaseClient();
            if (client) {
                await client.auth.signOut();
            }
            localStorage.removeItem('bibliaagora_usuario_logado');
            console.log('✅ Logout realizado');
            return { success: true };
        } catch (error) {
            console.error('Erro no logout:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtém o usuário atualmente autenticado
     */
    async function getUsuarioAtual() {
        try {
            var client = getSupabaseClient();
            if (!client) return null;

            var userResult = await client.auth.getUser();
            var user = userResult.data.user;
            
            if (!user) return null;

            // Buscar perfil adicional
            var profileResult = await client.from('user_profile')
                .select('*')
                .eq('user_id', user.id)
                .single();

            var profile = profileResult.data;

            return {
                user: user,
                profile: profile,
                nome: profile?.full_name || user.user_metadata?.full_name || user.email.split('@')[0],
                email: user.email,
                id: user.id
            };
        } catch (error) {
            console.error('Erro ao obter usuário:', error);
            return null;
        }
    }

    // ============================
    // FUNÇÕES DE PROGRESSO
    // ============================

    /**
     * Sincroniza o progresso do localStorage para o Supabase
     */
    async function sincronizarProgressoAposLogin(userId) {
        try {
            var client = getSupabaseClient();
            if (!client) return;

            var progressoLocal = JSON.parse(localStorage.getItem('bibliaagora_progresso') || '{}');
            
            if (Object.keys(progressoLocal).length === 0) {
                console.log('Nenhum progresso local para sincronizar');
                await carregarProgressoDoSupabase(userId);
                return;
            }

            console.log('📤 Sincronizando progresso local com Supabase...');

            var registros = [];
            for (var mes in progressoLocal) {
                var dias = progressoLocal[mes];
                for (var i = 0; i < dias.length; i++) {
                    var dia = dias[i];
                    var readingDate = '2026-' + String(mes).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
                    registros.push({
                        user_id: userId,
                        reading_date: readingDate,
                        month: parseInt(mes),
                        day: parseInt(dia),
                        completed: true
                    });
                }
            }

            if (registros.length > 0) {
                var result = await client.from('reading_progress')
                    .upsert(registros, { 
                        onConflict: 'user_id,reading_date',
                        ignoreDuplicates: true 
                    });

                if (result.error) {
                    console.warn('Aviso ao sincronizar:', result.error.message);
                } else {
                    console.log('✅ ' + registros.length + ' leituras sincronizadas');
                }
            }

            await carregarProgressoDoSupabase(userId);

        } catch (error) {
            console.error('Erro ao sincronizar progresso:', error);
        }
    }

    /**
     * Carrega o progresso do Supabase
     */
    async function carregarProgressoDoSupabase(userId) {
        try {
            var client = getSupabaseClient();
            if (!client) return;

            var result = await client.from('reading_progress')
                .select('month, day')
                .eq('user_id', userId)
                .eq('completed', true);

            if (result.error) {
                console.warn('Erro ao carregar progresso:', result.error.message);
                return;
            }

            var progresso = {};
            for (var i = 0; i < result.data.length; i++) {
                var registro = result.data[i];
                if (!progresso[registro.month]) {
                    progresso[registro.month] = [];
                }
                if (progresso[registro.month].indexOf(registro.day) === -1) {
                    progresso[registro.month].push(registro.day);
                }
            }

            localStorage.setItem('bibliaagora_progresso', JSON.stringify(progresso));
            
            if (typeof window.progresso !== 'undefined') {
                window.progresso = progresso;
            }

            console.log('📥 Progresso carregado do Supabase:', Object.keys(progresso).length, 'meses');

        } catch (error) {
            console.error('Erro ao carregar progresso:', error);
        }
    }

    /**
     * Salva uma leitura concluída
     */
    async function salvarLeituraSupabase(mes, dia, concluido) {
        try {
            var client = getSupabaseClient();
            if (!client) return { success: false };

            var usuario = await getUsuarioAtual();
            if (!usuario) return { success: false };

            var readingDate = '2026-' + String(mes).padStart(2, '0') + '-' + String(dia).padStart(2, '0');

            if (concluido) {
                var result = await client.from('reading_progress').upsert({
                    user_id: usuario.id,
                    reading_date: readingDate,
                    month: mes,
                    day: dia,
                    completed: true
                }, { 
                    onConflict: 'user_id,reading_date' 
                });

                if (result.error) throw result.error;
            } else {
                var deleteResult = await client.from('reading_progress')
                    .delete()
                    .eq('user_id', usuario.id)
                    .eq('reading_date', readingDate);

                if (deleteResult.error) throw deleteResult.error;
            }

            return { success: true };

        } catch (error) {
            console.error('Erro ao salvar leitura:', error);
            return { success: false, error: error.message };
        }
    }

    // ============================
    // UTILITÁRIOS
    // ============================

    function traduzirErroSupabase(mensagem) {
        var traducoes = {
            'Invalid login credentials': 'E-mail ou senha incorretos.',
            'Email not confirmed': 'Por favor, confirme seu e-mail antes de fazer login.',
            'User already registered': 'Este e-mail já está cadastrado.',
            'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
            'Unable to validate email address: invalid format': 'Formato de e-mail inválido.',
            'Signup requires a valid password': 'Por favor, insira uma senha válida.',
            'Auth session missing': 'Sessão expirada. Por favor, faça login novamente.',
            'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos.',
            'For security purposes, you can only request this once every 60 seconds': 'Por segurança, aguarde 60 segundos antes de tentar novamente.'
        };

        for (var key in traducoes) {
            if (mensagem && mensagem.includes(key)) {
                return traducoes[key];
            }
        }

        return mensagem || 'Ocorreu um erro. Tente novamente.';
    }

    // Exportar para uso global
    window.SupabaseConfig = {
        init: initSupabase,
        getClient: getSupabaseClient,
        isReady: isSupabaseReady,
        cadastrar: cadastrarUsuarioSupabase,
        login: loginSupabase,
        logout: logoutSupabase,
        getUsuario: getUsuarioAtual,
        sincronizarProgresso: sincronizarProgressoAposLogin,
        carregarProgresso: carregarProgressoDoSupabase,
        salvarLeitura: salvarLeituraSupabase
    };

    console.log('📦 SupabaseConfig carregado');

})();
