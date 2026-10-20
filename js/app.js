// Telas, escolhas antes da partida, pausa e resultado.
(() => {
  const $ = (id) => document.getElementById(id);

  function novoTime(evitarCamisa, evitarNome) {
    const opcoes = Visual.CAMISAS.filter((c) => c.cor !== evitarCamisa);
    const camisa = opcoes[Math.floor(Math.random() * opcoes.length)].cor;
    const calcoes = Visual.CALCOES.filter((c) => c.cor !== camisa);
    return {
      nome: Visual.nomeTime(evitarNome),
      camisa,
      calcao: calcoes[Math.floor(Math.random() * calcoes.length)].cor,
      visuais: Visual.elenco(),
    };
  }

  const config = {
    modo: 'solo',
    dificuldade: 'facil',
    minutos: 3,
    penaltisDois: false,
  };
  config.times = [novoTime()];
  config.times.push(novoTime(config.times[0].camisa, config.times[0].nome));

  let jogo = null;       // Partida.Jogo ou Penaltis.Disputa em andamento
  let telaJogo = null;   // 'partida' ou 'penaltis'
  let placarPartida = null; // guardado quando o empate vai para os pênaltis
  let segundoMostrado = -1;
  let timerGol = null;

  // ---------- Navegação ----------
  function mostrar(nome) {
    document.querySelectorAll('.tela').forEach((t) => t.classList.remove('ativa'));
    $('tela-' + nome).classList.add('ativa');
    window.scrollTo(0, 0);
    if (nome === 'partida' || nome === 'penaltis') ajustarCanvas();
  }

  document.querySelectorAll('[data-ir]').forEach((b) => {
    b.addEventListener('click', () => mostrar(b.dataset.ir));
  });

  // ---------- Som ----------
  $('btn-som').addEventListener('click', (e) => {
    const ligado = Som.alternar();
    const b = e.currentTarget;
    b.setAttribute('aria-pressed', String(ligado));
    b.setAttribute('aria-label', ligado ? 'Desligar o som' : 'Ligar o som');
    b.querySelector('.icone-som').textContent = ligado ? '🔊' : '🔇';
    b.blur();
  });

  // ---------- Tela inicial ----------
  document.querySelectorAll('[data-modo]').forEach((b) => {
    b.addEventListener('click', () => {
      config.modo = b.dataset.modo;
      montarConfig();
      mostrar('config');
    });
  });

  // ---------- Configuração ----------
  const TITULOS = {
    solo: '🧒 Partida Solo',
    dois: '👫 2 Jogadores',
    penaltis: '🥅 Pênaltis',
  };

  function blocoOpcoes(titulo, opcoes, valorAtual, aoEscolher) {
    const bloco = document.createElement('div');
    bloco.className = 'bloco';
    bloco.innerHTML = '<h3>' + titulo + '</h3>';
    const linha = document.createElement('div');
    linha.className = 'opcoes';
    opcoes.forEach((o) => {
      const b = document.createElement('button');
      b.className = 'opcao';
      b.innerHTML = '<span class="ic" aria-hidden="true">' + o.icone + '</span>' + o.texto;
      b.setAttribute('aria-pressed', String(o.valor === valorAtual));
      b.addEventListener('click', () => {
        linha.querySelectorAll('.opcao').forEach((x) => x.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        Som.clique();
        aoEscolher(o.valor);
      });
      linha.appendChild(b);
    });
    bloco.appendChild(linha);
    return bloco;
  }

  function quemControla(t) {
    if (config.modo === 'dois') return 'humano';
    if (config.modo === 'penaltis' && config.penaltisDois) return 'humano';
    return t === 0 ? 'humano' : 'computador';
  }

  function tituloTime(t) {
    if (quemControla(t) === 'computador') return '💻 Time do computador';
    if (config.modo === 'solo' || (config.modo === 'penaltis' && !config.penaltisDois)) return '⭐ Seu time';
    return t === 0 ? '🟡 Jogador 1' : '🔵 Jogador 2';
  }

  function cartaoTime(t) {
    const time = config.times[t];
    const outro = config.times[1 - t];
    const c = document.createElement('div');
    c.className = 'cartao-time';
    c.style.setProperty('--cor-time', time.camisa);

    const h = document.createElement('h3');
    h.textContent = tituloTime(t);
    c.appendChild(h);

    const linhaNome = document.createElement('div');
    linhaNome.className = 'linha-nome';
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 20;
    input.value = time.nome;
    input.setAttribute('aria-label', 'Nome do time');
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.addEventListener('input', () => { time.nome = input.value; });
    const dado = document.createElement('button');
    dado.className = 'btn btn-dado';
    dado.title = 'Sortear um nome';
    dado.setAttribute('aria-label', 'Sortear um nome');
    dado.textContent = '🎲';
    dado.addEventListener('click', () => {
      time.nome = Visual.nomeTime(outro.nome);
      input.value = time.nome;
      Som.clique();
    });
    linhaNome.append(input, dado);
    c.appendChild(linhaNome);

    c.appendChild(linhaCores('👕 Camisa', Visual.CAMISAS, time.camisa, (cor) => cor === outro.camisa, (cor) => {
      time.camisa = cor;
      if (time.calcao === cor) time.calcao = Visual.CALCOES.find((k) => k.cor !== cor).cor;
      montarConfig();
    }));
    c.appendChild(linhaCores('🩳 Calção', Visual.CALCOES, time.calcao, () => false, (cor) => {
      time.calcao = cor;
      montarConfig();
    }));

    const previaLinha = document.createElement('div');
    previaLinha.className = 'previa-linha';
    const previa = document.createElement('canvas');
    previa.className = 'previa';
    previa.width = 240;
    previa.height = 110;
    Visual.previaTime(previa, time);
    const trocar = document.createElement('button');
    trocar.className = 'btn btn-trocar';
    trocar.innerHTML = '<span aria-hidden="true">🔄</span> Trocar jogadores';
    trocar.addEventListener('click', () => {
      time.visuais = Visual.elenco();
      Visual.previaTime(previa, time);
      Som.clique();
    });
    previaLinha.append(previa, trocar);
    c.appendChild(previaLinha);
    return c;
  }

  function linhaCores(rotulo, lista, atual, bloqueada, aoEscolher) {
    const box = document.createElement('div');
    const r = document.createElement('div');
    r.className = 'rotulo-cor';
    r.textContent = rotulo;
    const cores = document.createElement('div');
    cores.className = 'cores';
    lista.forEach((k) => {
      const b = document.createElement('button');
      b.className = 'cor';
      b.style.background = k.cor;
      b.title = k.nome;
      b.setAttribute('aria-label', k.nome);
      b.setAttribute('aria-pressed', String(k.cor === atual));
      if (bloqueada(k.cor)) { b.disabled = true; b.title = k.nome + ' (o outro time já escolheu)'; }
      b.addEventListener('click', () => { Som.clique(); aoEscolher(k.cor); });
      cores.appendChild(b);
    });
    box.append(r, cores);
    return box;
  }

  function montarConfig() {
    $('config-titulo').textContent = TITULOS[config.modo];
    const area = $('config-conteudo');
    area.innerHTML = '';

    const linha = document.createElement('div');
    linha.className = 'linha-blocos';
    area.appendChild(linha);

    if (config.modo === 'penaltis') {
      linha.appendChild(blocoOpcoes('Quem vai jogar?', [
        { icone: '🧒', texto: '1 jogador (contra o computador)', valor: false },
        { icone: '🧒👧', texto: '2 jogadores', valor: true },
      ], config.penaltisDois, (v) => { config.penaltisDois = v; montarConfig(); }));
    }

    if (config.modo === 'solo' || (config.modo === 'penaltis' && !config.penaltisDois)) {
      linha.appendChild(blocoOpcoes('Dificuldade', [
        { icone: '🐢', texto: 'Fácil', valor: 'facil' },
        { icone: '🐇', texto: 'Médio', valor: 'medio' },
        { icone: '🐆', texto: 'Difícil', valor: 'dificil' },
      ], config.dificuldade, (v) => { config.dificuldade = v; }));
    }

    if (config.modo !== 'penaltis') {
      linha.appendChild(blocoOpcoes('Tempo da partida', [
        { icone: '⏱', texto: '2 min', valor: 2 },
        { icone: '⏱', texto: '3 min', valor: 3 },
        { icone: '⏱', texto: '5 min', valor: 5 },
      ], config.minutos, (v) => { config.minutos = v; }));
    }

    const times = document.createElement('div');
    times.className = 'times';
    times.append(cartaoTime(0), cartaoTime(1));
    area.appendChild(times);
  }

  $('btn-config-ok').addEventListener('click', () => {
    config.times.forEach((t, i) => {
      t.nome = t.nome.trim() || (i === 0 ? 'Time Amarelo' : 'Time Azul');
    });
    montarControles();
    mostrar('controles');
  });

  // ---------- Controles ----------
  function tecla(texto, classe) {
    return '<span class="tecla ' + (classe || '') + '">' + texto + '</span>';
  }
  function cruz(c, e, b, d) {
    return '<div class="cruz">' +
      tecla(c, 't-cima') + tecla(e, 't-esq') + tecla(b, 't-baixo') + tecla(d, 't-dir') +
      '</div>';
  }
  function painel(time, titulo, corpo) {
    return '<div class="painel-controle" style="--cor-time:' + time.camisa + '">' +
      '<h3>' + titulo + '</h3>' + corpo + '</div>';
  }
  const textoTime = (t) => escapar(t.nome);
  function escapar(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function montarControles() {
    const area = $('controles-conteudo');
    const [t0, t1] = config.times;
    const wasd = '<div class="grupo-teclas"><div>' + cruz('W', 'A', 'S', 'D') +
      '<div class="legenda-tecla">🏃 Correr</div></div><div>' + tecla('Espaço ⚽', 'larga') +
      '<div class="legenda-tecla">👟 Chutar</div></div></div>';
    const setas = '<div class="grupo-teclas"><div>' + cruz('▲', '◀', '▼', '▶') +
      '<div class="legenda-tecla">🏃 Correr</div></div><div>' + tecla('Enter ↵', 'enter') +
      '<div class="legenda-tecla">👟 Chutar</div></div></div>';
    let html = '';
    if (config.modo === 'solo') {
      html += painel(t0, '⭐ ' + textoTime(t0), '<div class="duas-opcoes">' + wasd + '<div class="ou">ou</div>' + setas + '</div>');
      html += '<p class="dica-pausa">🔼 A setinha amarela mostra quem você controla. Ela troca sozinha para quem está mais perto da bola!</p>';
    } else if (config.modo === 'dois') {
      html += painel(t0, '🟡 Jogador 1 — ' + textoTime(t0), wasd);
      html += painel(t1, '🔵 Jogador 2 — ' + textoTime(t1), setas);
      html += '<p class="dica-pausa">🔼 A setinha com o número 1 ou 2 mostra quem cada um controla.</p>';
    } else {
      const passos = config.penaltisDois
        ? '<li>🖱️ Use só o mouse.</li><li>👟 Batedor: clique no gol onde quer chutar.</li>' +
          '<li>🧤 Goleiro: clique para onde quer pular.</li><li>🔁 Vocês trocam: um chuta, o outro defende.</li>' +
          '<li>🙈 Quando o goleiro escolher, o batedor não pode olhar!</li>'
        : '<li>🖱️ Use só o mouse.</li><li>👟 Clique no gol onde quer chutar.</li>' +
          '<li>🧤 Quando for goleiro, clique para onde quer pular.</li><li>⚽ São 5 cobranças para cada time.</li>';
      html += painel(t0, '🥅 Pênaltis', '<div class="mouse-desenho" aria-hidden="true">🖱️</div><ul class="passos-pen">' + passos + '</ul>');
    }
    html += '<p class="dica-pausa">⏸️ Para pausar, clique em <b>Pausar</b> ou aperte a tecla <b>P</b>.</p>';
    area.innerHTML = html;
  }

  $('btn-comecar').addEventListener('click', () => {
    placarPartida = null;
    if (config.modo === 'penaltis') iniciarPenaltis(config.penaltisDois);
    else iniciarPartida();
  });

  // ---------- HUD ----------
  function pintarHud(tela) {
    config.times.forEach((t, i) => {
      const alvo = tela === 'partida' ? document.querySelector('#tela-partida .time-hud-' + i) : $('linha-pen-' + i);
      alvo.querySelector('.nome-hud').textContent = t.nome;
      const cor = alvo.querySelector('.cor-hud');
      cor.style.setProperty('--c1', t.camisa);
      cor.style.setProperty('--c2', t.calcao);
    });
  }

  function formatarTempo(seg) {
    const s = Math.ceil(seg);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function encerrarJogo() {
    if (jogo) jogo.destruir();
    jogo = null;
    clearTimeout(timerGol);
    $('aviso-gol').hidden = true;
    $('janela-pausa').hidden = true;
    $('janela-aviso').hidden = true;
  }

  // ---------- Partida ----------
  function iniciarPartida() {
    encerrarJogo();
    telaJogo = 'partida';
    pintarHud('partida');
    $('gols-0').textContent = '0';
    $('gols-1').textContent = '0';
    segundoMostrado = -1;
    mostrar('partida');
    if (document.activeElement) document.activeElement.blur();
    jogo = new Partida.Jogo($('canvas-partida'), {
      modo: config.modo,
      dificuldade: config.dificuldade,
      minutos: config.minutos,
      times: config.times,
    }, {
      tempo(seg) {
        const s = Math.ceil(seg);
        if (s === segundoMostrado) return;
        segundoMostrado = s;
        $('relogio').textContent = formatarTempo(seg);
        $('relogio').parentElement.classList.toggle('acabando', s <= 10);
      },
      gol(time, placar) {
        $('gols-0').textContent = placar[0];
        $('gols-1').textContent = placar[1];
        const aviso = $('aviso-gol');
        const t = config.times[time];
        aviso.style.setProperty('--cor-gol', t.camisa);
        aviso.querySelector('.gol-time').textContent = '⚽ ' + t.nome;
        aviso.querySelector('.gol-time').style.color = Visual.corTexto(t.camisa);
        aviso.hidden = false;
        clearTimeout(timerGol);
        timerGol = setTimeout(() => { aviso.hidden = true; }, 2600);
      },
      fim(placar) {
        mostrarFinal({ partida: placar });
      },
    });
  }

  // ---------- Pênaltis ----------
  function iniciarPenaltis(dois) {
    encerrarJogo();
    telaJogo = 'penaltis';
    pintarHud('penaltis');
    mostrar('penaltis');
    if (document.activeElement) document.activeElement.blur();
    jogo = new Penaltis.Disputa($('canvas-penaltis'), {
      dois,
      dificuldade: config.dificuldade,
      times: config.times,
    }, {
      placar(cobrancas) {
        cobrancas.forEach((lista, t) => {
          $('pen-gols-' + t).textContent = lista.filter(Boolean).length;
          const caixa = $('linha-pen-' + t).querySelector('.bolinhas');
          const total = Math.max(5, cobrancas[0].length, cobrancas[1].length);
          let html = '';
          for (let i = 0; i < total; i++) {
            if (i < lista.length) html += '<span class="bolinha ' + (lista[i] ? 'gol">✔' : 'erro">✖') + '</span>';
            else html += '<span class="bolinha"></span>';
          }
          caixa.innerHTML = html;
        });
      },
      faixa(texto) {
        $('faixa-penaltis').textContent = texto;
        $('faixa-penaltis').style.visibility = texto ? 'visible' : 'hidden';
      },
      aviso(icone, titulo, texto, botao, depois) {
        $('aviso-icone').textContent = icone;
        $('aviso-titulo').textContent = titulo;
        $('aviso-texto').textContent = texto;
        $('btn-aviso-ok').textContent = botao;
        $('janela-aviso').hidden = false;
        acaoAviso = depois;
        $('btn-aviso-ok').focus();
      },
      fim(cobrancas, vencedor) {
        mostrarFinal({
          partida: placarPartida,
          penaltis: cobrancas.map((l) => l.filter(Boolean).length),
          vencedor,
        });
      },
    });
  }

  let acaoAviso = null;
  $('btn-aviso-ok').addEventListener('click', () => {
    $('janela-aviso').hidden = true;
    const f = acaoAviso;
    acaoAviso = null;
    $('btn-aviso-ok').blur();
    if (f) f();
  });

  // ---------- Pausa ----------
  function pausar() {
    if (!jogo || jogo.pausado) return;
    jogo.pausar();
    $('janela-pausa').hidden = false;
    $('btn-continuar').focus();
  }
  function continuar() {
    if (!jogo) return;
    $('janela-pausa').hidden = true;
    $('btn-continuar').blur();
    jogo.continuar();
  }
  document.querySelectorAll('[data-pausa]').forEach((b) => b.addEventListener('click', () => { b.blur(); pausar(); }));
  $('btn-continuar').addEventListener('click', continuar);
  $('btn-recomecar').addEventListener('click', () => {
    if (telaJogo === 'partida') iniciarPartida();
    else iniciarPenaltis(config.modo === 'penaltis' ? config.penaltisDois : config.modo === 'dois');
  });
  $('btn-sair').addEventListener('click', () => { encerrarJogo(); mostrar('inicio'); });

  window.addEventListener('keydown', (e) => {
    if (!jogo) return;
    if (e.code === 'KeyP' || e.code === 'Escape') {
      e.preventDefault();
      if (jogo.pausado && !$('janela-pausa').hidden) continuar();
      else pausar();
    }
  });
  // Se a criança trocar de janela, o jogo pausa sozinho
  window.addEventListener('blur', () => { if (jogo && $('janela-aviso').hidden) pausar(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && jogo && $('janela-aviso').hidden) pausar(); });

  // ---------- Resultado ----------
  function mostrarFinal(r) {
    encerrarJogo();
    const [t0, t1] = config.times;
    const placar = r.partida;
    let vencedor = r.vencedor;
    if (vencedor === undefined) vencedor = placar[0] === placar[1] ? -1 : (placar[0] > placar[1] ? 0 : 1);

    const solo = config.modo === 'solo' || (config.modo === 'penaltis' && !config.penaltisDois);
    let titulo, msg, icone;
    if (vencedor < 0) {
      icone = '🤝';
      titulo = 'Empate!';
      msg = 'Que jogo equilibrado! Querem decidir nos pênaltis?';
    } else {
      const v = config.times[vencedor];
      icone = '🏆';
      titulo = v.nome + ' venceu!';
      if (solo && vencedor === 1) { icone = '💪'; msg = 'Foi por pouco! Tente de novo, você consegue!'; }
      else msg = solo ? 'Parabéns, craque! 🎉' : 'Parabéns, ' + v.nome + '! 🎉 E muito bem, ' + config.times[1 - vencedor].nome + '!';
    }
    $('final-icone').textContent = icone;
    $('final-titulo').textContent = titulo;
    $('final-titulo').style.color = vencedor >= 0 ? Visual.escurecer(config.times[vencedor].camisa, 0.85) : '#1d2433';
    if (vencedor >= 0 && config.times[vencedor].camisa === '#fafafa') $('final-titulo').style.color = '#1d2433';

    const linha = (a, b) => '<span>' + escapar(t0.nome) + '</span><span class="num">' + a + '</span><span>x</span><span class="num">' + b + '</span><span>' + escapar(t1.nome) + '</span>';
    if (placar) {
      $('final-placar').innerHTML = linha(placar[0], placar[1]);
      $('final-extra').textContent = r.penaltis ? '🥅 Pênaltis: ' + r.penaltis[0] + ' x ' + r.penaltis[1] : '';
    } else {
      $('final-placar').innerHTML = linha(r.penaltis[0], r.penaltis[1]);
      $('final-extra').textContent = '🥅 Disputa de pênaltis';
    }
    $('final-msg').textContent = msg;
    $('btn-final-penaltis').hidden = !(vencedor < 0 && !r.penaltis);
    placarPartida = placar;
    confeteFinal(vencedor >= 0 ? [config.times[vencedor].camisa, config.times[vencedor].calcao] : [t0.camisa, t1.camisa]);
    mostrar('final');
    Som.torcida();
  }

  function confeteFinal(coresTime) {
    const caixa = $('confete-final');
    caixa.innerHTML = '';
    const cores = coresTime.concat(['#ffd740', '#ff4081', '#40c4ff', '#69f0ae']);
    for (let i = 0; i < 60; i++) {
      const c = document.createElement('i');
      c.style.left = Math.random() * 100 + '%';
      c.style.background = cores[i % cores.length];
      c.style.animationDuration = 2.5 + Math.random() * 3 + 's';
      c.style.animationDelay = -Math.random() * 5 + 's';
      caixa.appendChild(c);
    }
  }

  $('btn-final-denovo').addEventListener('click', () => {
    placarPartida = null;
    if (config.modo === 'penaltis') iniciarPenaltis(config.penaltisDois);
    else iniciarPartida();
  });
  $('btn-final-inicio').addEventListener('click', () => { placarPartida = null; mostrar('inicio'); });
  $('btn-final-penaltis').addEventListener('click', () => iniciarPenaltis(config.modo === 'dois'));

  // ---------- Tamanho do campo na tela ----------
  function ajustarCanvas() {
    ['partida', 'penaltis'].forEach((nome) => {
      const tela = $('tela-' + nome);
      if (!tela.classList.contains('ativa')) return;
      const palco = tela.querySelector('.palco');
      const canvas = palco.querySelector('canvas');
      const w = palco.clientWidth - 4, h = palco.clientHeight - 10;
      const escala = Math.max(0.2, Math.min(w / 960, h / 600));
      canvas.style.width = Math.floor(960 * escala) + 'px';
      canvas.style.height = Math.floor(600 * escala) + 'px';
    });
  }
  window.addEventListener('resize', ajustarCanvas);
})();
