// Pênaltis de ouvido: chutar com as setas e defender ouvindo o lado da bola.
const PenaltisOuvido = (() => {
  const LADOS = [
    { nome: 'esquerda', pan: -1, tecla: 'ArrowLeft' },
    { nome: 'meio', pan: 0, tecla: 'ArrowUp' },
    { nome: 'direita', pan: 1, tecla: 'ArrowRight' },
  ];
  // adivinha: chance do goleiro do computador ir no canto certo
  // erra: chance do batedor do computador chutar para fora
  // janela: tempo (segundos) que a criança tem para pular depois de ouvir a bola
  const NIVEIS = {
    facil: { adivinha: 0.15, erra: 0.2, janela: 1.6, voo: 1.2 },
    medio: { adivinha: 0.3, erra: 0.1, janela: 1.1, voo: 0.9 },
    dificil: { adivinha: 0.45, erra: 0.05, janela: 0.8, voo: 0.7 },
  };

  // Retorna 0 (você venceu), 1 (computador venceu) ou -1 (continua)
  function vencedor(cobrancas) {
    const [a, b] = cobrancas;
    const ga = a.filter(Boolean).length, gb = b.filter(Boolean).length;
    if (a.length <= 5 && b.length <= 5) {
      if (ga > gb + (5 - b.length)) return 0;
      if (gb > ga + (5 - a.length)) return 1;
      if (a.length === 5 && b.length === 5 && ga !== gb) return ga > gb ? 0 : 1;
      return -1;
    }
    if (a.length === b.length && ga !== gb) return ga > gb ? 0 : 1;
    return -1;
  }

  class Disputa {
    // cb: { fim(cobrancas, vencedor), mostrar(estado) }
    constructor(dificuldade, cb) {
      this.nivel = NIVEIS[dificuldade] || NIVEIS.facil;
      this.cb = cb;
      this.cobrancas = [[], []];
      this.vez = 0;
      this.estado = 'falando';
      this.timers = [];
      this.pausado = false;
      this.vivo = true;
      this.geracao = 0; // muda a cada pausa: falas e esperas antigas são ignoradas
    }

    iniciar() {
      Sons.apito();
      this.falar('Disputa de pênaltis! São cinco cobranças para cada time. Você começa batendo.', () => this.proxima());
    }

    falar(texto, depois) {
      const g = this.geracao;
      Voz.falar(texto, { depois: depois ? () => { if (this.vivo && !this.pausado && g === this.geracao) depois(); } : null });
    }

    esperar(seg, f) {
      const g = this.geracao;
      const id = setTimeout(() => {
        this.timers = this.timers.filter((x) => x !== id);
        if (this.vivo && g === this.geracao) f();
      }, seg * 1000);
      this.timers.push(id);
    }

    placarTexto() {
      const g = this.cobrancas.map((l) => l.filter(Boolean).length);
      return 'Você ' + g[0] + ', computador ' + g[1] + '.';
    }

    proxima() {
      this.turnoFeito = false;
      this.cb.mostrar(this);
      if (this.vez === 0) {
        this.estado = 'mirar';
        this.falar('Sua vez de bater. Escolha o canto: seta para a esquerda, seta para cima para o meio, ou seta para a direita.');
      } else {
        this.estado = 'falando';
        this.falar('Agora você é o goleiro. Ouça a bola e aperte a seta do lado para onde ela for.', () => this.cpuBate());
      }
    }

    tecla(codigo, apertou) {
      if (apertou === false || this.pausado) return false;
      if (codigo === 'KeyR') { Voz.repetir(); return true; }
      if (codigo === 'KeyT') { Voz.falar(this.placarTexto()); return true; }
      const lado = LADOS.findIndex((l) => l.tecla === codigo || (codigo === 'ArrowDown' && l.nome === 'meio'));
      if (lado < 0) return false;
      if (this.estado === 'mirar') { Voz.parar(); this.bater(lado); return true; }
      if (this.estado === 'defender') { this.pular(lado); return true; }
      return true;
    }

    // ---- você bate ----
    bater(lado) {
      this.estado = 'animando';
      const gk = Math.random() < this.nivel.adivinha ? lado : this.outroLado(lado);
      [0, 0.3, 0.6].forEach((t) => this.esperar(t, () => Sons.passo(0)));
      this.esperar(0.9, () => { Sons.chute(0); Sons.voo(0, LADOS[lado].pan, 0.6, true); });
      this.esperar(1.55, () => {
        const gol = gk !== lado;
        this.registrar(gol);
        if (gol) {
          Sons.rede(LADOS[lado].pan);
          Sons.torcida(2.5);
          this.falar('Goool! Você chutou na ' + LADOS[lado].nome + ' e o goleiro pulou para o outro lado. ' + this.placarTexto(), () => this.seguir());
        } else {
          Sons.luva(LADOS[lado].pan);
          Sons.uuuh();
          this.falar('O goleiro defendeu! Ele pulou para a ' + LADOS[lado].nome + '. ' + this.placarTexto(), () => this.seguir());
        }
      });
    }

    outroLado(lado) {
      const opcoes = [0, 1, 2].filter((x) => x !== lado);
      return opcoes[Math.floor(Math.random() * opcoes.length)];
    }

    // ---- computador bate, você defende ----
    cpuBate() {
      this.estado = 'animando';
      this.cb.mostrar(this);
      this.alvo = Math.floor(Math.random() * 3);
      this.fora = Math.random() < this.nivel.erra;
      [0, 0.35, 0.7].forEach((t) => this.esperar(t, () => Sons.passo(0)));
      this.esperar(1.05, () => {
        Sons.chute(0);
        Sons.voo(0, LADOS[this.alvo].pan, this.nivel.voo, false);
        this.estado = 'defender';
        this.pulo = null;
        this.esperar(this.nivel.janela, () => this.resultadoDefesa());
      });
    }

    pular(lado) {
      if (this.pulo !== null) return;
      this.pulo = lado;
      Sons.passo(LADOS[lado].pan);
      // pulou certo: defende na hora
      if (lado === this.alvo && !this.fora) {
        this.timers.forEach(clearTimeout);
        this.timers = [];
        this.resultadoDefesa();
      }
    }

    resultadoDefesa() {
      if (this.estado !== 'defender') return;
      this.estado = 'animando';
      const nome = LADOS[this.alvo].nome;
      if (this.fora) {
        this.registrar(false);
        Sons.uuuh();
        this.falar('A bola foi para fora! Ufa! ' + this.placarTexto(), () => this.seguir());
      } else if (this.pulo === this.alvo) {
        this.registrar(false);
        Sons.luva(LADOS[this.alvo].pan);
        Sons.torcida(2);
        this.falar('Que defesa! Você pulou para a ' + nome + '! ' + this.placarTexto(), () => this.seguir());
      } else {
        this.registrar(true);
        Sons.rede(LADOS[this.alvo].pan);
        const motivo = this.pulo === null ? 'Você não pulou a tempo.' : 'Você pulou para a ' + LADOS[this.pulo].nome + '.';
        this.falar('Gol do computador. A bola foi na ' + nome + '. ' + motivo + ' ' + this.placarTexto(), () => this.seguir());
      }
    }

    registrar(gol) {
      this.cobrancas[this.vez].push(gol);
      this.turnoFeito = true;
      this.cb.mostrar(this);
    }

    seguir() {
      const v = vencedor(this.cobrancas);
      if (v >= 0) {
        this.estado = 'fim';
        Sons.apitoFinal();
        this.esperar(1.2, () => this.cb.fim(this.cobrancas, v));
        return;
      }
      const [a, b] = this.cobrancas;
      this.vez = 1 - this.vez;
      if (this.vez === 0 && a.length === 5 && b.length === 5) {
        this.falar('Empate! Agora é morte súbita: quem errar primeiro perde.', () => this.proxima());
      } else {
        this.proxima();
      }
    }

    pausar() {
      this.pausado = true;
      this.geracao++;
      Voz.parar();
      this.timers.forEach(clearTimeout);
      this.timers = [];
    }

    // Depois da pausa: se a cobrança já terminou, segue; se não, ela recomeça.
    continuar() {
      this.pausado = false;
      if (this.estado === 'fim') { this.cb.fim(this.cobrancas, vencedor(this.cobrancas)); return; }
      if (this.turnoFeito) this.seguir();
      else this.proxima();
    }

    destruir() {
      this.vivo = false;
      this.timers.forEach(clearTimeout);
      Voz.parar();
    }
  }

  return { Disputa, vencedor, NIVEIS };
})();
