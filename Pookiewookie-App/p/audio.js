/* The Starway Home: music-box soundtrack with per-world instruments, boss music, sound effects and Toffo's voice. All synthesized. */
(function () {
  const G = window.PW = window.PW || {};
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const A = G.audio = {
    ctx: null, master: null, music: null, noiseBuf: null, timer: 0, step: 0, nextT: 0, playing: false, muted: false,
    cfg: {bpm: 118, pattern: 0, transpose: 0, lead: 'bell', bass: 'sine', perc: 0}, boss: false,
    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
      const c = this.ctx = new Ctx();
      this.master = c.createGain(); this.master.gain.value = 0.6; this.master.connect(c.destination);
      this.music = c.createGain(); this.music.gain.value = 0.5; this.music.connect(this.master);
      const b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = b;
    },
    tone(f, dur, o = {}, dest) {
      if (!this.ctx || this.muted) return; const c = this.ctx, t = c.currentTime + (o.delay || 0);
      const osc = c.createOscillator(); osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t);
      if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + (o.slideDur || dur));
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.gain || 0.15, t + (o.attack || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(dest || this.master); osc.start(t); osc.stop(t + dur + 0.05);
    },
    noise(dur, o = {}, dest) {
      if (!this.ctx || this.muted) return; const c = this.ctx, t = c.currentTime + (o.delay || 0);
      const s = c.createBufferSource(); s.buffer = this.noiseBuf; let n = s;
      if (o.type) { const f = c.createBiquadFilter(); f.type = o.type; f.frequency.setValueAtTime(o.freq || 1000, t); if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t + dur); f.Q.value = o.q || 1; n.connect(f); n = f; }
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.gain || 0.2, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      n.connect(g).connect(dest || this.master); s.start(t); s.stop(t + dur + 0.05);
    },
    /* lead instruments */
    lead(f, dur, gain, delay, dest) {
      const k = this.cfg.lead;
      if (k === 'bell') { this.tone(f, dur, {gain, delay, attack: 0.003}, dest); this.tone(f * 2, dur * 0.6, {gain: gain * 0.35, delay, attack: 0.003}, dest); this.tone(f * 3, dur * 0.3, {gain: gain * 0.12, delay, attack: 0.003}, dest); }
      else if (k === 'marimba') { this.tone(f, dur * 0.5, {gain: gain * 1.2, delay, attack: 0.002}, dest); this.tone(f * 4, dur * 0.15, {gain: gain * 0.25, delay, attack: 0.002}, dest); }
      else if (k === 'flute') { this.tone(f, dur * 1.6, {type: 'triangle', gain: gain * 0.8, delay, attack: 0.05}, dest); this.tone(f * 1.003, dur * 1.6, {type: 'sine', gain: gain * 0.5, delay, attack: 0.06}, dest); }
      else { this.tone(f, dur * 0.8, {type: 'square', gain: gain * 0.45, delay, attack: 0.004}, dest); this.tone(f * 0.5, dur * 0.8, {type: 'sawtooth', gain: gain * 0.2, delay, attack: 0.004}, dest); }
    },
    bell(f, dur, gain, delay, dest) { this.tone(f, dur, {gain, delay, attack: 0.003}, dest); this.tone(f * 2, dur * 0.6, {gain: gain * 0.35, delay, attack: 0.003}, dest); },
    sfx: {
      jump() { A.tone(420, 0.2, {type: 'triangle', slide: 880, slideDur: 0.14, gain: 0.12}); },
      bigJump() { A.tone(320, 0.24, {type: 'triangle', slide: 700, slideDur: 0.16, gain: 0.14}); },
      glide() { A.noise(0.3, {type: 'bandpass', freq: 900, q: 1, gain: 0.05}); },
      spring() { A.tone(300, 0.3, {type: 'triangle', slide: 1500, slideDur: 0.25, gain: 0.16}); },
      heart() { A.bell(1760, 0.25, 0.14, 0); A.bell(2349, 0.35, 0.12, 0.08); },
      star() { [1047, 1319, 1568, 2093, 2637].forEach((f, i) => A.bell(f, 0.4, 0.13, i * 0.07)); },
      stomp() { A.tone(600, 0.12, {type: 'triangle', slide: 150, gain: 0.18}); A.noise(0.06, {type: 'lowpass', freq: 800, gain: 0.15}); },
      pop() { A.tone(900, 0.08, {type: 'sine', slide: 300, gain: 0.15}); },
      bump() { A.tone(180, 0.1, {type: 'triangle', slide: 120, gain: 0.18}); },
      crumble() { A.noise(0.25, {type: 'lowpass', freq: 600, freqTo: 150, gain: 0.2}); },
      power() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => A.bell(f, 0.3, 0.13, i * 0.07)); },
      appear() { [659, 784, 988, 1175].forEach((f, i) => A.bell(f, 0.2, 0.1, i * 0.06)); },
      hurt() { A.tone(500, 0.3, {type: 'triangle', slide: 180, gain: 0.16}); },
      die() { [784, 740, 698, 659, 622, 587, 523, 440].forEach((f, i) => A.bell(f, 0.35, 0.14, 0.6 + i * 0.16)); },
      oneUp() { [784, 988, 1175, 1568, 1319, 1568].forEach((f, i) => A.bell(f, 0.25, 0.12, i * 0.08)); },
      throwBean() { A.tone(1200, 0.06, {type: 'triangle', slide: 1800, gain: 0.1}); },
      checkpoint() { [659, 784, 1047].forEach((f, i) => A.bell(f, 0.3, 0.12, i * 0.1)); },
      flag() { [523, 587, 659, 784, 880, 1047, 1175, 1319].forEach((f, i) => A.bell(f, 0.25, 0.12, i * 0.06)); },
      clear() { [523, 659, 784, 1047, 988, 1047, 1319].forEach((f, i) => A.bell(f, i >= 5 ? 0.6 : 0.25, 0.14, 0.2 + i * 0.17)); },
      hazard() { A.noise(0.3, {type: 'lowpass', freq: 500, gain: 0.08}); },
      splash() { A.noise(0.25, {type: 'bandpass', freq: 1200, freqTo: 400, q: 1, gain: 0.2}); },
      fire() { A.noise(0.3, {type: 'lowpass', freq: 900, freqTo: 200, gain: 0.15}); A.tone(200, 0.2, {type: 'sawtooth', slide: 80, gain: 0.06}); },
      icicle() { A.tone(2400, 0.15, {type: 'triangle', slide: 900, gain: 0.12}); A.noise(0.12, {type: 'highpass', freq: 3000, gain: 0.12}); },
      thud() { A.noise(0.2, {type: 'lowpass', freq: 250, gain: 0.35}); A.tone(70, 0.2, {slide: 40, gain: 0.25}); },
      throwIt() { A.noise(0.08, {type: 'bandpass', freq: 700, q: 2, gain: 0.12}); },
      bossHit() { A.tone(300, 0.25, {type: 'square', slide: 120, gain: 0.2}); A.noise(0.15, {type: 'lowpass', freq: 600, gain: 0.25}); },
      bossDown() { [392, 349, 330, 294, 262, 220, 196, 165].forEach((f, i) => A.tone(f, 0.3, {type: 'square', gain: 0.14, delay: i * 0.12})); A.noise(1.2, {type: 'lowpass', freq: 400, freqTo: 60, gain: 0.3, delay: 0.9}); },
      gate() { A.noise(0.6, {type: 'lowpass', freq: 400, freqTo: 100, gain: 0.25}); [262, 330, 392, 523].forEach((f, i) => A.bell(f, 0.3, 0.12, 0.4 + i * 0.1)); },
      time() { A.bell(1400, 0.15, 0.12, 0); },
      sad() { A.tone(330, 0.8, {type: 'sine', slide: 220, gain: 0.18}); A.tone(247, 0.9, {type: 'sine', slide: 180, gain: 0.12, delay: 0.1}); },
      rescue() { [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => A.bell(f, 0.5, 0.14, i * 0.12)); },
      select() { A.bell(1319, 0.12, 0.08, 0); },
      wind() { A.noise(1.5, {type: 'bandpass', freq: 500, freqTo: 900, q: 0.6, gain: 0.05}); },
      /* gadgets, moves, bonus rooms */
      tick() { A.tone(1800, 0.05, {type: 'square', gain: 0.05}); },
      gadget() { [659, 784, 988, 1319, 1568, 1976, 2637].forEach((f, i) => A.bell(f, 0.35, 0.13, i * 0.06)); A.noise(0.4, {type: 'highpass', freq: 4000, gain: 0.05, delay: 0.1}); },
      starStart() { [523, 659, 784, 1047, 1319, 1568, 2093, 2637].forEach((f, i) => A.tone(f, 0.18, {type: 'square', gain: 0.09, delay: i * 0.05})); },
      starEnd() { [1568, 1319, 1047, 784].forEach((f, i) => A.bell(f, 0.25, 0.1, i * 0.09)); },
      jet() { A.noise(0.12, {type: 'bandpass', freq: 500 + Math.random() * 300, q: 0.8, gain: 0.07}); A.tone(90 + Math.random() * 20, 0.1, {type: 'sawtooth', gain: 0.03}); },
      jetEmpty() { A.tone(400, 0.3, {type: 'triangle', slide: 150, gain: 0.12}); A.noise(0.2, {type: 'lowpass', freq: 500, gain: 0.08}); },
      pound() { A.noise(0.25, {type: 'lowpass', freq: 300, freqTo: 80, gain: 0.35}); A.tone(90, 0.25, {slide: 40, gain: 0.25}); },
      poundStart() { A.tone(700, 0.12, {type: 'triangle', slide: 1400, gain: 0.08}); },
      wallJump() { A.tone(520, 0.16, {type: 'triangle', slide: 1040, slideDur: 0.12, gain: 0.12}); A.noise(0.08, {type: 'highpass', freq: 2500, gain: 0.05}); },
      slide() { A.noise(0.1, {type: 'bandpass', freq: 1500, q: 2, gain: 0.03}); },
      shoot() { A.tone(900, 0.1, {type: 'square', slide: 1500, gain: 0.07}); A.noise(0.06, {type: 'bandpass', freq: 2500, q: 2, gain: 0.08}); },
      honeyHit() { A.noise(0.15, {type: 'lowpass', freq: 1200, freqTo: 300, gain: 0.15}); A.tone(300, 0.12, {type: 'sine', slide: 120, gain: 0.1}); },
      magnetPull() { A.tone(1200 + Math.random() * 400, 0.06, {type: 'sine', gain: 0.04}); },
      bubbleOn() { [523, 784, 1047].forEach((f, i) => A.tone(f, 0.25, {type: 'sine', gain: 0.1, delay: i * 0.08})); },
      bubblePop() { A.noise(0.08, {type: 'highpass', freq: 3000, gain: 0.2}); A.tone(1400, 0.12, {type: 'sine', slide: 300, gain: 0.14}); },
      honeyTime() { [392, 330, 294, 262].forEach((f, i) => A.tone(f, 0.5, {type: 'triangle', gain: 0.12, delay: i * 0.18})); A.noise(0.6, {type: 'lowpass', freq: 400, freqTo: 120, gain: 0.08}); },
      cannonLoad() { A.noise(0.3, {type: 'lowpass', freq: 800, freqTo: 200, gain: 0.15}); A.tone(220, 0.3, {type: 'triangle', slide: 110, gain: 0.1}); },
      cannon() { A.noise(0.5, {type: 'lowpass', freq: 1500, freqTo: 100, gain: 0.45}); A.tone(120, 0.4, {type: 'sawtooth', slide: 40, gain: 0.18}); A.tone(800, 0.3, {type: 'triangle', slide: 2400, slideDur: 0.25, gain: 0.08, delay: 0.05}); },
      pipe() { A.tone(300, 0.35, {type: 'triangle', slide: 90, gain: 0.16}); A.noise(0.3, {type: 'lowpass', freq: 600, freqTo: 150, gain: 0.12}); },
      combo(n) { A.bell(880 * Math.pow(1.122, Math.min(n, 8)), 0.2, 0.12, 0); },
      pause() { A.tone(660, 0.12, {type: 'square', gain: 0.06}); A.tone(440, 0.16, {type: 'square', gain: 0.06, delay: 0.1}); },
      lose() { A.tone(500, 0.3, {type: 'triangle', slide: 200, gain: 0.14}); A.noise(0.25, {type: 'lowpass', freq: 700, freqTo: 200, gain: 0.12}); },
      cash() { A.tone(1568, 0.07, {type: 'square', gain: 0.045}); A.tone(2093, 0.12, {type: 'square', gain: 0.04, delay: 0.05}); },
      buy() { [1047, 1319, 1568, 2093].forEach((f, i) => A.tone(f, 0.12, {type: 'square', gain: 0.05, delay: i * 0.05})); A.noise(0.25, {type: 'highpass', freq: 5000, gain: 0.05, delay: 0.18}); },
      doubleJump() { A.tone(520, 0.18, {type: 'triangle', slide: 1300, slideDur: 0.14, gain: 0.12}); A.tone(780, 0.14, {type: 'sine', slide: 1560, slideDur: 0.1, gain: 0.07, delay: 0.03}); },
      /* brand intro: sub swell, whoosh, twelve rhythmic chocolate clacks, impact with a big chord, neon buzz, crunch, gold sparkle */
      brandSwell() { A.tone(38, 1.6, {type: 'sine', slide: 72, slideDur: 1.4, gain: 0.3, attack: 0.4}); A.tone(76, 1.6, {type: 'triangle', slide: 144, slideDur: 1.4, gain: 0.05, attack: 0.5}); },
      brandWhoosh() { A.noise(1.0, {type: 'bandpass', freq: 300, freqTo: 2400, q: 0.9, gain: 0.12}); },
      brandClack(i) { const f = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880, 1047, 1175][i % 12]; A.tone(f, 0.16, {type: 'triangle', slide: f * 0.9, slideDur: 0.14, gain: 0.14, attack: 0.002}); A.tone(f * 2, 0.08, {type: 'sine', gain: 0.05}); A.noise(0.03, {type: 'highpass', freq: 2500, gain: 0.12}); A.noise(0.06, {type: 'lowpass', freq: 500, gain: 0.1}); },
      brandImpact() {
        /* the big landing: sub drop, snare crack and a bright brass-like major-9 chord that rings out */
        A.noise(0.5, {type: 'lowpass', freq: 1500, freqTo: 80, gain: 0.42}); A.tone(98, 0.8, {type: 'sine', slide: 36, slideDur: 0.7, gain: 0.4}); A.noise(0.18, {type: 'bandpass', freq: 1900, q: 0.7, gain: 0.3});
        [131, 196, 262, 330, 392, 494, 587].forEach((f, k) => { A.tone(f, 2.8, {type: k < 2 ? 'sine' : 'sawtooth', gain: k < 2 ? 0.14 : 0.022, attack: 0.03}); A.tone(f * 1.006, 2.8, {type: 'triangle', gain: k < 2 ? 0.03 : 0.035, attack: 0.05}); });
        [1047, 1319, 1568, 2093].forEach((f, k) => A.bell(f, 1.0, 0.08, 0.05 + k * 0.06));
      },
      brandBurst() { A.noise(0.25, {type: 'highpass', freq: 3000, gain: 0.25}); A.noise(0.4, {type: 'bandpass', freq: 5000, freqTo: 1500, q: 1.5, gain: 0.12, delay: 0.03}); A.tone(523, 0.12, {type: 'triangle', slide: 1047, gain: 0.12}); [784, 1047, 1319].forEach((f, k) => A.bell(f, 0.4, 0.1, 0.05 + k * 0.05)); },
      brandBlink() { A.tone(1568, 0.06, {type: 'sine', gain: 0.07}); A.tone(2093, 0.08, {type: 'sine', gain: 0.06, delay: 0.07}); },
      brandStamp() { A.noise(0.22, {type: 'lowpass', freq: 600, freqTo: 120, gain: 0.45}); A.tone(70, 0.3, {type: 'sine', slide: 40, gain: 0.35}); A.tone(392, 0.5, {type: 'square', gain: 0.04, delay: 0.02}); },
      brandShing() { A.noise(0.5, {type: 'bandpass', freq: 6000, freqTo: 9000, q: 3, gain: 0.12}); A.tone(2637, 0.5, {type: 'sine', slide: 3136, gain: 0.08}); A.tone(3951, 0.6, {type: 'sine', gain: 0.05, delay: 0.06}); },
      brandNeon() { A.tone(110, 0.9, {type: 'square', gain: 0.025, attack: 0.01}); A.tone(220, 0.08, {type: 'square', gain: 0.05}); A.tone(220, 0.1, {type: 'square', gain: 0.05, delay: 0.15}); A.tone(220, 0.5, {type: 'square', gain: 0.04, delay: 0.3}); },
      brandCrunch() { A.noise(0.12, {type: 'bandpass', freq: 1200, q: 0.6, gain: 0.25}); A.noise(0.08, {type: 'lowpass', freq: 400, gain: 0.2, delay: 0.06}); },
      brandSparkle() { [1568, 1976, 2349, 2637, 3136, 3951].forEach((f, k) => A.bell(f, 0.8, 0.09, k * 0.07)); A.noise(1.2, {type: 'highpass', freq: 5000, gain: 0.05, delay: 0.1}); [523, 659, 784, 1047].forEach((f, k) => A.bell(f, 1.2, 0.12, 0.3 + k * 0.1)); },
      /* puzzles, coins, chocolate pen */
      bell(i) { const f = [523, 659, 784, 1047][i % 4]; A.bell(f, 0.7, 0.16, 0); A.tone(f * 2, 0.3, {gain: 0.05}); },
      wrong() { A.tone(220, 0.25, {type: 'square', slide: 160, gain: 0.08}); A.tone(165, 0.3, {type: 'square', slide: 120, gain: 0.08, delay: 0.15}); },
      puzzleSolved() { [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => A.bell(f, 0.5, 0.13, i * 0.09)); A.noise(0.6, {type: 'highpass', freq: 3000, gain: 0.05, delay: 0.3}); },
      coin() { [1319, 1760, 2217, 2637].forEach((f, i) => A.tone(f, 0.25, {type: 'square', gain: 0.07, delay: i * 0.06})); A.bell(2637, 0.6, 0.12, 0.25); },
      choco() { A.tone(600 + Math.random() * 300, 0.05, {type: 'sine', gain: 0.04}); },
      melt() { A.noise(0.2, {type: 'lowpass', freq: 500, freqTo: 150, gain: 0.05}); },
      /* rocket flight */
      laser() { A.tone(1400, 0.08, {type: 'square', slide: 500, gain: 0.05}); },
      boom() { A.noise(0.35, {type: 'lowpass', freq: 1200, freqTo: 100, gain: 0.3}); A.tone(90, 0.3, {type: 'sawtooth', slide: 30, gain: 0.12}); },
      smallBoom() { A.noise(0.15, {type: 'bandpass', freq: 800, q: 0.8, gain: 0.15}); },
      rocketHit() { A.tone(300, 0.3, {type: 'square', slide: 80, gain: 0.14}); A.noise(0.25, {type: 'lowpass', freq: 600, gain: 0.2}); },
      thrust() { A.noise(0.14, {type: 'lowpass', freq: 400 + Math.random() * 200, gain: 0.05}); },
      liftoff() { A.noise(2.5, {type: 'lowpass', freq: 200, freqTo: 1200, gain: 0.3}); A.tone(60, 2.5, {type: 'sawtooth', slide: 140, gain: 0.12}); },
      landing() { A.noise(1.2, {type: 'lowpass', freq: 900, freqTo: 150, gain: 0.18}); [392, 523, 659].forEach((f, i) => A.bell(f, 0.4, 0.1, 0.8 + i * 0.12)); },
      powerup() { [784, 1047, 1319].forEach((f, i) => A.tone(f, 0.15, {type: 'square', gain: 0.06, delay: i * 0.05})); },
      /* globe, dive and hub */
      globeGo() { A.tone(300, 1.4, {type: 'triangle', slide: 1800, slideDur: 1.3, gain: 0.1}); A.noise(1.5, {type: 'bandpass', freq: 400, freqTo: 3000, q: 0.7, gain: 0.12}); [523, 659, 784, 1047].forEach((f, i) => A.bell(f, 0.3, 0.1, 0.2 + i * 0.12)); },
      dive() { A.noise(2.6, {type: 'bandpass', freq: 300, freqTo: 1400, q: 0.5, gain: 0.16}); A.noise(2.6, {type: 'highpass', freq: 2500, gain: 0.04, delay: 0.3}); },
      land() { A.noise(0.25, {type: 'lowpass', freq: 400, freqTo: 100, gain: 0.3}); A.tone(90, 0.25, {slide: 45, gain: 0.2}); [784, 1047, 1319].forEach((f, i) => A.bell(f, 0.25, 0.1, 0.25 + i * 0.08)); },
    },
    /* patterns: scale degrees per 16th (0 = rest), 64 steps = 4 bars, with the bass as degrees too. Major scale offsets */
    SCALE: [0, 2, 4, 5, 7, 9, 11],
    PATTERNS: [
      {mel: [8, 0, 0, 10, 0, 0, 12, 0, 15, 0, 12, 0, 10, 0, 0, 0, 9, 0, 0, 12, 0, 0, 14, 0, 16, 0, 14, 0, 12, 0, 0, 0, 8, 0, 0, 10, 0, 0, 13, 0, 15, 0, 13, 0, 10, 0, 0, 0, 11, 0, 0, 13, 0, 0, 15, 0, 18, 0, 15, 0, 13, 0, 12, 11], bas: [1, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]},
      {mel: [8, 10, 12, 0, 8, 10, 12, 0, 15, 0, 12, 10, 8, 0, 0, 0, 9, 11, 13, 0, 9, 11, 13, 0, 16, 0, 13, 11, 9, 0, 0, 0, 10, 12, 13, 0, 10, 12, 13, 0, 17, 0, 15, 13, 12, 0, 0, 0, 11, 13, 15, 0, 16, 0, 15, 0, 13, 0, 12, 0, 10, 0, 8, 0], bas: [1, 0, 1, 0, 0, 0, 5, 0, 1, 0, 1, 0, 0, 0, 5, 0, 2, 0, 2, 0, 0, 0, 6, 0, 2, 0, 2, 0, 0, 0, 6, 0, 3, 0, 3, 0, 0, 0, 7, 0, 3, 0, 3, 0, 0, 0, 7, 0, 4, 0, 4, 0, 0, 0, 5, 0, 5, 0, 5, 0, 0, 0, 5, 0]},
      {mel: [12, 0, 0, 0, 0, 0, 10, 0, 8, 0, 0, 0, 0, 0, 0, 0, 10, 0, 0, 0, 0, 0, 9, 0, 8, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 13, 0, 15, 0, 0, 0, 0, 0, 0, 0, 13, 0, 0, 0, 12, 0, 0, 0, 10, 0, 0, 0, 8, 0, 0, 0], bas: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
      {mel: [8, 8, 0, 8, 10, 0, 8, 0, 11, 0, 10, 0, 8, 0, 0, 0, 8, 8, 0, 8, 12, 0, 11, 0, 10, 0, 8, 0, 6, 0, 0, 0, 8, 8, 0, 8, 10, 0, 8, 0, 11, 0, 10, 0, 8, 0, 0, 0, 13, 0, 12, 0, 11, 0, 10, 0, 8, 0, 6, 0, 8, 0, 0, 0], bas: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 6, 0, 6, 0, 6, 0, 6, 0, 6, 0, 6, 0, 6, 0, 6, 0, 4, 0, 4, 0, 4, 0, 4, 0, 4, 0, 4, 0, 4, 0, 4, 0, 5, 0, 5, 0, 5, 0, 5, 0, 5, 0, 5, 0, 5, 0, 5, 0]},
    ],
    deg(n, minor) { const oct = Math.floor((n - 1) / 7), k = (n - 1) % 7; let off = this.SCALE[k]; if (minor && (k === 2 || k === 5 || k === 6)) off -= 1; return 48 + oct * 12 + off; },
    schedule() {
      const c = this.ctx, cfg = this.boss ? {bpm: 150, pattern: 3, transpose: -2, lead: 'synth', bass: 'square', perc: 2, minor: true} : this.cfg, s16 = 60 / (cfg.bpm * (this.fast ? 1.35 : 1) * (this.slow ? 0.8 : 1)) / 4;
      const pat = this.PATTERNS[cfg.pattern], minor = !!cfg.minor || cfg.pattern === 3;
      const savedLead = this.cfg.lead; this.cfg.lead = cfg.lead;
      while (this.nextT < c.currentTime + 0.15) {
        const t = this.nextT, i = this.step % 64, dl = t - c.currentTime;
        const m = pat.mel[i], b = pat.bas[i];
        if (m) this.lead(midi(this.deg(m, minor) + 12 + cfg.transpose), s16 * 3, 0.11, dl, this.music);
        if (b) this.tone(midi(this.deg(b, minor) - 12 + cfg.transpose), s16 * (cfg.bass === 'square' ? 1.5 : 5), {type: cfg.bass, gain: cfg.bass === 'square' ? 0.07 : 0.14, delay: dl, attack: 0.02}, this.music);
        if (cfg.perc >= 1 && i % 4 === 2) this.noise(0.04, {type: 'highpass', freq: 6000, gain: 0.04, delay: dl}, this.music);
        if (cfg.perc >= 2 && i % 8 === 0) this.noise(0.08, {type: 'lowpass', freq: 250, gain: 0.16, delay: dl}, this.music);
        if (cfg.perc >= 2 && i % 8 === 4) this.noise(0.06, {type: 'bandpass', freq: 1800, q: 1.5, gain: 0.1, delay: dl}, this.music);
        if (cfg.perc === 0 && i % 8 === 4) this.noise(0.05, {type: 'highpass', freq: 7000, gain: 0.025, delay: dl}, this.music);
        this.nextT += s16; this.step++;
      }
      this.cfg.lead = savedLead;
    },
    setWorld(cfg) { this.cfg = Object.assign({}, cfg); },
    setBoss(on) { if (this.boss === on) return; this.boss = on; if (this.playing) { this.step = 0; } },
    startMusic() { this.init(); if (!this.ctx || this.playing) return; this.playing = true; this.step = 0; this.nextT = this.ctx.currentTime + 0.05; clearInterval(this.timer); this.timer = setInterval(() => this.schedule(), 40); this.music.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.05); },
    stopMusic() { clearInterval(this.timer); this.playing = false; if (this.music && this.ctx) this.music.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.1); },
    duck(sec) { if (this.music && this.ctx && this.playing) { this.music.gain.setTargetAtTime(0.12, this.ctx.currentTime, 0.05); this.music.gain.setTargetAtTime(0.5, this.ctx.currentTime + sec, 0.4); } },
    /* ---------- Toffo's voice ----------
       The browser's speech voices differ a lot in quality. Novelty and old formant voices (Fred, Zarvox, Eddy...) sound like robots,
       so they are excluded; natural / premium voices are preferred; a moderate pitch keeps a soft childlike timbre without the chipmunk effect. */
    voiceCfg: {uri: '', pitch: 'kind', on: true},
    GOOD: [/Google US English/i, /Samantha/i, /Microsoft (Aria|Jenny|Ana|Emma|Michelle|Sara|Zira|Libby|Sonia|Maisie)/i, /Karen/i, /Moira/i, /Tessa/i, /Ava/i, /Allison/i, /Susan/i, /Nicky/i, /Fiona/i, /Google UK English Female/i, /Serena/i, /Kate/i, /Zoe/i, /Joelle/i],
    BAD: /(Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley|Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Wobble|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Zarvox|Junior|Ralph|Fred|Kathy|Hysterical|Deranged|Princess|eSpeak|Agnes|Bruce|Vicki|Victoria|Bruce|Rishi|Novelty)/i,
    rank(v) {
      const n = v.name || '', l = v.lang || ''; let s = 0;
      if (this.BAD.test(n)) return -1;
      if (/^en[-_]?US/i.test(l)) s += 30; else if (/^en[-_]?GB/i.test(l)) s += 24; else if (/^en/i.test(l)) s += 18; else return -1;
      const gi = this.GOOD.findIndex(re => re.test(n)); if (gi >= 0) s += 20 - gi;
      if (/natural|neural|premium|enhanced|online/i.test(n)) s += 8;
      if (/female|woman|girl/i.test(n)) s += 2;
      return s;
    },
    voiceList() {
      try { const all = speechSynthesis.getVoices(); const en = all.map(v => ({v, s: this.rank(v)})).filter(x => x.s >= 0).sort((a, b) => b.s - a.s).map(x => x.v); return en.length ? en : all; } catch (e) { return []; }
    },
    pickVoice() {
      const list = this.voiceList(); if (!list.length) return null;
      if (this.voiceCfg.uri) { const v = list.find(v => v.voiceURI === this.voiceCfg.uri || v.name === this.voiceCfg.uri); if (v) return v; }
      return list[0];
    },
    loadVoiceCfg() { try { Object.assign(this.voiceCfg, JSON.parse(localStorage.getItem('pookie-voice') || '{}') || {}); } catch (e) {} },
    saveVoiceCfg() { try { localStorage.setItem('pookie-voice', JSON.stringify(this.voiceCfg)); } catch (e) {} },
    /* Toffo's lines are recorded audio files (see tools/mkvoice.py); the browser's speech synthesis is only the fallback */
    voiceBuf: {}, voiceSrc: null, voiceReq: 0,
    preloadVoice() {
      if (this.voicePreloaded || !this.ctx || !G.VOX) return; this.voicePreloaded = true;
      for (const list of Object.values(G.VOX || {})) for (const file of list) this.loadVoice(file);
    },
    loadVoice(file) {
      if (this.voiceBuf[file]) return this.voiceBuf[file];
      const p = fetch(file).then(r => r.arrayBuffer()).then(b => new Promise((res, rej) => this.ctx.decodeAudioData(b, res, rej))).catch(e => { console.warn('voice load failed ' + file, e && e.message); return null; });
      this.voiceBuf[file] = p; return p;
    },
    playFile(file, gain) {
      this.init(); if (!this.ctx || this.muted) return;
      this.loadVoice(file).then(buf => { if (!buf) return; const s = this.ctx.createBufferSource(); s.buffer = buf; const g = this.ctx.createGain(); g.gain.value = gain || 1; s.connect(g).connect(this.master); s.start(); });
    },
    /* Toffo's voice: real human vocalizations (p/vox.js), Mario-style. A spoken line picks a fitting sound, the bubble shows the words. */
    vox(cat, o = {}) {
      if (!this.voiceCfg.on || this.muted) return false;
      const list = G.VOX && G.VOX[cat]; if (!list || !list.length) return false;
      this.init(); if (!this.ctx) return false;
      const now = this.ctx.currentTime; if (!o.force && now < (this.voxT || 0)) return false;
      if (o.p !== undefined && Math.random() > o.p) return false;
      this.voxT = now + (o.gap || 0.32);
      let k = Math.floor(Math.random() * list.length); if (list.length > 1 && k === this.voxLast) k = (k + 1) % list.length; this.voxLast = k;
      const file = list[k], req = ++this.voiceReq;
      this.loadVoice(file).then(buf => {
        if (!buf || req !== this.voiceReq) return;
        try { if (this.voiceSrc) this.voiceSrc.stop(); } catch (e) {}
        const s = this.ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = o.rate || 1; const g = this.ctx.createGain(); g.gain.value = (o.gain || 1) * 0.95; s.connect(g).connect(this.master); s.start(this.ctx.currentTime + (o.delay || 0)); this.voiceSrc = s;
        if (buf.duration > 0.6) this.duck(buf.duration);
      });
      return true;
    },
    say(text, o = {}) {
      const line = G.VOICE_LINES && G.VOICE_LINES[text];
      const cat = line ? line.cat : (o.sad ? 'sad' : (o.happy ? 'cheer' : 'call'));
      if (!cat || cat === 'none') return false;
      return this.vox(cat, {force: true});
    },
    sayTTS(text, o = {}) {
      this.duck(2.2);
      try {
        if (!('speechSynthesis' in window)) return false;
        const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.volume = 1;
        const v = this.pickVoice(); if (v) { u.voice = v; u.lang = v.lang || 'en-US'; }
        const base = this.voiceCfg.pitch === 'natur' ? 1.0 : (this.voiceCfg.pitch === 'hoch' ? 1.5 : 1.25);
        u.pitch = Math.min(2, Math.max(0.5, base + (o.sad ? -0.12 : 0) + (o.happy ? 0.08 : 0)));
        u.rate = o.sad ? 0.9 : 1.0;
        speechSynthesis.cancel(); speechSynthesis.speak(u); return true;
      } catch (e) { return false; }
    },
  };
  A.loadVoiceCfg();
  try { if ('speechSynthesis' in window) { speechSynthesis.getVoices(); speechSynthesis.addEventListener('voiceschanged', () => { speechSynthesis.getVoices(); if (A.onVoices) A.onVoices(); }); } } catch (e) {}
})();
