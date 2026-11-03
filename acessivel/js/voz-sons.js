// Voz em português (a do próprio navegador) e sons que mostram onde as coisas estão.
const Voz = (() => {
  const temVoz = 'speechSynthesis' in window;
  let escolhida = null;
  let taxa = 1;
  let ultima = '';

  function escolher() {
    const vozes = window.speechSynthesis.getVoices();
    // prefere vozes instaladas no computador, que funcionam sem internet
    const pt = vozes.filter((v) => /^pt/i.test(v.lang));
    escolhida = pt.find((v) => /pt[-_]BR/i.test(v.lang) && v.localService)
      || pt.find((v) => /pt[-_]BR/i.test(v.lang))
      || pt.find((v) => v.localService)
      || pt[0] || null;
  }
  if (temVoz) {
    escolher();
    window.speechSynthesis.onvoiceschanged = escolher;
  }

  function legenda(texto) {
    const el = document.getElementById('legenda');
    if (el) el.textContent = texto;
  }

  // Fala um texto. "depois" roda quando a fala termina (ou se a voz falhar).
  function falar(texto, opcoes) {
    const o = opcoes || {};
    ultima = texto;
    legenda(texto);
    let feito = false;
    const terminar = () => {
      if (feito) return;
      feito = true;
      if (o.depois) o.depois();
    };
    if (!temVoz) {
      if (o.depois) setTimeout(terminar, 600 + texto.length * 60);
      return;
    }
    if (o.interromper !== false) window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'pt-BR';
    if (escolhida) u.voice = escolhida;
    u.rate = taxa;
    if (o.depois) {
      u.onend = terminar;
      u.onerror = terminar;
      // às vezes o navegador não avisa o fim da fala
      setTimeout(terminar, 2500 + (texto.length * 95) / taxa);
    }
    window.speechSynthesis.speak(u);
  }

  return {
    falar,
    parar() { if (temVoz) window.speechSynthesis.cancel(); },
    repetir() { if (ultima) falar(ultima); },
    get taxa() { return taxa; },
    set taxa(v) { taxa = v; },
    get temVoz() { return temVoz; },
    temPortugues() { return temVoz && !!escolhida; },
  };
})();

