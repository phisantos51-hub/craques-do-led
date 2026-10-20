// Sons feitos na hora pelo navegador (sem arquivos). Começam DESLIGADOS.
const Som = (() => {
  let ligado = false;
  let ctx = null;
  let saida = null;

  function preparar() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      saida = ctx.createGain();
      saida.gain.value = 0.4;
      saida.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function ruido(segundos) {
    const tam = Math.floor(ctx.sampleRate * segundos);
    const buf = ctx.createBuffer(1, tam, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < tam; i++) d[i] = Math.random() * 2 - 1;
    const fonte = ctx.createBufferSource();
    fonte.buffer = buf;
    return fonte;
  }

  function apitoCurto(inicio, duracao) {
    const osc = ctx.createOscillator();
    const vibrato = ctx.createOscillator();
    const prof = ctx.createGain();
    const g = ctx.createGain();
    osc.frequency.value = 2900;
    vibrato.frequency.value = 32;
    prof.gain.value = 140;
    vibrato.connect(prof).connect(osc.frequency);
    g.gain.setValueAtTime(0, inicio);
    g.gain.linearRampToValueAtTime(0.18, inicio + 0.02);
    g.gain.setValueAtTime(0.18, inicio + duracao - 0.04);
    g.gain.linearRampToValueAtTime(0, inicio + duracao);
    osc.connect(g).connect(saida);
    osc.start(inicio); vibrato.start(inicio);
    osc.stop(inicio + duracao); vibrato.stop(inicio + duracao);
  }

  const sons = {
    apito() {
      const t = ctx.currentTime;
      apitoCurto(t, 0.18);
      apitoCurto(t + 0.25, 0.4);
    },
    apitoFinal() {
      const t = ctx.currentTime;
      apitoCurto(t, 0.3);
      apitoCurto(t + 0.4, 0.3);
      apitoCurto(t + 0.8, 0.8);
    },
    chute() {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(190, t);
      osc.frequency.exponentialRampToValueAtTime(55, t + 0.12);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(g).connect(saida);
      osc.start(t); osc.stop(t + 0.16);
    },
    torcida() {
      const t = ctx.currentTime;
      const dur = 2.6;
      const fonte = ruido(dur);
      const filtro = ctx.createBiquadFilter();
      filtro.type = 'bandpass';
      filtro.frequency.value = 1000;
      filtro.Q.value = 0.6;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.7, t + 0.3);
      g.gain.setValueAtTime(0.7, t + 1.4);
      g.gain.linearRampToValueAtTime(0, t + dur);
      fonte.connect(filtro).connect(g).connect(saida);
      fonte.start(t);
    },
    defesa() {
      const t = ctx.currentTime;
      const fonte = ruido(1.2);
      const filtro = ctx.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = 600;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.6, t + 0.15);
      g.gain.linearRampToValueAtTime(0, t + 1.2);
      fonte.connect(filtro).connect(g).connect(saida);
      fonte.start(t);
    },
    clique() {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.value = 660;
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(g).connect(saida);
      osc.start(t); osc.stop(t + 0.09);
    },
  };

  const api = {
    get ligado() { return ligado; },
    alternar() {
      ligado = !ligado;
      if (ligado && preparar()) sons.clique();
      return ligado;
    },
  };
  Object.keys(sons).forEach((nome) => {
    api[nome] = () => {
      if (!ligado || !preparar()) return;
      try { sons[nome](); } catch (e) { /* som é opcional */ }
    };
  });
  return api;
})();
