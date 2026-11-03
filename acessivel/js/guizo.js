// Partida com bola de guizo: 1 contra 1 (mais os goleiros), guiada pelo som.
// O campo fica "em pé": você ataca para a frente (seta para cima), rumo ao gol do computador.
const PartidaGuizo = (() => {
  const LARG = 300, COMP = 600;
  const GOL0 = 105, GOL1 = 195;          // traves (largura do gol)
  const CENTRO = LARG / 2;

  const NIVEIS = {
    facil:   { adv: 45, toque: 34, rouba: 0.55, perde: 0.12, gkAdv: 45, defAdv: 0.5,  chuteAdv: 230, erroAdv: 60, drible: 0 },
    medio:   { adv: 65, toque: 28, rouba: 0.4,  perde: 0.3,  gkAdv: 65, defAdv: 0.6,  chuteAdv: 280, erroAdv: 45, drible: 50 },
    dificil: { adv: 85, toque: 24, rouba: 0.25, perde: 0.45, gkAdv: 85, defAdv: 0.7,  chuteAdv: 330, erroAdv: 30, drible: 80 },
  };
  const VEL_EU = 115;
  const GK_MEU = { vel: 55, defende: 0.55 };

  const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // Descreve uma posição em relação a você, em palavras
  function descrever(eu, alvo) {
    const dx = alvo.x - eu.x, dy = alvo.y - eu.y;
    const d = Math.hypot(dx, dy);
    if (d < 30) return 'bem pertinho de você';
    const partes = [];
    if (dy < -25) partes.push(d > 250 ? 'lá na frente' : 'na sua frente');
    else if (dy > 25) partes.push(d > 250 ? 'lá atrás' : 'atrás de você');
    if (Math.abs(dx) > 25) {
      const lado = dx < 0 ? 'esquerda' : 'direita';
      partes.push(Math.abs(dx) > 90 ? 'bem à ' + lado : 'um pouco à ' + lado);
    }
    return partes.join(', ');
  }

  class Jogo {
    // cfg: { dificuldade, minutos }  cb: { fim(placar), desenhar(jogo) }
    constructor(cfg, cb) {
      this.cfg = cfg;
      this.cb = cb;
      this.nv = NIVEIS[cfg.dificuldade] || NIVEIS.facil;
      this.placar = [0, 0];
      this.tempo = cfg.minutos * 60;
      this.teclas = new Set();
      this.estado = 'parado';
      this.pausado = false;
      this.vivo = true;
      this.avisos = new Set();
      this.cdSom = 0;
      this.cdGol = 0;
      this.cdParede = 0;
      this.ultimo = 0;
      this.geracao = 0;
      this.eu = { x: CENTRO, y: 420, cdPega: 0, cdRouba: 0 };
      this.adv = { x: CENTRO, y: 200, cdPega: 0, cdRouba: 0, pensa: 0 };
      this.gkAdv = { x: CENTRO, y: 8 };
      this.gkMeu = { x: CENTRO, y: COMP - 8 };
      this.bola = { x: CENTRO, y: 300, vx: 0, vy: 0, dono: null };
      this.loop = (t) => this.quadro(t);
    }

    iniciar() {
      this.saida(0);
      this.falar('Partida com bola de guizo! Você ataca para a frente, com a seta para cima. Ouça o guizo da bola e corra até ela. ' +
        'Com a bola, siga o bip do gol e chute com a barra de espaço. Apito inicial!', () => {
        Sons.apito();
        this.estado = 'jogando';
      });
      requestAnimationFrame(this.loop);
    }

    falar(texto, depois) {
      const g = this.geracao;
      Voz.falar(texto, { depois: depois ? () => { if (this.vivo && g === this.geracao) depois(); } : null });
    }

    saida(quem) {
      const b = this.bola;
      b.vx = b.vy = 0;
      this.gkAdv.x = this.gkMeu.x = CENTRO;
      if (quem === 0) {
        this.eu.x = CENTRO; this.eu.y = 310;
        this.adv.x = CENTRO; this.adv.y = 180;
        b.dono = this.eu;
      } else {
        this.adv.x = CENTRO; this.adv.y = 290;
        this.eu.x = CENTRO; this.eu.y = 430;
        b.dono = this.adv;
      }
      this.posicionarBola();
      this.congela = 1.2;
    }

    tecla(codigo, apertou) {
      const usadas = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyB', 'KeyG', 'KeyT', 'KeyR'];
      if (!usadas.includes(codigo)) return false;
      if (!apertou) { this.teclas.delete(codigo); return true; }
      if (this.pausado) return true;
      this.teclas.add(codigo);
      if (codigo === 'Space') this.chutar();
      if (codigo === 'KeyB') this.falarBola();
      if (codigo === 'KeyG') this.falar('O gol do computador está ' + descrever(this.eu, { x: CENTRO, y: 0 }) + '.');
      if (codigo === 'KeyT') this.falar(this.placarTexto() + ' ' + this.tempoTexto());
      if (codigo === 'KeyR') Voz.repetir();
      return true;
    }

    placarTexto() {
      return 'Você ' + this.placar[0] + ', computador ' + this.placar[1] + '.';
    }

    tempoTexto() {
      const s = Math.ceil(this.tempo);
      const m = Math.floor(s / 60), r = s % 60;
      const partes = [];
      if (m) partes.push(m + (m === 1 ? ' minuto' : ' minutos'));
      if (r) partes.push(r + (r === 1 ? ' segundo' : ' segundos'));
      return 'Faltam ' + (partes.join(' e ') || 'zero segundos') + '.';
    }

    falarBola() {
      const b = this.bola;
      if (b.dono === this.eu) this.falar('A bola está com você! O gol está ' + descrever(this.eu, { x: CENTRO, y: 0 }) + '.');
      else if (b.dono === this.adv) this.falar('A bola está com o computador, ' + descrever(this.eu, b) + '.');
      else this.falar('A bola está ' + descrever(this.eu, b) + '.');
    }

    chutar() {
      if (this.estado !== 'jogando') return;
      const b = this.bola, eu = this.eu;
      if (b.dono !== eu) { Sons.erro(); return; }
      // a mira ajuda: a bola vai em direção ao gol
      const alvoX = limitar(eu.x, GOL0 + 15, GOL1 - 15) + (Math.random() - 0.5) * 20;
      const dx = alvoX - eu.x, dy = 0 - eu.y, d = Math.hypot(dx, dy) || 1;
      b.dono = null;
      b.vx = (dx / d) * 300;
      b.vy = (dy / d) * 300;
      eu.cdPega = 0.5;
      Sons.chute(0);
    }

    pausar() { this.pausado = true; this.geracao++; this.teclas.clear(); Voz.parar(); }
    continuar() {
      this.pausado = false;
      this.ultimo = 0;
      if (this.estado === 'parado') {
        this.estado = 'jogando';
        Sons.apito();
      } else if (this.estado === 'gol') {
        this.recomecar();
      } else if (this.estado === 'fim') {
        this.cb.fim(this.placar.slice());
      }
    }

    destruir() { this.vivo = false; this.geracao++; Voz.parar(); }

    quadro(t) {
      if (!this.vivo) return;
      const dt = this.ultimo ? Math.min(0.05, (t - this.ultimo) / 1000) : 0;
      this.ultimo = t;
      if (!this.pausado) this.atualizar(dt);
      this.cb.desenhar(this);
      requestAnimationFrame(this.loop);
    }

    atualizar(dt) {
      if (this.estado !== 'jogando') return;
      this.tempo -= dt;
      this.avisarTempo();
      if (this.tempo <= 0) { this.terminar(); return; }
      if (this.congela > 0) this.congela -= dt;

      for (const p of [this.eu, this.adv]) {
        p.cdPega = Math.max(0, p.cdPega - dt);
        p.cdRouba = Math.max(0, p.cdRouba - dt);
      }
      this.moverEu(dt);
      this.moverAdv(dt);
      this.moverGoleiros(dt);
      this.moverBola(dt);
      this.tocarSons(dt);
    }

    avisarTempo() {
      const avisos = [[60, 'Falta um minuto!'], [30, 'Faltam trinta segundos!'], [10, 'Faltam dez segundos!']];
      for (const [s, texto] of avisos) {
        if (this.tempo <= s && this.cfg.minutos * 60 > s + 5 && !this.avisos.has(s)) {
          this.avisos.add(s);
          this.falar(texto + ' ' + this.placarTexto());
        }
      }
    }

    moverEu(dt) {
      const k = this.teclas, eu = this.eu;
      let dx = (k.has('ArrowRight') ? 1 : 0) - (k.has('ArrowLeft') ? 1 : 0);
      let dy = (k.has('ArrowDown') ? 1 : 0) - (k.has('ArrowUp') ? 1 : 0);
      if (!dx && !dy) return;
      const d = Math.hypot(dx, dy);
      const nx = eu.x + (dx / d) * VEL_EU * dt, ny = eu.y + (dy / d) * VEL_EU * dt;
      eu.x = limitar(nx, 10, LARG - 10);
      eu.y = limitar(ny, 10, COMP - 10);
      // bateu na lateral ou no fundo: um "toc" do lado da parede
      if ((eu.x !== nx || eu.y !== ny) && this.cdParede <= 0) {
        this.cdParede = 0.45;
        Sons.parede(eu.x !== nx ? (dx < 0 ? -1 : 1) : 0);
      }
    }

    moverAdv(dt) {
      const a = this.adv, b = this.bola, nv = this.nv;
      if (this.congela > 0) return;
      let tx = b.x, ty = b.y, vel = nv.adv;
      if (b.dono === a) {
        // vai em direção ao seu gol e chuta perto dele
        tx = CENTRO + Math.sin(a.y / 40) * 30;
        ty = COMP;
        // nos níveis mais altos, desvia de você
        const eu = this.eu;
        if (nv.drible && eu.y > a.y && eu.y - a.y < 90 && Math.abs(eu.x - a.x) < 50) {
          tx = a.x + (a.x < eu.x ? -1 : 1) * nv.drible;
        }
        vel = nv.adv * 0.9;
        if (a.y > COMP - nv.chuteAdv * 0.6 && a.cdPega <= 0) {
          const alvoX = CENTRO + (Math.random() - 0.5) * (GOL1 - GOL0 + nv.erroAdv * 2);
          const ddx = alvoX - a.x, ddy = COMP - a.y, dd = Math.hypot(ddx, ddy) || 1;
          b.dono = null;
          b.vx = (ddx / dd) * nv.chuteAdv;
          b.vy = (ddy / dd) * nv.chuteAdv;
          a.cdPega = 0.6;
          Sons.chute(this.panDe(a));
          return;
        }
      } else if (b.dono === this.eu) {
        tx = b.x; ty = b.y - 10;
      }
      const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
      if (d > 2) {
        a.x += (dx / d) * Math.min(vel * dt, d);
        a.y += (dy / d) * Math.min(vel * dt, d);
      }
      a.x = limitar(a.x, 10, LARG - 10);
      a.y = limitar(a.y, 10, COMP - 10);
    }

    moverGoleiros(dt) {
      const b = this.bola;
      const mover = (gk, vel) => {
        const alvo = limitar(b.x, GOL0 + 8, GOL1 - 8);
        const d = alvo - gk.x;
        gk.x += Math.sign(d) * Math.min(Math.abs(d), vel * dt);
      };
      mover(this.gkAdv, this.nv.gkAdv);
      mover(this.gkMeu, GK_MEU.vel);
    }

    posicionarBola() {
      const b = this.bola;
      if (b.dono === this.eu) { b.x = this.eu.x; b.y = this.eu.y - 14; }
      else if (b.dono === this.adv) { b.x = this.adv.x; b.y = this.adv.y + 14; }
    }

    moverBola(dt) {
      const b = this.bola, eu = this.eu, a = this.adv, nv = this.nv;
      if (b.dono) {
        this.posicionarBola();
        // disputa de bola
        if (b.dono === a && dist(eu, b) < nv.toque && eu.cdRouba <= 0) {
          eu.cdRouba = 0.6;
          if (Math.random() < nv.rouba) {
            b.dono = eu; a.cdPega = 0.8;
            Sons.ok();
            this.falar('Bola sua!');
          } else {
            Sons.passo(this.panDe(b));
          }
        } else if (b.dono === eu && dist(a, b) < 18 && a.cdRouba <= 0 && this.congela <= 0) {
          a.cdRouba = 0.7;
          if (Math.random() < nv.perde) {
            b.dono = a; eu.cdPega = 0.6;
            Sons.erro();
            this.falar('O computador pegou a bola!');
          }
        }
        return;
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const atrito = Math.exp(-0.7 * dt);
      b.vx *= atrito; b.vy *= atrito;
      if (Math.hypot(b.vx, b.vy) < 5) { b.vx = 0; b.vy = 0; }

      if (b.x < 6) { b.x = 6; b.vx = Math.abs(b.vx) * 0.6; Sons.parede(-1); }
      if (b.x > LARG - 6) { b.x = LARG - 6; b.vx = -Math.abs(b.vx) * 0.6; Sons.parede(1); }
      if (b.y < 4) { this.chegouNoFundo(0); return; }
      if (b.y > COMP - 4) { this.chegouNoFundo(1); return; }

      // alguém pega a bola solta
      if (eu.cdPega <= 0 && dist(eu, b) < nv.toque) {
        b.dono = eu;
        Sons.ok();
        this.falar('Bola sua!');
      } else if (a.cdPega <= 0 && dist(a, b) < 18) {
        b.dono = a;
        Sons.passo(this.panDe(a));
      }
    }

    // A bola chegou à linha de fundo: lado 0 = gol do computador, 1 = seu gol
    chegouNoFundo(lado) {
      const b = this.bola;
      const noGol = b.x > GOL0 && b.x < GOL1;
      const gk = lado === 0 ? this.gkAdv : this.gkMeu;
      const defende = lado === 0 ? this.nv.defAdv : GK_MEU.defende;
      if (!noGol) {
        b.y = lado === 0 ? 4 : COMP - 4;
        b.vy = (lado === 0 ? 1 : -1) * Math.abs(b.vy) * 0.4;
        Sons.parede(this.panDe(b));
        return;
      }
      if (Math.abs(gk.x - b.x) < 22 && Math.random() < defende) {
        b.y = lado === 0 ? 10 : COMP - 10;
        b.vy = (lado === 0 ? 1 : -1) * (140 + Math.random() * 60);
        b.vx = (Math.random() - 0.5) * 160;
        Sons.luva(this.panDe(b));
        this.falar(lado === 0 ? 'O goleiro defendeu! Pegue o rebote!' : 'Seu goleiro defendeu!');
        return;
      }
      this.gol(lado === 0 ? 0 : 1);
    }

    gol(quem) {
      this.placar[quem]++;
      this.estado = 'gol';
      this.saidaPendente = quem === 0 ? 1 : 0;
      Sons.rede(0);
      Sons.torcida(3);
      const texto = quem === 0 ? 'Gooool! Gol seu! ' : 'Gol do computador. ';
      this.falar(texto + this.placarTexto(), () => {
        const g = this.geracao;
        setTimeout(() => { if (this.vivo && g === this.geracao) this.recomecar(); }, 500);
      });
    }

    // saída de bola depois de um gol
    recomecar() {
      this.saida(this.saidaPendente);
      this.estado = 'jogando';
      Sons.apito();
      if (this.bola.dono === this.eu) this.falar('Bola sua! Saída de bola.');
      else this.falar('Saída do computador.');
    }

    terminar() {
      this.tempo = 0;
      this.estado = 'fim';
      Sons.apitoFinal();
      const g = this.geracao;
      setTimeout(() => { if (this.vivo && g === this.geracao) this.cb.fim(this.placar.slice()); }, 1500);
    }

    panDe(obj) { return limitar((obj.x - this.eu.x) / 80, -1, 1); }

    // Guizo da bola e bip do gol, repetidos de tempos em tempos
    tocarSons(dt) {
      const b = this.bola, eu = this.eu;
      this.cdSom -= dt;
      this.cdGol -= dt;
      this.cdParede -= dt;
      if (b.dono === eu) {
        if (this.cdSom <= 0) { this.cdSom = 0.55; Sons.guizo(0, 0.35, true); }
        if (this.cdGol <= 0) {
          this.cdGol = 0.75;
          const dx = CENTRO - eu.x;
          const vol = limitar(1 - eu.y / COMP, 0.35, 1);
          Sons.bipGol(limitar(dx / 80, -1, 1), vol, eu.x > GOL0 + 10 && eu.x < GOL1 - 10);
        }
        return;
      }
      if (this.cdSom <= 0) {
        const d = dist(eu, b);
        this.cdSom = 0.12 + Math.min(1, d / 450) * 0.5;
        Sons.guizo(this.panDe(b), limitar(1 - d / 500, 0.15, 1), b.y < eu.y - 8);
      }
    }
  }

  return { Jogo, NIVEIS, LARG, COMP, GOL0, GOL1, descrever };
})();
