// Disputa de pênaltis só com o mouse. 5 cobranças para cada lado e morte súbita.
const Penaltis = (() => {
  const W = 960, H = 600;
  const GX0 = 230, GX1 = 730, GYT = 110, GYB = 370;
  const BOLA0 = { x: W / 2, y: 540, r: 26 };
  const GK_X = W / 2, GK_Y = GYB - 46;
  const ESCALA_GK = 3.2;

  // Chance do goleiro do computador adivinhar o canto / do batedor do computador errar o gol
  const NIVEL = {
    facil: { adivinha: 0.1, erra: 0.22 },
    medio: { adivinha: 0.25, erra: 0.1 },
    dificil: { adivinha: 0.4, erra: 0.04 },
  };

  function zonaDe(x, y) {
    if (x < GX0 || x > GX1 || y < GYT || y > GYB) return -1;
    const col = Math.min(2, Math.floor(((x - GX0) / (GX1 - GX0)) * 3));
    const lin = y < (GYT + GYB) / 2 ? 0 : 1;
    return lin * 3 + col;
  }
  function centroZona(z) {
    const col = z % 3, lin = Math.floor(z / 3);
    const w = (GX1 - GX0) / 3;
    return { x: GX0 + w * col + w / 2, y: lin ? GYB - 60 : GYT + 60 };
  }

  // Decide se a disputa acabou. Retorna 0 ou 1 (vencedor) ou -1 (continua).
  function vencedor(cobrancas) {
    const [a, b] = cobrancas;
    const ga = a.filter(Boolean).length, gb = b.filter(Boolean).length;
    if (a.length <= 5 && b.length <= 5) {
      const ra = 5 - a.length, rb = 5 - b.length;
      if (ga > gb + rb) return 0;
      if (gb > ga + ra) return 1;
      if (a.length === 5 && b.length === 5 && ga !== gb) return ga > gb ? 0 : 1;
      return -1;
    }
    if (a.length === b.length && ga !== gb) return ga > gb ? 0 : 1;
    return -1;
  }

  function desenharFundo() {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const ceu = g.createLinearGradient(0, 0, 0, 200);
    ceu.addColorStop(0, '#4fc3f7');
    ceu.addColorStop(1, '#b3e5fc');
    g.fillStyle = ceu;
    g.fillRect(0, 0, W, 200);
    // arquibancada com torcida colorida
    g.fillStyle = '#5c6bc0';
    g.fillRect(0, 40, W, 180);
    const cores = ['#ff5252', '#ffd740', '#40c4ff', '#69f0ae', '#ff80ab', '#b388ff', '#ffffff', '#ffab40'];
    let k = 7;
    for (let y = 55; y < 215; y += 16) {
      for (let x = 6 + (y % 32 ? 8 : 0); x < W; x += 16) {
        k = (k * 31 + 17) % 97;
        Visual.circulo(g, x, y, 5, cores[k % cores.length]);
      }
    }
    g.fillStyle = '#3949ab';
    g.fillRect(0, 210, W, 14);
    // grama em faixas
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#5cbf60' : '#4caf50';
      const y = 224 + i * 50;
      g.fillRect(0, y, W, 50);
    }
    // linhas da área em perspectiva
    g.strokeStyle = '#ffffff';
    g.lineWidth = 5;
    g.beginPath(); g.moveTo(0, GYB); g.lineTo(W, GYB); g.stroke();
    g.beginPath();
    g.moveTo(140, GYB); g.lineTo(60, 470); g.lineTo(900, 470); g.lineTo(820, GYB);
    g.stroke();
    g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(BOLA0.x, BOLA0.y + 18, 14, 5, 0, 0, Math.PI * 2); g.fill();
    // rede
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(GX0, GYT, GX1 - GX0, GYB - GYT);
    g.strokeStyle = 'rgba(255,255,255,0.55)';
    g.lineWidth = 1.5;
    for (let x = GX0; x <= GX1; x += 18) { g.beginPath(); g.moveTo(x, GYT); g.lineTo(x, GYB); g.stroke(); }
    for (let y = GYT; y <= GYB; y += 18) { g.beginPath(); g.moveTo(GX0, y); g.lineTo(GX1, y); g.stroke(); }
    // traves
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#9e9e9e';
    g.lineWidth = 2;
    g.fillRect(GX0 - 12, GYT - 12, 12, GYB - GYT + 12);
    g.fillRect(GX1, GYT - 12, 12, GYB - GYT + 12);
    g.fillRect(GX0 - 12, GYT - 12, GX1 - GX0 + 24, 12);
    g.strokeRect(GX0 - 12, GYT - 12, GX1 - GX0 + 24, GYB - GYT + 12);
    return c;
  }

  class Disputa {
    // cfg: { dois: bool, dificuldade, times: [time, time] }
    // cb: { placar(cobrancas), faixa(texto), aviso(icone, titulo, texto, botao, depois), fim(cobrancas, vencedor) }
    constructor(canvas, cfg, cb) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.cfg = cfg;
      this.cb = cb;
      this.nivel = NIVEL[cfg.dificuldade] || NIVEL.medio;
      this.fundo = desenharFundo();
      this.cobrancas = [[], []];
      this.vez = 0;
      this.fase = 'espera';
      this.mouse = { x: -100, y: -100 };
      this.confete = [];
      this.anim = 0;
      this.pausado = false;
      this.vivo = true;
      this.ultimo = 0;

      this.aoMover = (e) => { this.mouse = this.coord(e); };
      this.aoClicar = (e) => this.clique(this.coord(e));
      canvas.addEventListener('mousemove', this.aoMover);
      canvas.addEventListener('mousedown', this.aoClicar);
      this.loop = (t) => this.quadro(t);
      requestAnimationFrame(this.loop);
      this.cb.placar(this.cobrancas);
      this.proxima();
    }

    coord(e) {
      const r = this.canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
    }

    nome(t) { return this.cfg.times[t].nome; }

    proxima() {
      const s = this.vez, k = 1 - s;
      this.zonaGk = -1;
      this.alvo = null;
      this.resultado = null;
      this.t = 0;
      if (!this.cfg.dois) {
        if (s === 0) {
          this.fase = 'mira';
          this.cb.faixa('👟 Clique no gol onde você quer chutar!');
        } else {
          this.fase = 'goleiro';
          this.cb.faixa('🧤 Você é o goleiro! Clique para onde pular.');
        }
        return;
      }
      this.fase = 'espera';
      this.cb.faixa('');
      this.cb.aviso('🧤', 'Vez do goleiro!',
        'Goleiro do time ' + this.nome(k) + ': escolha para onde pular. 🙈 Batedor do time ' + this.nome(s) + ': não olhe!',
        '👍 Ok', () => {
          this.fase = 'goleiro';
          this.cb.faixa('🧤 Goleiro do time ' + this.nome(k) + ': clique para onde pular.');
        });
    }

    clique(m) {
      if (this.pausado) return;
      const z = zonaDe(m.x, m.y);
      if (z < 0) return;
      if (this.fase === 'goleiro') {
        this.zonaGk = z;
        Som.clique();
        if (this.cfg.dois) {
          this.fase = 'espera';
          this.cb.faixa('');
          this.cb.aviso('🤫', 'O goleiro já escolheu!',
            'Agora é a vez do batedor do time ' + this.nome(this.vez) + '. Pode olhar! 👀',
            '👟 Vou chutar!', () => {
              this.fase = 'mira';
              this.cb.faixa('👟 Batedor do time ' + this.nome(this.vez) + ': clique no gol para chutar!');
            });
        } else {
          this.chuteComputador();
        }
      } else if (this.fase === 'mira') {
        if (!this.cfg.dois) this.goleiroComputador(z);
        this.iniciarChute({ x: m.x, y: m.y, zona: z });
      }
    }

    goleiroComputador(zonaChute) {
      if (Math.random() < this.nivel.adivinha) { this.zonaGk = zonaChute; return; }
      let z;
      do { z = Math.floor(Math.random() * 6); } while (z === zonaChute);
      this.zonaGk = z;
    }

    chuteComputador() {
      if (Math.random() < this.nivel.erra) {
        const lado = Math.random() < 0.5 ? -1 : 1;
        const alto = Math.random() < 0.5;
        const alvo = alto
          ? { x: W / 2 + lado * Math.random() * 200, y: GYT - 60, zona: -1 }
          : { x: lado < 0 ? GX0 - 70 : GX1 + 70, y: GYB - 70, zona: -1 };
        this.iniciarChute(alvo);
        return;
      }
      const z = Math.floor(Math.random() * 6);
      const c = centroZona(z);
      this.iniciarChute({ x: c.x + (Math.random() - 0.5) * 60, y: c.y + (Math.random() - 0.5) * 40, zona: z });
    }

    iniciarChute(alvo) {
      this.alvo = alvo;
      this.fase = 'chute';
      this.t = 0;
      this.cb.faixa('');
      const z = alvo.zona;
      if (z < 0) this.resultado = 'fora';
      else if (z === this.zonaGk) this.resultado = 'defesa';
      else if (z % 3 === this.zonaGk % 3 && Math.random() < 0.35) this.resultado = 'defesa';
      else this.resultado = 'gol';
      Som.chute();
    }

    terminarChute() {
      const gol = this.resultado === 'gol';
      this.cobrancas[this.vez].push(gol);
      this.cb.placar(this.cobrancas);
      if (gol) {
        const t = this.cfg.times[this.vez];
        Visual.criarConfete(this.confete, this.alvo.x, this.alvo.y, [t.camisa, t.calcao, '#ffd740', '#ff4081', '#40c4ff'], 80);
        Som.torcida();
      } else {
        Som.defesa();
      }
      this.fase = 'resultado';
      this.t = 0;
    }

    depoisDoResultado() {
      const v = vencedor(this.cobrancas);
      if (v >= 0) {
        this.fase = 'fim';
        Som.apitoFinal();
        setTimeout(() => { if (this.vivo) this.cb.fim(this.cobrancas, v); }, 900);
        return;
      }
      this.vez = 1 - this.vez;
      this.proxima();
    }

    pausar() { this.pausado = true; }
    continuar() { this.pausado = false; this.ultimo = 0; }

    destruir() {
      this.vivo = false;
      this.canvas.removeEventListener('mousemove', this.aoMover);
      this.canvas.removeEventListener('mousedown', this.aoClicar);
    }

    quadro(ts) {
      if (!this.vivo) return;
      const dt = this.ultimo ? Math.min(0.05, (ts - this.ultimo) / 1000) : 0;
      this.ultimo = ts;
      if (!this.pausado) {
        this.anim += dt;
        Visual.atualizarConfete(this.confete, dt);
        if (this.fase === 'chute') {
          this.t += dt / 0.7;
          if (this.t >= 1) { this.t = 1; this.terminarChute(); }
        } else if (this.fase === 'resultado') {
          this.t += dt;
          if (this.t > 1.8) this.depoisDoResultado();
        }
      }
      this.desenhar();
      this.canvas.style.cursor = (this.fase === 'mira' || this.fase === 'goleiro') && zonaDe(this.mouse.x, this.mouse.y) >= 0 ? 'pointer' : 'default';
      requestAnimationFrame(this.loop);
    }

    // posição do goleiro: progresso p (0 a 1) do pulo para a zona z
    poseGoleiro(p) {
      const z = this.zonaGk;
      if (z < 0 || p <= 0) return { x: GK_X, y: GK_Y + Math.sin(this.anim * 3) * 2, giro: 0, cima: false };
      const col = z % 3, lin = Math.floor(z / 3);
      const e = 1 - Math.pow(1 - Math.min(1, p), 3);
      if (col === 1) {
        return { x: GK_X, y: GK_Y - (lin ? 0 : 70) * Math.sin(e * Math.PI * 0.5), giro: 0, cima: true, agacha: lin === 1 };
      }
      const lado = col === 0 ? -1 : 1;
      return {
        x: GK_X + lado * 165 * e,
        y: GK_Y - (lin ? 0 : 75) * e + (lin ? 25 : 0) * e,
        giro: lado * (lin ? 1.35 : 1.0) * e,
        cima: true,
      };
    }

    posBola() {
      const a = this.alvo;
      if (!a || this.fase === 'mira' || this.fase === 'goleiro' || this.fase === 'espera') {
        return { x: BOLA0.x, y: BOLA0.y, r: BOLA0.r };
      }
      const defesa = this.resultado === 'defesa';
      const tFinal = this.fase === 'chute' ? this.t : 1;
      const corte = defesa ? 0.85 : 1;
      const tt = Math.min(tFinal, corte);
      const x = BOLA0.x + (a.x - BOLA0.x) * tt;
      const y = BOLA0.y + (a.y - BOLA0.y) * tt - Math.sin(Math.PI * tt) * 40;
      const r = BOLA0.r - (BOLA0.r - 13) * tt;
      if (defesa && this.fase === 'resultado') {
        // bola espirra para fora depois da defesa
        const k = Math.min(1, this.t / 0.6);
        const lado = a.x < W / 2 ? -1 : 1;
        return { x: x + lado * 220 * k, y: y + (440 - y) * k - Math.sin(Math.PI * k) * 80, r: r + 6 * k };
      }
      if (this.resultado === 'gol' && this.fase === 'resultado') {
        return { x, y: y + Math.min(1, this.t * 2) * 8, r };
      }
      return { x, y, r };
    }

    desenhar() {
      const g = this.ctx;
      g.drawImage(this.fundo, 0, 0);
      const goleiroTime = this.cfg.times[1 - this.vez];

      // dicas de onde clicar
      if (this.fase === 'mira' || this.fase === 'goleiro') {
        const zm = zonaDe(this.mouse.x, this.mouse.y);
        for (let z = 0; z < 6; z++) {
          const c = centroZona(z);
          g.save();
          g.setLineDash([10, 8]);
          g.lineWidth = 4;
          g.strokeStyle = 'rgba(255,255,255,0.9)';
          g.fillStyle = z === zm ? (this.fase === 'mira' ? 'rgba(255,214,0,0.55)' : 'rgba(0,229,255,0.5)') : 'rgba(255,255,255,0.15)';
          g.beginPath(); g.arc(c.x, c.y, 46, 0, Math.PI * 2); g.fill(); g.stroke();
          g.restore();
          if (z === zm) {
            g.font = '44px sans-serif';
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.fillText(this.fase === 'mira' ? '🎯' : '🧤', c.x, c.y);
          }
        }
      }

      // goleiro
      const p = this.fase === 'chute' ? (this.t - 0.1) / 0.55 : (this.fase === 'resultado' || this.fase === 'fim') ? 1 : 0;
      const pose = this.poseGoleiro(this.fase === 'goleiro' ? 0 : p);
      g.save();
      g.translate(pose.x, pose.y);
      if (pose.agacha) g.scale(1.1, 0.85);
      Visual.jogador(g, 0, 0, {
        visual: goleiroTime.visuais[0],
        camisa: goleiroTime.camisa,
        calcao: goleiroTime.calcao,
        escala: ESCALA_GK,
        giro: pose.giro,
        luvas: '#ffffff',
        bracosCima: pose.cima || this.fase !== 'espera',
        numero: 1,
        semSombra: pose.giro !== 0,
        feliz: this.fase === 'resultado' && this.resultado !== 'gol',
      });
      g.restore();

      // bola
      const b = this.posBola();
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.beginPath(); g.ellipse(b.x, Math.max(b.y + b.r * 0.8, GYB), b.r, b.r * 0.35, 0, 0, Math.PI * 2); g.fill();
      Visual.bola(g, b.x, b.y, b.r, this.fase === 'chute' ? this.t * 12 : 0);

      Visual.desenharConfete(g, this.confete);

      if (this.fase === 'resultado' || this.fase === 'fim') {
        const textos = { gol: 'GOOOL! ⚽', defesa: 'DEFENDEU! 🧤', fora: 'PRA FORA! 😮' };
        const cores = { gol: '#ffd740', defesa: '#40c4ff', fora: '#ff8a80' };
        const k = Math.min(1, this.t * 4);
        g.save();
        g.translate(W / 2, 470);
        g.scale(0.5 + k * 0.5, 0.5 + k * 0.5);
        g.font = 'bold 80px Verdana, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.lineWidth = 12;
        g.strokeStyle = '#1d2433';
        g.fillStyle = cores[this.resultado];
        g.strokeText(textos[this.resultado], 0, 0);
        g.fillText(textos[this.resultado], 0, 0);
        g.restore();
      }
    }
  }

  return { Disputa, vencedor };
})();
