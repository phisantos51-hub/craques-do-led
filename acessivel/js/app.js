// Menus falados, treino dos sons, pausa e resultado da versão acessível.
(() => {
  const $ = (id) => document.getElementById(id);
  let modo = 'inicio';     // inicio, menu, jogo
  let menu = null;
  let jogo = null;
  let tipoJogo = null;     // 'penaltis' ou 'guizo'
  let escolha = { dificuldade: 'facil', minutos: 3 };
  let roteiro = 0;         // muda para interromper treino e instruções

  const VELOCIDADES = [
    { nome: 'devagar', taxa: 0.85 },
    { nome: 'normal', taxa: 1 },
    { nome: 'rápida', taxa: 1.2 },
  ];
  let velocidade = 1;

  function mostrarTela(nome) {
    document.querySelectorAll('.tela').forEach((t) => t.classList.remove('ativa'));
    $('tela-' + nome).classList.add('ativa');
  }

  // ---------- Menus ----------
  function abrirMenu(m, primeiraVez) {
    roteiro++;
    modo = 'menu';
    menu = m;
    m.indice = m.indice || 0;
    mostrarTela('menu');
    $('menu-titulo').textContent = m.titulo;
    desenharMenu();
    const dica = primeiraVez
      ? ' Use as setas para cima e para baixo para escolher, e aperte Enter.'
      : '';
    Voz.falar(m.titulo + '.' + dica + ' ' + textoItem());
  }

  function textoItem() {
    const it = menu.itens[menu.indice];
    return it.texto + '. ' + (menu.indice + 1) + ' de ' + menu.itens.length + '.';
  }

  function desenharMenu() {
    const lista = $('menu-lista');
    lista.innerHTML = '';
    menu.itens.forEach((it, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.className = 'item' + (i === menu.indice ? ' atual' : '');
      b.innerHTML = '<span class="num">' + (i + 1) + '</span>' + (it.icone ? '<span aria-hidden="true">' + it.icone + '</span> ' : '') + it.texto;
      b.tabIndex = -1;
      b.addEventListener('click', () => { menu.indice = i; escolher(); });
      li.appendChild(b);
      lista.appendChild(li);
    });
  }

  function moverMenu(passo) {
    menu.indice = (menu.indice + passo + menu.itens.length) % menu.itens.length;
    Sons.menu();
    desenharMenu();
    Voz.falar(textoItem());
  }

  function escolher() {
    Sons.ok();
    menu.itens[menu.indice].acao();
  }

  function menuPrincipal(primeiraVez) {
    abrirMenu({
      titulo: 'Craques do LED, versão para ouvir',
      itens: [
        { icone: '🥅', texto: 'Pênaltis de ouvido', acao: () => menuDificuldade(() => comecar('penaltis')) },
        { icone: '🔔', texto: 'Partida com bola de guizo', acao: () => menuDificuldade(menuTempo) },
        { icone: '🎧', texto: 'Treino do fone e dos sons', acao: treino },
        { icone: '❓', texto: 'Como jogar', acao: comoJogar },
        { icone: '🗣️', texto: 'Velocidade da voz: ' + VELOCIDADES[velocidade].nome, acao: trocarVelocidade },
        { icone: '🏠', texto: 'Voltar para o jogo com imagens', acao: () => { window.location.href = '../index.html'; } },
      ],
      indice: menuPrincipal.ultimo || 0,
      voltar: null,
    }, primeiraVez);
  }

  function trocarVelocidade() {
    velocidade = (velocidade + 1) % VELOCIDADES.length;
    Voz.taxa = VELOCIDADES[velocidade].taxa;
    const it = menu.itens[menu.indice];
    it.texto = 'Velocidade da voz: ' + VELOCIDADES[velocidade].nome;
    desenharMenu();
    Voz.falar(it.texto);
  }

  function menuDificuldade(depois) {
    menuPrincipal.ultimo = menu.indice;
    const itens = [
      { icone: '🐢', texto: 'Fácil', valor: 'facil' },
      { icone: '🐇', texto: 'Médio', valor: 'medio' },
      { icone: '🐆', texto: 'Difícil', valor: 'dificil' },
    ].map((o) => ({ ...o, acao: () => { escolha.dificuldade = o.valor; depois(); } }));
    abrirMenu({ titulo: 'Escolha a dificuldade', itens, voltar: () => menuPrincipal() });
  }

  function menuTempo() {
    const itens = [2, 3, 5].map((m) => ({
      icone: '⏱️', texto: m + ' minutos', acao: () => { escolha.minutos = m; comecar('guizo'); },
    }));
    abrirMenu({ titulo: 'Quanto tempo de partida?', itens, indice: 1, voltar: () => menuDificuldade(menuTempo) });
  }

  // ---------- Treino e instruções ----------
  // Cada passo: uma fala e, depois dela, um som repetido algumas vezes.
  function rodarRoteiro(passos, aoTerminar) {
    const meu = ++roteiro;
    modo = 'roteiro';
    let i = 0;
    const proximo = () => {
      if (meu !== roteiro) return;
      if (i >= passos.length) { aoTerminar(); return; }
      const p = passos[i++];
      Voz.falar(p.fala, {
        depois: () => {
          if (meu !== roteiro) return;
          if (!p.som) { setTimeout(proximo, 300); return; }
          const vezes = p.vezes || 3;
          let n = 0;
          const tocar = () => {
            if (meu !== roteiro) return;
            if (n >= vezes) { setTimeout(proximo, 500); return; }
            const espera = typeof p.intervalo === 'function' ? p.intervalo(n) : (p.intervalo || 450);
            p.som(n++);
            setTimeout(tocar, espera);
          };
          tocar();
        },
      });
    };
    proximo();
  }

  function treino() {
    menuPrincipal.ultimo = menu.indice;
    mostrarTela('roteiro');
    $('roteiro-titulo').textContent = '🎧 Treino do fone e dos sons';
    rodarRoteiro([
      { fala: 'Vamos testar o fone. Coloque o fone nos dois ouvidos. Este som está na esquerda.', som: () => Sons.guizo(-1, 1, true) },
      { fala: 'Este som está na direita.', som: () => Sons.guizo(1, 1, true) },
      { fala: 'Este está no meio.', som: () => Sons.guizo(0, 1, true) },
      { fala: 'Na partida, a bola tem um guizo. Quando a bola está na sua frente, o guizo é fino, assim.', som: () => Sons.guizo(0, 1, true) },
      { fala: 'Quando a bola está atrás de você, o guizo é grosso, assim.', som: () => Sons.guizo(0, 1, false) },
      { fala: 'Quanto mais perto a bola está, mais rápido o guizo toca.', som: (n) => Sons.guizo(0, 0.3 + n * 0.1, true), vezes: 9, intervalo: (n) => 650 - n * 65 },
      { fala: 'Quando você está com a bola, o gol faz bip bip, do lado em que ele está.', som: () => Sons.bipGol(-0.7, 1, false), vezes: 2, intervalo: 700 },
      { fala: 'Se o bip ficar agudo, assim, você está de frente para o gol. Pode chutar com a barra de espaço!', som: () => Sons.bipGol(0, 1, true), vezes: 2, intervalo: 700 },
      { fala: 'Se você bater na lateral do campo, vai ouvir este som.', som: () => Sons.parede(-1), vezes: 2, intervalo: 500 },
      { fala: 'Nos pênaltis, a bola voa para um lado. Esta foi para a direita.', som: () => Sons.voo(0, 1, 0.9, false), vezes: 1, intervalo: 1200 },
      { fala: 'E esta foi para a esquerda.', som: () => Sons.voo(0, -1, 0.9, false), vezes: 1, intervalo: 1200 },
      { fala: 'Treino terminado. Muito bem!' },
    ], () => menuPrincipal());
  }

  function comoJogar() {
    menuPrincipal.ultimo = menu.indice;
    mostrarTela('roteiro');
    $('roteiro-titulo').textContent = '❓ Como jogar';
    rodarRoteiro([
      { fala: 'Pênaltis de ouvido. Para chutar, aperte a seta para a esquerda, a seta para cima para chutar no meio, ou a seta para a direita.' },
      { fala: 'Para defender, ouça o chute e o voo da bola. Aperte a seta do lado para onde a bola foi. Seja rápido!' },
      { fala: 'Partida com bola de guizo. Use as setas para correr. A seta para cima leva você até o gol do computador.' },
      { fala: 'Corra até o guizo para pegar a bola. Com a bola, siga o bip do gol e aperte a barra de espaço para chutar.' },
      { fala: 'Teclas de ajuda: B diz onde está a bola. G diz onde está o gol. T diz o placar e o tempo. R repete a última fala.' },
      { fala: 'Para pausar o jogo, aperte a tecla Esc, que fica no canto de cima do teclado, à esquerda.' },
    ], () => menuPrincipal());
  }

  // ---------- Jogos ----------
  function comecar(tipo) {
    roteiro++;
    encerrar();
    tipoJogo = tipo;
    modo = 'jogo';
    mostrarTela('jogo');
    $('placar-texto').textContent = '';
    if (tipo === 'penaltis') {
      $('campo').hidden = true;
      $('painel-penaltis').hidden = false;
      jogo = new PenaltisOuvido.Disputa(escolha.dificuldade, {
        mostrar: mostrarPenaltis,
        fim: (cobrancas, v) => {
          const g = cobrancas.map((l) => l.filter(Boolean).length);
          resultado(v === 0 ? 0 : 1, 'Pênaltis: você ' + g[0] + ', computador ' + g[1] + '.');
        },
      });
    } else {
      $('campo').hidden = false;
      $('painel-penaltis').hidden = true;
      jogo = new PartidaGuizo.Jogo(escolha, {
        desenhar: desenharCampo,
        fim: (placar) => {
          const v = placar[0] === placar[1] ? -1 : (placar[0] > placar[1] ? 0 : 1);
          resultado(v, 'Placar final: você ' + placar[0] + ', computador ' + placar[1] + '.');
        },
      });
    }
    jogo.iniciar();
  }

  function encerrar() {
    if (jogo) jogo.destruir();
    jogo = null;
  }

  function resultado(vencedor, placarTexto) {
    encerrar();
    const frase = vencedor === 0 ? 'Você venceu! Parabéns, craque!'
      : vencedor === 1 ? 'O computador venceu desta vez. Tente de novo, você consegue!'
      : 'Empate! Que jogo equilibrado!';
    if (vencedor === 0) Sons.torcida(3);
    const tipo = tipoJogo;
    abrirMenu({
      titulo: frase + ' ' + placarTexto,
      itens: [
        { icone: '🔁', texto: 'Jogar de novo', acao: () => comecar(tipo) },
        { icone: '🏠', texto: 'Menu principal', acao: () => menuPrincipal() },
      ],
      voltar: () => menuPrincipal(),
    });
  }

  function pausar() {
    if (!jogo || jogo.pausado) return;
    jogo.pausar();
    abrirMenu({
      titulo: 'Jogo pausado',
      itens: [
        { icone: '▶️', texto: 'Continuar', acao: continuar },
        { icone: '🔁', texto: 'Recomeçar', acao: () => comecar(tipoJogo) },
        { icone: '🏠', texto: 'Sair para o menu', acao: () => { encerrar(); menuPrincipal(); } },
      ],
      voltar: continuar,
    });
  }

  function continuar() {
    modo = 'jogo';
    mostrarTela('jogo');
    Voz.falar('Continuando.', { depois: () => { if (jogo && jogo.pausado) jogo.continuar(); } });
  }

  // ---------- Desenho (para quem enxerga ou tem baixa visão) ----------
  function mostrarPenaltis(d) {
    const g = d.cobrancas.map((l) => l.filter(Boolean).length);
    $('placar-texto').textContent = 'Você ' + g[0] + ' x ' + g[1] + ' Computador';
    const linha = (l) => {
      const total = Math.max(5, d.cobrancas[0].length, d.cobrancas[1].length);
      let s = '';
      for (let i = 0; i < total; i++) s += i < l.length ? (l[i] ? '⚽' : '❌') : '⚪';
      return s;
    };
    $('pen-voce').textContent = linha(d.cobrancas[0]);
    $('pen-cpu').textContent = linha(d.cobrancas[1]);
    $('pen-vez').textContent = d.vez === 0 ? '👟 Você bate' : '🧤 Você defende';
  }

  function desenharCampo(j) {
    const c = $('campo');
    const g = c.getContext('2d');
    const s = c.width / PartidaGuizo.LARG;
    g.fillStyle = '#1b5e20';
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 4;
    g.strokeRect(2, 2, c.width - 4, c.height - 4);
    g.beginPath(); g.moveTo(0, c.height / 2); g.lineTo(c.width, c.height / 2); g.stroke();
    g.fillStyle = '#ffffff';
    g.fillRect(PartidaGuizo.GOL0 * s, 0, (PartidaGuizo.GOL1 - PartidaGuizo.GOL0) * s, 10);
    g.fillRect(PartidaGuizo.GOL0 * s, c.height - 10, (PartidaGuizo.GOL1 - PartidaGuizo.GOL0) * s, 10);
    const bolinha = (o, r, cor, texto) => {
      g.fillStyle = cor;
      g.beginPath(); g.arc(o.x * s, o.y * s, r, 0, Math.PI * 2); g.fill();
      g.lineWidth = 3; g.strokeStyle = '#000'; g.stroke();
      if (texto) {
        g.fillStyle = '#fff'; g.font = 'bold 18px Verdana, sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(texto, o.x * s, o.y * s);
      }
    };
    bolinha(j.gkAdv, 16, '#ef5350', '');
    bolinha(j.gkMeu, 16, '#42a5f5', '');
    bolinha(j.adv, 22, '#e53935', 'PC');
    bolinha(j.eu, 22, '#1e63d6', 'EU');
    bolinha(j.bola, 12, '#ffeb3b', '');
    const t = Math.ceil(j.tempo);
    $('placar-texto').textContent = 'Você ' + j.placar[0] + ' x ' + j.placar[1] + ' Computador   ⏱️ ' +
      Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
  }

  // ---------- Teclado ----------
  const TECLAS_JOGO = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter'];
  window.addEventListener('keydown', (e) => {
    const k = e.code;
    if (TECLAS_JOGO.includes(k) || k === 'Escape') e.preventDefault();
    if (modo === 'inicio') {
      if (k === 'Space' || k === 'Enter') {
        Sons.preparar();
        Sons.ok();
        menuPrincipal(true);
      }
      return;
    }
    if (e.repeat && modo !== 'jogo') return;
    if (modo === 'menu') {
      if (k === 'ArrowDown' || k === 'ArrowRight') moverMenu(1);
      else if (k === 'ArrowUp' || k === 'ArrowLeft') moverMenu(-1);
      else if (k === 'Enter' || k === 'Space') escolher();
      else if (k === 'Escape' && menu.voltar) { Sons.menu(); menu.voltar(); }
      else if (k === 'KeyR') Voz.falar(menu.titulo + '. ' + textoItem());
      else if (/^(Digit|Numpad)[1-9]$/.test(k)) {
        const n = Number(k.slice(-1)) - 1;
        if (n < menu.itens.length) { menu.indice = n; desenharMenu(); escolher(); }
      }
      return;
    }
    if (modo === 'roteiro') {
      if (k === 'Escape' || k === 'Enter' || k === 'Space') { Voz.parar(); menuPrincipal(); }
      return;
    }
    if (modo === 'jogo' && jogo) {
      if (k === 'Escape') { pausar(); return; }
      if (e.repeat) return;
      jogo.tecla(k, true);
    }
  });
  window.addEventListener('keyup', (e) => {
    if (modo === 'jogo' && jogo && jogo.tecla) jogo.tecla(e.code, false);
  });

  // clique no botão grande da tela inicial também começa (ajuda o professor)
  $('btn-comecar').addEventListener('click', () => { Sons.preparar(); Sons.ok(); menuPrincipal(true); });

  // trocou de janela: pausa
  window.addEventListener('blur', () => { if (modo === 'jogo') pausar(); });

  // a tela inicial avisa (para quem enxerga) se este computador não tem voz em português
  setTimeout(() => { if (!Voz.temPortugues()) $('aviso-voz').hidden = false; }, 1500);
})();
