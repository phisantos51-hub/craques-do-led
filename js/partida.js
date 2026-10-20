// Partida 3 contra 3 (goleiro + 2), campo visto de cima.
const Partida = (() => {
  const W = 960, H = 600;
  const X0 = 50, X1 = 910, Y0 = 40, Y1 = 560;
  const CX = W / 2, CY = (Y0 + Y1) / 2;
  const GOL_MEIO = 78;
  const GY0 = CY - GOL_MEIO, GY1 = CY + GOL_MEIO;
  const GOL_FUNDO = 34;
  const AREA_W = 130, AREA_H = 300;
  const PR = 15, BR = 8;

  // Quanto maior o número, mais rápido/esperto. "facil" é bem lento para os pequenos.
  const NIVEIS = {
    facil:   { vel: 85,  gkVel: 60,  gkPega: 0.3,  gkRebate: 0.35, reacao: 0.6,  erro: 130, chute: 420, rouba: 0.15, dominio: 0.3,  alcance: 220, ajuda: 1.0 },
    medio:   { vel: 145, gkVel: 120, gkPega: 0.55, gkRebate: 0.7,  reacao: 0.3,  erro: 75,  chute: 520, rouba: 0.4,  dominio: 0.6,  alcance: 290, ajuda: 0.6 },
    dificil: { vel: 182, gkVel: 165, gkPega: 0.75, gkRebate: 0.9,  reacao: 0.15, erro: 40,  chute: 610, rouba: 0.6,  dominio: 0.85, alcance: 330, ajuda: 0.3 },
  };
  // Colegas controlados pelo computador no time das crianças
  const COLEGA = { vel: 160, gkVel: 140, gkPega: 0.65, gkRebate: 0.85, reacao: 0.25, erro: 60, chute: 520, rouba: 0.45, dominio: 0.7, alcance: 300 };
  const HUMANO = { vel: 200, chute: 650, rouba: 0.8 };

  const TECLAS = [
    { cima: ['KeyW'], baixo: ['KeyS'], esq: ['KeyA'], dir: ['KeyD'], chute: ['Space'] },
    { cima: ['ArrowUp'], baixo: ['ArrowDown'], esq: ['ArrowLeft'], dir: ['ArrowRight'], chute: ['Enter', 'NumpadEnter'] },
  ];
  // No modo solo, a criança pode usar qualquer um dos dois conjuntos
  const TECLAS_SOLO = {
    cima: ['KeyW', 'ArrowUp'], baixo: ['KeyS', 'ArrowDown'], esq: ['KeyA', 'ArrowLeft'],
    dir: ['KeyD', 'ArrowRight'], chute: ['Space', 'Enter', 'NumpadEnter'],
  };

  const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function distSegmento(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = limitar(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
  }
  function normal(x, y) {
    const d = Math.hypot(x, y) || 1;
    return { x: x / d, y: y / d };
  }

  function desenharCampo() {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#2e7d32';
    g.fillRect(0, 0, W, H);
    // faixas de grama
    const faixas = 12, lw = (X1 - X0) / faixas;
    for (let i = 0; i < faixas; i++) {
      g.fillStyle = i % 2 ? '#5cbf60' : '#4caf50';
      g.fillRect(X0 + i * lw, Y0, lw + 1, Y1 - Y0);
    }
    // bolinhas coloridas na borda (alegria)
    const cores = ['#ff5252', '#ffd740', '#40c4ff', '#69f0ae', '#ff80ab', '#b388ff'];
    let k = 0;
    for (let x = 20; x < W; x += 34) {
      Visual.circulo(g, x, 16, 7, cores[k++ % cores.length]);
      Visual.circulo(g, x + 17, H - 16, 7, cores[k++ % cores.length]);
    }
    g.strokeStyle = '#ffffff';
    g.lineWidth = 4;
    g.strokeRect(X0, Y0, X1 - X0, Y1 - Y0);
    g.beginPath(); g.moveTo(CX, Y0); g.lineTo(CX, Y1); g.stroke();
    g.beginPath(); g.arc(CX, CY, 70, 0, Math.PI * 2); g.stroke();
    Visual.circulo(g, CX, CY, 5, '#fff');
    for (const lado of [0, 1]) {
      const linha = lado ? X1 : X0, s = lado ? -1 : 1;
      g.strokeRect(lado ? X1 - AREA_W : X0, CY - AREA_H / 2, AREA_W, AREA_H);
      g.strokeRect(lado ? X1 - 50 : X0, CY - 115, 50, 230);
      Visual.circulo(g, linha + s * 95, CY, 4, '#fff');
      g.beginPath();
      g.arc(linha + s * 95, CY, 60, lado ? Math.PI * 0.62 : -Math.PI * 0.38, lado ? Math.PI * 1.38 : Math.PI * 0.38);
      g.stroke();
      // gol com rede
      const gx = lado ? X1 : X0 - GOL_FUNDO;
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(gx, GY0, GOL_FUNDO, GY1 - GY0);
      g.save();
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      g.lineWidth = 1;
      for (let x = gx; x <= gx + GOL_FUNDO; x += 8) { g.beginPath(); g.moveTo(x, GY0); g.lineTo(x, GY1); g.stroke(); }
      for (let y = GY0; y <= GY1; y += 8) { g.beginPath(); g.moveTo(gx, y); g.lineTo(gx + GOL_FUNDO, y); g.stroke(); }
      g.restore();
      g.lineWidth = 5;
      g.strokeRect(gx, GY0, GOL_FUNDO, GY1 - GY0);
      Visual.circulo(g, linha, GY0, 6, '#fff');
      Visual.circulo(g, linha, GY1, 6, '#fff');
      g.lineWidth = 4;
    }
    return c;
  }

  class Jogo {
    // cfg: { modo: 'solo'|'dois', dificuldade, minutos, times: [time, time] }
    // cb: { tempo(seg), gol(timeQueMarcou, placar), fim(placar) }
    constructor(canvas, cfg, cb) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.cfg = cfg;
      this.cb = cb;
      this.humanos = [true, cfg.modo === 'dois'];
      this.ajuda = cfg.modo === 'solo' ? NIVEIS[cfg.dificuldade].ajuda : 0.6;
      this.campo = desenharCampo();
      this.placar = [0, 0];
      this.tempo = cfg.minutos * 60;
      this.estado = 'jogando';
      this.pausado = false;
      this.teclas = new Set();
      this.chutePedido = [false, false];
      this.controlado = [null, null];
      this.cdTroca = [0, 0];
      this.confete = [];
      this.anim = 0;
      this.congela = 0;
      this.timeSaida = 0;
      this.corGk = Visual.corGoleiro(cfg.times.map((t) => t.camisa));
      this.criarJogadores();
      this.bola = { x: CX, y: CY, vx: 0, vy: 0, dono: null, giro: 0, protecao: 0 };
      this.saida(Math.random() < 0.5 ? 0 : 1);

      this.aoApertar = (e) => this.tecla(e, true);
      this.aoSoltar = (e) => this.tecla(e, false);
      window.addEventListener('keydown', this.aoApertar);
      window.addEventListener('keyup', this.aoSoltar);
      this.vivo = true;
      this.ultimo = 0;
      this.loop = (t) => this.quadro(t);
      requestAnimationFrame(this.loop);
      Som.apito();
    }

    criarJogadores() {
      this.jogadores = [];
      for (let t = 0; t < 2; t++) {
        const time = this.cfg.times[t];
        const nivelCpu = this.humanos[t] ? COLEGA : NIVEIS[this.cfg.dificuldade];
        ['gk', 'fp', 'fp'].forEach((papel, i) => {
          this.jogadores.push({
            time: t, papel, faixa: i === 1 ? -1 : 1,
            sinal: t === 0 ? 1 : -1,
            nivel: nivelCpu,
            visual: time.visuais[i],
            numero: papel === 'gk' ? 1 : i * 5 + 2,
            x: 0, y: 0, vx: 0, vy: 0, dir: { x: t === 0 ? 1 : -1, y: 0 },
            fase: Math.random() * 6, pensa: 0, alvo: { x: CX, y: CY, corre: false },
            cdPega: 0, cdRouba: 0, atordoado: 0, segura: 0, humano: false,
          });
        });
      }
    }

    saida(time) {
      const b = this.bola;
      for (const p of this.jogadores) {
        const s = p.sinal, meuGol = p.time === 0 ? X0 : X1;
        p.vx = p.vy = 0;
        p.dir = { x: s, y: 0 };
        p.cdPega = p.cdRouba = p.atordoado = p.segura = 0;
        p.pensa = 0;
        if (p.papel === 'gk') { p.x = meuGol + s * 28; p.y = CY; continue; }
        if (p.time === time) {
          if (p.faixa === -1) { p.x = CX - s * (PR + BR); p.y = CY; }
          else { p.x = CX - s * 150; p.y = CY + 120; }
        } else {
          p.x = CX - s * 120;
          p.y = CY + p.faixa * 95;
        }
      }
      const comBola = this.jogadores.find((p) => p.time === time && p.papel === 'fp' && p.faixa === -1);
      b.dono = comBola;
      b.vx = b.vy = 0;
      b.protecao = 0.8;
      comBola.pensa = 0.6;
      this.timeSaida = time;
      this.congela = 0.9;
      this.controlado = [null, null];
    }

    tecla(e, apertou) {
      const codigo = e.code;
      const usadas = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'NumpadEnter'];
      if (!usadas.includes(codigo)) return;
      e.preventDefault();
      if (apertou) {
        if (!e.repeat && !this.pausado) {
          if (this.cfg.modo === 'solo') {
            if (TECLAS_SOLO.chute.includes(codigo)) this.chutePedido[0] = true;
          } else {
            TECLAS.forEach((m, n) => { if (m.chute.includes(codigo)) this.chutePedido[n] = true; });
          }
        }
        this.teclas.add(codigo);
      } else {
        this.teclas.delete(codigo);
      }
    }

    pausar() { this.pausado = true; this.teclas.clear(); }
    continuar() { this.pausado = false; this.ultimo = 0; this.teclas.clear(); }

    destruir() {
      this.vivo = false;
      window.removeEventListener('keydown', this.aoApertar);
      window.removeEventListener('keyup', this.aoSoltar);
    }

    quadro(t) {
      if (!this.vivo) return;
      const dt = this.ultimo ? Math.min(0.05, (t - this.ultimo) / 1000) : 0;
      this.ultimo = t;
      if (!this.pausado) this.atualizar(dt);
      this.desenhar();
      requestAnimationFrame(this.loop);
    }

    atualizar(dt) {
      this.anim += dt;
      Visual.atualizarConfete(this.confete, dt);
      if (this.estado === 'gol') {
        this.golTimer -= dt;
        for (const p of this.jogadores) p.fase += dt * 8;
        if (this.golTimer <= 0) {
          this.estado = 'jogando';
          this.saida(1 - this.ultimoGol);
          Som.apito();
        }
        return;
      }
      if (this.estado === 'fim') {
        this.fimTimer -= dt;
        if (this.fimTimer <= 0 && !this.avisouFim) {
          this.avisouFim = true;
          this.cb.fim(this.placar.slice());
        }
        return;
      }

      this.tempo -= dt;
      if (this.tempo <= 0) {
        this.tempo = 0;
        this.estado = 'fim';
        this.fimTimer = 1.6;
        this.bola.dono = null;
        for (const p of this.jogadores) p.vx = p.vy = 0;
        Som.apitoFinal();
      }
      this.cb.tempo(this.tempo);
      if (this.congela > 0) this.congela -= dt;

      this.trocarControlado(dt);
      for (const p of this.jogadores) {
        p.cdPega = Math.max(0, p.cdPega - dt);
        p.cdRouba = Math.max(0, p.cdRouba - dt);
        if (p.humano) this.controleHumano(p);
        else this.ia(p, dt);
      }
      this.chutePedido = [false, false];
      this.mover(dt);
      this.atualizarBola(dt);
    }

    trocarControlado(dt) {
      const b = this.bola;
      for (let t = 0; t < 2; t++) {
        if (!this.humanos[t]) continue;
        const linha = this.jogadores.filter((p) => p.time === t && p.papel === 'fp');
        let atual = this.controlado[t];
        this.cdTroca[t] -= dt;
        if (b.dono && b.dono.time === t && b.dono.papel === 'fp') {
          atual = b.dono;
        } else {
          const perto = linha.reduce((a, p) => (dist(p, b) < dist(a, b) ? p : a));
          if (!atual) atual = perto;
          else if (perto !== atual && this.cdTroca[t] <= 0 && dist(perto, b) < dist(atual, b) - 35) {
            atual = perto;
            this.cdTroca[t] = 0.35;
          }
        }
        for (const p of linha) {
          if (p.humano && p !== atual) p.pensa = 0;
          p.humano = p === atual;
        }
        this.controlado[t] = atual;
      }
    }

    controleHumano(p) {
      const m = this.cfg.modo === 'solo' ? TECLAS_SOLO : TECLAS[p.time];
      const k = this.teclas;
      const tem = (lista) => lista.some((c) => k.has(c));
      let dx = (tem(m.dir) ? 1 : 0) - (tem(m.esq) ? 1 : 0);
      let dy = (tem(m.baixo) ? 1 : 0) - (tem(m.cima) ? 1 : 0);
      if (p.atordoado > 0) { dx = 0; dy = 0; p.atordoado -= 1 / 60; }
      if (dx || dy) {
        const d = normal(dx, dy);
        p.vx = d.x * HUMANO.vel;
        p.vy = d.y * HUMANO.vel;
        p.dir = d;
      } else {
        p.vx = 0; p.vy = 0;
      }
      if (!this.chutePedido[p.time]) return;
      const b = this.bola;
      if (b.dono === p) {
        this.chutar(p, this.mira(p, p.dir), HUMANO.chute);
      } else if (!b.dono && dist(p, b) < PR + BR + 14 && p.cdPega <= 0) {
        this.chutar(p, this.mira(p, p.dir), HUMANO.chute);
      } else if (b.dono && b.dono.time !== p.time && b.dono.papel !== 'gk' && dist(p, b.dono) < PR * 2 + 16) {
        this.roubar(p, b.dono, 0.9);
      }
    }

    // Ajuda de mira: se a criança chuta mais ou menos na direção do gol, a bola vai no gol.
    mira(p, dir) {
      const golX = p.time === 0 ? X1 : X0;
      const paraGol = normal(golX - p.x, CY - p.y);
      const distGol = Math.abs(golX - p.x);
      if (dir.x * paraGol.x + dir.y * paraGol.y < 0.55 || distGol > 520 || !this.ajuda) return dir;
      const t = (golX - p.x) / (dir.x || 0.0001);
      let y = p.y + dir.y * t;
      y = limitar(y, GY0 + 20, GY1 - 20);
      const certo = normal(golX - p.x, y - p.y);
      return normal(lerp(dir.x, certo.x, this.ajuda), lerp(dir.y, certo.y, this.ajuda));
    }

    chutar(p, dir, forca) {
      const b = this.bola;
      b.dono = null;
      b.x = p.x + dir.x * (PR + BR);
      b.y = p.y + dir.y * (PR + BR);
      b.vx = dir.x * forca;
      b.vy = dir.y * forca;
      b.chute = (b.chute || 0) + 1;
      // quem chuta não pega a própria bola de volta na hora
      if (p.papel === 'gk') p.falhou = b.chute;
      else p.cdPega = 0.35;
      p.dir = dir;
      Som.chute();
    }

    roubar(ladrao, dono, chance) {
      const b = this.bola;
      if (ladrao.cdRouba > 0 || b.protecao > 0) return;
      ladrao.cdRouba = 0.5;
      if (Math.random() < chance) {
        b.dono = ladrao;
        b.protecao = 0.5;
        if (ladrao.papel === 'gk') ladrao.segura = 0.8;
        dono.cdPega = 0.6;
        dono.atordoado = 0.35;
        ladrao.pensa = ladrao.nivel.reacao + 0.15;
      }
    }

    // ---------- Computador ----------
    ia(p, dt) {
      if (this.congela > 0 && p.time !== this.timeSaida) { p.vx = p.vy = 0; return; }
      if (p.atordoado > 0) { p.atordoado -= dt; p.vx *= 0.85; p.vy *= 0.85; return; }
      p.pensa -= dt;
      if (p.papel === 'gk') { this.iaGoleiro(p, dt); return; }
      if (this.bola.dono === p) { this.iaComBola(p); return; }
      if (p.pensa <= 0) {
        p.pensa = p.nivel.reacao * (0.7 + Math.random() * 0.6);
        p.alvo = this.alvoSemBola(p);
      }
      this.irPara(p, p.alvo.x, p.alvo.y, p.nivel.vel * (p.alvo.corre ? 1 : 0.75));
      // marca quem está com a bola
      const b = this.bola;
      if (b.dono && b.dono.time !== p.time && b.dono.papel !== 'gk' && dist(p, b.dono) < PR * 2 + 6) {
        this.roubar(p, b.dono, p.nivel.rouba);
      }
    }

    perseguidor(t) {
      if (this.humanos[t] && this.controlado[t]) return this.controlado[t];
      const b = this.bola;
      const linha = this.jogadores.filter((p) => p.time === t && p.papel === 'fp');
      return linha.reduce((a, p) => (dist(p, b) < dist(a, b) ? p : a));
    }

    alvoSemBola(p) {
      const b = this.bola, s = p.sinal, meuGol = p.time === 0 ? X0 : X1;
      if (b.dono && b.dono.time === p.time) {
        return { x: limitar(b.dono.x + s * 150, X0 + AREA_W + 40, X1 - AREA_W - 40), y: CY + p.faixa * 135, corre: true };
      }
      if (this.perseguidor(p.time) === p) {
        return { x: b.x + b.vx * 0.25, y: b.y + b.vy * 0.25, corre: true };
      }
      return { x: lerp(meuGol, b.x, 0.5), y: lerp(CY, b.y, 0.45) + p.faixa * 60, corre: false };
    }

    iaComBola(p) {
      const nv = p.nivel, s = p.sinal, golX = p.time === 0 ? X1 : X0;
      const distGol = Math.hypot(golX - p.x, CY - p.y);
      if (this.congela > 0) { p.vx = p.vy = 0; return; }
      if (distGol < nv.alcance && p.pensa <= 0) {
        const ty = CY + (Math.random() * 2 - 1) * GOL_MEIO * 0.6 + (Math.random() * 2 - 1) * nv.erro;
        this.chutar(p, normal(golX - p.x, ty - p.y), nv.chute);
        return;
      }
      let adv = null, dAdv = Infinity;
      for (const q of this.jogadores) {
        if (q.time === p.time) continue;
        const d = dist(p, q);
        if (d < dAdv) { dAdv = d; adv = q; }
      }
      if (dAdv < 60 && p.pensa <= 0) {
        const colega = this.jogadores.find((q) => q.time === p.time && q.papel === 'fp' && q !== p);
        if (colega && (colega.x - p.x) * s > -40 && Math.random() < 0.6) {
          const alvo = { x: colega.x + colega.vx * 0.3, y: colega.y + colega.vy * 0.3 };
          const forca = limitar(dist(p, alvo) * 1.5, 300, 520);
          this.chutar(p, normal(alvo.x - p.x, alvo.y - p.y), forca);
          return;
        }
        p.pensa = nv.reacao;
      }
      let ty = lerp(p.y, CY, 0.4);
      if (adv && (adv.x - p.x) * s > 0 && dAdv < 110) ty += (p.y < adv.y ? -1 : 1) * 90;
      this.irPara(p, golX, ty, nv.vel * 0.9);
    }

    iaGoleiro(p, dt) {
      const b = this.bola, s = p.sinal, linha = p.time === 0 ? X0 : X1, nv = p.nivel;
      if (b.dono === p) {
        p.vx = p.vy = 0;
        p.segura -= dt;
        if (p.segura <= 0) {
          // passa para o colega com o caminho mais livre
          const colegas = this.jogadores.filter((q) => q.time === p.time && q.papel === 'fp');
          const rivais = this.jogadores.filter((q) => q.time !== p.time);
          let alvo = colegas[0], melhor = -1;
          for (const q of colegas) {
            const livre = Math.min(...rivais.map((r) => distSegmento(r, p, q)));
            if (livre > melhor) { melhor = livre; alvo = q; }
          }
          const dir = normal(alvo.x - p.x + s * 40, alvo.y - p.y + (Math.random() - 0.5) * 40);
          this.chutar(p, dir, 460);
        }
        return;
      }
      let tx = linha + s * 26;
      let ty = limitar(lerp(CY, b.y, 0.85), GY0 + 12, GY1 - 12);
      if (!b.dono && b.vx * s < -150) {
        // bola vindo para o gol: vai para onde ela vai passar
        const tempo = (p.x - b.x) / b.vx;
        if (tempo > 0) ty = limitar(b.y + b.vy * tempo, GY0 - 10, GY1 + 10);
      }
      const dBola = Math.hypot(b.x - linha, b.y - CY);
      const atacante = b.dono && b.dono.time !== p.time ? b.dono : null;
      if (!b.dono && dBola < 150 && (b.x - linha) * s > 0) { tx = b.x; ty = b.y; }
      else if (atacante && dBola < 120) { tx = b.x; ty = b.y; }
      else if (atacante && dBola < 220) tx = linha + s * 46;
      // tenta tirar a bola de quem chega perto do gol
      if (atacante && dist(p, b) < PR + BR + 14) this.roubar(p, atacante, nv.gkPega);
      tx = s > 0 ? limitar(tx, X0 + PR, X0 + AREA_W) : limitar(tx, X1 - AREA_W, X1 - PR);
      ty = limitar(ty, CY - AREA_H / 2 + 20, CY + AREA_H / 2 - 20);
      this.irPara(p, tx, ty, nv.gkVel);
    }

    irPara(p, tx, ty, vel) {
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
      if (d < 4) { p.vx = 0; p.vy = 0; return; }
      const v = Math.min(vel, d * 6);
      p.vx = (dx / d) * v;
      p.vy = (dy / d) * v;
      p.dir = { x: dx / d, y: dy / d };
    }

    mover(dt) {
      for (const p of this.jogadores) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.x = limitar(p.x, X0 + PR - 4, X1 - PR + 4);
        p.y = limitar(p.y, Y0 + PR, Y1 - PR);
        if (p.vx || p.vy) p.fase += dt * 14;
      }
      // empurrãozinho para não ficarem um em cima do outro
      const js = this.jogadores;
      for (let i = 0; i < js.length; i++) {
        for (let j = i + 1; j < js.length; j++) {
          const a = js[i], b = js[j];
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
          if (d > 0 && d < PR * 2) {
            const em = (PR * 2 - d) / 2;
            a.x -= (dx / d) * em; a.y -= (dy / d) * em;
            b.x += (dx / d) * em; b.y += (dy / d) * em;
          }
        }
      }
    }

    atualizarBola(dt) {
      const b = this.bola;
      b.protecao = Math.max(0, b.protecao - dt);
      if (this.estado !== 'jogando') return;
      if (b.dono) {
        const p = b.dono;
        b.x = p.x + p.dir.x * (PR + BR - 2);
        b.y = p.y + p.dir.y * (PR + BR - 2);
        b.vx = p.vx; b.vy = p.vy;
        if (Math.hypot(p.vx, p.vy) > 1) b.giro += dt * 10;
        if (b.y > GY0 && b.y < GY1) {
          if (b.x > X1 + 4) { this.gol(0); return; }
          if (b.x < X0 - 4) { this.gol(1); return; }
        }
        b.x = limitar(b.x, X0 - 10, X1 + 10);
        b.y = limitar(b.y, Y0 + BR, Y1 - BR);
        return;
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const atrito = Math.exp(-1.1 * dt);
      b.vx *= atrito; b.vy *= atrito;
      const vel = Math.hypot(b.vx, b.vy);
      if (vel < 6) { b.vx = 0; b.vy = 0; }
      b.giro += vel * dt * 0.08;

      if (b.y < Y0 + BR) { b.y = Y0 + BR; b.vy = Math.abs(b.vy) * 0.7; }
      if (b.y > Y1 - BR) { b.y = Y1 - BR; b.vy = -Math.abs(b.vy) * 0.7; }
      const naBoca = b.y > GY0 && b.y < GY1;
      if (b.x < X0 + BR) {
        if (naBoca) { if (b.x < X0 - BR) { this.gol(1); return; } }
        else { b.x = X0 + BR; b.vx = Math.abs(b.vx) * 0.7; }
      }
      if (b.x > X1 - BR) {
        if (naBoca) { if (b.x > X1 + BR) { this.gol(0); return; } }
        else { b.x = X1 - BR; b.vx = -Math.abs(b.vx) * 0.7; }
      }

      // alguém domina a bola?
      const perto = this.jogadores
        .map((p) => ({ p, d: dist(p, b) }))
        .sort((a, c) => a.d - c.d);
      for (const { p, d } of perto) {
        const alcance = PR + BR + (p.papel === 'gk' ? 12 : 3);
        if (d > alcance) break;
        if (p.cdPega > 0 || p.atordoado > 0 || p.falhou === b.chute) continue;
        let pega = true;
        if (p.papel === 'gk') { if (vel > 260) pega = Math.random() < p.nivel.gkPega; }
        else if (vel > 380 && !p.humano) pega = Math.random() < p.nivel.dominio;
        if (pega) {
          b.dono = p;
          b.protecao = 0.3;
          p.pensa = p.nivel.reacao + 0.2;
          if (p.papel === 'gk') p.segura = 0.8;
          break;
        }
        p.falhou = b.chute;
        if (p.papel === 'gk' && Math.random() < p.nivel.gkRebate) {
          // espalmou: a bola volta para o campo
          b.vx = p.sinal * Math.abs(b.vx) * 0.25;
          b.vy = (b.y < p.y ? -1 : 1) * (260 + Math.random() * 160);
          b.chute++;
          p.cdPega = 0.2;
          Som.chute();
        }
      }
    }

    gol(time) {
      const b = this.bola;
      this.placar[time]++;
      this.estado = 'gol';
      this.golTimer = 3;
      this.ultimoGol = time;
      b.dono = null;
      b.vx *= 0.2; b.vy *= 0.2;
      for (const p of this.jogadores) { p.vx = p.vy = 0; }
      const c = this.cfg.times[time];
      const cores = [c.camisa, c.calcao, '#ffd740', '#ffffff', '#ff4081', '#40c4ff'];
      Visual.criarConfete(this.confete, time === 0 ? X1 : X0, CY, cores, 70);
      Visual.criarConfete(this.confete, CX, Y0 + 40, cores, 50);
      Som.apito();
      Som.torcida();
      this.cb.gol(time, this.placar.slice());
    }

    // ---------- Desenho ----------
    desenhar() {
      const g = this.ctx;
      g.drawImage(this.campo, 0, 0);
      const b = this.bola;
      const coisas = this.jogadores.map((p) => ({ y: p.y, p }));
      coisas.push({ y: b.y - 6, bola: true });
      coisas.sort((a, c) => a.y - c.y);

      // marcação de quem a criança controla (embaixo dos pés)
      for (let t = 0; t < 2; t++) {
        const p = this.controlado[t];
        if (!p || !this.humanos[t]) continue;
        g.save();
        g.strokeStyle = '#ffffff';
        g.lineWidth = 5;
        g.beginPath(); g.ellipse(p.x, p.y + 14, 20, 8, 0, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = t === 0 ? '#ffd600' : '#00e5ff';
        g.lineWidth = 3;
        g.stroke();
        g.restore();
      }

      for (const c of coisas) {
        if (c.bola) { this.desenharBola(g); continue; }
        const p = c.p;
        const time = this.cfg.times[p.time];
        let pulo = 0;
        if (this.estado === 'gol' && p.time === this.ultimoGol) pulo = -Math.abs(Math.sin(this.anim * 9 + p.numero)) * 14;
        Visual.jogador(g, p.x, p.y + pulo, {
          visual: p.visual,
          camisa: p.papel === 'gk' ? this.corGk : time.camisa,
          calcao: time.calcao,
          fase: p.fase,
          olhar: p.dir.x,
          numero: p.numero,
          luvas: p.papel === 'gk' ? '#ffffff' : null,
          bracosCima: pulo < -4,
          feliz: this.estado === 'gol' && p.time === this.ultimoGol,
        });
      }

      // setinha em cima de quem a criança controla
      for (let t = 0; t < 2; t++) {
        const p = this.controlado[t];
        if (!p || !this.humanos[t]) continue;
        const y = p.y - 46 + Math.sin(this.anim * 6) * 3;
        const cor = t === 0 ? '#ffd600' : '#00e5ff';
        g.fillStyle = cor;
        g.strokeStyle = '#1d2433';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(p.x - 13, y - 14); g.lineTo(p.x + 13, y - 14); g.lineTo(p.x, y);
        g.closePath(); g.fill(); g.stroke();
        if (this.cfg.modo === 'dois') {
          g.font = 'bold 18px Verdana, sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'bottom';
          g.lineWidth = 4;
          g.strokeText(String(t + 1), p.x, y - 15);
          g.fillText(String(t + 1), p.x, y - 15);
        }
      }

      Visual.desenharConfete(g, this.confete);

      if (this.congela > 0 && this.estado === 'jogando') {
        g.save();
        g.globalAlpha = Math.min(1, this.congela * 2);
        g.font = 'bold 54px Verdana, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.lineWidth = 8;
        g.strokeStyle = '#1d2433';
        g.fillStyle = '#ffffff';
        g.strokeText('Vai! ⚽', CX, Y0 + 70);
        g.fillText('Vai! ⚽', CX, Y0 + 70);
        g.restore();
      }
      if (this.estado === 'fim') {
        g.save();
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(0, 0, W, H);
        g.font = 'bold 70px Verdana, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.lineWidth = 10;
        g.strokeStyle = '#1d2433';
        g.fillStyle = '#ffd740';
        g.strokeText('Fim de jogo!', CX, CY);
        g.fillText('Fim de jogo!', CX, CY);
        g.restore();
      }
    }

    desenharBola(g) {
      const b = this.bola;
      const vel = Math.hypot(b.vx, b.vy);
      if (!b.dono && vel > 300) {
        g.fillStyle = 'rgba(255,255,255,0.35)';
        for (let i = 1; i <= 3; i++) {
          Visual.circulo(g, b.x - b.vx * 0.012 * i, b.y - b.vy * 0.012 * i, BR - i * 1.5, 'rgba(255,255,255,' + (0.4 - i * 0.1) + ')');
        }
      }
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.beginPath(); g.ellipse(b.x + 3, b.y + 6, BR, BR * 0.5, 0, 0, Math.PI * 2); g.fill();
      Visual.bola(g, b.x, b.y, BR + 1, b.giro);
    }
  }

  return { Jogo };
})();
