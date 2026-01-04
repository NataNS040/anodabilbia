/**
 * BibliaAgora - Main JavaScript
 */

// Gerenciamento de progresso com localStorage e Supabase
var progresso = JSON.parse(localStorage.getItem('bibliaagora_progresso') || '{}');

// Tornar progresso acessível globalmente para sincronização
window.progresso = progresso;

function salvarProgresso() {
    localStorage.setItem('bibliaagora_progresso', JSON.stringify(progresso));
}

function getLeiturasConcluidas(mes) {
    return progresso[mes] || [];
}

async function toggleLeitura(mes, dia) {
    if (!progresso[mes]) {
        progresso[mes] = [];
    }
    
    var index = progresso[mes].indexOf(dia);
    var concluido = false;
    
    if (index > -1) {
        progresso[mes].splice(index, 1);
        concluido = false;
    } else {
        progresso[mes].push(dia);
        concluido = true;
    }
    
    salvarProgresso();
    atualizarUIProgresso(mes);
    
    // Sincronizar com Supabase se usuário estiver logado
    if (window.SupabaseConfig && window.SupabaseConfig.isReady()) {
        try {
            await window.SupabaseConfig.salvarLeitura(mes, dia, concluido);
        } catch (error) {
            console.warn('Erro ao sincronizar leitura:', error);
        }
    }
}

function atualizarUIProgresso(mes) {
    var data = window.BibliaAgoraData;
    var mesInfo = data.MESES_INFO[mes - 1];
    var concluidas = getLeiturasConcluidas(mes);
    var porcentagem = Math.round((concluidas.length / mesInfo.dias) * 100);
    
    // Atualizar barra de progresso na página do mês
    var progressFill = document.getElementById('detail-progress-fill');
    var progressText = document.getElementById('detail-progress-text');
    var completoBadge = document.querySelector('#detail-nome .mes-completo-badge');
    
    if (progressFill) {
        progressFill.style.width = porcentagem + '%';
    }
    if (progressText) {
        progressText.textContent = porcentagem + '%';
    }
    if (completoBadge) {
        completoBadge.style.display = porcentagem === 100 ? 'inline-flex' : 'none';
    }
    
    // Atualizar visual dos dias
    for (var dia = 1; dia <= mesInfo.dias; dia++) {
        var item = document.getElementById('dia-item-' + dia);
        if (item) {
            if (concluidas.indexOf(dia) > -1) {
                item.classList.add('concluido');
            } else {
                item.classList.remove('concluido');
            }
        }
    }
    
    // Atualizar cards dos meses na home
    atualizarCardsMeses();
}

function atualizarCardsMeses() {
    var data = window.BibliaAgoraData;
    
    for (var i = 0; i < 12; i++) {
        var mesNum = i + 1;
        var mesInfo = data.MESES_INFO[i];
        var concluidas = getLeiturasConcluidas(mesNum);
        var porcentagem = Math.round((concluidas.length / mesInfo.dias) * 100);
        
        var progressFill = document.getElementById('mes-progress-' + mesNum);
        var progressText = document.getElementById('mes-progress-text-' + mesNum);
        var card = document.getElementById('mes-card-' + mesNum);
        var checkIcon = document.getElementById('mes-check-' + mesNum);
        
        if (progressFill) {
            progressFill.style.width = porcentagem + '%';
        }
        if (progressText) {
            progressText.textContent = concluidas.length + '/' + mesInfo.dias + ' leituras';
        }
        if (card) {
            if (porcentagem === 100) {
                card.classList.add('completo');
            } else {
                card.classList.remove('completo');
            }
        }
        if (checkIcon) {
            checkIcon.style.display = porcentagem === 100 ? 'flex' : 'none';
        }
    }
}

// Nomes dos meses em português
var NOMES_MESES = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

function carregarLeituraDeHoje() {
    var hoje = new Date();
    var dia = hoje.getDate();
    var mes = hoje.getMonth() + 1; // JavaScript usa 0-11, nosso plano usa 1-12
    
    var data = window.BibliaAgoraData;
    var leituraDoMes = data.PLANO_LEITURA[mes];
    var leitura = leituraDoMes ? leituraDoMes[dia] : null;
    
    // Formatar data
    var dataFormatada = dia + ' de ' + NOMES_MESES[mes - 1];
    document.getElementById('leitura-hoje-data').textContent = dataFormatada;
    
    // Preencher conteúdo
    var conteudo = document.getElementById('leitura-hoje-conteudo');
    
    if (leitura) {
        conteudo.innerHTML = '<p class="leitura-hoje-texto"><i data-lucide="book-open"></i>' + leitura + '</p>';
    } else {
        conteudo.innerHTML = '<p class="leitura-hoje-indisponivel">A leitura para este dia não está disponível no plano atual.</p>';
    }
    
    // Recriar ícones do Lucide
    lucide.createIcons();
}

