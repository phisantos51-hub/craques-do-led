// Cores, nomes inventados e o desenho dos jogadores (meninas e meninos).
const Visual = (() => {
  const CAMISAS = [
    { cor: '#e53935', nome: 'Vermelho' },
    { cor: '#fb8c00', nome: 'Laranja' },
    { cor: '#fdd835', nome: 'Amarelo' },
    { cor: '#43a047', nome: 'Verde' },
    { cor: '#29b6f6', nome: 'Azul-claro' },
    { cor: '#1e5bd6', nome: 'Azul' },
    { cor: '#8e24aa', nome: 'Roxo' },
    { cor: '#ec407a', nome: 'Rosa' },
    { cor: '#263238', nome: 'Preto' },
    { cor: '#fafafa', nome: 'Branco' },
  ];
  const CALCOES = [
    { cor: '#fafafa', nome: 'Branco' },
    { cor: '#212121', nome: 'Preto' },
    { cor: '#1a237e', nome: 'Azul-marinho' },
    { cor: '#9e9e9e', nome: 'Cinza' },
    { cor: '#fdd835', nome: 'Amarelo' },
    { cor: '#c62828', nome: 'Vermelho' },
  ];
  const PELES = ['#f9d7b9', '#f1c27d', '#e0ac69', '#c68642', '#a0662f', '#8d5524', '#6b3e1d'];
  const CABELOS = ['#1b1b1b', '#2e1b10', '#5a3519', '#8b4a22', '#c98b2f', '#e8c46a', '#b5482a'];
  const ESTILOS_MENINA = ['rabo', 'trancas', 'coque', 'puffs', 'longo'];
  const ESTILOS_MENINO = ['curto', 'black', 'raspado', 'topete', 'curto'];
  const LACOS = ['#ff4081', '#ffeb3b', '#00e5ff', '#76ff03', '#ffffff', '#b388ff'];

  const BICHOS = ['Foguetes', 'Corujas', 'Dragões', 'Raios', 'Abelhas', 'Cometas', 'Pinguins',
    'Furacões', 'Golfinhos', 'Estrelas', 'Panteras', 'Tatus', 'Saguis', 'Jacarés', 'Araras',
    'Tucanos', 'Vaga-lumes', 'Capivaras', 'Polvos', 'Robôs', 'Unicórnios', 'Lagartixas'];
  const COMPLEMENTOS = ['do Recreio', 'da Lua', 'do Pátio', 'Turbo', 'da Floresta', 'do Sol',
    'Relâmpago', 'do Espaço', 'da Praia', 'do Arco-Íris', 'do LED', 'da Nuvem'];

  const sorteio = (lista) => lista[Math.floor(Math.random() * lista.length)];

  function nomeTime(evitar) {
    for (let i = 0; i < 50; i++) {
      const nome = sorteio(BICHOS) + ' ' + sorteio(COMPLEMENTOS);
      if (nome.length <= 20 && nome !== evitar) return nome;
    }
    return 'Time Turbo';
  }

  function criarVisual(menina) {
    return {
      menina,
      pele: sorteio(PELES),
      cabelo: sorteio(CABELOS),
      estilo: sorteio(menina ? ESTILOS_MENINA : ESTILOS_MENINO),
      laco: menina && Math.random() < 0.6 ? sorteio(LACOS) : null,
    };
  }

  // Cada time tem 3 atletas (goleiro + 2): sempre pelo menos uma menina e um menino.
  function elenco() {
    const generos = [true, false, Math.random() < 0.5];
    for (let i = generos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [generos[i], generos[j]] = [generos[j], generos[i]];
    }
    return generos.map(criarVisual);
  }

  function luminancia(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  const corTexto = (fundo) => (luminancia(fundo) > 0.6 ? '#1d2433' : '#ffffff');

  function distanciaCor(a, b) {
    const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
    const dr = ((x >> 16) & 255) - ((y >> 16) & 255);
    const dg = ((x >> 8) & 255) - ((y >> 8) & 255);
    const db = (x & 255) - (y & 255);
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  // Goleiro usa uma cor que não se confunde com nenhum dos dois times.
  function corGoleiro(camisas) {
    const opcoes = ['#c6ff00', '#00e5ff', '#ff6d00', '#ff80ab', '#b0bec5'];
    let melhor = opcoes[0], maior = -1;
    for (const c of opcoes) {
      const d = Math.min(...camisas.map((k) => distanciaCor(c, k)));
      if (d > maior) { maior = d; melhor = c; }
    }
    return melhor;
  }

  function escurecer(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function retArredondado(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function circulo(ctx, x, y, r, cor) {
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function cabeloAtras(ctx, v) {
    const c = v.cabelo;
    switch (v.estilo) {
      case 'longo':
        ctx.fillStyle = c;
        retArredondado(ctx, -12, -26, 24, 22, 7);
        ctx.fill();
        break;
      case 'rabo':
        circulo(ctx, 0, -9, 6, c);
        circulo(ctx, 0, -3, 4.5, c);
        break;
      case 'trancas':
        for (const lado of [-1, 1]) {
          circulo(ctx, lado * 11, -14, 4, c);
          circulo(ctx, lado * 11.5, -8, 3.6, c);
          circulo(ctx, lado * 12, -3, 3.2, c);
          circulo(ctx, lado * 12, 1, 2.2, v.laco || '#ff4081');
        }
        break;
      case 'black':
        circulo(ctx, 0, -22, 14, c);
        break;
      case 'puffs':
        circulo(ctx, -10, -28, 6.5, c);
        circulo(ctx, 10, -28, 6.5, c);
        break;
      case 'coque':
        circulo(ctx, 0, -31, 6, c);
        break;
      default:
        break;
    }
  }

  function cabeloFrente(ctx, v) {
    const c = v.cabelo;
    ctx.fillStyle = c;
    if (v.estilo === 'raspado') {
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(0, -19, 10.4, Math.PI * 1.05, Math.PI * 1.95);
      ctx.lineTo(0, -24);
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }
    ctx.beginPath();
    ctx.arc(0, -19, 10.6, Math.PI * 1.02, Math.PI * 1.98);
    ctx.quadraticCurveTo(4, -22, 0, -21);
    ctx.quadraticCurveTo(-5, -23, -10.5, -20);
    ctx.fill();
    if (v.estilo === 'topete') circulo(ctx, -2, -29, 4.5, c);
    if (v.estilo === 'black') circulo(ctx, 0, -27, 9, c);
    if (v.laco && v.estilo !== 'trancas') {
      const x = v.estilo === 'coque' ? 0 : 7, y = v.estilo === 'coque' ? -26 : -27;
      ctx.fillStyle = v.laco;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 6, y - 4); ctx.lineTo(x - 6, y + 4); ctx.closePath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 6, y - 4); ctx.lineTo(x + 6, y + 4); ctx.closePath();
      ctx.fill();
      circulo(ctx, x, y, 2, escurecer(v.laco, 0.8));
    }
  }

  // Desenha um atleta com os pés perto de (x, y + 14). o = { visual, camisa, calcao, ... }
  function jogador(ctx, x, y, o) {
    const v = o.visual;
    const s = o.escala || 1;
    const passo = Math.sin(o.fase || 0);
    const olhar = Math.max(-1, Math.min(1, o.olhar || 0));
    const luvas = o.luvas || null;
    ctx.save();
    ctx.translate(x, y);
    if (o.giro) ctx.rotate(o.giro);
    ctx.scale(s, s);

    if (!o.semSombra) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 15, 13, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // pernas e chuteiras
    ctx.fillStyle = v.pele;
    ctx.fillRect(-7, 6, 5, 6 + passo * 2);
    ctx.fillRect(2, 6, 5, 6 - passo * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-7, 10 + passo * 2, 5, 3);
    ctx.fillRect(2, 10 - passo * 2, 5, 3);
    ctx.fillStyle = '#222';
    ctx.fillRect(-8, 12.5 + passo * 2, 7, 3);
    ctx.fillRect(1, 12.5 - passo * 2, 7, 3);

    // calção
    ctx.fillStyle = o.calcao;
    retArredondado(ctx, -10, 1, 20, 8, 2.5);
    ctx.fill();

    // braços
    const contorno = escurecer(o.camisa, 0.7);
    if (o.bracosCima) {
      for (const lado of [-1, 1]) {
        ctx.fillStyle = o.camisa;
        ctx.fillRect(lado > 0 ? 9 : -14, -18, 5, 10);
        circulo(ctx, lado * 11.5, -20, 4.2, luvas || v.pele);
      }
    } else {
      for (const lado of [-1, 1]) {
        const dy = lado * passo * 2;
        ctx.fillStyle = o.camisa;
        ctx.fillRect(lado > 0 ? 9 : -14, -9 + dy, 5, 6);
        circulo(ctx, lado * 11.5, -1 + dy, 3.8, luvas || v.pele);
      }
    }

    // camisa
    ctx.fillStyle = o.camisa;
    retArredondado(ctx, -11, -11, 22, 15, 5);
    ctx.fill();
    ctx.strokeStyle = contorno;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (o.numero) {
      ctx.fillStyle = corTexto(o.camisa);
      ctx.font = 'bold 9px Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(o.numero), 0, -3.5);
    }

    // cabeça
    cabeloAtras(ctx, v);
    circulo(ctx, 0, -19, 10, v.pele);
    cabeloFrente(ctx, v);
    // rosto
    const ox = olhar * 2;
    circulo(ctx, -3.6 + ox, -17.5, 1.7, '#1d1d1d');
    circulo(ctx, 3.6 + ox, -17.5, 1.7, '#1d1d1d');
    ctx.fillStyle = 'rgba(255,120,140,0.45)';
    ctx.beginPath(); ctx.arc(-6 + ox, -14.5, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6 + ox, -14.5, 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5a2a1a';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(ox, -14.5, o.feliz ? 3.2 : 2.4, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    ctx.restore();
  }

  function bola(ctx, x, y, r, giro) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(giro || 0);
    circulo(ctx, 0, 0, r, '#ffffff');
    ctx.fillStyle = '#222';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * r * 0.38, Math.sin(a) * r * 0.38);
    }
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#333';
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Confete simples, desenhado no canvas
  function criarConfete(lista, x, y, cores, quantos) {
    for (let i = 0; i < quantos; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 120 + Math.random() * 320;
      lista.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 200,
        giro: Math.random() * 6,
        vg: (Math.random() - 0.5) * 12,
        cor: cores[i % cores.length],
        vida: 2 + Math.random() * 1.5,
      });
    }
  }
  function atualizarConfete(lista, dt) {
    for (let i = lista.length - 1; i >= 0; i--) {
      const c = lista[i];
      c.vy += 420 * dt;
      c.vx *= 0.99;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.giro += c.vg * dt;
      c.vida -= dt;
      if (c.vida <= 0) lista.splice(i, 1);
    }
  }
  function desenharConfete(ctx, lista) {
    for (const c of lista) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.giro);
      ctx.fillStyle = c.cor;
      ctx.fillRect(-5, -3, 10, 6);
      ctx.restore();
    }
  }

  // Previa de um time (3 atletas) num canvas pequeno
  function previaTime(canvas, time) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#43a047';
    for (let i = 0; i < canvas.width; i += 40) ctx.fillRect(i, 0, 20, canvas.height);
    const gk = corGoleiro([time.camisa]);
    const xs = [canvas.width * 0.2, canvas.width * 0.5, canvas.width * 0.8];
    time.visuais.forEach((v, i) => {
      jogador(ctx, xs[i], canvas.height * 0.56, {
        visual: v,
        camisa: i === 0 ? gk : time.camisa,
        calcao: time.calcao,
        escala: 1.6,
        numero: i === 0 ? 1 : i * 5 + 2,
        luvas: i === 0 ? '#ffffff' : null,
        feliz: true,
      });
    });
  }

  return {
    CAMISAS, CALCOES, nomeTime, elenco, corTexto, corGoleiro, escurecer,
    retArredondado, circulo, jogador, bola, previaTime,
    criarConfete, atualizarConfete, desenharConfete,
  };
})();