const Sons = (() => {
  let ctx = null;
  let saida = null;
  let ruido = null;

  function preparar() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      saida = ctx.createGain();
      saida.gain.value = 0.9;
      saida.connect(comp).connect(ctx.destination);
      ruido = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = ruido.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Liga um som a um "lado": -1 esquerda, 0 meio, 1 direita
  function lado(pan) {
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan || 0));
      p.connect(saida);
      return p;
    }
    return saida;
  }

  function fonteRuido(t, dur) {
    const s = ctx.createBufferSource();
    s.buffer = ruido;
    s.start(t, Math.random() * 1.5, dur);
    return s;
  }

  function tom(freq, t, dur, vol, tipo, destino) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = tipo || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(destino || saida);
    o.start(t);
    o.stop(t + dur + 0.02);
    return o;
  }

  const sons = {
    // Chocalho da bola: som fino = bola na frente, som grosso = bola atrás
    guizo(pan, vol, frente) {
      const t = ctx.currentTime;
      const filtro = ctx.createBiquadFilter();
      filtro.type = 'bandpass';
      filtro.frequency.value = frente ? 5200 : 1500;
      filtro.Q.value = 2.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      const v = Math.max(0.05, Math.min(1, vol)) * (frente ? 1.6 : 2.2);
      for (let i = 0; i < 3; i++) {
        const ti = t + i * 0.035;
        g.gain.setValueAtTime(v, ti);
        g.gain.exponentialRampToValueAtTime(0.001, ti + 0.028);
      }
      fonteRuido(t, 0.13).connect(filtro).connect(g).connect(lado(pan));
    },
    // Bip do gol adversário. Agudo quando você está bem de frente para o gol.
    bipGol(pan, vol, alinhado) {
      const t = ctx.currentTime;
      const destino = lado(pan);
      const f = alinhado ? 1320 : 880;
      tom(f, t, 0.09, 0.35 * vol, 'triangle', destino);
      tom(f, t + 0.12, 0.09, 0.35 * vol, 'triangle', destino);
    },
    parede(pan) {
      const t = ctx.currentTime;
      tom(110, t, 0.08, 0.5, 'square', lado(pan));
    },
    chute(pan) {
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(200, t);
      o.frequency.exponentialRampToValueAtTime(55, t + 0.12);
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      o.connect(g).connect(lado(pan));
      o.start(t); o.stop(t + 0.18);
    },
    passo(pan) {
      const t = ctx.currentTime;
      tom(70, t, 0.1, 0.6, 'sine', lado(pan));
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 400;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.4, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      fonteRuido(t, 0.09).connect(f).connect(g).connect(lado(pan));
    },
    // A bola "voando" de um lado para outro
    voo(pan0, pan1, dur, frente) {
      const t = ctx.currentTime;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(frente ? 900 : 1800, t);
      f.frequency.linearRampToValueAtTime(frente ? 2600 : 3200, t + dur);
      f.Q.value = 1.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.1, t);
      g.gain.linearRampToValueAtTime(0.9, t + dur * 0.8);
      g.gain.linearRampToValueAtTime(0.001, t + dur);
      let destino = saida;
      if (ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.setValueAtTime(pan0, t);
        p.pan.linearRampToValueAtTime(pan1, t + dur * 0.7);
        p.connect(saida);
        destino = p;
      }
      fonteRuido(t, dur).connect(f).connect(g).connect(destino);
    },
    rede(pan) {
      const t = ctx.currentTime;
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.setValueAtTime(2000, t);
      f.frequency.linearRampToValueAtTime(6000, t + 0.4);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.7, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      fonteRuido(t, 0.5).connect(f).connect(g).connect(lado(pan));
    },
    luva(pan) {
      const t = ctx.currentTime;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 1400;
      const g = ctx.createGain();
      g.gain.setValueAtTime(1.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      fonteRuido(t, 0.14).connect(f).connect(g).connect(lado(pan));
      tom(160, t, 0.12, 0.6, 'sine', lado(pan));
    },
    torcida(dur) {
      const t = ctx.currentTime, d = dur || 2.5;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1000; f.Q.value = 0.6;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.8, t + 0.3);
      g.gain.setValueAtTime(0.8, t + d * 0.6);
      g.gain.linearRampToValueAtTime(0, t + d);
      fonteRuido(t, d).connect(f).connect(g).connect(saida);
    },
    uuuh() {
      const t = ctx.currentTime;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.Q.value = 3;
      f.frequency.setValueAtTime(700, t);
      f.frequency.linearRampToValueAtTime(380, t + 1.1);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(1.4, t + 0.15);
      g.gain.linearRampToValueAtTime(0, t + 1.2);
      fonteRuido(t, 1.2).connect(f).connect(g).connect(saida);
    },
    apito() {
      const t = ctx.currentTime;
      for (const [ini, dur] of [[0, 0.18], [0.26, 0.45]]) {
        const o = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const prof = ctx.createGain();
        const g = ctx.createGain();
        o.frequency.value = 2900; lfo.frequency.value = 32; prof.gain.value = 140;
        lfo.connect(prof).connect(o.frequency);
        g.gain.setValueAtTime(0, t + ini);
        g.gain.linearRampToValueAtTime(0.25, t + ini + 0.02);
        g.gain.setValueAtTime(0.25, t + ini + dur - 0.04);
        g.gain.linearRampToValueAtTime(0, t + ini + dur);
        o.connect(g).connect(saida);
        o.start(t + ini); lfo.start(t + ini);
        o.stop(t + ini + dur); lfo.stop(t + ini + dur);
      }
    },
    apitoFinal() {
      sons.apito();
      setTimeout(() => { if (ctx) sons.apito(); }, 800);
    },
    ok() {
      const t = ctx.currentTime;
      tom(660, t, 0.1, 0.4, 'triangle');
      tom(990, t + 0.1, 0.14, 0.4, 'triangle');
    },
    erro() {
      const t = ctx.currentTime;
      tom(140, t, 0.2, 0.35, 'sawtooth');
    },
    menu() {
      const t = ctx.currentTime;
      tom(740, t, 0.05, 0.25, 'triangle');
    },
    tique() {
      const t = ctx.currentTime;
      tom(1200, t, 0.04, 0.3, 'square');
    },
  };

  const api = { preparar };
  Object.keys(sons).forEach((nome) => {
    api[nome] = (...args) => {
      if (!preparar()) return;
      try { sons[nome](...args); } catch (e) { /* som indisponível */ }
    };
  });
  return api;
})();