function irParaLeituraHoje() {
    var hoje = new Date();
    var mes = hoje.getMonth() + 1;
    abrirMes(mes);
    
    // Aguardar renderização e scroll até o dia atual
    setTimeout(function() {
        var dia = hoje.getDate();
        var diaElement = document.getElementById('dia-item-' + dia);
        if (diaElement) {
            diaElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            diaElement.classList.add('destacado');
            setTimeout(function() {
                diaElement.classList.remove('destacado');
            }, 2000);
        }
    }, 300);
}

// Controle do Banner de Conta
function verificarBannerConta() {
    var banner = document.getElementById('banner-conta');
    var btnCriarContaHero = document.getElementById('btn-criar-conta-hero');
    
    if (!banner) return;
    
    // Verificar se usuário está logado
    var usuarioLogado = false;
    if (window.SupabaseConfig && window.SupabaseConfig.isReady()) {
        var usuario = localStorage.getItem('bibliaagora_usuario');
        usuarioLogado = !!usuario;
    }
    
    // Verificar se usuário fechou o banner recentemente (24 horas)
    var bannerFechado = localStorage.getItem('bibliaagora_banner_fechado');
    var bannerExpirado = false;
    if (bannerFechado) {
        var fechadoEm = parseInt(bannerFechado);
        var agora = Date.now();
        var umDia = 24 * 60 * 60 * 1000;
        bannerExpirado = (agora - fechadoEm) > umDia;
    }
    
    // Mostrar banner apenas se não logado e não fechou recentemente
    if (usuarioLogado) {
        banner.classList.add('hidden');
        // Esconder botão criar conta do hero também
        if (btnCriarContaHero) {
            btnCriarContaHero.style.display = 'none';
        }
    } else if (bannerFechado && !bannerExpirado) {
        banner.classList.add('hidden');
    } else {
        banner.classList.remove('hidden');
        // Mostrar botão criar conta no hero
        if (btnCriarContaHero) {
            btnCriarContaHero.style.display = 'inline-flex';
        }
    }
}

function fecharBannerConta() {
    var banner = document.getElementById('banner-conta');
    if (banner) {
        banner.classList.add('hidden');
        // Salvar que o usuário fechou o banner
        localStorage.setItem('bibliaagora_banner_fechado', Date.now().toString());
    }
}

// Tornar função global
window.fecharBannerConta = fecharBannerConta;

document.addEventListener('DOMContentLoaded', async function() {
    // Inicializar Supabase
    if (window.SupabaseConfig) {
        window.SupabaseConfig.init();
        
        // Verificar se usuário está logado e carregar progresso do Supabase
        var usuario = await window.SupabaseConfig.getUsuario();
        if (usuario) {
            console.log('👤 Usuário logado:', usuario.nome);
            // O progresso será carregado automaticamente após sincronização
            await window.SupabaseConfig.carregarProgresso(usuario.id);
            // Atualizar variável local
            progresso = JSON.parse(localStorage.getItem('bibliaagora_progresso') || '{}');
            window.progresso = progresso;
        }
    }
    
    lucide.createIcons();
    carregarLeituraDeHoje();
    renderMeses();
    setupScrollTop();
    atualizarCardsMeses();
    
    // Verificar se deve mostrar o banner de conta
    verificarBannerConta();
    
    // Atualizar UI de login se a função existir
    if (typeof atualizarUILogin === 'function') {
        atualizarUILogin();
    }
});

