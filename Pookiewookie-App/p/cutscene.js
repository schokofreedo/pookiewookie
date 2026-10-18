/* The Starway Home: the story cutscenes. The boss intro plays before every tower level, the outro after the boss is beaten
   (data: p/cutscenes.js). Cinematic staging: letterbox bars, a cached world backdrop with vignette and spotlight, the game's own
   hero and boss renderers at cinema size, typewriter speech bubbles with name tags, the clue item with sparkles, the "next stop"
   card and synthesized stings. API (called by game.js): G.cut.play(key, kind, done) · update() at 60 Hz · frame(ctx) · next() · skip(). */
(function () {
  const G = window.PW = window.PW || {}, TAU = Math.PI * 2, VH = 270, BAR = 24, GY = 226, CPS = 30;
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de);
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v), lerp = (a, b, k) => a + (b - a) * k, ss = (t, a, b) => { const k = clamp((t - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  const backOut = k => { k = clamp(k, 0, 1) - 1; return k * k * (2.70158 * k + 1.70158) + 1; };
  const rnd = (a, b) => a + Math.random() * (b - a), VW = () => G.VW || 480;
  const FONT = '"Fredoka", "Nunito", system-ui, sans-serif';
  /* ---------- colours ---------- */
  const cc = new Map();
  function rgb(h) { let c = cc.get(h); if (c) return c; if (h[0] === '#') { const s = h.length < 7 ? h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h.slice(1, 7), n = parseInt(s, 16) || 0; c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; } else { const m = h.match(/[\d.]+/g) || [128, 128, 128]; c = [+m[0], +m[1], +m[2]]; } cc.set(h, c); return c; }
  const shade = (h, f) => { const q = rgb(h), t = f > 0 ? 255 : 0, a = Math.abs(f); return 'rgb(' + Math.round(lerp(q[0], t, a)) + ',' + Math.round(lerp(q[1], t, a)) + ',' + Math.round(lerp(q[2], t, a)) + ')'; };
  const rgba = (h, a) => { const q = rgb(h); return 'rgba(' + q[0] + ',' + q[1] + ',' + q[2] + ',' + a + ')'; };
  /* ---------- shapes and text ---------- */
  function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0.01, r), 0, TAU); }
  function ell(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); }
  function fs(g, fill, stroke, lw) { if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 1; g.stroke(); } }
  function star(g, x, y, r1, r2, n) { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, r = i % 2 ? r2 : r1; if (i) g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); }
  function heart(g, x, y, s) { g.beginPath(); g.moveTo(x, y + s * 0.95); g.bezierCurveTo(x - s * 1.35, y, x - s * 0.9, y - s * 1.1, x, y - s * 0.4); g.bezierCurveTo(x + s * 0.9, y - s * 1.1, x + s * 1.35, y, x, y + s * 0.95); g.closePath(); }
  function puffs(g, x, y, w, h) { ell(g, x + w / 2, y + h * 0.72, w / 2, h * 0.28); g.fill(); circ(g, x + w * 0.28, y + h * 0.52, h * 0.42); g.fill(); circ(g, x + w * 0.52, y + h * 0.42, h * 0.5); g.fill(); circ(g, x + w * 0.76, y + h * 0.55, h * 0.38); g.fill(); }
  function font(g, px, wt) { g.font = (wt || 700) + ' ' + px + 'px ' + FONT; g.textBaseline = 'middle'; }
  function txt(g, t, x, y, px, col, align, ol, lw, wt) { font(g, px, wt); g.textAlign = align || 'center'; if (ol) { g.lineJoin = 'round'; g.strokeStyle = ol; g.lineWidth = lw || px * 0.3; g.strokeText(t, x, y); } g.fillStyle = col; g.fillText(t, x, y); }
  const wrapCache = new Map();
  function wrap(g, text, max) {
    const key = text + '|' + g.font + '|' + Math.round(max); let r = wrapCache.get(key); if (r) return r;
    const words = text.split(' '), lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && g.measureText(t).width > max) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur); r = {lines, w: Math.max(...lines.map(l => g.measureText(l).width))}; if (wrapCache.size > 200) wrapCache.clear(); wrapCache.set(key, r); return r;
  }
  function jagged(g, x, y, w, h, amp, step) {
    const pts = []; let i = 0;
    for (let px = x; px < x + w; px += step, i++) pts.push([px, y + (i % 2 ? amp : -amp)]);
    for (let py = y; py < y + h; py += step, i++) pts.push([x + w + (i % 2 ? amp : -amp), py]);
    for (let px = x + w; px > x; px -= step, i++) pts.push([px, y + h + (i % 2 ? amp : -amp)]);
    for (let py = y + h; py > y; py -= step, i++) pts.push([x + (i % 2 ? amp : -amp), py]);
    g.beginPath(); pts.forEach((p, j) => j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath();
  }

  /* ---------- sounds (all synthesized through p/audio.js; silent when the audio is muted or not started yet) ---------- */
  const S = f => { const A = G.audio; if (!A || !A.ctx || A.muted) return; try { f(A); } catch (e) {} };
  const snd = {
    tick(boss) { S(A => boss ? A.tone(100 + Math.random() * 70, 0.07, {type: 'square', gain: 0.03, slide: 80, attack: 0.004}) : A.tone(1400 + Math.random() * 600, 0.035, {type: 'sine', gain: 0.03})); },
    pop() { S(A => A.tone(700, 0.09, {type: 'sine', slide: 1300, gain: 0.06})); },
    step() { S(A => A.noise(0.05, {type: 'lowpass', freq: 500, gain: 0.07})); },
    laugh() { S(A => [392, 349, 311, 277].forEach((f, i) => { A.tone(f, 0.22, {type: 'square', gain: 0.07, slide: f * 0.84, slideDur: 0.2, delay: i * 0.21, attack: 0.01}); A.tone(f * 0.5, 0.22, {type: 'sawtooth', gain: 0.03, delay: i * 0.21}); A.noise(0.09, {type: 'bandpass', freq: 700, q: 1.2, gain: 0.08, delay: i * 0.21}); })); },
    taunt() { S(A => [262, 247, 233, 220].forEach((f, i) => A.tone(f, 0.16, {type: 'square', gain: 0.045, delay: i * 0.13}))); },
    angry() { S(A => { A.tone(160, 0.55, {type: 'sawtooth', slide: 720, slideDur: 0.45, gain: 0.12, attack: 0.02}); A.noise(0.45, {type: 'bandpass', freq: 400, freqTo: 2200, q: 0.8, gain: 0.15}); A.tone(80, 0.7, {type: 'square', gain: 0.07}); A.noise(0.2, {type: 'lowpass', freq: 600, gain: 0.25, delay: 0.05}); }); },
    dizzy() { S(A => { for (let i = 0; i < 4; i++) A.tone(540 - i * 70, 0.38, {type: 'sine', slide: 430 - i * 70, slideDur: 0.3, gain: 0.07, delay: i * 0.26}); }); },
    plead() { S(A => { A.tone(440, 0.5, {type: 'triangle', slide: 290, gain: 0.07}); A.tone(330, 0.5, {type: 'triangle', slide: 230, gain: 0.05, delay: 0.3}); }); },
    hero(m) { S(A => { if (m === 'angry') { A.tone(330, 0.12, {type: 'triangle', slide: 660, gain: 0.1}); A.tone(440, 0.16, {type: 'triangle', slide: 900, gain: 0.1, delay: 0.1}); } else if (m === 'happy') [784, 1047, 1319].forEach((f, i) => A.bell(f, 0.3, 0.1, i * 0.08)); else if (m === 'wide') { A.tone(600, 0.25, {type: 'triangle', slide: 1500, gain: 0.09}); A.bell(2093, 0.2, 0.06, 0.22); } else if (m === 'sad') A.tone(330, 0.6, {type: 'sine', slide: 220, gain: 0.09}); else A.bell(988, 0.18, 0.07, 0); }); },
    sting() { S(A => { A.noise(0.6, {type: 'lowpass', freq: 1200, freqTo: 80, gain: 0.4}); A.tone(55, 1.4, {type: 'sawtooth', slide: 38, slideDur: 1.2, gain: 0.18}); [220, 262, 311, 392].forEach(f => A.tone(f, 1.2, {type: 'sawtooth', gain: 0.03, attack: 0.02, delay: 0.02})); A.tone(110, 1.2, {type: 'square', gain: 0.05}); }); },
    crack() { S(A => { A.noise(0.25, {type: 'highpass', freq: 2500, gain: 0.25}); A.noise(0.5, {type: 'lowpass', freq: 900, freqTo: 100, gain: 0.3, delay: 0.04}); }); },
    thud() { S(A => { A.noise(0.28, {type: 'lowpass', freq: 300, gain: 0.4}); A.tone(75, 0.3, {slide: 35, gain: 0.3}); }); },
    swoop() { S(A => A.noise(0.6, {type: 'bandpass', freq: 1400, freqTo: 300, q: 0.8, gain: 0.15})); },
    rise() { S(A => { A.noise(1.0, {type: 'bandpass', freq: 200, freqTo: 900, q: 0.7, gain: 0.2}); A.tone(60, 1.0, {type: 'sine', slide: 130, gain: 0.2}); }); },
    sparkle() { S(A => { [1047, 1319, 1568, 2093, 2637, 3136].forEach((f, i) => A.bell(f, 0.5, 0.11, i * 0.07)); A.noise(0.8, {type: 'highpass', freq: 5000, gain: 0.05, delay: 0.1}); }); },
    whoosh() { S(A => A.noise(0.5, {type: 'bandpass', freq: 300, freqTo: 2400, q: 0.9, gain: 0.14})); },
    ding() { S(A => { A.bell(1568, 0.5, 0.12, 0); A.bell(2093, 0.7, 0.1, 0.1); }); },
    cut() { S(A => { A.noise(0.35, {type: 'highpass', freq: 1500, gain: 0.3}); A.tone(130, 0.5, {type: 'sawtooth', slide: 60, gain: 0.18}); [262, 311, 392].forEach(f => A.tone(f, 0.5, {type: 'square', gain: 0.04})); }); },
    mallo() { S(A => [1047, 1319, 1568, 2093].forEach((f, i) => A.bell(f, 0.35, 0.1, i * 0.09))); },
  };

  /* ---------- state ---------- */
  const C = {active: false, key: '', kind: 'boss', W: null, D: null, done: null, t: 0, fr: 0, ph: 'in', li: -1, ln: null, zoom: 1, zoomT: 1, shake: 0, flash: 0, red: 0, fade: 1, fading: false, bars: 0, parts: [], amb: [], item: null, dest: 0, cutT: 0, spot: 0, bg: null, bgKey: '', finished: false, kraken: false, sub: false, introLen: 2.9, loom: 0, bolt: 0, bossS: 3, flyer: false};
  const H = {x: 0, tx: 0, walk: true, mood: 'cool', mt: 0, pose: 'idle', stepT: 0, name: 'Toffo'}, B = {x: 0, y: 0, st: 'hidden', mood: 'idle', mt: 0, e: null, landT: 0, ex: 0}, M = {on: false, x: 0, tx: 0, run: false, mood: 'happy', mt: 0, caged: false};
  const worldFor = key => (G.L && G.L.world && G.L.world.key === key) ? G.L.world : (G.WORLDS || []).find(w => w.key === key);
  const heroName = () => { const id = (G.S && G.S.hero) || 'wookie', h = G.heroes && G.heroes.list && G.heroes.list.find(x => x.id === id); return (h && h.name) || (G.NAMES && G.NAMES.hero) || 'Toffo'; };
  const heroCol = () => { const id = (G.S && G.S.hero) || 'wookie', h = G.heroes && G.heroes.list && G.heroes.list.find(x => x.id === id); return (h && h.color) || '#b9834a'; };
  const outfit = () => (G.S && G.S.outfitOverride) || (C.W && C.W.key) || 'wiese';
  const lineText = l => (G.lang === 'en' && l.en) ? l.en : l.de;
  const heroX = () => Math.round(VW() * 0.27), bossX = () => Math.round(VW() * 0.7);

  function finish() { if (C.finished) return; C.finished = true; C.active = false; const d = C.done; C.done = null; if (d) { try { d(); } catch (e) { console.error('CUT_DONE_ERROR ' + (e && e.message)); } } }
  function startFade(dur) { if (C.fading) return; C.fading = true; C.fadeDur = dur || 0.45; C.ph = 'fade'; }
  function burst(x, y, n, k, col, sp) { for (let i = 0; i < n; i++) { const a = rnd(0, TAU), v = rnd(0.4, 1) * (sp || 2); C.parts.push({k, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (k === 'dust' ? 0.6 : 0), t: 0, life: rnd(0.4, 0.9), col, r: rnd(1.5, 3.5)}); } }
  function dust(x, n) { const gr = C.W.ground || {}; for (let i = 0; i < n; i++) C.parts.push({k: 'dust', x: x + rnd(-26, 26), y: GY + rnd(-2, 2), vx: rnd(-3, 3), vy: rnd(-2.2, -0.3), t: 0, life: rnd(0.45, 0.8), col: shade(gr.dirt || '#c9a060', 0.25), r: rnd(2.5, 5)}); }

  function play(key, kind, done) {
    const W = worldFor(key), D = G.CUTS && G.CUTS[key] && G.CUTS[key][kind];
    if (!W || !D || !D.lines || !D.lines.length) { if (done) done(); return; }
    if (!G.L || !G.L.world) G.L = {world: W, cols: [], w: 0, h: 15};   /* draw.js reads G.L.world.boss for the boss colours */
    Object.assign(C, {active: true, key, kind, W, D, done, t: 0, fr: 0, ph: 'in', li: -1, ln: null, zoom: 1, zoomT: 1, shake: 0, flash: 0, red: 0, fade: 1, fading: false, bars: 0, parts: [], amb: [], item: null, dest: 0, cutT: 0, spot: kind === 'outro' ? 0.8 : 0, bg: null, bgKey: '', finished: false, loom: 0, bolt: 0, fadeDur: 0.45});
    C.kraken = D.draw === 'kraken'; C.sub = key === 'unterwasser'; C.flyer = !C.kraken && W.boss && W.boss.kind === 'flyer'; C.bossS = key === 'schoko' ? 2.6 : 3; C.introLen = kind === 'boss' ? 2.9 : 0.9;
    Object.assign(H, {x: kind === 'boss' ? -60 : heroX(), tx: heroX(), walk: kind === 'boss', mood: 'cool', mt: 0, stepT: 0, name: heroName(), win: kind === 'outro' ? 1.3 : 0});
    const bk = (W.boss && W.boss.kind) || 'hopper';
    Object.assign(B, {x: bossX(), y: 0, st: kind === 'boss' ? 'hidden' : 'idle', mood: kind === 'boss' ? 'idle' : 'dizzy', mt: 0, landT: 0, ex: 0, e: {kind: 'boss', look: bk, x: 0, y: 0, w: 30, h: 30, alive: true, active: true, anim: 0, dir: -1, flash: 0, hp: 5, maxHp: 5, t: 0, phase: 'idle', onGround: true, landed: false, vy: 0, seed: 0.3, charge: 0, burst: 0}});
    const cage = key === 'weltraum';
    Object.assign(M, {on: cage, caged: cage, x: cage ? Math.round(VW() * 0.9) : VW() + 40, tx: 0, run: false, mood: cage ? 'sad' : 'happy', mt: 0});
    for (let i = 0; i < 60; i++) ambient(true);
  }
  function snapIntro() { H.x = H.tx; H.walk = false; B.st = 'idle'; B.y = 0; C.spot = C.kind === 'outro' ? 0.8 : 1; C.loom = 0; C.t = Math.max(C.t, C.introLen); }
  function startLine(i) {
    const L = C.D.lines; if (i >= L.length) { endScene(); return; }
    const l = L[i], text = lineText(l); C.li = i;
    C.ln = {who: l.who, mood: l.mood, item: l.item, text, n: text.length, typed: 0, lt: 0, done: false, hold: 1.6 + 0.055 * text.length, ht: 0, pop: 0};
    C.ph = 'line'; C.zoomT = 1; snd.pop();
    if (l.who === 'boss') {
      B.mood = l.mood; B.mt = 0; const e = B.e; e.hp = l.mood === 'angry' ? 2 : 5; e.phase = l.mood === 'angry' ? (e.look === 'charger' ? 'charge' : (e.look === 'flyer' ? 'swoop' : 'idle')) : 'idle'; e.charge = l.mood === 'angry' ? 1 : 0;
      if (l.mood === 'laugh') { snd.laugh(); C.flash = Math.max(C.flash, 0.45); C.shake = Math.max(C.shake, 5); }
      else if (l.mood === 'taunt') snd.taunt();
      else if (l.mood === 'angry') { snd.angry(); C.zoomT = 1.32; C.red = 1; C.flash = 0.6; C.shake = 7; }
      else if (l.mood === 'dizzy') snd.dizzy();
      else if (l.mood === 'plead') snd.plead();
    } else if (l.who === 'toffo') { H.mood = l.mood; H.mt = 0; snd.hero(l.mood); if (l.mood === 'angry') C.shake = Math.max(C.shake, 2); }
    else if (l.who === 'mallo') { if (!M.on) { M.on = true; M.x = VW() + 40; } M.caged = false; M.run = true; M.tx = H.x + 46; M.mood = l.mood; M.mt = 0; snd.mallo(); }
    else if (l.who === 'clue') { C.item = {id: l.item, t: 0, x: H.x + 26, y: GY - 82}; burst(C.item.x, C.item.y, 22, 'spark', '#ffd84a', 2.6); snd.sparkle(); }
  }
  function advance() { startLine(C.li + 1); }
  function endScene() {
    if (C.kind === 'boss') { C.ph = 'cut'; C.cutT = 0; C.flash = 1; C.zoomT = 1.5; snd.cut(); }
    else { C.ph = 'dest'; C.dest = 0; C.ln = null; snd.whoosh(); }
  }
  function destName() { const k = C.D.next; if (k === 'finale') return tr('Schwarzes Loch!', 'Black hole!'); const w = (G.WORLDS || []).find(x => x.key === k); return w ? w.name : (k || ''); }

  /* ---------- update ---------- */
  function update() {
    if (!C.active) return; const dt = 1 / 60; C.t += dt; C.fr++;
    C.bars = Math.min(1, C.t / 0.5); C.shake = Math.max(0, C.shake - dt * 22); C.flash = Math.max(0, C.flash - dt * 3.2); C.red = Math.max(0, C.red - dt * 2.4); C.bolt = Math.max(0, C.bolt - dt);
    C.zoom += (C.zoomT - C.zoom) * (C.ph === 'cut' ? 0.25 : 0.09);
    if (!C.fading) C.fade = Math.max(0, 1 - C.t / 0.4); else { C.fade = Math.min(1, C.fade + dt / C.fadeDur); if (C.fade >= 1) { finish(); return; } }
    for (const p of C.parts) { p.t += dt; p.x += p.vx; p.y += p.vy; if (p.k === 'dust') { p.vy += 0.08; p.vx *= 0.94; } else if (p.k === 'spark') { p.vy += 0.03; p.vx *= 0.96; p.vy *= 0.96; } else if (p.k === 'sweat') p.vy += 0.15; else if (p.k === 'ink') { p.vx *= 0.97; p.vy *= 0.97; } }
    C.parts = C.parts.filter(p => p.t < p.life); if (C.parts.length > 120) C.parts.splice(0, C.parts.length - 120);
    ambient(false);
    if (C.ph === 'in') intro(dt); else if (C.ph === 'line') lineStep(dt); else if (C.ph === 'cut') { C.cutT += dt; C.flash = 1; if (C.cutT >= 0.35) finish(); } else if (C.ph === 'dest') { C.dest += dt; if (Math.abs(C.dest - 0.45) < dt * 0.51) snd.ding(); if (C.dest >= 3.4) startFade(0.5); }
    actors(dt);
  }
  function intro(dt) {
    const t = C.t;
    if (C.kind === 'outro') { if (t >= C.introLen) startLine(0); return; }
    /* 0..1.4 the hero walks in, 0.9..1.9 the looming shadow and the eyes, 1.9 the flash, the boss drops / swoops / rises, 2.35 impact, 2.9 the first line */
    H.x = lerp(-60, H.tx, ss(t, 0, 1.45)); H.walk = t < 1.45;
    if (H.walk) { H.stepT += dt; if (H.stepT > 0.2) { H.stepT = 0; snd.step(); if (C.sub) C.parts.push({k: 'bub', x: H.x - 40, y: GY - 28 + rnd(-6, 6), vx: -0.6, vy: rnd(-1.2, -0.6), t: 0, life: 1.2, col: '#fff', r: rnd(1.5, 3)}); } }
    C.loom = t < 1.9 ? ss(t, 0.9, 1.6) : 1 - ss(t, 1.9, 2.3);
    if (t >= 1.9 && B.st === 'hidden') { B.st = 'drop'; C.flash = 1; C.bolt = 0.16; snd.crack(); snd.sting(); if (C.flyer) snd.swoop(); if (C.kraken) snd.rise(); }
    if (B.st === 'drop') {
      const k = clamp((t - 1.9) / 0.45, 0, 1);
      if (C.kraken) { B.y = 150 * (1 - ss(t, 1.9, 2.5)); if (k > 0.2 && C.fr % 3 === 0) C.parts.push({k: 'bub', x: B.x + rnd(-50, 50), y: GY + 4, vx: rnd(-0.3, 0.3), vy: rnd(-2.2, -1), t: 0, life: 1, col: '#fff', r: rnd(1.5, 4)}); if (t >= 2.5) { B.st = 'idle'; B.y = 0; C.shake = 7; C.spot = 1; burst(B.x, GY - 40, 14, 'ink', '#2a1238', 3); } }
      else if (C.flyer) { const e = ss(t, 1.9, 2.5); B.ex = (VW() + 90 - B.x) * (1 - e); B.y = -70 * (1 - e); if (t >= 2.5) { B.st = 'idle'; B.ex = 0; B.y = 0; C.shake = 4; C.spot = 1; burst(B.x, GY - 50, 10, 'puff', '#fff', 2); } }
      else { B.y = -150 * (1 - k * k); B.e.vy = -3; if (k >= 1) { B.st = 'idle'; B.y = 0; B.e.vy = 0; B.e.landed = true; B.landT = 0.16; C.shake = 10; C.spot = 1; snd.thud(); dust(B.x, 20); } }
      if (B.st === 'idle') { H.mood = 'wide'; H.mt = 0; }   /* the hero is startled by the reveal until his first line */
    }
    C.spot = B.st === 'idle' ? Math.min(1, C.spot + dt * 2.5) : C.spot;
    if (t >= C.introLen) startLine(0);
  }
  function lineStep(dt) {
    const l = C.ln; l.lt += dt; l.pop = Math.min(1, l.pop + dt / 0.28);
    if (!l.done) { const want = Math.min(l.n, Math.floor(l.lt * CPS)); if (want > l.typed) { if (((want >> 1) !== (l.typed >> 1)) && l.who !== 'clue') snd.tick(l.who === 'boss'); l.typed = want; } if (l.typed >= l.n) l.done = true; }
    else { l.ht += dt; if (l.ht >= l.hold) advance(); }
  }
  function actors(dt) {
    H.mt += dt; B.mt += dt; M.mt += dt; if (H.win > 0) H.win -= dt;
    /* the layout follows the current logical width (G.VW can change with the viewport, also between boot and the first frame) */
    H.tx = heroX(); B.x = bossX(); if (!H.walk && C.ph !== 'in') H.x += (H.tx - H.x) * 0.2; if (M.caged) M.x = Math.round(VW() * 0.9); if (M.run) M.tx = H.x + 46; if (C.item) C.item.x = H.x + 26;
    if (B.landT > 0) { B.landT -= dt; if (B.landT <= 0) B.e.landed = false; }
    if (B.mood === 'laugh' && B.st === 'idle') { const ph = B.mt * 7.5, pp = (B.mt - dt) * 7.5; if (Math.floor(ph / Math.PI) !== Math.floor(pp / Math.PI) && B.mt < 2.3) { C.shake = Math.max(C.shake, C.kind === 'outro' ? 2.5 : 4.5); B.e.landed = true; B.landT = 0.1; if (C.kind === 'boss' && !C.flyer && !C.kraken) dust(B.x, 5); } }
    if (B.mood === 'plead' && C.fr % 14 === 0 && B.mt < 3) for (const d of [-1, 1]) C.parts.push({k: 'sweat', x: B.x + d * 24, y: GY - 48, vx: d * rnd(1, 2), vy: rnd(-2.2, -1.2), t: 0, life: 0.7, col: '#8fd3ff', r: 2.4});
    if (B.mood === 'angry' && C.kraken && C.fr % 5 === 0 && B.mt < 1.2) C.parts.push({k: 'ink', x: B.x - 30, y: GY - 70, vx: rnd(-4, -2), vy: rnd(-1.5, 1), t: 0, life: 0.9, col: '#2a1238', r: rnd(3, 6)});
    if (H.mood === 'sad' && C.fr % 30 === 0) C.parts.push({k: 'sweat', x: H.x + 9, y: GY - 52, vx: 0.3, vy: 0.4, t: 0, life: 0.8, col: '#8fd3ff', r: 2});
    if (M.on && M.run) { M.x += (M.tx - M.x) * 0.08; if (Math.abs(M.tx - M.x) < 1.5) { M.x = M.tx; M.run = false; burst(M.x, GY - 40, 10, 'spark', '#ff9eb0', 1.6); } }
    if (C.item) C.item.t += dt;
  }
  /* ambient weather per world: petals, bubbles, leaves, steam, snow, embers, twinkles */
  function ambient(pre) {
    const w = VW(), key = C.key, A = C.amb, dt = 1 / 60;
    if (!pre) { for (const p of A) { p.t += dt; p.x += p.vx; p.y += p.vy; if (p.sw) p.x += Math.sin(p.t * 2.2 + p.ph) * 0.5; } C.amb = A.filter(p => p.t < p.life); }
    const spawn = pre ? 1 : (key === 'schnee' ? (C.fr % 4 === 0) : key === 'lava' ? (C.fr % 6 === 0) : key === 'unterwasser' ? (C.fr % 11 === 0) : key === 'wiese' || key === 'dschungel' ? (C.fr % 18 === 0) : key === 'schoko' ? (C.fr % 12 === 0) : (C.fr % 9 === 0));
    if (!spawn || C.amb.length > 90) return;
    const life = rnd(3, 6), t0 = pre ? rnd(0, life) : 0;
    if (key === 'schnee') C.amb.push({k: 'snow', x: rnd(-20, w + 20), y: pre ? rnd(0, VH) : -6, vx: 0.15, vy: rnd(0.35, 0.7), t: t0, life, r: rnd(1, 2.4), sw: 1, ph: rnd(0, 9)});
    else if (key === 'wiese') C.amb.push({k: 'petal', x: rnd(-20, w + 20), y: pre ? rnd(0, VH) : -6, vx: 0.25, vy: rnd(0.3, 0.55), t: t0, life, r: rnd(1.5, 2.5), sw: 1, ph: rnd(0, 9), col: Math.random() < 0.5 ? '#ff9eb0' : '#fff'});
    else if (key === 'dschungel') C.amb.push({k: 'leaf', x: rnd(-20, w + 20), y: pre ? rnd(0, VH) : -6, vx: -0.3, vy: rnd(0.4, 0.7), t: t0, life, r: rnd(2, 3.2), sw: 1, ph: rnd(0, 9), col: Math.random() < 0.5 ? '#5fcf6a' : '#9be7a5'});
    else if (key === 'unterwasser') C.amb.push({k: 'bub', x: rnd(0, w), y: pre ? rnd(0, VH) : GY + 10, vx: 0, vy: -rnd(0.4, 0.9), t: t0, life, r: rnd(1, 3.2), sw: 1, ph: rnd(0, 9)});
    else if (key === 'lava') C.amb.push({k: 'ember', x: rnd(0, w), y: pre ? rnd(0, VH) : GY + 6, vx: rnd(-0.2, 0.2), vy: -rnd(0.5, 1.1), t: t0, life: rnd(2, 4), r: rnd(1, 2), sw: 1, ph: rnd(0, 9)});
    else if (key === 'schoko') C.amb.push({k: 'steam', x: B.x + rnd(-70, 70), y: GY - 4, vx: rnd(-0.1, 0.1), vy: -rnd(0.3, 0.6), t: t0, life: rnd(2, 3), r: rnd(3, 5), sw: 1, ph: rnd(0, 9)});
    else if (key === 'himmel' || key === 'weltraum') C.amb.push({k: 'twinkle', x: rnd(0, w), y: rnd(BAR, 150), vx: 0, vy: 0, t: t0, life: rnd(0.6, 1.4), r: rnd(1, 2.2)});
    else if (key === 'insel') C.amb.push({k: 'glint', x: rnd(0, w), y: rnd(GY - 78, GY - 40), vx: 0.2, vy: 0, t: t0, life: rnd(0.5, 1.2), r: 1.2});
  }

  /* ---------- the backdrop (cached per scene, drawn once at the backing-store scale) ---------- */
  function sun(g, x, y, r, col, halo) { const gr = g.createRadialGradient(x, y, r * 0.5, x, y, r * 3.2); gr.addColorStop(0, rgba(halo, 0.6)); gr.addColorStop(1, rgba(halo, 0)); g.fillStyle = gr; g.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4); circ(g, x, y, r); fs(g, col); }
  function cloud(g, x, y, w, h, col, dark) { g.fillStyle = col; puffs(g, x, y, w, h); g.save(); g.beginPath(); g.rect(x - 2, y + h * 0.62, w + 4, h); g.clip(); g.fillStyle = dark; puffs(g, x, y, w, h); g.restore(); }
  function hills(g, w, base, amp, n, seed, col) { g.fillStyle = col; for (let i = 0; i < n; i++) { const cx = (i + 0.5) * w / n + Math.sin(seed + i * 3.1) * w / n * 0.3, r = amp * (0.7 + 0.3 * Math.abs(Math.sin(seed * 2 + i * 1.7))); circ(g, cx, base + r * 0.35, r); g.fill(); } g.fillRect(0, base, w, VH - base); }
  function lolli(g, x, y, r, col, stick) { g.strokeStyle = '#fff'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + stick); g.stroke(); circ(g, x, y, r); fs(g, col, shade(col, -0.3), 1.2); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = r * 0.28; g.beginPath(); g.arc(x, y, r * 0.55, 0.3, 2.4); g.stroke(); g.beginPath(); g.arc(x, y, r * 0.2, 2.5, 5.5); g.stroke(); }
  function cupcake(g, x, y, s, cup, cream, cherry) { const h = s * 0.55; g.beginPath(); g.moveTo(x - s * 0.45, y - h); g.lineTo(x + s * 0.45, y - h); g.lineTo(x + s * 0.34, y); g.lineTo(x - s * 0.34, y); g.closePath(); fs(g, cup, shade(cup, -0.3), 1); g.fillStyle = cream; for (const [dx, dy, r] of [[-0.22, -0.1, 0.22], [0.22, -0.1, 0.22], [0, -0.25, 0.28], [0, -0.45, 0.18]]) { circ(g, x + dx * s, y - h + dy * s, r * s); g.fill(); } circ(g, x, y - h - s * 0.62, s * 0.11); fs(g, cherry); }
  function palm(g, x, y, h, lean, trunk, leaf) { g.strokeStyle = trunk; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * 0.3, y - h * 0.6, x + lean, y - h); g.stroke(); const tx = x + lean, ty = y - h; for (let i = 0; i < 6; i++) { const a = -Math.PI * 0.95 + i * Math.PI * 0.38, lw = h * 0.5; g.fillStyle = i % 2 ? leaf : shade(leaf, -0.15); g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + Math.cos(a) * lw * 0.6, ty + Math.sin(a) * lw * 0.6 - 6, tx + Math.cos(a) * lw, ty + Math.sin(a) * lw + 6); g.quadraticCurveTo(tx + Math.cos(a) * lw * 0.5, ty + Math.sin(a) * lw * 0.5 + 3, tx, ty + 2); g.fill(); } circ(g, tx - 2, ty + 3, 2.4); fs(g, '#6b4a2a'); circ(g, tx + 3, ty + 4, 2.4); fs(g, '#6b4a2a'); }
  function pine(g, x, y, h, col, snow) { const w = h * 0.55; g.fillStyle = '#5a3a1a'; g.fillRect(x - 1.5, y - h * 0.2, 3, h * 0.2); for (let i = 0; i < 3; i++) { const ty = y - h * (0.2 + i * 0.27), bw = w * (1 - i * 0.22), th = h * 0.36; g.fillStyle = i % 2 ? shade(col, 0.08) : col; g.beginPath(); g.moveTo(x - bw, ty); g.quadraticCurveTo(x, ty + 2, x + bw, ty); g.lineTo(x, ty - th); g.closePath(); g.fill(); if (snow) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x - bw * 0.7, ty - th * 0.28); g.quadraticCurveTo(x, ty - th * 0.1, x + bw * 0.7, ty - th * 0.28); g.lineTo(x, ty - th); g.closePath(); g.fill(); } } }
  function tree(g, x, y, h, trunk, c1, c2) { g.fillStyle = trunk; g.fillRect(x - h * 0.06, y - h * 0.45, h * 0.12, h * 0.45); g.fillStyle = c1; for (const [dx, dy, r] of [[0, -0.62, 0.36], [-0.22, -0.5, 0.26], [0.22, -0.5, 0.26]]) { circ(g, x + dx * h, y + dy * h, r * h); g.fill(); } g.fillStyle = c2; circ(g, x - h * 0.08, y - h * 0.72, h * 0.2); g.fill(); circ(g, x + h * 0.14, y - h * 0.6, h * 0.14); g.fill(); }
  function tower(g, x, y, h, W, alpha) {
    const b = W.block, w = h * 0.42, top = y - h; g.save(); g.globalAlpha = alpha;
    rr(g, x - w / 2, top, w, h + 4, 4); const gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0); gr.addColorStop(0, shade(b.a, -0.1)); gr.addColorStop(0.35, b.b); gr.addColorStop(1, shade(b.a, -0.3)); fs(g, gr, b.c, 1.3);
    g.save(); rr(g, x - w / 2, top, w, h + 4, 4); g.clip(); g.strokeStyle = rgba(b.c, 0.3); g.lineWidth = 0.8; for (let r = 0; r < h / 8; r++) { const yy = top + 6 + r * 8; g.beginPath(); g.moveTo(x - w / 2, yy); g.lineTo(x + w / 2, yy); g.stroke(); for (let i = 0; i < 4; i++) { const xx = x - w / 2 + (r % 2) * 6 + i * 12; g.beginPath(); g.moveTo(xx, yy - 8); g.lineTo(xx, yy); g.stroke(); } } g.restore();
    for (let i = 0; i < 5; i++) { rr(g, x - w / 2 - 2 + i * (w + 4) / 4.6, top - 8, 8, 10, 1.5); fs(g, b.b, b.c, 1); }
    rr(g, x - w / 2 - 4, top - 1, w + 8, 5, 2); fs(g, shade(b.a, -0.15));
    g.beginPath(); g.moveTo(x - w / 2 + 6, top - 8); g.lineTo(x, top - h * 0.28); g.lineTo(x + w / 2 - 6, top - 8); g.closePath(); fs(g, '#ff6f9c', '#c9305f', 1);
    rr(g, x - 1, top - h * 0.28 - 14, 2, 14, 1); fs(g, '#fff'); g.beginPath(); g.moveTo(x + 1, top - h * 0.28 - 14); g.lineTo(x + 15, top - h * 0.28 - 9); g.lineTo(x + 1, top - h * 0.28 - 4); g.closePath(); fs(g, '#ffd84a');
    rr(g, x - 9, top + h * 0.22, 18, 24, 9); fs(g, '#8fd3ff', '#fff', 2); rr(g, x - 7, top + h * 0.62, 14, 28, 7); fs(g, '#c69c6d', '#8a5a2b', 1.2);
    g.restore();
  }
  function groundBand(g, W, w) {
    const gr = W.ground || {top: '#8fe0a0', edge: '#6cc482', dirt: '#f2d9a6', dot: '#ff9eb0', dot2: '#8fd3ff'};
    const dg = g.createLinearGradient(0, GY, 0, VH); dg.addColorStop(0, shade(gr.dirt, 0.08)); dg.addColorStop(1, shade(gr.dirt, -0.25)); g.fillStyle = dg; g.fillRect(0, GY, w, VH - GY);
    g.fillStyle = gr.top; g.fillRect(0, GY, w, 8); for (let i = 0; i < w / 14 + 1; i++) { circ(g, i * 14 + (i % 2) * 5, GY + 7, 3.2 + (i % 3)); g.fill(); }
    g.fillStyle = gr.edge; g.fillRect(0, GY + 7.5, w, 1.4); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, GY, w, 1.2);
    for (let i = 0; i < w / 22; i++) { const x = i * 22 + 7, y = GY + 14 + (i * 7) % 12; circ(g, x, y, 1.2); fs(g, shade(gr.dirt, -0.18)); if (i % 3 === 0) { circ(g, x + 9, y + 3, 1); fs(g, i % 2 ? gr.dot : gr.dot2); } }
  }
  function vignette(g, w) {
    const r = g.createRadialGradient(w / 2, VH * 0.5, VH * 0.35, w / 2, VH * 0.5, w * 0.75); r.addColorStop(0, 'rgba(20,8,30,0)'); r.addColorStop(1, 'rgba(20,8,30,.5)'); g.fillStyle = r; g.fillRect(0, 0, w, VH);
    const tg = g.createLinearGradient(0, 0, 0, 70); tg.addColorStop(0, 'rgba(20,8,30,.45)'); tg.addColorStop(1, 'rgba(20,8,30,0)'); g.fillStyle = tg; g.fillRect(0, 0, w, 70);
  }
  function shafts(g, w, col, n) { g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < n; i++) { const x = w * (0.15 + i * 0.7 / Math.max(1, n - 1)); const gr = g.createLinearGradient(0, 0, 0, GY); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 8, 0); g.lineTo(x + 14, 0); g.lineTo(x + 70, GY); g.lineTo(x + 20, GY); g.closePath(); g.fill(); } g.restore(); }
  function rock(g, x, y, w, h, col) { g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x - w * 0.3, y - h * 0.8); g.lineTo(x + w * 0.1, y - h); g.lineTo(x + w * 0.45, y - h * 0.5); g.lineTo(x + w / 2, y); g.closePath(); fs(g, col, shade(col, -0.35), 1.2); }
  function cave(g, x, base, w, h, col, inner) { g.beginPath(); g.moveTo(x - w / 2, base); g.quadraticCurveTo(x - w / 2, base - h, x, base - h); g.quadraticCurveTo(x + w / 2, base - h, x + w / 2, base); g.closePath(); fs(g, col, shade(col, -0.3), 2); g.beginPath(); g.moveTo(x - w * 0.36, base); g.quadraticCurveTo(x - w * 0.36, base - h * 0.78, x, base - h * 0.78); g.quadraticCurveTo(x + w * 0.36, base - h * 0.78, x + w * 0.36, base); g.closePath(); const gr = g.createLinearGradient(0, base - h * 0.78, 0, base); gr.addColorStop(0, inner); gr.addColorStop(1, shade(inner, 0.15)); fs(g, gr); }
  function saturn(g, x, y, r) { g.save(); g.translate(x, y); g.rotate(-0.3); g.strokeStyle = 'rgba(230,200,255,.4)'; g.lineWidth = r * 0.16; ell(g, 0, 0, r * 2.3, r * 0.42); g.stroke(); g.restore(); const gr = g.createLinearGradient(0, y - r, 0, y + r); gr.addColorStop(0, '#f6e2b8'); gr.addColorStop(0.5, '#d9a874'); gr.addColorStop(1, '#8a5a40'); circ(g, x, y, r); fs(g, gr); g.save(); circ(g, x, y, r); g.clip(); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x - r, y - r * 0.4, r * 2, r * 0.12); g.fillStyle = 'rgba(80,40,30,.18)'; g.fillRect(x - r, y + r * 0.1, r * 2, r * 0.1); g.restore(); g.save(); g.translate(x, y); g.rotate(-0.3); g.beginPath(); g.rect(-r * 3, 0, r * 6, r); g.clip(); g.strokeStyle = 'rgba(240,215,255,.8)'; g.lineWidth = r * 0.16; ell(g, 0, 0, r * 2.3, r * 0.42); g.stroke(); g.strokeStyle = 'rgba(150,100,200,.6)'; g.lineWidth = r * 0.05; ell(g, 0, 0, r * 2.5, r * 0.47); g.stroke(); g.restore(); }
  const BG = {
    wiese(g, W, w) { sun(g, w * 0.8, 60, 18, W.sun, '#ffe9a8'); cloud(g, w * 0.08, 48, 70, 26, '#fff', '#f1dcea'); cloud(g, w * 0.5, 36, 54, 20, '#fff', '#f1dcea'); cloud(g, w * 0.62, 84, 44, 16, '#fff', '#f1dcea'); hills(g, w, GY - 78, 46, 5, 1, W.hills[0]); for (let i = 0; i < 5; i++) lolli(g, w * (0.08 + i * 0.21), GY - 106 + (i % 2) * 8, 9, ['#ff9eb0', '#8fd3ff', '#ffd84a', '#b9a3ec', '#9be7a5'][i], 24); hills(g, w, GY - 44, 32, 7, 5, W.hills[1]); tower(g, bossX() - 92, GY - 26, 108, W, 0.92); cupcake(g, w * 0.12, GY - 36, 26, '#ff9eb0', '#fff', '#e0457b'); cupcake(g, w * 0.9, GY - 40, 22, '#8fd3ff', '#fff', '#e0457b'); lolli(g, w * 0.3, GY - 60, 7, '#9be7a5', 20); g.fillStyle = '#a8ecb4'; for (let i = 0; i < w / 50 + 1; i++) { circ(g, i * 50 + (i % 3) * 7, GY + 2, 11 + (i % 3) * 3); g.fill(); } },
    insel(g, W, w) { sun(g, w * 0.78, 52, 20, W.sun, '#fff6c8'); cloud(g, w * 0.1, 40, 60, 22, '#fff', '#dcefff'); cloud(g, w * 0.45, 56, 46, 18, '#fff', '#dcefff'); const sea = GY - 84; const sg = g.createLinearGradient(0, sea, 0, GY - 24); sg.addColorStop(0, '#8fe0ec'); sg.addColorStop(0.4, W.hills[0]); sg.addColorStop(1, W.hills[1]); g.fillStyle = sg; g.fillRect(0, sea, w, GY - 24 - sea); g.fillStyle = '#4fb3c3'; ell(g, w * 0.2, sea + 2, 46, 10); g.fill(); palm(g, w * 0.2 - 8, sea - 4, 18, -4, '#3a8a98', '#3a8a98'); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.2; for (let r = 0; r < 5; r++) { const y = sea + 12 + r * 11; g.beginPath(); for (let x = -10; x <= w + 10; x += 8) { const yy = y + Math.sin(x * 0.06 + r) * 1.6; x === -10 ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.stroke(); } g.fillStyle = '#ffe9a8'; for (let i = 0; i < w / 60 + 1; i++) { circ(g, i * 60 + 20, GY - 22, 18 + (i % 2) * 5); g.fill(); } g.fillRect(0, GY - 22, w, 30); cave(g, bossX(), GY + 2, 190, 128, '#6a5a60', '#2a1a28'); for (let i = 0; i < 5; i++) rock(g, bossX() - 100 + i * 50, GY + 2, 30 + (i % 2) * 10, 16 + (i % 3) * 6, '#7a6a70'); palm(g, w * 0.06, GY + 2, 86, -14, '#b9793f', '#3fbf6b'); palm(g, w * 0.17, GY + 2, 64, 10, '#b9793f', '#5fcf6a'); palm(g, w * 0.95, GY + 2, 74, 12, '#b9793f', '#3fbf6b'); g.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { ell(g, 40 + i * w * 0.2, GY + 4, 3.5, 2); g.fill(); } },
    unterwasser(g, W, w) { const wg = g.createLinearGradient(0, 0, 0, VH); wg.addColorStop(0, '#0b2f63'); wg.addColorStop(0.55, '#1b62a6'); wg.addColorStop(1, '#2f8fd0'); g.fillStyle = wg; g.fillRect(0, 0, w, VH); shafts(g, w, 'rgba(180,230,255,.28)', 4); g.fillStyle = '#0d2a52'; for (let i = 0; i < 7; i++) { circ(g, i * w / 6, GY - 20, 40 + (i % 3) * 14); g.fill(); } cave(g, bossX(), GY + 2, 230, 150, '#2a3a7a', '#0a0a2a'); const corals = ['#ff6f9c', '#ff9a2a', '#ffd84a', '#c86aff']; for (let i = 0; i < 6; i++) { const x = (i < 3 ? w * 0.05 + i * 38 : w * 0.86 + (i - 3) * 30), col = corals[i % 4]; g.strokeStyle = col; g.lineWidth = 5; g.lineCap = 'round'; for (let b = -1; b <= 1; b++) { g.beginPath(); g.moveTo(x, GY + 2); g.quadraticCurveTo(x + b * 10, GY - 22, x + b * 20, GY - 34 - (i % 2) * 10); g.stroke(); } circ(g, x + 22, GY - 8, 12); fs(g, shade(col, 0.2), shade(col, -0.2), 1.2); } g.fillStyle = '#2fb36a'; for (let i = 0; i < 8; i++) { const x = 30 + i * w / 8; g.beginPath(); g.moveTo(x - 3, GY + 2); g.quadraticCurveTo(x + 6, GY - 20, x - 2, GY - 42 - (i % 3) * 8); g.quadraticCurveTo(x - 4, GY - 20, x + 3, GY + 2); g.fill(); } g.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 12; i++) { circ(g, (i * 97) % w, 40 + (i * 61) % 170, 1 + (i % 3)); g.fill(); } },
    dschungel(g, W, w) { sun(g, w * 0.25, 46, 16, '#fff9d8', '#fff2a0'); g.fillStyle = '#4e9a64'; for (let i = 0; i < w / 54 + 1; i++) { circ(g, i * 54 + 20, GY - 90 + (i % 3) * 10, 34 + (i % 2) * 8); g.fill(); } g.fillRect(0, GY - 90, w, 100); g.fillStyle = W.hills[0]; for (let i = 0; i < w / 48 + 1; i++) { const x = i * 48 + 10; g.fillRect(x - 2, GY - 100, 4, 90); circ(g, x, GY - 104 + (i % 2) * 8, 22); g.fill(); circ(g, x - 14, GY - 92, 16); g.fill(); } g.fillRect(0, GY - 74, w, 80); /* temple behind the boss */ const bx = bossX(); for (let t = 0; t < 4; t++) { const tw = 150 - t * 34, th = 22; rr(g, bx - tw / 2, GY - 10 - (t + 1) * th, tw, th + 2, 3); fs(g, t % 2 ? '#6a7a62' : '#7a8a70', '#3a4a38', 1.2); g.fillStyle = '#4e9a64'; circ(g, bx - tw / 2 + 12, GY - 10 - (t + 1) * th + 4, 5); g.fill(); } rr(g, bx - 16, GY - 10 - 22, 32, 24, 4); fs(g, '#1a2a1a', '#3a4a38', 1.2); tree(g, w * 0.08, GY + 2, 150, '#5a3a1a', W.hills[1], '#3a8a55'); tree(g, w * 0.94, GY + 2, 130, '#5a3a1a', W.hills[1], '#3a8a55'); g.strokeStyle = '#1a4a30'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { const x = w * (0.15 + i * 0.16); g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + 10, 50, x - 6, 90 + (i % 3) * 25); g.stroke(); g.fillStyle = '#2a7a40'; for (let j = 0; j < 3; j++) { ell(g, x + 4 - j * 2, 30 + j * 24, 4, 2, 0.4); g.fill(); } } shafts(g, w, 'rgba(255,250,200,.3)', 3); g.fillStyle = '#2f8a46'; for (let i = 0; i < w / 60 + 1; i++) { const x = i * 60 + 20; for (let j = -2; j <= 2; j++) { g.beginPath(); g.moveTo(x, GY + 2); g.quadraticCurveTo(x + j * 8, GY - 14, x + j * 14, GY - 24 + Math.abs(j) * 6); g.quadraticCurveTo(x + j * 6, GY - 10, x + 3, GY + 2); g.fill(); } } for (let i = 0; i < 5; i++) { circ(g, 50 + i * w * 0.2, GY - 8, 3.2); fs(g, '#e04a7a'); circ(g, 50 + i * w * 0.2, GY - 8, 1.2); fs(g, '#ffd84a'); } },
    schoko(g, W, w) { sun(g, w * 0.8, 56, 16, W.sun, '#ffe0b0'); g.fillStyle = W.hills[0]; for (let i = 0; i < 4; i++) { const x = w * (0.1 + i * 0.27), ht = 90 + (i % 2) * 30; g.beginPath(); g.moveTo(x - 90, GY - 30); g.lineTo(x, GY - 30 - ht); g.lineTo(x + 90, GY - 30); g.closePath(); g.fill(); g.fillStyle = '#fff1dc'; g.beginPath(); g.moveTo(x - 26, GY - 30 - ht + 32); g.lineTo(x, GY - 30 - ht); g.lineTo(x + 26, GY - 30 - ht + 32); g.lineTo(x + 14, GY - 30 - ht + 26); g.lineTo(x + 4, GY - 30 - ht + 36); g.lineTo(x - 8, GY - 30 - ht + 27); g.lineTo(x - 16, GY - 30 - ht + 35); g.closePath(); g.fill(); g.fillStyle = W.hills[0]; } /* the chocolate waterfall behind the boss */ const bx = bossX(); const fg = g.createLinearGradient(bx - 36, 0, bx + 36, 0); fg.addColorStop(0, '#4a2210'); fg.addColorStop(0.5, '#8a5030'); fg.addColorStop(1, '#4a2210'); g.fillStyle = fg; g.fillRect(bx - 36, 60, 72, GY - 60); g.strokeStyle = 'rgba(255,230,200,.25)'; g.lineWidth = 2; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(bx - 30 + i * 10, 64); g.lineTo(bx - 30 + i * 10 + Math.sin(i) * 2, GY); g.stroke(); } g.fillStyle = '#fff1dc'; for (let i = 0; i < 8; i++) { circ(g, bx - 34 + i * 10, 62 + Math.sin(i) * 1.5, 5.5); g.fill(); } hills(g, w, GY - 26, 24, 8, 3, W.hills[1]); ell(g, bx, GY - 2, 96, 12); fs(g, W.liquid.a, shade(W.liquid.a, -0.3), 1.5); g.fillStyle = 'rgba(255,241,220,.85)'; for (let i = 0; i < 9; i++) { ell(g, bx - 70 + i * 17, GY - 4, 6, 3 + (i % 2) * 2); g.fill(); } for (let i = 0; i < 4; i++) { const x = i < 2 ? w * 0.08 + i * 46 : w * 0.88 + (i - 2) * 40; circ(g, x, GY - 12, 13); fs(g, i % 2 ? '#5a2e14' : '#8a5030', '#2e1408', 1.4); circ(g, x - 4, GY - 17, 4); fs(g, 'rgba(255,255,255,.3)'); g.strokeStyle = '#fff1dc'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 8, GY - 14); g.quadraticCurveTo(x, GY - 20, x + 8, GY - 12); g.stroke(); } for (let i = 0; i < 4; i++) { rr(g, w * 0.07 - 14, GY - 14 - i * 11, 28, 10, 2); fs(g, i % 2 ? '#e8b878' : '#d9a05a', '#8a5a2b', 1); } },
    schnee(g, W, w) { sun(g, w * 0.82, 50, 14, '#fff', '#e8f2ff'); g.save(); g.globalCompositeOperation = 'lighter'; for (let b = 0; b < 2; b++) { g.fillStyle = b ? 'rgba(120,255,190,.14)' : 'rgba(200,140,255,.14)'; g.beginPath(); for (let x = 0; x <= w; x += 20) { const y = 40 + b * 18 + Math.sin(x * 0.014 + b) * 14; x === 0 ? g.moveTo(x, y) : g.lineTo(x, y); } for (let x = w; x >= 0; x -= 20) g.lineTo(x, 72 + b * 16 + Math.sin(x * 0.012 + b + 1) * 12); g.closePath(); g.fill(); } g.restore(); for (let i = 0; i < 5; i++) { const x = w * (0.05 + i * 0.24), ht = 100 + (i % 2) * 36; g.fillStyle = W.hills[1]; g.beginPath(); g.moveTo(x - 90, GY - 40); g.lineTo(x, GY - 40 - ht); g.lineTo(x + 90, GY - 40); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x - 26, GY - 40 - ht + 34); g.lineTo(x, GY - 40 - ht); g.lineTo(x + 26, GY - 40 - ht + 34); g.lineTo(x + 12, GY - 40 - ht + 28); g.lineTo(x + 4, GY - 40 - ht + 38); g.lineTo(x - 8, GY - 40 - ht + 29); g.lineTo(x - 16, GY - 40 - ht + 37); g.closePath(); g.fill(); } hills(g, w, GY - 36, 30, 7, 3, W.hills[0]); for (let i = 0; i < 6; i++) pine(g, w * (0.04 + i * 0.19), GY - 30 + (i % 2) * 6, 40 + (i % 3) * 8, '#3a7a5a', true); cave(g, bossX(), GY + 2, 200, 130, '#a9cdf0', '#2a3a6a'); g.fillStyle = '#dff4ff'; for (let i = 0; i < 7; i++) { const x = bossX() - 72 + i * 24, l = 10 + (i % 3) * 8; g.beginPath(); g.moveTo(x - 5, GY - 98 + (i % 2) * 6); g.lineTo(x + 5, GY - 98 + (i % 2) * 6); g.lineTo(x, GY - 98 + l + (i % 2) * 6); g.closePath(); g.fill(); } pine(g, w * 0.08, GY + 2, 90, '#2f6a4e', true); pine(g, w * 0.94, GY + 2, 76, '#2f6a4e', true); const sx = w * 0.18; circ(g, sx, GY - 12, 14); fs(g, '#fff', '#b8c8e0', 1.2); circ(g, sx, GY - 36, 10); fs(g, '#fff', '#b8c8e0', 1.2); circ(g, sx - 3, GY - 38, 1.3); fs(g, '#2a1b2a'); circ(g, sx + 3, GY - 38, 1.3); fs(g, '#2a1b2a'); g.beginPath(); g.moveTo(sx, GY - 35); g.lineTo(sx + 9, GY - 33); g.lineTo(sx, GY - 32); g.closePath(); fs(g, '#ff9a2a'); g.fillStyle = '#fff'; for (let i = 0; i < 8; i++) { star(g, (i * 83) % w, GY - 4 + (i % 3), 2, 0.8, 4); g.fill(); } },
    lava(g, W, w) { sun(g, w * 0.78, 62, 20, '#ff6a2a', '#ff8a3a'); const vx = w * 0.62; g.fillStyle = W.hills[0]; g.beginPath(); g.moveTo(vx - 170, GY - 30); g.lineTo(vx - 22, GY - 170); g.lineTo(vx + 22, GY - 170); g.lineTo(vx + 170, GY - 30); g.closePath(); g.fill(); g.fillStyle = '#ff7a2a'; g.beginPath(); g.moveTo(vx - 22, GY - 170); g.lineTo(vx + 22, GY - 170); g.lineTo(vx + 36, GY - 138); g.lineTo(vx + 2, GY - 156); g.lineTo(vx - 30, GY - 130); g.closePath(); g.fill(); g.fillStyle = '#ffd24a'; g.beginPath(); g.moveTo(vx - 12, GY - 170); g.lineTo(vx + 12, GY - 170); g.lineTo(vx + 2, GY - 158); g.closePath(); g.fill(); for (let i = 0; i < 5; i++) { circ(g, vx + (i - 2) * 14, GY - 186 - (i % 2) * 10, 8 + (i % 3) * 3); fs(g, 'rgba(90,60,70,.6)'); } g.fillStyle = W.hills[1]; for (let i = 0; i < w / 50 + 1; i++) { const x = i * 50 + 10; g.beginPath(); g.moveTo(x - 30, GY - 20); g.lineTo(x - 10, GY - 56 + (i % 3) * 8); g.lineTo(x + 4, GY - 50); g.lineTo(x + 18, GY - 62 + (i % 3) * 10); g.lineTo(x + 36, GY - 20); g.closePath(); g.fill(); } g.fillRect(0, GY - 24, w, 30); const hz = g.createLinearGradient(0, GY - 80, 0, VH); hz.addColorStop(0, 'rgba(255,100,30,0)'); hz.addColorStop(1, 'rgba(255,120,40,.4)'); g.fillStyle = hz; g.fillRect(0, GY - 80, w, VH - GY + 80); ell(g, bossX() + 10, GY - 6, 120, 14); fs(g, '#ff6a1a', '#8a2a0a', 1.5); g.fillStyle = '#ffd24a'; for (let i = 0; i < 6; i++) { ell(g, bossX() - 80 + i * 36, GY - 8, 12, 3); g.fill(); } for (const x of [w * 0.1, w * 0.9]) { rr(g, x - 12, GY - 96, 24, 100, 5); fs(g, '#5a4a4a', '#2a1a1a', 1.5); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x + 4, GY - 96, 8, 100); } for (let i = 0; i < 6; i++) rock(g, w * (0.05 + i * 0.18), GY + 2, 26 + (i % 2) * 14, 14 + (i % 3) * 8, '#2a1418'); },
    himmel(g, W, w) { g.fillStyle = '#fff'; for (let i = 0; i < 70; i++) { circ(g, (i * 97.3) % w, (i * 53.7) % 150, 0.5 + (i % 3) * 0.4); fs(g, i % 5 ? '#fff' : '#ffe9a8'); } const mx = w * 0.82; const mg = g.createRadialGradient(mx, 48, 8, mx, 48, 56); mg.addColorStop(0, 'rgba(216,204,245,.6)'); mg.addColorStop(1, 'rgba(216,204,245,0)'); g.fillStyle = mg; g.fillRect(mx - 56, -8, 112, 112); circ(g, mx, 48, 16); fs(g, '#fff8f0'); circ(g, mx - 5, 45, 3.5); fs(g, '#e8e0f5'); circ(g, mx + 6, 53, 2.6); fs(g, '#e8e0f5'); g.globalAlpha = 0.8; g.fillStyle = '#6a52b0'; const cx = bossX() - 30; g.fillRect(cx - 50, GY - 150, 100, 90); g.fillRect(cx - 66, GY - 170, 20, 110); g.fillRect(cx + 46, GY - 170, 20, 110); g.fillRect(cx - 9, GY - 196, 18, 136); for (let j = 0; j < 5; j++) g.fillRect(cx - 50 + j * 24, GY - 160, 12, 12); for (const [tx, ty] of [[cx - 56, GY - 170], [cx + 56, GY - 170], [cx, GY - 196]]) { g.beginPath(); g.moveTo(tx - 13, ty); g.lineTo(tx, ty - 26); g.lineTo(tx + 13, ty); g.closePath(); g.fill(); } g.fillStyle = '#ffe9a8'; for (let j = 0; j < 4; j++) g.fillRect(cx - 36 + j * 22, GY - 128, 7, 11); g.globalAlpha = 1; cloud(g, w * 0.04, 86, 90, 30, '#d8ccf5', '#b9a3ec'); cloud(g, w * 0.36, 60, 70, 24, '#d8ccf5', '#b9a3ec'); cloud(g, w * 0.86, 110, 70, 24, '#d8ccf5', '#b9a3ec'); for (let i = 0; i < 3; i++) { const bxx = w * (0.1 + i * 0.4), by = 120 + (i % 2) * 30; ell(g, bxx, by, 9, 11); fs(g, ['#ff6f9c', '#ffd84a', '#8fd3ff'][i], 'rgba(60,30,80,.4)', 1); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(bxx, by + 11); g.lineTo(bxx + 2, by + 26); g.stroke(); } g.fillStyle = '#efe8fb'; for (let i = 0; i < w / 80 + 1; i++) puffs(g, i * 80 - 10, GY - 22, 100, 32); g.fillRect(0, GY, w, VH - GY); },
    weltraum(g, W, w) { g.fillStyle = '#fff'; for (let i = 0; i < 90; i++) { circ(g, (i * 97.3) % w, (i * 53.7) % 200, 0.4 + (i % 3) * 0.4); fs(g, i % 6 ? '#fff' : '#ffe9a8'); } saturn(g, w * 0.28, 76, 34); const eg = g.createRadialGradient(w * 0.82, 50, 2, w * 0.82, 50, 20); eg.addColorStop(0, '#6fc0ff'); eg.addColorStop(0.5, '#1a4ab0'); eg.addColorStop(1, 'rgba(26,74,176,0)'); g.fillStyle = eg; g.fillRect(w * 0.82 - 20, 30, 40, 40); g.fillStyle = W.hills[1]; for (let i = 0; i < w / 60 + 1; i++) { circ(g, i * 60 + 20, GY - 34, 30 + (i % 3) * 10); g.fill(); } g.fillRect(0, GY - 34, w, 40); for (let i = 0; i < 6; i++) { const x = w * (0.04 + i * 0.19), h = 26 + (i % 3) * 12; g.beginPath(); g.moveTo(x - 7, GY + 2); g.lineTo(x - 2, GY - h); g.lineTo(x + 3, GY - h - 4); g.lineTo(x + 8, GY + 2); g.closePath(); fs(g, '#8a66c8', '#2a1850', 1.2); g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.moveTo(x - 3, GY + 2); g.lineTo(x - 1, GY - h + 4); g.lineTo(x + 1, GY + 2); g.closePath(); g.fill(); } for (let i = 0; i < 3; i++) { ell(g, w * (0.15 + i * 0.3), GY + 16, 22 + i * 6, 6); fs(g, '#3a2666', '#7a56c0', 1.2); } },
  };
  function buildBg(W, w, k) {
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w * k)); c.height = Math.max(1, Math.ceil(VH * k));
    const g = c.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0); g.lineJoin = 'round'; g.lineCap = 'round';
    const sg = g.createLinearGradient(0, 0, 0, VH); sg.addColorStop(0, W.sky[0]); sg.addColorStop(0.55, W.sky[1]); sg.addColorStop(1, W.sky[2]); g.fillStyle = sg; g.fillRect(0, 0, w, VH);
    try { (BG[W.key] || BG.wiese)(g, W, w); } catch (e) { console.error('CUT_BG_ERROR ' + (e && e.message)); }
    groundBand(g, W.key === 'weltraum' ? Object.assign({}, W, {ground: {top: '#b48cf0', edge: '#7a56c0', dirt: '#4e3488', dot: '#3a2666', dot2: '#ffe9a8'}}) : W, w); vignette(g, w);
    return c;
  }

  /* ---------- the clue items (cached sprites, ~40 px chunky icons) ---------- */
  const ITEM = {
    bottle(g) { g.rotate(-0.55); rr(g, -4.5, -27, 9, 7, 2); fs(g, '#c69c6d', '#6b3f1d', 1.4); rr(g, -5, -22, 10, 10, 2); fs(g, 'rgba(170,230,255,.9)', '#3a7aa0', 1.6); rr(g, -10, -14, 20, 32, 8); fs(g, 'rgba(170,230,255,.9)', '#3a7aa0', 1.6); rr(g, -5, -7, 10, 17, 2); fs(g, '#fff7ea', '#b08a5a', 1); g.strokeStyle = '#ff6f9c'; g.lineWidth = 1.2; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-3, -3 + i * 4); g.lineTo(3, -3 + i * 4); g.stroke(); } g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-6.5, -9); g.lineTo(-6.5, 9); g.stroke(); },
    glass(g) { g.beginPath(); g.moveTo(-13, 11); g.lineTo(-5, -16); g.lineTo(13, -7); g.lineTo(8, 14); g.closePath(); fs(g, 'rgba(200,245,255,.9)', '#4a8ab0', 1.6); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-7, 6); g.lineTo(-2, -10); g.stroke(); g.strokeStyle = '#ff6f9c'; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-18, 14); g.bezierCurveTo(-10, 20, 4, -4, 10, 4); g.bezierCurveTo(14, 10, 18, 0, 19, -8); g.stroke(); circ(g, 19, -8, 2.2); fs(g, '#ffb3c6', '#c9305f', 1); },
    map(g) { g.rotate(-0.12); rr(g, -19, -14, 38, 28, 2); fs(g, '#f2dfb0', '#8a6a3a', 1.6); g.strokeStyle = 'rgba(138,106,58,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-13, -14); g.lineTo(-13, 14); g.moveTo(0, -14); g.lineTo(0, 14); g.stroke(); g.setLineDash([2, 2]); g.strokeStyle = '#5a3a2a'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-15, 9); g.quadraticCurveTo(-4, -2, 8, -5); g.stroke(); g.setLineDash([]); g.strokeStyle = '#e0457b'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(5, -8); g.lineTo(11, -2); g.moveTo(11, -8); g.lineTo(5, -2); g.stroke(); circ(g, 8, -5, 6); g.stroke(); g.fillStyle = '#3aa0e8'; for (const [x, y] of [[-16, 12], [12, 10], [-6, 15]]) { ell(g, x, y, 2.2, 3); g.fill(); } g.fillStyle = 'rgba(58,160,232,.25)'; ell(g, -9, 8, 9, 5); g.fill(); },
    letter(g) { g.rotate(0.1); rr(g, -18, -12, 36, 24, 3); fs(g, '#ffb3c6', '#c9305f', 1.6); g.strokeStyle = '#c9305f'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-18, -12); g.lineTo(0, 3); g.lineTo(18, -12); g.stroke(); heart(g, 0, 2, 4.5); fs(g, '#e0457b', '#8a1a3a', 0.8); g.globalCompositeOperation = 'destination-out'; for (const [x, y, r] of [[16, -10, 5], [12, -14, 4], [19, -4, 3.5]]) { circ(g, x, y, r); g.fill(); } g.globalCompositeOperation = 'source-over'; g.strokeStyle = '#c9305f'; g.lineWidth = 1.2; for (const [x, y, r] of [[16, -10, 5], [12, -14, 4], [19, -4, 3.5]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); } },
    snowflake(g) { g.strokeStyle = '#8fd3ff'; g.lineWidth = 3.6; g.lineCap = 'round'; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 17, Math.sin(a) * 17); g.moveTo(Math.cos(a) * 9, Math.sin(a) * 9); g.lineTo(Math.cos(a - 0.5) * 14, Math.sin(a - 0.5) * 14); g.moveTo(Math.cos(a) * 9, Math.sin(a) * 9); g.lineTo(Math.cos(a + 0.5) * 14, Math.sin(a + 0.5) * 14); g.stroke(); } g.strokeStyle = '#fff'; g.lineWidth = 1.6; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 16, Math.sin(a) * 16); g.stroke(); } g.save(); g.translate(11, 10); g.rotate(0.3); rr(g, -8, -6, 16, 12, 1); fs(g, '#fff7ea', '#b08a5a', 1.2); g.strokeStyle = '#5a3a2a'; g.lineWidth = 1; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-5, -3 + i * 3); g.lineTo(4 - (i % 2) * 3, -3 + i * 3); g.stroke(); } g.restore(); },
    icekey(g) { rr(g, -19, -13, 38, 26, 6); fs(g, 'rgba(190,230,255,.8)', '#6aa0d0', 1.6); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-14, -6); g.lineTo(-9, -1); g.lineTo(-11, 5); g.moveTo(8, -9); g.lineTo(12, -3); g.stroke(); g.strokeStyle = '#ffd84a'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-6, 0); g.lineTo(13, 0); g.moveTo(9, 0); g.lineTo(9, 5); g.moveTo(13, 0); g.lineTo(13, 6); g.stroke(); circ(g, -9, 0, 6); fs(g, '#ffd84a', '#a0741a', 1.4); circ(g, -9, 0, 2.2); fs(g, 'rgba(190,230,255,.9)'); g.fillStyle = '#fff'; for (const [x, y, r] of [[-12, -3.5, 2.2], [-9, -5, 2.6], [-6, -3.5, 2.2]]) { circ(g, x, y, r); g.fill(); } g.fillRect(-12, -3.5, 6, 2.5); g.strokeStyle = '#ffd84a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-4, 0); g.lineTo(13, 0); g.stroke(); },
    feather(g) { g.rotate(-0.6); const gl = g.createRadialGradient(0, 0, 4, 0, 0, 26); gl.addColorStop(0, 'rgba(255,255,255,.45)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(-26, -26, 52, 52); g.beginPath(); g.moveTo(0, -20); g.quadraticCurveTo(14, -8, 5, 18); g.quadraticCurveTo(0, 21, -5, 18); g.quadraticCurveTo(-14, -8, 0, -20); g.closePath(); fs(g, '#fff', '#b9a3ec', 1.5); g.strokeStyle = '#d8ccf5'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, -17); g.lineTo(0, 22); g.stroke(); for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(0, -10 + i * 5); g.lineTo(-6 + i * 0.5, -14 + i * 5); g.moveTo(0, -10 + i * 5); g.lineTo(6 - i * 0.5, -14 + i * 5); g.stroke(); } },
    crown(g) { g.beginPath(); g.moveTo(-16, 4); g.lineTo(-18, -12); g.lineTo(-9, -4); g.lineTo(0, -17); g.lineTo(9, -4); g.lineTo(18, -12); g.lineTo(16, 4); g.closePath(); fs(g, '#ffd84a', '#a0741a', 1.6); circ(g, 0, -3, 2.8); fs(g, '#ff6f9c', '#8a2a4a', 0.8); circ(g, -10, 0, 1.9); fs(g, '#8fd3ff', '#2a5a8a', 0.6); circ(g, 10, 0, 1.9); fs(g, '#9be7a5', '#2a6a3a', 0.6); for (const [x, y] of [[-18, -12], [0, -17], [18, -12]]) { circ(g, x, y, 1.8); fs(g, '#fff'); } rr(g, -11, 5, 22, 13, 3); fs(g, '#8a8a9a', '#3a3a4a', 1.3); rr(g, -8, 8, 8, 7, 1.5); fs(g, '#2a2a3a'); circ(g, 6, 11.5, 2.2); fs(g, '#ff3a5a'); g.strokeStyle = '#3a3a4a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(8, 5); g.lineTo(13, -6); g.stroke(); circ(g, 13, -6, 1.4); fs(g, '#ff3a5a'); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1; for (let i = 1; i <= 2; i++) { g.beginPath(); g.arc(13, -6, 3 + i * 2.5, -1.2, 0.4); g.stroke(); } },
  };
  const itemSpr = new Map();
  function drawItem(ctx, id, x, y, s, k) {
    const key = id + '|' + k; let c = itemSpr.get(key);
    if (!c) { c = document.createElement('canvas'); c.width = Math.ceil(72 * k); c.height = Math.ceil(72 * k); const g = c.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0); g.lineJoin = 'round'; g.lineCap = 'round'; g.translate(36, 36); try { (ITEM[id] || ITEM.bottle)(g); } catch (e) {} itemSpr.set(key, c); }
    ctx.drawImage(c, x - 36 * s, y - 36 * s, 72 * s, 72 * s);
  }

  /* ---------- the kraken (Korallenmeer has no platformer boss: drawn here, big) ---------- */
  function tentacle(g, x0, y0, x1, y1, w0, t, col, phase) {
    const n = 14, dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, L1 = [], L2 = [], mid = [];
    for (let i = 0; i <= n; i++) { const k = i / n, wv = Math.sin(k * 5 - t * 6 + phase) * 4 * k, x = x0 + dx * k + nx * wv, y = y0 + dy * k + ny * wv, hw = lerp(w0, 2.5, k); mid.push([x, y, hw]); L1.push([x + nx * hw, y + ny * hw]); L2.push([x - nx * hw, y - ny * hw]); }
    g.beginPath(); g.moveTo(L1[0][0], L1[0][1]); for (const p of L1) g.lineTo(p[0], p[1]); for (let i = L2.length - 1; i >= 0; i--) g.lineTo(L2[i][0], L2[i][1]); g.closePath(); fs(g, col, '#2a1040', 1.8);
    for (let i = 1; i < n; i += 2) { const [x, y, hw] = mid[i]; circ(g, x - nx * hw * 0.45, y - ny * hw * 0.45, Math.max(1, hw * 0.32)); fs(g, '#f4b8e8', '#8a3a8a', 0.6); }
  }
  function drawKraken(g, t, mood, mt, lying) {
    const rage = mood === 'angry', limp = lying || mood === 'dizzy', body = rage ? '#b04a9a' : '#8a4ac8', dark = rage ? '#7a2a6a' : '#5a2a8a';
    for (let i = 0; i < 6; i++) { const a0 = Math.PI * (0.25 + i * 0.12), bx = Math.cos(a0) * 28, by = 34, ex = bx - 30 - i * 6 + Math.sin(t * 2 + i) * (limp ? 3 : 10) - (rage ? 14 : 0), ey = by + 40 + Math.sin(t * 1.6 + i * 1.3) * (limp ? 3 : 12); tentacle(g, bx, by, ex, ey, 9, limp ? t * 0.3 : t, i % 2 ? dark : body, i); }
    const inh = mood === 'laugh' ? Math.abs(Math.sin(mt * 7.5)) * 0.08 : 0, sw = 1 + inh + Math.sin(t * 2) * 0.02;
    g.save(); g.scale(sw, 1 / sw);
    g.beginPath(); g.moveTo(-44, 26); g.bezierCurveTo(-56, -30, -30, -70, 4, -70); g.bezierCurveTo(40, -70, 60, -30, 48, 26); g.quadraticCurveTo(2, 44, -44, 26); g.closePath();
    const bg = g.createRadialGradient(-12, -40, 6, 0, -10, 70); bg.addColorStop(0, rage ? '#e07ac8' : '#b88af0'); bg.addColorStop(1, body); fs(g, bg, '#2a1040', 2.6);
    for (const [sx, sy, sr] of [[-20, -48, 5], [18, -52, 4], [30, -30, 6], [-32, -18, 4], [6, -60, 3]]) { circ(g, sx, sy, sr); fs(g, 'rgba(255,255,255,.18)'); }
    g.restore();
    /* crown */
    g.save(); g.translate(4, -70); g.rotate(0.1 + Math.sin(t * 1.3) * 0.05 + (lying ? 0.5 : 0)); g.beginPath(); g.moveTo(-14, 4); g.lineTo(-16, -10); g.lineTo(-8, -3); g.lineTo(0, -14); g.lineTo(8, -3); g.lineTo(16, -10); g.lineTo(14, 4); g.closePath(); fs(g, '#ffd84a', '#8a5a10', 1.5); circ(g, 0, -2, 2.4); fs(g, '#ff6f9c', '#8a2a4a', 0.8); circ(g, -9, 0, 1.6); fs(g, '#8fd3ff'); circ(g, 9, 0, 1.6); fs(g, '#9be7a5'); g.restore();
    /* eyes */
    for (const [ex, ey, sd] of [[-20, -18, -1], [16, -20, 1]]) {
      if (rage) { g.save(); g.globalCompositeOperation = 'lighter'; const gg = g.createRadialGradient(ex, ey, 2, ex, ey, 26); gg.addColorStop(0, 'rgba(255,200,80,.6)'); gg.addColorStop(1, 'rgba(255,200,60,0)'); g.fillStyle = gg; g.fillRect(ex - 26, ey - 26, 52, 52); g.restore(); }
      ell(g, ex, ey, 11, 12); fs(g, rage ? '#fff6b0' : '#fff', '#2a1040', 1.8);
      if (mood === 'dizzy') { g.strokeStyle = '#2a1040'; g.lineWidth = 2; g.beginPath(); for (let a = 0; a < 9; a += 0.3) { const r = a * 0.7; a ? g.lineTo(ex + Math.cos(a + t * 6) * r, ey + Math.sin(a + t * 6) * r) : g.moveTo(ex, ey); } g.stroke(); }
      else { const lk = mood === 'plead' ? -0.4 : (mood === 'taunt' ? 0.3 : 0), px = ex - 3 + lk * 4, py = ey + 1; circ(g, px, py, rage ? 5.5 : 4.6); fs(g, rage ? '#ff9a2a' : '#2a1040'); if (rage) { circ(g, px, py, 2.6); fs(g, '#2a1040'); } circ(g, px - 1.5, py - 2, 1.4); fs(g, '#fff'); }
      if (mood !== 'plead' && mood !== 'dizzy') { g.fillStyle = body; g.beginPath(); g.moveTo(ex - 13, ey - 13 + (sd < 0 ? -2 : 6)); g.lineTo(ex + 13, ey - 13 + (sd < 0 ? 6 : -2)); g.lineTo(ex + 13, ey - 16); g.lineTo(ex - 13, ey - 16); g.closePath(); g.fill(); }
      g.strokeStyle = '#2a1040'; g.lineWidth = 3.4; g.lineCap = 'round'; g.beginPath(); const tilt = mood === 'plead' ? -4 : (mood === 'dizzy' ? 0 : 5); g.moveTo(ex - 11, ey - 14 + (sd < 0 ? -tilt * 0.3 : tilt)); g.lineTo(ex + 11, ey - 14 + (sd < 0 ? tilt : -tilt * 0.3)); g.stroke(); g.lineCap = 'butt';
    }
    /* mouth */
    const mo = mood === 'laugh' ? 0.6 + Math.abs(Math.sin(mt * 7.5)) * 0.4 : (rage ? 1 : (mood === 'taunt' ? 0.25 : 0));
    if (mo > 0.15) { ell(g, -4, 12, 14, 4 + mo * 9); fs(g, '#3a0a2a', '#2a1040', 1.8); ell(g, -4, 14 + mo * 4, 7, 3 * mo); fs(g, '#ff6f9c'); g.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-14 + i * 5, 8 - mo * 8); g.lineTo(-12 + i * 5, 12 - mo * 4); g.lineTo(-10 + i * 5, 8 - mo * 8); g.fill(); } }
    else { g.strokeStyle = '#2a1040'; g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath(); if (mood === 'plead' || mood === 'dizzy') { g.moveTo(-16, 15); g.quadraticCurveTo(-4, 8, 8, 15); } else { g.moveTo(-16, 10); g.quadraticCurveTo(-4, 18, 8, 10); } g.stroke(); g.lineCap = 'butt'; }
  }

  /* ---------- the hero's submarine (Korallenmeer) ---------- */
  function drawSub(ctx, x, y, t, mood) {
    const bob = Math.sin(t * 2) * 3, cy = y - 30 + bob; ctx.save(); ctx.translate(x, cy); ctx.rotate(mood === 'angry' ? -0.1 : (mood === 'wide' ? 0.06 : Math.sin(t * 1.3) * 0.03));
    /* propeller */ ctx.save(); ctx.translate(-44, 0); ctx.scale(Math.max(0.15, Math.abs(Math.cos(t * 22))), 1); ell(ctx, 0, 0, 5, 12); fs(ctx, '#8fd3ff', '#2a5a8a', 1.4); ctx.restore(); ctx.fillStyle = '#ffb347'; ctx.fillRect(-42, -3, 10, 6);
    /* fins, tower, periscope */ ctx.beginPath(); ctx.moveTo(-30, -4); ctx.lineTo(-40, -14); ctx.lineTo(-24, -10); ctx.closePath(); fs(ctx, '#ffb347', '#8a5a10', 1.4); ctx.beginPath(); ctx.moveTo(-30, 4); ctx.lineTo(-40, 14); ctx.lineTo(-24, 10); ctx.closePath(); fs(ctx, '#ffb347', '#8a5a10', 1.4);
    rr(ctx, -14, -30, 26, 16, 5); fs(ctx, '#ffd84a', '#8a5a10', 1.6); ctx.fillStyle = '#8a5a10'; ctx.fillRect(2, -44, 3, 16); ctx.fillRect(2, -44, 10, 3); circ(ctx, 12, -42.5, 2.2); fs(ctx, '#8fd3ff', '#2a5a8a', 1);
    /* hull */ ell(ctx, 0, 0, 40, 19); const hg = ctx.createLinearGradient(0, -19, 0, 19); hg.addColorStop(0, '#fff0a0'); hg.addColorStop(0.5, '#ffd84a'); hg.addColorStop(1, '#e0a020'); fs(ctx, hg, '#8a5a10', 1.8); ctx.fillStyle = '#e0a020'; for (let i = 0; i < 4; i++) { circ(ctx, -26 + i * 10, 11, 1.2); ctx.fill(); }
    /* porthole with the hero */ circ(ctx, 6, -1, 14); fs(ctx, '#8fd3ff', '#8a5a10', 2.4); ctx.save(); circ(ctx, 6, -1, 12.5); ctx.clip(); const pg = ctx.createLinearGradient(0, -14, 0, 12); pg.addColorStop(0, '#bfe8ff'); pg.addColorStop(1, '#6fb8f0'); ctx.fillStyle = pg; ctx.fillRect(-10, -16, 32, 32);
    try { G.draw.drawBearAt(ctx, 5, 36, {scale: 2.2, facing: 1, pose: 'idle', mood: mood === 'angry' ? 'cool' : mood, t, frame: 0, speed: 0, outfit: 'wiese'}); } catch (e) {}
    ctx.restore(); circ(ctx, 1, -7, 3.5); fs(ctx, 'rgba(255,255,255,.55)'); ctx.strokeStyle = '#8a5a10'; ctx.lineWidth = 2.4; circ(ctx, 6, -1, 14); ctx.stroke(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.78; circ(ctx, 6 + Math.cos(a) * 13.5, -1 + Math.sin(a) * 13.5, 1.3); fs(ctx, '#8a5a10'); }
    /* headlight */ ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createLinearGradient(40, 0, 110, 0); lg.addColorStop(0, 'rgba(255,255,200,.35)'); lg.addColorStop(1, 'rgba(255,255,200,0)'); ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(38, -5); ctx.lineTo(110, -26); ctx.lineTo(110, 22); ctx.lineTo(38, 5); ctx.closePath(); ctx.fill(); ctx.restore(); circ(ctx, 36, 0, 4); fs(ctx, '#fff6b0', '#8a5a10', 1.2);
    ctx.restore();
  }

  /* ---------- drawing the actors ---------- */
  function heroMarks(ctx, x, top, mood, mt) {
    if (mood === 'angry') { const p = (1 + Math.sin(mt * 12) * 0.08) * backOut(mt / 0.3); ctx.save(); ctx.translate(x - 26, top + 2); ctx.scale(p, p); ctx.lineCap = 'round'; for (const [lw, col] of [[6, '#7a1a2a'], [3.2, '#ff3a5a']]) { ctx.strokeStyle = col; ctx.lineWidth = lw; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.78; ctx.beginPath(); ctx.arc(Math.cos(a) * 7, Math.sin(a) * 7, 6, a + 2.3, a + 4.0); ctx.stroke(); } } ctx.restore(); }
    else if (mood === 'wide' && mt < 1.2) { const k = backOut(mt / 0.25); txt(ctx, '!', x + 12, top - 16 - Math.abs(Math.sin(mt * 8)) * 3, 22 * k, '#ffd84a', 'center', '#7a3b57', 4); }
    else if (mood === 'happy' && mt < 1.6) { for (let i = 0; i < 3; i++) { const k = ((mt * 1.4 + i * 0.33) % 1); heart(ctx, x - 10 + i * 12 + Math.sin(k * 6 + i) * 3, top - 4 - k * 26, 3.2 * (1 - k * 0.5)); ctx.globalAlpha = 1 - k; fs(ctx, '#ff6f9c', '#c9305f', 0.8); ctx.globalAlpha = 1; } }
  }
  function drawHero(ctx) {
    const sc = 3.3, x = H.x, t = C.t, m = H.mood, pose = H.walk ? 'run' : (H.win > 0 ? 'victory' : (m === 'happy' ? 'victory' : (m === 'sad' ? 'sad' : 'idle')));
    ell(ctx, x + 2, GY + 2, H.walk ? 26 : 22, 5); fs(ctx, 'rgba(20,8,30,.28)');
    if (C.sub) { drawSub(ctx, x, GY, t, m); heroMarks(ctx, x, GY - 64, m, H.mt); return; }
    ctx.save(); let dx = 0;
    if (m === 'angry' && !H.walk) { const k = ss(H.mt, 0, 0.3); ctx.translate(x, GY); ctx.rotate(0.17 * k); ctx.translate(-x, -GY); dx = Math.abs(Math.sin(Math.min(H.mt, 0.55) * 11)) * -5; }
    if (m === 'wide' && !H.walk) dx = -7 * (1 - ss(H.mt, 0, 0.35)) - 3;
    try { G.draw.drawBearAt(ctx, x + dx, GY - (m === 'angry' && !H.walk ? Math.abs(Math.sin(Math.min(H.mt, 0.55) * 11)) * 7 : 0), {scale: sc, facing: 1, pose, mood: H.walk ? undefined : (m === 'angry' ? 'cool' : m), t, frame: C.fr * 0.3, speed: H.walk ? 0.85 : 0, outfit: outfit()}); }
    catch (e) { circ(ctx, x, GY - 36, 26); fs(ctx, heroCol(), '#3a2414', 2); }
    if (m === 'angry' && !H.walk && H.mt > 0.1) { const fy = GY - 56 - Math.abs(Math.sin(H.mt * 14)) * 5; circ(ctx, x + 26, fy, 6.5); fs(ctx, heroCol(), '#3a2414', 2.2); circ(ctx, x + 24, fy - 2, 2); fs(ctx, 'rgba(255,255,255,.35)'); }
    ctx.restore();
    heroMarks(ctx, x, GY - 80, m, H.mt);
  }
  function drawMallo(ctx) {
    if (!M.on) return; const t = C.t, pose = M.run ? 'run' : (M.caged ? 'sad' : (M.mt < 2 ? 'victory' : 'idle'));
    if (M.caged) {   /* the Saturn prison: a cage with Mallo inside; its door swings open in the outro */
      const cx = M.x, open = C.kind === 'outro'; ell(ctx, cx, GY + 2, 30, 6); fs(ctx, '#2a1850'); rr(ctx, cx - 30, GY - 4, 60, 8, 3); fs(ctx, '#8a8ab0', '#2a2a4a', 1.4);
      try { G.draw.drawBearAt(ctx, cx, GY - 2, {scale: 2.3, facing: -1, pose: open ? 'idle' : 'sad', mood: open ? 'happy' : 'sad', t, frame: 0, white: true, bow: true, hero: 'wookie'}); } catch (e) {}
      ctx.strokeStyle = '#c0c0d8'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (let i = 0; i < 7; i++) { const bx = cx - 24 + i * 8; if (open && i >= 2 && i <= 4) continue; ctx.beginPath(); ctx.moveTo(bx, GY - 4); ctx.lineTo(bx, GY - 74); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(cx - 26, GY - 74); ctx.quadraticCurveTo(cx, GY - 96, cx + 26, GY - 74); ctx.stroke(); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 24, GY - 40); ctx.lineTo(cx + 24, GY - 40); ctx.stroke();
      if (open) { ctx.save(); ctx.translate(cx - 8, GY - 4); ctx.rotate(-1.1); ctx.strokeStyle = '#c0c0d8'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(i * 8, 0); ctx.lineTo(i * 8, -70); ctx.stroke(); } ctx.restore(); }
      else { rr(ctx, cx - 6, GY - 46, 12, 10, 2); fs(ctx, '#ffd84a', '#a0741a', 1.2); ctx.strokeStyle = '#a0741a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, GY - 46, 4, Math.PI, 0); ctx.stroke(); }
      return;
    }
    ell(ctx, M.x, GY + 2, M.run ? 24 : 20, 5); fs(ctx, 'rgba(20,8,30,.28)');
    try { G.draw.drawBearAt(ctx, M.x, GY, {scale: 3.1, facing: -1, pose, mood: M.run ? undefined : 'happy', t, frame: C.fr * 0.3, speed: M.run ? 0.9 : 0, white: true, bow: true, hero: 'wookie'}); } catch (e) {}
    if (!M.run && M.mt < 2.2) heroMarks(ctx, M.x, GY - 78, 'happy', M.mt);
  }
  function bossPose() {
    const m = B.mood, mt = B.mt, lying = C.kind === 'outro', fly = C.flyer; let rot = 0, sx = 1, sy = 1, dx = 0, dy = 0;
    if (lying) { rot = (C.kraken ? -0.55 : (fly ? 0.9 : -1.2)) + Math.sin(C.t * 1.7) * 0.04; dy = C.kraken ? 10 : (fly ? -10 : -4); }
    else if (fly) dy = -44 + Math.sin(C.t * 2.6) * 5;
    if (m === 'laugh') { const ph = mt * 7.5, b = Math.abs(Math.sin(ph)); dy -= b * (lying ? 5 : 13); sy *= 1 + Math.cos(ph * 2) * 0.09; sx *= 1 - Math.cos(ph * 2) * 0.07; }
    else if (m === 'taunt') { rot += -0.13 * ss(mt, 0, 0.45); dy -= Math.abs(Math.sin(mt * 3)) * 2; dx -= 6 * ss(mt, 0, 0.45); }
    else if (m === 'angry') { const k = ss(mt, 0, 0.25); sx *= 1 + k * 0.08; sy *= 1 + k * 0.1; dx += (Math.random() - 0.5) * (mt < 0.5 ? 3 : 0.8); }
    else if (m === 'plead') { const k = ss(mt, 0, 0.5); sx *= 1 - 0.14 * k; sy *= 1 - 0.14 * k; dx += Math.sin(C.t * 40) * 1.2 * k; }
    return {rot, sx, sy, dx, dy};
  }
  function bossHeadTop() { const P = bossPose(), lying = C.kind === 'outro', h = C.kraken ? (lying ? 70 : 118) : (lying ? 30 * C.bossS * 0.55 : 30 * C.bossS + (C.flyer ? -2 : 0)); return {x: B.x + B.ex + P.dx, y: GY + B.y + P.dy - h}; }
  function drawBoss(ctx) {
    if (B.st === 'hidden') return;
    const P = bossPose(), lying = C.kind === 'outro', x = B.x + B.ex + P.dx, y = GY + B.y + P.dy, t = C.t, e = B.e, up = clamp(1 + (B.y + (C.flyer ? P.dy + 44 : 0)) / 160, 0.35, 1);
    if (!C.kraken || lying) { ell(ctx, B.x + B.ex, GY + 2, (C.kraken ? 60 : 46) * up, 7 * up); fs(ctx, 'rgba(20,8,30,' + (0.3 * up) + ')'); }
    e.anim = t * 6; e.dir = -1; e.onGround = B.st === 'idle';
    ctx.save(); ctx.translate(x, y);
    if (lying) { const c = C.kraken ? -20 : -15 * C.bossS; ctx.translate(0, c); ctx.rotate(P.rot); ctx.translate(0, -c); } else ctx.rotate(P.rot);
    ctx.scale(P.sx, P.sy);
    if (C.kraken) { ctx.scale(0.85, 0.85); ctx.translate(0, -80); drawKraken(ctx, t, lying && B.mood === 'laugh' ? 'laugh' : B.mood, B.mt, lying); }
    else {
      ctx.scale(C.bossS, C.bossS); ctx.translate(-15, -30);
      let ok = false; try { ok = !!(G.fx && G.fx.ent && G.fx.ent(ctx, e, C.fr)); if (!ok && G.draw && G.draw.drawEnt) { G.draw.drawEnt(e, C.fr); ok = true; } } catch (err) { ok = false; }
      if (!ok) { const b = C.W.boss || {a: '#c7ef6b', b: '#8fb84a'}; ell(ctx, 15, 15, 14.5, 14.5); fs(ctx, b.a, shade(b.b, -0.4), 1.3); circ(ctx, 9.5, 12, 2.1); fs(ctx, '#2a1b12'); circ(ctx, 20.5, 12, 2.1); fs(ctx, '#2a1b12'); }
    }
    ctx.restore();
    /* dizzy stars, anger steam */
    const ht = bossHeadTop();
    if (B.mood === 'dizzy' || (lying && B.mood !== 'plead' && B.mood !== 'laugh')) { for (let i = 0; i < 3; i++) { const a = t * 4 + i * TAU / 3, sx = ht.x + Math.cos(a) * 30, sy = ht.y - 6 + Math.sin(a) * 8, s = 4.2 + Math.sin(a) * 1.5; star(ctx, sx, sy, s, s * 0.45, 5); fs(ctx, '#ffd84a', '#a0741a', 1); } }
    if (B.mood === 'angry' && B.mt < 1.5 && !C.kraken) { ctx.globalAlpha = 0.5 * (1 - B.mt / 1.5); for (let i = 0; i < 3; i++) { const k = (B.mt * 2 + i * 0.33) % 1; circ(ctx, ht.x - 20 + i * 20, ht.y - 6 - k * 24, 4 + k * 6); fs(ctx, '#fff'); } ctx.globalAlpha = 1; }
  }
  function drawParts(ctx, front) {
    for (const p of C.parts) {
      const k = p.t / p.life, a = 1 - k; if (front !== (p.k !== 'bub')) continue;
      if (p.k === 'dust') { ctx.globalAlpha = a * 0.75; circ(ctx, p.x, p.y, p.r * (1 + k)); fs(ctx, p.col); }
      else if (p.k === 'spark') { ctx.globalAlpha = a; star(ctx, p.x, p.y, p.r * (1.6 - k), p.r * 0.5, 4); fs(ctx, k < 0.3 ? '#fff' : p.col); }
      else if (p.k === 'sweat') { ctx.globalAlpha = a; ell(ctx, p.x, p.y, p.r * 0.8, p.r * 1.2); fs(ctx, p.col, '#2a5a8a', 0.8); }
      else if (p.k === 'ink') { ctx.globalAlpha = a * 0.9; circ(ctx, p.x, p.y, p.r * (1 + k * 0.5)); fs(ctx, p.col); }
      else if (p.k === 'puff') { ctx.globalAlpha = a * 0.6; circ(ctx, p.x, p.y, p.r * (1 + k * 2)); fs(ctx, p.col); }
      else if (p.k === 'bub') { ctx.globalAlpha = a * 0.7; circ(ctx, p.x, p.y, p.r); fs(ctx, 'rgba(255,255,255,.25)', 'rgba(255,255,255,.8)', 1); }
    }
    ctx.globalAlpha = 1;
  }
  function drawAmbient(ctx) {
    for (const p of C.amb) {
      const k = p.t / p.life, a = Math.min(1, Math.min(k, 1 - k) * 4);
      if (p.k === 'snow') { ctx.globalAlpha = a * 0.9; circ(ctx, p.x, p.y, p.r); fs(ctx, '#fff'); }
      else if (p.k === 'petal') { ctx.globalAlpha = a * 0.85; ell(ctx, p.x, p.y, p.r, p.r * 0.6, p.t * 3); fs(ctx, p.col); }
      else if (p.k === 'leaf') { ctx.globalAlpha = a * 0.9; ell(ctx, p.x, p.y, p.r, p.r * 0.5, p.t * 2); fs(ctx, p.col); }
      else if (p.k === 'bub') { ctx.globalAlpha = a * 0.6; circ(ctx, p.x, p.y, p.r); fs(ctx, 'rgba(255,255,255,.2)', 'rgba(255,255,255,.8)', 1); }
      else if (p.k === 'ember') { ctx.globalAlpha = a; circ(ctx, p.x, p.y, p.r); fs(ctx, k < 0.5 ? '#ffd24a' : '#ff7a2a'); }
      else if (p.k === 'steam') { ctx.globalAlpha = a * 0.18; circ(ctx, p.x, p.y, p.r * (1 + k)); fs(ctx, '#fff'); }
      else if (p.k === 'twinkle') { ctx.globalAlpha = a; star(ctx, p.x, p.y, p.r * 1.8, p.r * 0.5, 4); fs(ctx, '#fff'); }
      else if (p.k === 'glint') { ctx.globalAlpha = a * 0.8; star(ctx, p.x, p.y, 2.5, 0.8, 4); fs(ctx, '#fff'); }
    }
    ctx.globalAlpha = 1;
  }
  function bgDyn(ctx, w) {
    const t = C.t, key = C.key;
    if (key === 'lava') { const g = ctx.createRadialGradient(B.x + 10, GY - 6, 10, B.x + 10, GY - 6, 150); const a = 0.18 + Math.sin(t * 3) * 0.06; g.addColorStop(0, 'rgba(255,140,40,' + a + ')'); g.addColorStop(1, 'rgba(255,100,30,0)'); ctx.fillStyle = g; ctx.fillRect(0, GY - 150, w, 160); }
    else if (key === 'himmel' && C.kind === 'boss' && C.ph !== 'in' && Math.floor(t * 2) % 7 === 0 && (t * 2) % 1 < 0.12) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(0, 0, w, VH); }
    else if (key === 'unterwasser') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.12 + Math.sin(t * 1.5) * 0.06; const g = ctx.createLinearGradient(0, 0, 0, GY); g.addColorStop(0, '#bfe8ff'); g.addColorStop(1, 'rgba(191,232,255,0)'); ctx.fillStyle = g; const x = w * 0.5 + Math.sin(t * 0.4) * 30; ctx.beginPath(); ctx.moveTo(x - 10, 0); ctx.lineTo(x + 20, 0); ctx.lineTo(x + 80, GY); ctx.lineTo(x + 20, GY); ctx.closePath(); ctx.fill(); ctx.restore(); }
    /* drifting ground fog for drama */
    ctx.globalAlpha = 0.16; ctx.fillStyle = key === 'lava' ? '#ff9a5a' : '#fff'; for (let i = 0; i < 4; i++) { const x = ((i * 190 + t * 9 * (1 + i % 2)) % (w + 240)) - 120; ell(ctx, x, GY + 4, 110, 9 + (i % 2) * 4); ctx.fill(); } ctx.globalAlpha = 1;
  }
  function loom(ctx, w) {
    const k = C.loom; if (k <= 0 || C.kind !== 'boss') return;
    ctx.fillStyle = 'rgba(25,5,45,' + (0.5 * k) + ')'; ctx.fillRect(-20, -20, w + 40, VH + 40);
    const t = C.t, k2 = ss(t, 1.15, 1.55) * (t < 1.9 ? 1 : 0);
    if (!C.kraken && !C.flyer) { ell(ctx, B.x, GY + 2, 12 + 44 * k, 3 + 7 * k); fs(ctx, 'rgba(10,0,20,' + (0.5 * k) + ')'); }
    if (k2 > 0) { const ey = C.kraken ? GY - 50 : (C.flyer ? 60 : 66), ex = C.kraken ? B.x : (C.flyer ? w - 40 : B.x), fl = 0.75 + Math.sin(t * 30) * 0.25; ctx.save(); ctx.globalAlpha = k2 * fl; for (const d of [-1, 1]) { const g = ctx.createRadialGradient(ex + d * 14, ey, 1, ex + d * 14, ey, 18); g.addColorStop(0, 'rgba(255,240,120,.9)'); g.addColorStop(0.3, 'rgba(255,200,60,.5)'); g.addColorStop(1, 'rgba(255,200,60,0)'); ctx.fillStyle = g; ctx.fillRect(ex + d * 14 - 18, ey - 18, 36, 36); ell(ctx, ex + d * 14, ey, 6, 3.5 * (1 - 0.5 * Math.abs(Math.sin(t * 2.5)))); fs(ctx, '#fff6b0'); } ctx.restore(); }
    if (C.bolt > 0) { const x0 = B.x + 30, y1 = GY - 110; ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; for (const [lw, col] of [[9, 'rgba(255,255,255,.35)'], [3, '#fff']]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x0, 0); let y = 0, x = x0; for (let i = 1; i <= 6; i++) { y = y1 * i / 6; x = x0 + ((i % 2) ? -16 : 10) * (i / 6) + (i === 3 ? 14 : 0); ctx.lineTo(x, y); } ctx.lineTo(B.x, y1 + 20); ctx.stroke(); } ctx.restore(); }
  }
  function spotlight(ctx) {
    const s = C.spot; if (s <= 0) return; const x = B.x, top = BAR - 14;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = s; const g = ctx.createLinearGradient(0, top, 0, GY + 8); g.addColorStop(0, 'rgba(255,245,200,.24)'); g.addColorStop(1, 'rgba(255,245,200,.02)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 24, top); ctx.lineTo(x + 24, top); ctx.lineTo(x + 90, GY + 8); ctx.lineTo(x - 90, GY + 8); ctx.closePath(); ctx.fill();
    ell(ctx, x, GY + 2, 76, 10); ctx.fillStyle = 'rgba(255,245,200,.14)'; ctx.fill(); ctx.restore();
  }
  function drawItemFloat(ctx, k) {
    const it = C.item; if (!it) return; const t = it.t, pop = backOut(t / 0.35), y = it.y + Math.sin(t * 3) * 4, x = it.x;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, 4, x, y, 44); g.addColorStop(0, 'rgba(255,230,120,' + (0.35 + Math.sin(t * 5) * 0.1) + ')'); g.addColorStop(1, 'rgba(255,230,120,0)'); ctx.fillStyle = g; ctx.fillRect(x - 44, y - 44, 88, 88); ctx.restore();
    for (let i = 0; i < 5; i++) { const a = t * 2.2 + i * TAU / 5, r = 30 + Math.sin(t * 4 + i) * 4; star(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, 2.6, 1, 4); fs(ctx, i % 2 ? '#fff' : '#ffd84a'); }
    ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop); ctx.rotate(Math.sin(t * 2) * 0.08); drawItem(ctx, it.id, 0, 0, 1, k); ctx.restore();
  }

  /* ---------- text layers: bubbles, the clue card, the destination card ---------- */
  function toScreen(x, y, zx, zy, shx, shy) { return {x: (x - zx) * C.zoom + zx + shx, y: (y - zy) * C.zoom + zy + shy}; }
  function speakerHead(who) {
    if (who === 'boss') return bossHeadTop();
    if (who === 'mallo') return {x: M.x, y: GY - (M.caged ? 100 : 78)};
    return {x: H.x + 2, y: GY - (C.sub ? 76 : 82)};
  }
  function drawBubble(ctx, w, l, xf) {
    const boss = l.who === 'boss', hd = speakerHead(l.who), sp = toScreen(hd.x, hd.y, xf.zx, xf.zy, xf.shx, xf.shy);
    const maxW = Math.min(300, w - 40); font(ctx, 10.5); const wr = wrap(ctx, l.text, maxW - 22), bw = Math.max(72, wr.w + 24), lh = 13, bh = wr.lines.length * lh + 14;
    const bx = clamp(sp.x - bw * 0.5, 10, w - 10 - bw), by = Math.max(BAR + 15, Math.min(sp.y - bh - 14, GY - bh - 60)), tx = clamp(sp.x, bx + 16, bx + bw - 16);
    const wob = boss && l.mood === 'laugh' && B.mt < 2.4 ? Math.sin(C.t * 22) * 0.04 : (boss && l.mood === 'angry' && B.mt < 0.6 ? (Math.random() - 0.5) * 0.05 : 0), sc = backOut(l.pop) * (boss && l.mood === 'laugh' && B.mt < 2.4 ? 1 + Math.abs(Math.sin(C.t * 15)) * 0.03 : 1);
    ctx.save(); ctx.translate(tx, by + bh); ctx.rotate(wob); ctx.scale(sc, sc); ctx.translate(-tx, -(by + bh)); ctx.lineJoin = 'round';
    const fill = boss ? '#2b1535' : '#ffffff', line = boss ? '#ff9eb0' : (l.who === 'mallo' ? '#ffb3c6' : '#ff9eb0'), col = boss ? '#fff4e0' : '#7a3b57';
    ctx.fillStyle = 'rgba(20,8,30,.25)'; if (boss) jagged(ctx, bx + 3, by + 4, bw, bh, 2.5, 9); else rr(ctx, bx + 3, by + 4, bw, bh, 11); ctx.fill();
    /* tail */ ctx.beginPath(); ctx.moveTo(tx - 8, by + bh - 2); ctx.lineTo(sp.x, Math.min(sp.y + 2, by + bh + 26)); ctx.lineTo(tx + 8, by + bh - 2); ctx.closePath(); fs(ctx, fill, line, 2);
    if (boss) jagged(ctx, bx, by, bw, bh, 2.5, 9); else rr(ctx, bx, by, bw, bh, 11); fs(ctx, fill, line, boss ? 1.8 : 2.2);
    ctx.beginPath(); ctx.moveTo(tx - 6, by + bh - 3); ctx.lineTo(tx, by + bh + 4); ctx.lineTo(tx + 6, by + bh - 3); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    /* name tag */ const name = boss ? ((C.W.boss && C.W.boss.name) || '') : (l.who === 'mallo' ? (G.NAMES ? G.NAMES.partner : 'Mallo') : H.name); font(ctx, 7.5); const nw = ctx.measureText(name).width + 12; rr(ctx, bx + 8, by - 8, nw, 13, 6.5); fs(ctx, boss ? '#ffd84a' : '#ff6f9c', boss ? '#a0741a' : '#c9305f', 1); txt(ctx, name, bx + 8 + nw / 2, by - 1.5, 7.5, boss ? '#3a1a3a' : '#fff', 'center');
    /* typewriter text */ font(ctx, 10.5); ctx.textAlign = 'left'; ctx.fillStyle = col; let left = l.typed;
    for (let i = 0; i < wr.lines.length; i++) { const ln = wr.lines[i], s = ln.slice(0, clamp(left, 0, ln.length)); if (s) ctx.fillText(s, bx + 12, by + 7 + i * lh + lh / 2 + 0.5); if (!l.done && left >= 0 && left <= ln.length && (C.fr >> 3) % 2) { const cw = ctx.measureText(s).width; ctx.fillRect(bx + 13 + cw, by + 7 + i * lh + 2, 2, lh - 4); } left -= ln.length + 1; }
    ctx.restore();
  }
  function drawClueCard(ctx, w, l, k) {
    const maxW = Math.min(w - 36, 400); font(ctx, 9.5, 600); const wr = wrap(ctx, l.text, maxW - 66), cw = Math.max(170, wr.w + 66), ch = Math.max(46, wr.lines.length * 12 + 18), cx = w / 2, top = BAR + 12, pop = backOut(l.pop);
    ctx.save(); ctx.translate(cx, top); ctx.scale(pop, pop); ctx.translate(-cx, -top);
    rr(ctx, cx - cw / 2 + 3, top + 4, cw, ch, 9); fs(ctx, 'rgba(20,8,30,.28)'); rr(ctx, cx - cw / 2, top, cw, ch, 9); fs(ctx, '#fff4de', '#d9a85a', 2.2); rr(ctx, cx - cw / 2 + 4, top + 4, cw - 8, ch - 8, 6); ctx.strokeStyle = 'rgba(217,168,90,.45)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
    const lab = tr('Hinweis', 'Clue'); font(ctx, 7.5); const lw = ctx.measureText(lab).width + 14; rr(ctx, cx - lw / 2, top - 7, lw, 13, 6.5); fs(ctx, '#ffd84a', '#a0741a', 1); txt(ctx, lab, cx, top - 0.5, 7.5, '#3a1a3a', 'center');
    const ix = cx - cw / 2 + 28, iy = top + ch / 2; ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(ix, iy, 2, ix, iy, 22); g.addColorStop(0, 'rgba(255,220,120,.5)'); g.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = g; ctx.fillRect(ix - 22, iy - 22, 44, 44); ctx.restore(); drawItem(ctx, l.item, ix, iy, 0.62, k);
    font(ctx, 9.5, 600); ctx.textAlign = 'left'; ctx.fillStyle = '#5a3a2a'; let left = l.typed; for (let i = 0; i < wr.lines.length; i++) { const ln = wr.lines[i], s = ln.slice(0, clamp(left, 0, ln.length)); if (s) ctx.fillText(s, cx - cw / 2 + 54, top + 9 + i * 12 + 6.5); left -= ln.length + 1; }
    ctx.restore();
  }
  function drawDest(ctx, w) {
    const k = C.dest, name = destName(), inK = backOut(clamp(k / 0.5, 0, 1)), cx = w / 2 + (1 - inK) * w * 0.7, cy = 108;
    ctx.fillStyle = 'rgba(20,8,30,' + (0.38 * clamp(k / 0.3, 0, 1)) + ')'; ctx.fillRect(0, 0, w, VH);
    font(ctx, 17); let nw = ctx.measureText(name).width, px = 17; if (nw > w - 150) { px = 17 * (w - 150) / nw; font(ctx, px); nw = ctx.measureText(name).width; }
    const cw = Math.max(230, nw + 110), ch = 66; ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.02 * (1 - inK)); ctx.translate(-cx, -cy);
    rr(ctx, cx - cw / 2 + 4, cy - ch / 2 + 5, cw, ch, 14); fs(ctx, 'rgba(10,4,20,.4)'); rr(ctx, cx - cw / 2, cy - ch / 2, cw, ch, 14); const g = ctx.createLinearGradient(0, cy - ch / 2, 0, cy + ch / 2); g.addColorStop(0, '#5a2a6a'); g.addColorStop(1, '#2b1535'); fs(ctx, g, '#ff9eb0', 2.6); rr(ctx, cx - cw / 2 + 4, cy - ch / 2 + 4, cw - 8, ch * 0.42, 10); fs(ctx, 'rgba(255,255,255,.08)');
    txt(ctx, tr('NÄCHSTES ZIEL', 'NEXT STOP'), cx - 14, cy - 15, 8, '#ffd84a', 'center'); txt(ctx, name, cx - 14, cy + 9, px, '#fff', 'center', '#2b1535', px * 0.28);
    const ax = cx + cw / 2 - 30 + Math.abs(Math.sin(k * 7)) * 6, ay = cy; star(ctx, ax, ay, 12 + Math.sin(k * 7) * 1.5, 5, 5); fs(ctx, '#ffd84a', '#a0741a', 1.5); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ax - 5, ay); ctx.lineTo(ax + 4, ay); ctx.moveTo(ax + 1, ay - 3.5); ctx.lineTo(ax + 4.5, ay); ctx.lineTo(ax + 1, ay + 3.5); ctx.stroke();
    for (let i = 0; i < 6; i++) { const a = k * 3 + i * TAU / 6, r = 26 + Math.sin(k * 5 + i) * 5; star(ctx, ax + Math.cos(a) * r, ay + Math.sin(a) * r * 0.7, 2.4, 0.9, 4); fs(ctx, i % 2 ? '#fff' : '#ffd84a'); }
    ctx.restore();
  }

  /* ---------- frame ---------- */
  function frame(ctx) {
    if (!C.active) return;
    const w = VW(); let k = 1; try { k = ctx.getTransform().a || 1; } catch (e) { k = (G.draw && G.draw.k) || 1; }
    if (!C.bg || C.bgKey !== C.key + '|' + w + '|' + k) { C.bg = buildBg(C.W, w, k); C.bgKey = C.key + '|' + w + '|' + k; }
    const shx = C.shake > 0 ? (Math.random() - 0.5) * C.shake * 1.6 : 0, shy = C.shake > 0 ? (Math.random() - 0.5) * C.shake * 1.2 : 0, zx = B.x, zy = GY - 50, xf = {zx, zy, shx, shy};
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.translate(zx + shx, zy + shy); ctx.scale(C.zoom, C.zoom); ctx.translate(-zx, -zy);
    ctx.drawImage(C.bg, -2, -2, w + 4, VH + 4);
    bgDyn(ctx, w); drawAmbient(ctx); drawParts(ctx, false); spotlight(ctx); loom(ctx, w);
    drawMallo(ctx); drawHero(ctx); drawBoss(ctx); drawParts(ctx, true); drawItemFloat(ctx, k);
    ctx.restore();
    if (C.red > 0) { ctx.fillStyle = 'rgba(255,40,60,' + (0.4 * C.red) + ')'; ctx.fillRect(0, 0, w, VH); }
    if (C.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(C.ph === 'cut' ? 1 : 0.8, C.flash) + ')'; ctx.fillRect(0, 0, w, VH); }
    /* letterbox bars */
    const bh = BAR * C.bars; ctx.fillStyle = '#0d0612'; ctx.fillRect(0, 0, w, bh); ctx.fillRect(0, VH - bh, w, bh);
    if (C.ph === 'line' && C.ln) { if (C.ln.who === 'clue') drawClueCard(ctx, w, C.ln, k); else drawBubble(ctx, w, C.ln, xf); }
    if (C.ph === 'dest') drawDest(ctx, w);
    if (C.bars >= 1 && C.ph !== 'cut') { const touch = !!(G.input && G.input.touchMode); ctx.globalAlpha = 0.5 + Math.sin(C.t * 2) * 0.12; txt(ctx, tr('Tippen = weiter · Halten = überspringen', 'Tap = next · hold = skip'), w - (touch ? 8 : 122), VH - BAR / 2, 7, '#fff', 'right', null, 0, 600); ctx.globalAlpha = 1; }   /* desktop: the corner buttons sit bottom-right */
    if (C.fade > 0) { ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, C.fade) + ')'; ctx.fillRect(0, 0, w, VH); }
  }

  /* ---------- input ---------- */
  function next() {
    if (!C.active || C.fading || C.ph === 'cut') return;
    if (C.ph === 'in') { snapIntro(); startLine(0); return; }
    if (C.ph === 'dest') { if (C.dest > 0.5) startFade(0.5); return; }
    if (C.ph === 'line' && C.ln) { const l = C.ln; if (!l.done) { l.typed = l.n; l.done = true; l.ht = 0; snd.pop(); } else advance(); }
  }
  function skip() { if (!C.active || C.fading || C.ph === 'cut') return; snd.whoosh(); C.ln = null; startFade(0.4); }

  G.cut = {get active() { return C.active; }, set active(v) { C.active = !!v; }, play, update, frame, next, skip, _C: C};
})();