function renderMeses() {
    var grid = document.getElementById('meses-grid');
    var hoje = new Date();
    var mesAtual = hoje.getMonth() + 1;
    var icones = ['book-open', 'book-open', 'book-open', 'book-open', 'book-open', 'book-open', 'book-open', 'book-open', 'book-open', 'book-open', 'book-open', 'book-open'];

    for (var i = 0; i < 12; i++) {
        var mes = window.BibliaAgoraData.MESES_INFO[i];
        var num = i + 1;
        var isAtual = num === mesAtual;
        var concluidas = getLeiturasConcluidas(num);
        var porcentagem = Math.round((concluidas.length / mes.dias) * 100);
        var completo = porcentagem === 100;
        
        var card = document.createElement('div');
        card.id = 'mes-card-' + num;
        card.className = 'mes-card' + (isAtual ? ' atual' : '') + (completo ? ' completo' : '');
        card.onclick = (function(n) { return function() { abrirMes(n); }; })(num);
        
        card.innerHTML = 
            '<span class="mes-card-numero">' + String(num).padStart(2, '0') + '</span>' +
            (completo ? '<span class="mes-card-check" id="mes-check-' + num + '"><i data-lucide="check"></i></span>' : 
                (isAtual ? '<span class="mes-card-badge">Atual</span>' : '<span class="mes-card-check" id="mes-check-' + num + '" style="display:none"><i data-lucide="check"></i></span>')) +
            '<i data-lucide="' + icones[i] + '" class="mes-card-icon"></i>' +
            '<h3 class="mes-card-nome">' + mes.nome + '</h3>' +
            '<div class="mes-progress">' +
                '<div class="mes-progress-bar">' +
                    '<div class="mes-progress-fill" id="mes-progress-' + num + '" style="width:' + porcentagem + '%"></div>' +
                '</div>' +
                '<p class="mes-progress-text" id="mes-progress-text-' + num + '">' + concluidas.length + '/' + mes.dias + ' leituras</p>' +
            '</div>';
        
        grid.appendChild(card);
    }
    
    lucide.createIcons();
}

function abrirMes(mesNum) {
    console.log('Abrindo mes:', mesNum);
    var data = window.BibliaAgoraData;
    var mes = data.MESES_INFO[mesNum - 1];
    var leituras = data.PLANO_LEITURA[mesNum];
    var hoje = new Date();
    var diaAtual = hoje.getDate();
    var mesAtual = hoje.getMonth() + 1;
    var concluidas = getLeiturasConcluidas(mesNum);
    var porcentagem = Math.round((concluidas.length / mes.dias) * 100);

    document.getElementById('detail-numero').textContent = String(mesNum).padStart(2, '0');
    document.getElementById('detail-nome').innerHTML = mes.nome + '<span class="mes-completo-badge" id="mes-completo-badge" style="display:' + (porcentagem === 100 ? 'inline-flex' : 'none') + '"><i data-lucide="trophy"></i> Completo!</span>';
    document.getElementById('detail-dias').textContent = mes.dias + ' dias de leitura';

    // Guardar mes atual para referencia
    window.mesAberto = mesNum;

    var lista = document.getElementById('dias-lista');
    lista.innerHTML = '';

    for (var dia = 1; dia <= mes.dias; dia++) {
        var leitura = leituras[dia] || 'Leitura nao definida';
        var isHoje = mesNum === mesAtual && dia === diaAtual;
        var isConcluido = concluidas.indexOf(dia) > -1;
        var mesAbrev = mes.nome.substring(0, 3);

        var item = document.createElement('div');
        item.id = 'dia-item-' + dia;
        item.className = 'dia-item' + (isHoje ? ' hoje' : '') + (isConcluido ? ' concluido' : '');
        item.innerHTML = 
            '<div class="dia-numero">' + String(dia).padStart(2, '0') + '</div>' +
            '<div class="dia-content">' +
                '<div class="dia-data">' + String(dia).padStart(2, '0') + ' de ' + mesAbrev + (isHoje ? ' - Hoje!' : '') + '</div>' +
                '<div class="dia-leitura">' + leitura + '</div>' +
            '</div>' +
            '<button class="dia-check" onclick="toggleLeitura(' + mesNum + ', ' + dia + ')" title="Marcar como concluido">' +
                '<i data-lucide="check"></i>' +
            '</button>';
        
        lista.appendChild(item);
    }

    // Atualizar barra de progresso
    document.getElementById('detail-progress-fill').style.width = porcentagem + '%';
    document.getElementById('detail-progress-text').textContent = porcentagem + '%';

    document.getElementById('home-view').style.display = 'none';
    document.getElementById('mes-detail').classList.add('active');
    document.querySelector('.footer').style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    lucide.createIcons();
}

function voltarHome() {
    document.getElementById('mes-detail').classList.remove('active');
    document.getElementById('home-view').style.display = 'block';
    document.querySelector('.footer').style.display = 'block';
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    return false;
}

function irParaMesAtual() {
    var mesAtual = new Date().getMonth() + 1;
    abrirMes(mesAtual);
}

function setupScrollTop() {
    window.addEventListener('scroll', function() {
        var btn = document.getElementById('scroll-top');
        if (window.scrollY > 500) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    });
}
