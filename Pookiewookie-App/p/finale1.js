/* The Starway Home: Finale, part 1 (world 'finale'). Two self-contained game modes:
   G.modes.blackhole  level 1 "Schwarzes Loch": Toffo and Mallo in the rocket, caught by a black hole. The rocket circles in a tightening
                      spiral; steer along the orbit, thrust out, dive in, laser the spaghettified candy, slip through the gaps of gravity waves,
                      collect 5 Zeitkristalle, solve the alien console at the wormhole gate, then the wormhole tunnel brings them back to Earth.
   G.modes.chase      level 2 "Großstadt": side-scrolling car chase at dusk turning to night. Toffo drives the red convertible, Mallo throws
                      praline bombs backwards at the mafia limousines, duck under bullets, hop over potholes, barriers and traffic, ramps,
                      a bridge, a tunnel, then the highway out of town at sunset ("Ranch 5 km"). */
(function () {
  const G = window.PW = window.PW || {};
  G.modes = G.modes || {};
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de);
  const VH = 270, TAU = Math.PI * 2, DT = 1 / 60, OL = '#2a1530';
  const VW = () => G.VW || 480;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
  const hash = (x, y, s) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul((s | 0) + 7, 1442695041)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  function mkRng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const font = (ctx, px, w) => { ctx.font = (w || 700) + ' ' + px + 'px "Fredoka", sans-serif'; ctx.textBaseline = 'middle'; };
  function outlined(ctx, t, x, y, px, col, align, ol) { font(ctx, px); ctx.textAlign = align || 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = px * 0.32; ctx.strokeStyle = ol || 'rgba(42,21,40,.92)'; ctx.strokeText(t, x, y); ctx.fillStyle = col; ctx.fillText(t, x, y); }
  function rr(ctx, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function circ(ctx, x, y, r, fill, stroke, lw) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, TAU); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); } }
  function ell(ctx, x, y, rx, ry, rot, fill, stroke, lw) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); } }
  function heartPath(ctx, x, y, s) { ctx.beginPath(); ctx.moveTo(x, y + 4 * s); ctx.bezierCurveTo(x - 8 * s, y - 2 * s, x - 4 * s, y - 8 * s, x, y - 4 * s); ctx.bezierCurveTo(x + 4 * s, y - 8 * s, x + 8 * s, y - 2 * s, x, y + 4 * s); ctx.closePath(); }
  function starPath(ctx, x, y, r1, r2, n, rot) { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = (rot || -Math.PI / 2) + i * Math.PI / n, r = i % 2 ? r2 : r1; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); }
  const mix = (a, b, k) => 'rgb(' + Math.round(lerp(a[0], b[0], k)) + ',' + Math.round(lerp(a[1], b[1], k)) + ',' + Math.round(lerp(a[2], b[2], k)) + ')';
  const mixA = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const rgbS = (c, al) => 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (al === undefined ? 1 : al) + ')';
  function sfxOf(opts) { return (n, arg) => { try { if (opts && opts.sfx) opts.sfx(n, arg); else if (G.audio && G.audio.sfx && G.audio.sfx[n]) G.audio.sfx[n](arg); } catch (e) {} }; }
  function tone(f, d, o) { try { if (G.audio && G.audio.tone) G.audio.tone(f, d, o || {}); } catch (e) {} }
  function noise(d, o) { try { if (G.audio && G.audio.noise) G.audio.noise(d, o || {}); } catch (e) {} }
  function bear(opts, ctx, x, y, o) { try { if (opts && opts.drawBear) opts.drawBear(ctx, x, y, o); else if (G.draw && G.draw.drawBearAt) G.draw.drawBearAt(ctx, x, y, o); } catch (e) {} }
  function wookieOutfit(def) { return (G.S && G.S.outfit) || def; }

  /* ---------------------------------- particles (shared) ---------------------------------- */
  function pUpdate(arr) {
    for (const p of arr) { p.t += DT; p.x += p.vx || 0; p.y += p.vy || 0; if (p.g) p.vy += p.g; if (p.drag) { p.vx *= p.drag; p.vy *= p.drag; } if (p.spin) p.rot = (p.rot || 0) + p.spin; }
    return arr.length > 420 ? arr.filter(p => p.t < p.life).slice(-420) : arr.filter(p => p.t < p.life);
  }
  function pDraw(ctx, arr) {
    for (const p of arr) {
      const k = p.t / p.life, al = 1 - k;
      if (p.k === 's') { ctx.globalAlpha = al; circ(ctx, p.x, p.y, p.r * (1 - k * 0.6), p.c); }
      else if (p.k === 'star') { ctx.globalAlpha = al; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0); starPath(ctx, 0, 0, p.r, p.r * 0.45, 5); ctx.fillStyle = p.c || '#ffd84a'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 0.8; ctx.stroke(); ctx.restore(); }
      else if (p.k === 'ring') { ctx.globalAlpha = al; circ(ctx, p.x, p.y, p.r * (0.3 + k * 0.9), null, p.c || '#fff', 2.2 * al + 0.3); }
      else if (p.k === 'smoke') { ctx.globalAlpha = al * (p.a || 0.55); circ(ctx, p.x, p.y, p.r * (0.6 + k * 1.4), p.c || '#8a8494'); }
      else if (p.k === 'flash') { ctx.globalAlpha = al * 0.9; const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, '#fff'); g.addColorStop(0.4, p.c || 'rgba(255,230,160,.8)'); g.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = g; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); }
      else if (p.k === 'txt') { ctx.globalAlpha = Math.min(1, al * 2); outlined(ctx, p.text, p.x, p.y, p.size || 9, p.c || '#fff'); }
      else if (p.k === 'blob') { ctx.globalAlpha = al; ell(ctx, p.x, p.y, p.r, p.r * 0.8, p.rot || 0, p.c || '#6b3a1f'); }
    }
    ctx.globalAlpha = 1;
  }
  const burst = (arr, x, y, n, c, sp, r) => { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = (0.4 + Math.random()) * (sp || 2); arr.push({k: 's', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 0.35 + Math.random() * 0.4, r: (r || 1.6) * (0.6 + Math.random() * 0.8), c, drag: 0.94}); } };
  const stars = (arr, x, y, n, c) => { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 0.8 + Math.random() * 1.6; arr.push({k: 'star', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, t: 0, life: 0.6 + Math.random() * 0.4, r: 2.5 + Math.random() * 2, c: c || '#ffd84a', spin: 0.15, drag: 0.95}); } };
  const popText = (arr, x, y, text, c, size) => arr.push({k: 'txt', x, y, vx: 0, vy: -0.5, t: 0, life: 1.0, text, c: c || '#fff', size});

  /* ---------------------------------- HUD bits (shared) ---------------------------------- */
  function heartsHud(ctx, x, y, hp, max, t) {
    for (let i = 0; i < max; i++) {
      const full = i < hp, s = full && i === hp - 1 && hp <= 1 ? 1 + 0.12 * Math.sin(t * 9) : 1;
      ctx.save(); ctx.translate(x + i * 15, y + 2); ctx.scale(s, s); heartPath(ctx, 0, 0, 0.95); ctx.fillStyle = full ? '#ff6f9c' : 'rgba(255,255,255,.2)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = OL; ctx.stroke();
      if (full) circ(ctx, -3, -3.6, 1.3, 'rgba(255,255,255,.7)'); ctx.restore();
    }
  }
  function coinIcon(ctx, x, y, r, spin) { const sx = spin === undefined ? 1 : Math.max(0.16, Math.abs(Math.cos(spin))); ctx.save(); ctx.translate(x, y); ctx.scale(sx, 1); circ(ctx, 0, 0, r, '#ffd84a', '#7a4a10', 1.2); circ(ctx, 0, 0, r * 0.6, null, '#e0a020', 0.9); circ(ctx, -r * 0.35, -r * 0.35, r * 0.22, '#fff6c0'); ctx.restore(); }
  function moneyHud(ctx, x, y, n) { coinIcon(ctx, x + 4, y, 5); outlined(ctx, String(n), x + 13, y + 0.5, 9, '#ffd84a', 'left'); }
  /* a hint pill at the bottom centre that stays out of the touch corners (150 px each side); splits at " · " onto two lines */
  function hintPill(ctx, text, al, t) {
    if (!text || al <= 0) return; const W = VW(), maxW = W - 310; font(ctx, 8.5, 600);
    let lines = [text]; if (ctx.measureText(text).width > maxW - 14) { let parts = text.split(' · '), sep = ' · '; if (parts.length < 2) { parts = text.split(' '); sep = ' '; } const half = Math.ceil(parts.length / 2); lines = [parts.slice(0, half).join(sep), parts.slice(half).join(sep)]; }
    const w = Math.min(maxW, Math.max(...lines.map(l => ctx.measureText(l).width)) + 16), h = lines.length * 11 + 7, y = VH - 8 - h;
    ctx.globalAlpha = al; rr(ctx, W / 2 - w / 2, y, w, h, 7); ctx.fillStyle = 'rgba(74,34,58,.88)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,158,176,.7)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#fff4e0'; ctx.textAlign = 'center'; lines.forEach((l, i) => ctx.fillText(l, W / 2, y + 9 + i * 11)); ctx.globalAlpha = 1;
  }
  /* a white speech bubble whose tail points down at (x, y); word-wrapped to maxW, kept on screen */
  function sayBubble(ctx, x, y, text, maxW, px, al) {
    if (al <= 0) return; font(ctx, px, 600); const lines = []; let cur = '';
    for (const w of text.split(' ')) { const tt = cur ? cur + ' ' + w : w; if (ctx.measureText(tt).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tt; } if (cur) lines.push(cur);
    const lh = px * 1.25, bw = Math.max(...lines.map(l => ctx.measureText(l).width)) + 12, bh = lines.length * lh + 8, bx = clamp(x - bw / 2, 6, VW() - 6 - bw), by = y - bh - 7, tx = clamp(x, bx + 10, bx + bw - 10);
    ctx.globalAlpha = al; rr(ctx, bx, by, bw, bh, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#ff9eb0'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx - 4, by + bh - 0.8); ctx.lineTo(x, y); ctx.lineTo(tx + 4, by + bh - 0.8); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke(); ctx.fillRect(tx - 3.2, by + bh - 2.2, 6.4, 2);
    ctx.fillStyle = '#7a3b57'; ctx.textAlign = 'center'; lines.forEach((l, i) => ctx.fillText(l, bx + bw / 2, by + 4 + lh * (i + 0.5))); ctx.globalAlpha = 1;
  }

  /* ======================================================================================================== */
  /*                                              BLACK HOLE                                                  */
  /* ======================================================================================================== */
  const KX = 1.55, KY = 0.77, BCY = 145, RH = 21, RDANGER = 50, WSPD = 66;
  let B = null, DISK = null, BUF = null, BCTX = null;
  const bcx = () => VW() / 2;
  const bxy = (r, a) => [bcx() + Math.cos(a) * r * KX, BCY + Math.sin(a) * r * KY];
  const wrapA = a => ((a % TAU) + TAU) % TAU;
  const adiff = (a, b) => { const d = wrapA(a - b); return d > Math.PI ? d - TAU : d; };
  const CANDY = ['lolli', 'cane', 'gummy', 'choco', 'donut', 'clock'];

  /* the accretion disk is pre-rendered once (two bands that spin at different speeds) and drawn squashed into the orbit ellipse */
  function mkDisk() {
    const S = 2.4, R = 150, n = Math.round(R * 2 * S);
    const band = (r0, r1, stops, cols, seed, nStreak) => {
      const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'); g.setTransform(S, 0, 0, S, R * S, R * S);
      const rg = g.createRadialGradient(0, 0, r0, 0, 0, r1); for (const s of stops) rg.addColorStop(s[0], s[1]);
      g.beginPath(); g.arc(0, 0, r1, 0, TAU); g.arc(0, 0, r0, 0, TAU, true); g.fillStyle = rg; g.fill('evenodd');
      const Rn = mkRng(seed); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      for (let i = 0; i < nStreak; i++) { const k = Math.pow(Rn(), 1.25), r = r0 + 3 + k * (r1 - r0 - 6), a = Rn() * TAU, len = 0.2 + Rn() * 1.4; g.strokeStyle = cols[Math.floor(k * cols.length * 0.999)]; g.globalAlpha = (0.1 + Rn() * 0.32) * (1 - k * 0.5); g.lineWidth = 0.5 + Rn() * 2.4 * (1 - k * 0.5); g.beginPath(); g.arc(0, 0, r, a, a + len); g.stroke(); }
      g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 6; i++) { const r = r0 + 6 + Rn() * (r1 - r0 - 12); g.globalAlpha = 0.25 + Rn() * 0.3; g.lineWidth = 0.8 + Rn() * 2.4; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); }
      return c;
    };
    return {R,
      inner: band(25, 80, [[0, 'rgba(255,255,236,1)'], [0.1, 'rgba(255,232,150,1)'], [0.38, 'rgba(255,156,70,.95)'], [0.75, 'rgba(255,92,140,.75)'], [1, 'rgba(220,80,180,0)']], ['#fff8d8', '#ffd480', '#ffa060', '#ff7aa0'], 11, 240),
      outer: band(64, 150, [[0, 'rgba(255,110,150,0)'], [0.12, 'rgba(255,110,150,.7)'], [0.42, 'rgba(196,84,210,.5)'], [0.75, 'rgba(110,70,210,.26)'], [1, 'rgba(60,30,140,0)']], ['#ff90b8', '#e070ff', '#a080ff', '#ffb080', '#80c0ff'], 23, 260)};
  }

  function bhStart(opts) {
    opts = opts || {}; const lo = opts.loadout || {};
    if (!DISK) { try { DISK = mkDisk(); } catch (e) { DISK = null; } }
    const R = mkRng(1234), st = [], decor = [];
    for (let i = 0; i < 180; i++) st.push({x: (R() - 0.5) * 900, y: (R() - 0.5) * 560, s: 0.6 + R() * 1.3, tw: R() * 6, c: R() < 0.18 ? '#ffc8ee' : (R() < 0.3 ? '#c8e4ff' : '#ffffff'), v: 6 + R() * 9});
    for (let i = 0; i < 8; i++) decor.push({k: i % 2 ? 'clock' : ['lolli', 'cane', 'donut', 'gummy'][(i >> 1) % 4], r: 155 + R() * 110, a: R() * TAU, w: 0.025 + R() * 0.04, sp: R() * 6, s: 8 + R() * 6});
    const maxHp = 3 + (lo.fat ? 2 : 0);
    B = {opts, lo, sfx: sfxOf(opts), t: 0, phase: 'intro', pt: 0, r: 124, a: -2.25, vr: 0, v: 78, ang: -0.3, px: 0, py: 0, hp: maxHp, maxHp, shield: lo.shield ? 1 : 0, inv: 0, cool: 0, thrust: 0.4, dive: 0,
      ents: [], shots: [], waves: [], parts: [], decor, stars: st, crystals: 0, crysT: 4.0, spawnT: 2.4, coinT: 4.5, waveT: 15, ripple: 0.9, flash: 0, shake: 0, money: 0, kills: 0, hits: 0,
      auto: !!opts.autoplay, gate: null, asked: false, finished: false, bot: {fire: 0}, tt: 0, rings: [], streaks: [], msg: null, hint: 9, gapHint: 0, deadSpeak: false};
    const p = bxy(B.r, B.a); B.px = p[0]; B.py = p[1];
    B.sfx('liftoff');
    try { opts.banner && opts.banner(tr('Schwarzes Loch', 'Black Hole'), 2.6, tr('Sammle 5 Zeitkristalle und finde das Wurmloch-Tor!', 'Collect 5 time crystals and find the wormhole gate!')); } catch (e) {}
    try { opts.speak && opts.speak('Mallo, hold on!'); } catch (e) {}
  }

  function bhFinish(result) {
    const b = B; if (!b || b.finished) return; b.finished = true;
    try { if (G.audio && G.audio.setBoss) G.audio.setBoss(false); } catch (e) {}
    const info = {score: b.crystals * 1000 + b.kills * 100 + b.money * 10 + (result === 'clear' ? b.hp * 500 + 3000 : 0), money: b.money, stars: [result === 'clear', b.hits <= 1, b.money >= 20]};
    try { if (b.opts.done) b.opts.done(result, result === 'clear' ? info : undefined); } catch (e) {}
  }
  function bhMsg(text, sub, sec) { B.msg = {text, sub, t: sec || 2, life: sec || 2}; }
  function bhMoney(n, x, y) { const b = B; b.money += n; try { b.opts.money && b.opts.money(n); } catch (e) {} popText(b.parts, x, y - 8, '+' + n, '#ffd84a'); }

  function bhHurt() {
    const b = B; if (b.auto || b.inv > 0 || (b.phase !== 'play' && b.phase !== 'gate' && b.phase !== 'intro')) return;
    if (b.shield > 0) { b.shield = 0; b.inv = 1.2; b.sfx('bubblePop'); b.parts.push({k: 'ring', x: b.px, y: b.py, t: 0, life: 0.5, r: 34, c: '#8fd3ff'}); burst(b.parts, b.px, b.py, 12, '#bfe8ff', 2.4); bhMsg(tr('Schild weg!', 'Shield gone!'), '', 1.2); return; }
    b.hp--; b.hits++; b.inv = 1.6; b.shake = 6; b.ripple = Math.max(b.ripple, 0.7); b.flash = 0.35; b.sfx('rocketHit');
    burst(b.parts, b.px, b.py, 12, '#ffd84a', 2.4); stars(b.parts, b.px, b.py - 6, 4);
    if (b.hp <= 0) { b.phase = 'boom'; b.pt = 0; b.sfx('boom'); burst(b.parts, b.px, b.py, 30, '#ff9a4a', 3.5, 2.6); b.parts.push({k: 'flash', x: b.px, y: b.py, t: 0, life: 0.5, r: 60}); try { b.opts.speak && b.opts.speak('Oh no... Mallo...'); } catch (e) {} }
  }

  function bhBot() {
    const b = B, c = {up: false, down: false, left: false, right: false, fire: false};
    let tr = 92, ta = null; const cr = b.ents.find(e => e.k === 'crys');
    if (b.gate && b.phase === 'gate') { tr = b.gate.r; ta = b.gate.a; } else if (cr) { tr = cr.r; ta = cr.a; }
    if (b.r < tr - 3) c.up = true; else if (b.r > tr + 5) c.down = true;
    if (b.r < 46) { c.up = true; c.down = false; }
    if (ta !== null) { const d = wrapA(ta - b.a); if (d > TAU - 0.4) c.left = true; else if (d > 0.3) c.right = true; }
    const wv = b.waves.find(w => w.st === 'go' && w.r < b.r && b.r - w.r < 50);
    if (wv && !wv.gaps.some(g => Math.abs(adiff(b.a, g)) < wv.hw * 0.7)) { const g = wv.gaps.reduce((m, g) => (Math.abs(adiff(g, b.a)) < Math.abs(adiff(m, b.a)) ? g : m), wv.gaps[0]); c.right = adiff(g, b.a) > 0; c.left = !c.right; }
    b.bot.fire -= DT; if (b.bot.fire <= 0 && b.ents.some(e => e.k === 'deb' && Math.hypot(e.x - b.px, e.y - b.py) < 110)) { b.bot.fire = 0.3; c.fire = true; }
    return c;
  }

  function bhSpawnDebris(prog, rMax) {
    const b = B, k = CANDY[Math.floor(Math.random() * CANDY.length)];
    let a = Math.random() * TAU; if (Math.abs(adiff(a, b.a)) < 0.6) a += 1.4;
    b.ents.push({k: 'deb', kind: k, r: rMax + 40, a, w: (Math.random() < 0.28 ? -1 : 1) * (0.14 + Math.random() * 0.3), vin: 15 + Math.random() * 14 + prog * 12, s: k === 'clock' ? 9 + Math.random() * 2 : 6.5 + Math.random() * 3.5, spin: Math.random() * TAU, vs: (Math.random() - 0.5) * 4, hue: Math.random(), t: 0, x: 0, y: 0});
  }

  function bhUpdate() {
    const b = B; if (!b || b.finished) return; const I = G.input || {};
    b.t += DT; b.pt += DT;
    if (b.inv > 0) b.inv -= DT; if (b.flash > 0) b.flash = Math.max(0, b.flash - DT * 1.6); b.ripple = Math.max(0, b.ripple - DT * 0.7); if (b.shake > 0) b.shake = Math.max(0, b.shake - DT * 14);
    if (b.msg) { b.msg.t -= DT; if (b.msg.t <= 0) b.msg = null; }
    if (b.hint > 0) b.hint -= DT; if (b.gapHint > 0) b.gapHint -= DT;
    b.parts = pUpdate(b.parts);
    for (const d of b.decor) { d.a += d.w * DT; d.sp += DT * 0.6; }
    if (b.phase === 'tunnel') return bhTunnelStep();
    if (b.phase === 'boom') { if (b.pt > 1.9) bhFinish('dead'); return; }
    if (b.phase === 'fall') { b.r = Math.max(0, b.r - (20 + b.pt * 40) * DT); b.a += (2 + b.pt * 5) * DT; const p = bxy(b.r, b.a); b.px = p[0]; b.py = p[1]; b.ripple = 1; if (b.pt > 2.1) bhFinish('dead'); return; }

    const prog = clamp(b.t / 75, 0, 1), rMax = lerp(136, 104, ease(prog));
    let up = !!(I.up || I.jump), down = !!I.down, L = !!I.left, Rt = !!I.right, fire = !!(I.runEdge || (I.run && !b.opts.isTouch));
    if (b.auto) { const c = bhBot(); up = c.up; down = c.down; L = c.left; Rt = c.right; fire = c.fire; }
    if (b.phase === 'intro' && b.pt > 3.2) { b.phase = 'play'; b.pt = 0; bhMsg(tr('Wir werden angezogen!', 'We are being pulled in!'), tr('Halte Abstand vom Loch', 'Keep away from the hole'), 2.2); b.sfx('hazard'); }

    if (b.gate) { const q = bxy(b.gate.r, b.gate.a); b.gate.x = q[0]; b.gate.y = q[1]; }
    if (b.phase === 'dock' || b.phase === 'open') {
      const g = b.gate, tx = g.x - 46, ty = g.y; b.px += (tx - b.px) * 0.1; b.py += (ty - b.py) * 0.1; b.ang += adiff(0, b.ang) * 0.12; b.thrust = lerp(b.thrust, 0.2, 0.1);
      g.open = b.phase === 'open' ? clamp(b.pt / 1.1, 0, 1) : 0;
      if (b.phase === 'dock' && b.pt > 0.7 && !b.asked) {
        b.asked = true; let pre = false; try { pre = !!(b.opts.isSolved && b.opts.isSolved('finale-wurmloch')); } catch (e) {}
        const go = () => { if (B === b && b.phase === 'dock') { b.phase = 'open'; b.pt = 0; b.sfx('gate'); bhMsg(tr('Koordinaten akzeptiert!', 'Coordinates accepted!'), tr('Das Wurmloch öffnet sich …', 'The wormhole is opening …'), 1.8); } };
        if (pre || !b.opts.openPuzzle) go(); else { b.askT = 0; try { b.opts.openPuzzle('finale-wurmloch', go); } catch (e) { go(); } }
      }
      /* still docked a moment after asking: the console was closed without solving, so back off and let the player try again */
      if (b.phase === 'dock' && b.asked) { b.askT = (b.askT || 0) + DT; if (b.askT > 0.5) { b.phase = 'gate'; b.asked = false; b.askT = 0; b.a = wrapA(g.a - 0.55); b.r = g.r - 6; b.vr = 0; b.v = 60; bhMsg(tr('Die Konsole wartet …', 'The console is waiting …'), tr('Flieg nochmal ins Tor', 'Fly into the gate again'), 2.2); burst(b.parts, b.px, b.py, 10, '#9be7a5', 2); } }
      if (b.phase === 'open') {
        if (b.pt > 0.9) { const k = ease((b.pt - 0.9) / 0.7); b.px = lerp(g.x - 46, g.x, k); b.suck = k; }
        if (b.pt > 1.0 && !b.whoosh) { b.whoosh = true; b.sfx('globeGo'); noise(1.4, {type: 'bandpass', freq: 300, freqTo: 3000, q: 2, gain: 0.25}); }
        if (b.pt > 1.6) { b.phase = 'tunnel'; b.tt = 0; b.flash = 1; bhTunnelInit(); try { b.opts.banner && b.opts.banner(tr('Wurmloch!', 'Wormhole!'), 2, tr('Festhalten, Mallo!', 'Hold on tight, Mallo!')); } catch (e) {} }
      }
      return;
    }

    /* ---- flight: gravity pulls inward, thrust pushes out, left/right change the speed along the orbit ---- */
    const turbo = b.lo.turbo ? 1.3 : 1;
    let acc = -(6 + 10 * prog) - 0.92e5 / (b.r * b.r);
    if (b.phase === 'intro') acc *= 0.35;
    if (up) acc += 178 * turbo; if (down) acc -= 115 * turbo;
    if (b.r > rMax) acc -= (b.r - rMax) * 16;
    b.vr += acc * DT; b.vr *= 0.966; b.vr = clamp(b.vr, -115, 95); b.r += b.vr * DT;
    if (b.r > rMax + 10) { b.r = rMax + 10; b.vr = Math.min(0, b.vr); }
    if (b.auto && b.r < 40) { b.r = 40; b.vr = Math.max(b.vr, 20); }
    const vt = 76 * (1 + (Rt ? 0.85 * turbo : 0) - (L ? 0.58 : 0)); b.v += (vt - b.v) * 0.05 * turbo;
    b.a = wrapA(b.a + b.v / (Math.max(b.r, 30) * 1.18) * DT);
    b.thrust = lerp(b.thrust, up ? 1 : (Rt ? 0.65 : 0.3), 0.15); b.dive = lerp(b.dive, down ? 1 : 0, 0.2);
    if (up && (G.S && G.S.frames || 0) % 10 === 0) b.sfx('thrust');
    const p = bxy(b.r, b.a), dx = p[0] - b.px, dy = p[1] - b.py; b.px = p[0]; b.py = p[1];
    if (dx * dx + dy * dy > 0.0004) b.ang += adiff(Math.atan2(dy, dx), b.ang) * 0.2;
    if (b.r < RH + 1) { b.phase = 'fall'; b.pt = 0; b.sfx('dive'); try { b.opts.speak && b.opts.speak('Oh no... Mallo...'); } catch (e) {} return; }
    if (b.r < RDANGER && (G.S && G.S.frames || 0) % 30 === 0) b.sfx('tick');
    if (Math.random() < 0.5) { const ex = b.px - Math.cos(b.ang) * 20, ey = b.py - Math.sin(b.ang) * 20; b.parts.push({k: 's', x: ex, y: ey, vx: -Math.cos(b.ang) * (0.6 + b.thrust), vy: -Math.sin(b.ang) * (0.6 + b.thrust), t: 0, life: 0.35, r: 1.3 + b.thrust, c: Math.random() < 0.5 ? '#ffd84a' : '#ff8a4a'}); }

    /* ---- lasers ---- */
    b.cool -= DT;
    if (fire && b.cool <= 0) {
      b.cool = 0.2; const n = b.lo.laser || 1, ca = Math.cos(b.ang), sa = Math.sin(b.ang), nx = b.px + ca * 22, ny = b.py + sa * 22, sp = 5.8;
      const add = (ox, da) => { const a = b.ang + da; b.shots.push({x: nx - sa * ox, y: ny + ca * ox, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0}); };
      if (n <= 1) add(0, 0); else if (n === 2) { add(-4, 0); add(4, 0); } else { add(0, 0); add(-3, -0.16); add(3, 0.16); }
      b.sfx('laser');
    }
    for (const s of b.shots) { s.x += s.vx; s.y += s.vy; s.t += DT; }

    /* ---- spawns ---- */
    const playing = b.phase === 'play' || b.phase === 'gate';
    if (playing) {
      b.spawnT -= DT; if (b.spawnT <= 0) { b.spawnT = lerp(2.0, 0.9, prog) * (b.phase === 'gate' ? 1.5 : 1); bhSpawnDebris(prog, rMax); }
      b.coinT -= DT;
      if (b.coinT <= 0 && b.ents.filter(e => e.k === 'coin').length < 8) {
        b.coinT = 5.5 + Math.random() * 3; const rc = clamp(b.r + (Math.random() - 0.5) * 40, 52, rMax - 8), a0 = b.a + 1.1 + Math.random() * 1.6, heart = b.hp < b.maxHp && Math.random() < 0.35;
        for (let i = 0; i < 5; i++) b.ents.push({k: heart && i === 2 ? 'heart' : 'coin', r: rc, a: a0 + i * 0.13, w: 0.04, life: 15, t: Math.random() * 3, x: 0, y: 0});
      }
      if (b.phase === 'play' && b.crystals < 5 && !b.ents.some(e => e.k === 'crys')) {
        b.crysT -= DT;
        if (b.crysT <= 0) { const CR = [98, 70, 116, 56, 86], r = Math.min(CR[b.crystals], rMax - 8); b.ents.push({k: 'crys', r, a: b.a + Math.PI + (Math.random() - 0.5) * 1.1, w: -0.07, t: 0, x: 0, y: 0, born: 0}); b.sfx('appear'); }
      }
      if (b.phase === 'play' && b.t > 13) {
        b.waveT -= DT;
        if (b.waveT <= 0) {
          b.waveT = lerp(10, 6.5, prog); const two = prog > 0.55, arr = 1.1 + (b.r - RH) / WSPD, ap = b.a + b.v / (b.r * 1.18) * arr, g0 = ap + (Math.random() - 0.5) * 1.5;
          b.waves.push({st: 'tele', t: 0, r: RH, gaps: two ? [g0, g0 + Math.PI + (Math.random() - 0.5) * 0.6] : [g0], hw: two ? 0.45 : 0.55, hit: false});
          b.sfx('hazard'); if (b.waves.length === 1 && !b.gapSeen) { b.gapSeen = true; b.gapHint = 4; }
        }
      }
    }

    /* ---- gravity waves ---- */
    for (const w of b.waves) {
      w.t += DT;
      if (w.st === 'tele') { if (w.t > 1.1) { w.st = 'go'; b.ripple = Math.max(b.ripple, 0.55); b.sfx('boom'); b.shake = Math.max(b.shake, 2); } continue; }
      w.r += WSPD * DT;
      if (!w.hit && w.r >= b.r) {
        w.hit = true; const inGap = w.gaps.some(g => Math.abs(adiff(b.a, g)) < w.hw);
        if (inGap) { popText(b.parts, b.px, b.py - 16, tr('Puh!', 'Phew!'), '#9be7a5', 10); b.sfx('select'); } else { bhHurt(); b.ripple = 1; }
      }
    }
    b.waves = b.waves.filter(w => w.r < 230);

    /* ---- entities ---- */
    const magnet = !!b.lo.magnet;
    for (const e of b.ents) {
      e.t += DT;
      if (e.k === 'deb') {
        e.r -= e.vin * (1 + 26 / Math.max(e.r, 22)) * DT; e.a += e.w * (110 / Math.max(e.r, 30)) * DT; e.spin += e.vs * DT;
        const q = bxy(e.r, e.a); e.x = q[0]; e.y = q[1];
        if (e.r < RH + 2) { e.dead = true; b.parts.push({k: 'flash', x: bcx(), y: BCY, t: 0, life: 0.3, r: 18, c: 'rgba(255,180,255,.7)'}); continue; }
        for (const s of b.shots) if (!s.dead && Math.hypot(s.x - e.x, s.y - e.y) < e.s + 3) {
          s.dead = true; e.dead = true; b.kills++; burst(b.parts, e.x, e.y, 10, e.kind === 'clock' ? '#ffd84a' : '#ff9eb0', 2); stars(b.parts, e.x, e.y, 2, '#fff4e0'); b.sfx('pop');
          if (Math.random() < 0.3) b.ents.push({k: 'coin', r: e.r, a: e.a, w: 0.04, life: 8, t: 0, x: e.x, y: e.y}); break;
        }
        if (!e.dead && Math.hypot(e.x - b.px, e.y - b.py) < e.s * 0.85 + 11) { e.dead = true; burst(b.parts, e.x, e.y, 10, '#fff', 2); bhHurt(); }
      } else {
        if (e.k === 'coin' || e.k === 'heart') { e.life -= DT; if (e.life <= 0) { e.dead = true; continue; } }
        if (e.mag) { e.x += (b.px - e.x) * 0.16; e.y += (b.py - e.y) * 0.16; }
        else { e.a += e.w * DT; const q = bxy(e.r, e.a); e.x = q[0]; e.y = q[1] + Math.sin(e.t * 3) * 2; if (magnet && e.k !== 'crys' && Math.hypot(e.x - b.px, e.y - b.py) < 95) e.mag = true; }
        if (b.phase !== 'boom' && Math.hypot(e.x - b.px, e.y - b.py) < (e.k === 'crys' ? 16 : 13)) {
          e.dead = true;
          if (e.k === 'coin') { bhMoney(1, e.x, e.y); b.sfx('coin'); burst(b.parts, e.x, e.y, 5, '#ffd84a', 1.4); }
          else if (e.k === 'heart') { b.hp = Math.min(b.maxHp, b.hp + 1); b.sfx('heart'); popText(b.parts, e.x, e.y - 8, '+1 ♥', '#ff9eb0'); }
          else if (e.k === 'crys') {
            b.crystals++; b.sfx('star'); b.flash = 0.6; b.ripple = 1; b.crysT = 5.5; bhMoney(3, e.x, e.y);
            b.parts.push({k: 'ring', x: e.x, y: e.y, t: 0, life: 0.6, r: 46, c: '#9ff0ff'}); burst(b.parts, e.x, e.y, 18, '#9ff0ff', 2.8); stars(b.parts, e.x, e.y, 6, '#c9a0ff');
            if (b.crystals >= 5) {
              b.phase = 'gate'; b.pt = 0; const gr = Math.min(112, rMax - 2), q = bxy(gr, 0);
              b.gate = {r: gr, a: 0, x: q[0], y: q[1], open: 0, t: 0}; b.waves.forEach(w => { w.hit = true; }); b.sfx('powerup');
              bhMsg(tr('Alle 5 Zeitkristalle!', 'All 5 time crystals!'), tr('Das Wurmloch-Tor erscheint →', 'The wormhole gate appears →'), 2.6);
              try { b.opts.speak && b.opts.speak("Let's go!"); } catch (er) {}
            } else bhMsg(tr(`Zeitkristall ${b.crystals}/5`, `Time crystal ${b.crystals}/5`), b.crystals === 4 ? tr('Nur noch einer!', 'Just one more!') : '', 1.6);
          }
        }
      }
    }
    b.ents = b.ents.filter(e => !e.dead);
    b.shots = b.shots.filter(s => !s.dead && s.t < 0.9);
    if (b.gate) {
      const g = b.gate; g.t += DT; const q = bxy(g.r, g.a); g.x = q[0]; g.y = q[1];
      if (b.phase === 'gate' && Math.hypot(b.px - (g.x - 14), b.py - g.y) < 34) {
        b.phase = 'dock'; b.pt = 0; b.sfx('checkpoint');
        for (const e of b.ents) if (e.k === 'deb') { burst(b.parts, e.x, e.y, 6, '#ff9eb0', 1.5); }
        b.ents = b.ents.filter(e => e.k !== 'deb'); b.waves = [];
        bhMsg(tr('Die Alien-Konsole', 'The alien console'), tr('will die Wurmloch-Koordinaten …', 'wants the wormhole coordinates …'), 2.2);
      }
    }
  }

  function bhTunnelInit() {
    const b = B; b.rings = []; b.streaks = [];
    for (let i = 0; i < 26; i++) b.rings.push({z: 0.2 + i * 0.16, h: i * 37, rot: Math.random() * TAU});
    for (let i = 0; i < 90; i++) b.streaks.push({a: Math.random() * TAU, d: Math.random() * 1.3, c: Math.random() < 0.3 ? '#ffc8ee' : (Math.random() < 0.5 ? '#bff4ff' : '#fff')});
  }
  function bhTunnelStep() {
    const b = B; b.tt += DT; const tt = b.tt, sp = 0.9 + tt * 0.85;
    for (const r of b.rings) { r.z -= sp * DT; if (r.z < 0.12) { r.z += 4.16; r.h += 140; } }
    for (const s of b.streaks) { s.d *= 1 + (0.018 + tt * 0.012); if (s.d > 1.4) { s.d = 0.02 + Math.random() * 0.08; s.a = Math.random() * TAU; } }
    if (tt > 0.2 && (G.S && G.S.frames || 0) % 20 === 0 && tt < 5) tone(220 + tt * 120, 0.25, {type: 'sine', gain: 0.05, slide: 440 + tt * 200, slideDur: 0.25});
    if (tt > 5.4 && !b.earthSfx) { b.earthSfx = true; b.sfx('clear'); }
    if (tt > 6.6 && !b.yay) { b.yay = true; try { b.opts.speak && b.opts.speak('Yay! I did it!'); } catch (e) {} }
    if (tt > 7.9) bhFinish('clear');
  }

  /* ---------------------------------- black hole art ---------------------------------- */
  function drawCandy(ctx, kind, s, t, hue) {
    ctx.lineJoin = 'round';
    if (kind === 'lolli') {
      rr(ctx, -0.9, s * 0.5, 1.8, s * 1.3, 0.9); ctx.fillStyle = '#fff4e0'; ctx.fill();
      circ(ctx, 0, 0, s * 0.72, hue < 0.5 ? '#ff6f9c' : '#8fd3ff', OL, 1.1);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = s * 0.16; ctx.beginPath(); for (let i = 0; i < 18; i++) { const a = i * 0.55, r = s * 0.06 + i * s * 0.033; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke();
    } else if (kind === 'cane') {
      ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-s * 0.2, s * 0.9); ctx.lineTo(-s * 0.2, -s * 0.2); ctx.arc(s * 0.22, -s * 0.2, s * 0.42, Math.PI, 0); ctx.lineTo(s * 0.64, s * 0.1);
      ctx.strokeStyle = OL; ctx.lineWidth = s * 0.5; ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = s * 0.34; ctx.stroke(); ctx.setLineDash([s * 0.22, s * 0.22]); ctx.strokeStyle = '#ff4060'; ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = 'butt';
    } else if (kind === 'gummy') {
      const c = hue < 0.33 ? 'rgba(120,230,140,.92)' : (hue < 0.66 ? 'rgba(255,90,110,.92)' : 'rgba(255,190,60,.92)');
      ctx.fillStyle = c; ctx.strokeStyle = OL; ctx.lineWidth = 0.9;
      circ(ctx, -s * 0.32, -s * 0.72, s * 0.2, c, OL, 0.9); circ(ctx, s * 0.32, -s * 0.72, s * 0.2, c, OL, 0.9);
      ell(ctx, 0, s * 0.25, s * 0.5, s * 0.62, 0, c, OL, 0.9); circ(ctx, 0, -s * 0.4, s * 0.42, c, OL, 0.9);
      circ(ctx, -s * 0.14, -s * 0.45, s * 0.06, OL); circ(ctx, s * 0.14, -s * 0.45, s * 0.06, OL); ell(ctx, -s * 0.15, -s * 0.6, s * 0.12, s * 0.07, -0.5, 'rgba(255,255,255,.6)');
    } else if (kind === 'choco') {
      rr(ctx, -s * 0.85, -s * 0.55, s * 1.7, s * 1.1, s * 0.15); ctx.fillStyle = '#7a4424'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = '#a0643a'; ctx.lineWidth = 0.7; ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(i * s * 0.42, -s * 0.5); ctx.lineTo(i * s * 0.42, s * 0.5); } ctx.moveTo(-s * 0.8, 0); ctx.lineTo(s * 0.8, 0); ctx.stroke();
      rr(ctx, -s * 0.85, s * 0.05, s * 1.7, s * 0.5, s * 0.12); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fill();
    } else if (kind === 'donut') {
      circ(ctx, 0, 0, s * 0.85, '#e0a060', OL, 1); circ(ctx, 0, -s * 0.05, s * 0.7, hue < 0.5 ? '#ff9ec8' : '#b48cf0');
      const cols = ['#fff', '#ffd84a', '#8fd3ff', '#9be7a5']; for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3, r = s * 0.5; ctx.fillStyle = cols[i % 4]; ctx.save(); ctx.translate(Math.cos(a) * r, Math.sin(a) * r - s * 0.05); ctx.rotate(a * 2); ctx.fillRect(-s * 0.12, -s * 0.04, s * 0.24, s * 0.08); ctx.restore(); }
      circ(ctx, 0, 0, s * 0.26, '#1a0828', OL, 1);
    } else if (kind === 'clock') {
      /* a melting pocket clock: the bottom drips */
      ctx.beginPath(); ctx.moveTo(-s, 0); ctx.arc(0, 0, s, Math.PI, 0); ctx.bezierCurveTo(s, s * 0.7, s * 0.5, s * 0.6, s * 0.35, s * 1.5); ctx.bezierCurveTo(s * 0.2, s * 1.9, -s * 0.1, s * 1.4, -s * 0.2, s * 0.9); ctx.bezierCurveTo(-s * 0.5, s * 0.9, -s, s * 0.7, -s, 0); ctx.closePath();
      ctx.fillStyle = '#ffd84a'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.1; ctx.stroke();
      circ(ctx, 0, -s * 0.05, s * 0.76, '#fff8ea');
      ctx.strokeStyle = '#7a3b57'; ctx.lineWidth = 0.6; ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.moveTo(Math.cos(a) * s * 0.6, Math.sin(a) * s * 0.6 - s * 0.05); ctx.lineTo(Math.cos(a) * s * 0.7, Math.sin(a) * s * 0.7 - s * 0.05); } ctx.stroke();
      ctx.lineCap = 'round'; ctx.strokeStyle = OL; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(0, -s * 0.05); ctx.lineTo(Math.cos(t * 5) * s * 0.55, Math.sin(t * 5) * s * 0.55 - s * 0.05); ctx.moveTo(0, -s * 0.05); ctx.lineTo(Math.cos(-t * 1.3) * s * 0.36, Math.sin(-t * 1.3) * s * 0.36 - s * 0.05); ctx.stroke(); ctx.lineCap = 'butt';
      rr(ctx, -s * 0.18, -s * 1.28, s * 0.36, s * 0.3, 1); ctx.fillStyle = '#ffd84a'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 0.8; ctx.stroke();
    }
  }
  /* the rocket with Toffo and Mallo under the glass dome; never drawn upside down */
  function drawRocket(ctx, x, y, ang, o) {
    o = o || {}; const lo = o.lo || {}, gold = !!lo.paint, hull = gold ? '#ffcf3a' : '#ff5c8a', hull2 = gold ? '#c99a10' : '#c9305f', body = gold ? '#fff3c4' : '#fff4e6', sc = o.scale || 1, t = o.t || 0;
    let flip = 1, a = ang; if (Math.cos(ang) < 0) { flip = -1; a = ang - Math.PI; }
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(flip * sc, sc); if (lo.fat) ctx.scale(1.1, 1.16);
    if (o.stretch) ctx.scale(1 + o.stretch, 1 / (1 + o.stretch * 0.6));
    if (o.blink) ctx.globalAlpha = 0.45;
    /* flame */
    const th = o.thrust === undefined ? 0.4 : o.thrust, fl = 7 + th * 16 + Math.sin(t * 50) * 2.5;
    ctx.beginPath(); ctx.moveTo(-22, -5.5); ctx.quadraticCurveTo(-22 - fl * 0.6, -4, -22 - fl, 0); ctx.quadraticCurveTo(-22 - fl * 0.6, 4, -22, 5.5); ctx.closePath(); ctx.fillStyle = '#ff7a2a'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-22, -3); ctx.quadraticCurveTo(-22 - fl * 0.4, -2, -22 - fl * 0.62, 0); ctx.quadraticCurveTo(-22 - fl * 0.4, 2, -22, 3); ctx.closePath(); ctx.fillStyle = '#ffe94a'; ctx.fill();
    if (o.dive > 0.2) { ctx.globalAlpha = o.dive * 0.8; for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(14, d * 7); ctx.lineTo(19, d * (12 + Math.sin(t * 40) * 2)); ctx.lineTo(10, d * 8); ctx.fillStyle = '#bff4ff'; ctx.fill(); } ctx.globalAlpha = o.blink ? 0.45 : 1; }
    /* fins */
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.4; ctx.strokeStyle = OL;
    ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(-22, -16); ctx.quadraticCurveTo(-25, -16, -23, -10); ctx.lineTo(-18, -5); ctx.closePath(); ctx.fillStyle = hull; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-10, 6); ctx.lineTo(-22, 16); ctx.quadraticCurveTo(-25, 16, -23, 10); ctx.lineTo(-18, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
    rr(ctx, -25, -5, 5, 10, 2); ctx.fillStyle = '#6a6a84'; ctx.fill(); ctx.stroke();
    /* glass dome (back), the bears, then the hull in front of their legs */
    ctx.beginPath(); ctx.ellipse(1, -5, 13, 13.5, 0, Math.PI, TAU); ctx.closePath(); ctx.fillStyle = 'rgba(143,211,255,.3)'; ctx.fill();
    const mood = o.mood, bt = t;
    bear(o.opts, ctx, -6, 1.5, {scale: 0.56, facing: 1, frame: bt * 6, pose: o.pose || 'idle', white: true, bow: true, t: bt + 1.3, mood});
    bear(o.opts, ctx, 7, 1.8, {scale: 0.58, facing: 1, frame: bt * 6, pose: o.pose || 'idle', outfit: 'weltraum', t: bt, mood: mood === 'happy' ? 'happy' : (mood || 'determined')});
    rr(ctx, -21, -7.5, 42, 15, 7.5); ctx.fillStyle = body; ctx.fill(); ctx.stroke();
    ctx.save(); rr(ctx, -21, -7.5, 42, 15, 7.5); ctx.clip(); ctx.fillStyle = 'rgba(122,59,87,.14)'; ctx.fillRect(-21, 2.5, 42, 6); ctx.fillStyle = hull; ctx.fillRect(-15, -8, 4, 16); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(-17, -5.5, 30, 1.6); ctx.restore();
    ctx.beginPath(); ctx.moveTo(16, -7.2); ctx.quadraticCurveTo(31, -4.5, 32, 0); ctx.quadraticCurveTo(31, 4.5, 16, 7.2); ctx.closePath(); ctx.fillStyle = hull; ctx.fill(); ctx.stroke();
    circ(ctx, 24, -2, 1.2, 'rgba(255,255,255,.65)');
    starPath(ctx, -2, 3.2, 2.6, 1.1, 5); ctx.fillStyle = hull2; ctx.fill();
    if ((lo.laser || 1) > 1) { rr(ctx, 2, 7, 12, 3.4, 1.7); ctx.fillStyle = '#5a5a72'; ctx.fill(); ctx.stroke(); if (lo.laser > 2) { rr(ctx, -6, 7.5, 9, 3, 1.5); ctx.fill(); ctx.stroke(); } }
    ctx.beginPath(); ctx.ellipse(1, -5, 13, 13.5, 0, Math.PI, TAU); ctx.strokeStyle = OL; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(1, -5, 10, 10.5, 0, Math.PI * 1.15, Math.PI * 1.45); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function drawGem(ctx, x, y, s, t, filled) {
    ctx.save(); ctx.translate(x, y);
    if (filled) { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 2.6); g.addColorStop(0, 'rgba(160,240,255,.55)'); g.addColorStop(1, 'rgba(160,140,255,0)'); ctx.fillStyle = g; ctx.fillRect(-s * 2.6, -s * 2.6, s * 5.2, s * 5.2); }
    ctx.beginPath(); ctx.moveTo(0, -s * 1.25); ctx.lineTo(s * 0.85, -s * 0.45); ctx.lineTo(s * 0.85, s * 0.45); ctx.lineTo(0, s * 1.25); ctx.lineTo(-s * 0.85, s * 0.45); ctx.lineTo(-s * 0.85, -s * 0.45); ctx.closePath();
    if (filled) { const lg = ctx.createLinearGradient(-s, -s, s, s); lg.addColorStop(0, '#e8fdff'); lg.addColorStop(0.4, '#7ae8ff'); lg.addColorStop(1, '#9a6aff'); ctx.fillStyle = lg; } else ctx.fillStyle = 'rgba(255,255,255,.14)';
    ctx.fill(); ctx.strokeStyle = filled ? '#3a2070' : 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.1; ctx.stroke();
    if (filled) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-s * 0.85, -s * 0.45); ctx.lineTo(0, -s * 0.1); ctx.lineTo(s * 0.85, -s * 0.45); ctx.moveTo(0, -s * 0.1); ctx.lineTo(0, s * 1.25); ctx.stroke(); circ(ctx, -s * 0.35, -s * 0.55, s * 0.18, '#fff'); }
    ctx.restore();
  }
  function drawGate(ctx, g, t) {
    const op = g.open; ctx.save(); ctx.translate(g.x, g.y); ctx.scale(1.35, 1.35); const x = 0, y = 0;
    /* beacon glow */
    const gl = ctx.createRadialGradient(x, y, 4, x, y, 46 + op * 30); gl.addColorStop(0, 'rgba(180,255,220,' + (0.35 + op * 0.4) + ')'); gl.addColorStop(1, 'rgba(120,80,255,0)'); ctx.fillStyle = gl; ctx.fillRect(x - 80, y - 80, 160, 160);
    /* console platform with the alien below the ring */
    rr(ctx, x - 17, y + 22, 34, 11, 4); ctx.fillStyle = '#5a4a8a'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.3; ctx.stroke();
    rr(ctx, x - 11, y + 24.5, 14, 6, 1.5); ctx.fillStyle = '#122a2a'; ctx.fill(); ctx.fillStyle = '#7dffb0'; for (let i = 0; i < 4; i++) if (((t * 6 + i * 3) | 0) % 3) ctx.fillRect(x - 9.5 + i * 3, y + 26 + (i % 2) * 1.6, 2, 1.2);
    for (let i = 0; i < 3; i++) circ(ctx, x + 6 + i * 3.5, y + 27.5, 1.1, ((t * 4 | 0) + i) % 3 === 0 ? '#ffd84a' : '#ff6f9c');
    /* the alien peeking up behind the console, waving */
    const ay = y + 20 + Math.sin(t * 3) * 0.8; ell(ctx, x + 12, ay, 5.2, 4.8, 0, '#8af27a', OL, 1.1); circ(ctx, x + 12.5, ay - 0.6, 2.3, '#fff', OL, 0.6); circ(ctx, x + 13.1, ay - 0.4, 1.1, OL);
    ctx.strokeStyle = OL; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x + 12, ay - 4.6); ctx.quadraticCurveTo(x + 13, ay - 8, x + 15, ay - 8.5); ctx.stroke(); circ(ctx, x + 15, ay - 8.5, 1.2, '#ff6f9c');
    ctx.lineCap = 'round'; ctx.strokeStyle = '#8af27a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 16.5, ay); ctx.quadraticCurveTo(x + 20, ay - 3, x + 19 + Math.sin(t * 8) * 2, ay - 7); ctx.stroke(); ctx.lineCap = 'butt';
    /* the ring */
    ctx.save(); ctx.translate(x, y);
    ell(ctx, 0, 0, 13, 25, 0, '#1a0a3a');
    if (op > 0 || true) { ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 11, 23, 0, 0, TAU); ctx.clip(); for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(0, 0, 11 - i * 1.5, 23 - i * 3.1, 0, t * (2 + op * 6) + i, t * (2 + op * 6) + i + 3.5); ctx.strokeStyle = 'hsla(' + ((i * 40 + t * 90) % 360) + ',95%,' + (55 + op * 25) + '%,' + (0.35 + op * 0.6) + ')'; ctx.lineWidth = 1.6 + op; ctx.stroke(); } if (op > 0) circ(ctx, 0, 0, 3 + op * 7, 'rgba(255,255,255,' + op + ')'); ctx.restore(); }
    ctx.beginPath(); ctx.ellipse(0, 0, 13, 25, 0, 0, TAU); ctx.lineWidth = 5; ctx.strokeStyle = OL; ctx.stroke(); ctx.lineWidth = 3.4; ctx.strokeStyle = '#8a7ad8'; ctx.stroke();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + t * 0.6; circ(ctx, Math.cos(a) * 13, Math.sin(a) * 25, 1.5, (i + (t * 5 | 0)) % 4 === 0 || op > 0 ? '#9ff0ff' : '#5a4aa8'); }
    ctx.restore();
    if (op <= 0) outlined(ctx, tr('Wurmloch-Tor', 'Wormhole gate'), 0, -34 + Math.sin(t * 3) * 1.5, 7, '#9be7a5');
    ctx.restore();
  }
  function withRipple(ctx, amt, t, fn) {
    const cv = ctx.canvas; if (amt < 0.03 || !ctx.getTransform || !cv) { fn(ctx); return; }
    try {
      if (!BUF || BUF.width !== cv.width || BUF.height !== cv.height) { BUF = document.createElement('canvas'); BUF.width = cv.width; BUF.height = cv.height; BCTX = BUF.getContext('2d'); }
      const m = ctx.getTransform(); BCTX.setTransform(1, 0, 0, 1, 0, 0); BCTX.clearRect(0, 0, BUF.width, BUF.height); BCTX.setTransform(m); fn(BCTX);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#07031a'; ctx.fillRect(0, 0, cv.width, cv.height);
      const n = 90, sh = Math.ceil(cv.height / n), A = amt * 2.6 * m.a;
      for (let i = 0; i < n; i++) { const y = i * sh, off = Math.sin(i * 0.3 - t * 9) * A; ctx.drawImage(BUF, 0, y, cv.width, sh, off - A, y, cv.width + A * 2, sh); }
      ctx.restore();
    } catch (e) { fn(ctx); }
  }
  function lensedStars(ctx, b, t) {
    const cx = bcx(), TE = 56, W = VW(); ctx.lineCap = 'round';
    const img = (s, rad, phi, mag, al) => {
      if (rad > 520) return; const x = cx + Math.cos(phi) * rad, y = BCY + Math.sin(phi) * rad; if (x < -10 || x > W + 10 || y < -10 || y > VH + 10) return;
      ctx.globalAlpha = clamp(al, 0, 1);
      if (mag < 1.35) { ctx.fillStyle = s.c; ctx.fillRect(x - s.s * 0.5, y - s.s * 0.5, s.s, s.s); return; }
      const hl = Math.min(0.9, s.s * mag * 0.7 / rad); ctx.strokeStyle = s.c; ctx.lineWidth = Math.min(2.2, s.s * (0.7 + mag * 0.08)); ctx.beginPath(); ctx.arc(cx, BCY, rad, phi - hl, phi + hl); ctx.stroke();
    };
    for (const s of b.stars) {
      let sx = s.x - t * s.v; sx = ((sx + 450) % 900 + 900) % 900 - 450; const sy = s.y;
      const beta = Math.max(1.5, Math.hypot(sx, sy)), phi = Math.atan2(sy, sx), root = Math.sqrt(beta * beta + 4 * TE * TE), tp = (beta + root) / 2, tm = (root - beta) / 2;
      const tw = 0.55 + 0.45 * Math.sin(t * 2 + s.tw);
      img(s, tp, phi, tp / beta, tw);
      if (beta < 170) img(s, tm, phi + Math.PI, tm / beta, tw * 0.6);
    }
    ctx.globalAlpha = 1; ctx.lineCap = 'butt';
  }
  function drawDiskHalf(ctx, t, front) {
    if (!DISK) return; const cx = bcx(), R = DISK.R;
    ctx.save(); ctx.beginPath(); if (front) ctx.rect(-20, BCY, VW() + 40, VH); else ctx.rect(-20, -20, VW() + 40, BCY + 20); ctx.clip();
    ctx.translate(cx, BCY); ctx.scale(KX, KY);
    ctx.globalAlpha = 0.72; ctx.save(); ctx.rotate(t * 0.16); ctx.drawImage(DISK.outer, -R, -R, R * 2, R * 2); ctx.restore();
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.8; ctx.save(); ctx.rotate(t * 0.55); ctx.drawImage(DISK.inner, -R, -R, R * 2, R * 2); ctx.restore();
    ctx.restore();
  }
  function bhScene(ctx) {
    const b = B, W = VW(), cx = bcx(), t = b.t, hueT = t * 0.35;
    ctx.save();
    if (b.shake > 0) ctx.translate((Math.random() - 0.5) * b.shake, (Math.random() - 0.5) * b.shake);
    const bg = ctx.createRadialGradient(cx, BCY, 10, cx, BCY, W * 0.78); bg.addColorStop(0, '#2c0e40'); bg.addColorStop(0.45, '#150828'); bg.addColorStop(1, '#05020f'); ctx.fillStyle = bg; ctx.fillRect(-20, -20, W + 40, VH + 40);
    /* drifting nebulae */
    ctx.globalCompositeOperation = 'lighter';
    const neb = [[0.18, 0.25, 140, [255, 80, 160]], [0.85, 0.7, 170, [90, 70, 255]], [0.7, 0.12, 120, [60, 200, 220]], [0.1, 0.85, 130, [255, 140, 60]]];
    for (let i = 0; i < neb.length; i++) { const n = neb[i], x = n[0] * W + Math.sin(t * 0.13 + i) * 30, y = n[1] * VH + Math.cos(t * 0.11 + i * 2) * 20, c = mixA(n[3], neb[(i + 1) % 4][3], 0.5 + 0.5 * Math.sin(hueT + i)); const g = ctx.createRadialGradient(x, y, 0, x, y, n[2]); g.addColorStop(0, rgbS(c, 0.16)); g.addColorStop(1, rgbS(c, 0)); ctx.fillStyle = g; ctx.fillRect(x - n[2], y - n[2], n[2] * 2, n[2] * 2); }
    ctx.globalCompositeOperation = 'source-over';
    lensedStars(ctx, b, t);
    /* Einstein ring glow */
    ctx.globalCompositeOperation = 'lighter'; circ(ctx, cx, BCY, 56, null, 'rgba(200,160,255,.16)', 6); circ(ctx, cx, BCY, 56, null, 'rgba(255,230,255,.22)', 1.2); ctx.globalCompositeOperation = 'source-over';
    /* far floating clocks and candy, stretched toward the hole */
    for (const d of b.decor) { const q = bxy(d.r, d.a), ra = Math.atan2(q[1] - BCY, q[0] - cx); if (q[0] < -30 || q[0] > W + 30 || q[1] < -30 || q[1] > VH + 30) continue; ctx.save(); ctx.globalAlpha = 0.5; ctx.translate(q[0], q[1]); ctx.rotate(ra); ctx.scale(1.25, 0.85); ctx.rotate(d.sp); drawCandy(ctx, d.k, d.s, t, 0.3); ctx.restore(); }
    ctx.globalAlpha = 1;
    drawDiskHalf(ctx, t, false);
    /* lensed back side of the disk arching over the shadow, the shadow, the photon ring, then the front of the disk */
    ctx.globalCompositeOperation = 'lighter';
    const hc = [[255, 225, 150], [255, 140, 90], [220, 90, 210]];
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(cx, BCY, 33 + i * 4.5, 30 + i * 4, 0, Math.PI, TAU); ctx.lineWidth = 6 - i * 1.4; ctx.strokeStyle = rgbS(hc[i], 0.55 - i * 0.12); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(cx, BCY, 29, 25, 0, 0.15, Math.PI - 0.15); ctx.lineWidth = 2.2; ctx.strokeStyle = 'rgba(255,190,120,.4)'; ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    const sh = ctx.createRadialGradient(cx, BCY, 0, cx, BCY, 27); sh.addColorStop(0, '#000'); sh.addColorStop(0.78, '#000'); sh.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sh; circ(ctx, cx, BCY, 27, null); ctx.fill();
    circ(ctx, cx, BCY, 22.5, null, 'rgba(255,236,200,' + (0.75 + 0.2 * Math.sin(t * 7)) + ')', 1.3);
    drawDiskHalf(ctx, t, true);
    /* colour shift of the whole backdrop (gameplay objects are drawn after this so they stay readable) */
    try { ctx.globalCompositeOperation = 'hue'; ctx.globalAlpha = 0.18 + 0.12 * Math.sin(t * 0.5); ctx.fillStyle = 'hsl(' + ((t * 22) % 360) + ',90%,55%)'; ctx.fillRect(-20, -20, W + 40, VH + 40); } catch (e) {}
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    /* point of no return */
    const dz = clamp(1 - (b.r - RH) / (RDANGER + 20 - RH), 0, 1);
    if (b.phase !== 'tunnel') { ctx.setLineDash([4, 4]); ctx.lineDashOffset = -t * 20; ctx.beginPath(); ctx.ellipse(cx, BCY, RH * KX, RH * KY, 0, 0, TAU); ctx.strokeStyle = 'rgba(255,90,120,' + (0.25 + dz * 0.6) + ')'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]); }
    /* gravity waves */
    for (const w of b.waves) {
      if (w.st === 'tele') {
        const k = w.t / 1.1, pul = 0.5 + 0.5 * Math.sin(w.t * 26);
        circ(ctx, cx, BCY, 24 + pul * 6, null, 'rgba(255,200,255,' + (0.3 + 0.5 * k) + ')', 2 + pul * 2);
        ctx.lineCap = 'round';
        for (const g of w.gaps) { ctx.beginPath(); ctx.ellipse(cx, BCY, b.r * KX, b.r * KY, 0, g - w.hw, g + w.hw); ctx.strokeStyle = 'rgba(16,48,28,.6)'; ctx.lineWidth = 10; ctx.stroke(); ctx.strokeStyle = 'rgba(155,231,165,' + (0.6 + 0.4 * pul) + ')'; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,' + (0.3 + 0.5 * pul) + ')'; ctx.lineWidth = 1.4; ctx.stroke(); }
        ctx.lineCap = 'butt';
        continue;
      }
      const al = clamp((220 - w.r) / 50, 0, 1), gs = w.gaps.map(g => wrapA(g)).sort((p, q) => p - q);
      const segs = []; for (let i = 0; i < gs.length; i++) { const a0 = gs[i] + w.hw, a1 = (i + 1 < gs.length ? gs[i + 1] : gs[0] + TAU) - w.hw; if (a1 > a0) segs.push([a0, a1]); }
      const arc = (rad, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw; for (const s of segs) { ctx.beginPath(); ctx.ellipse(cx, BCY, Math.max(1, rad * KX), Math.max(1, rad * KY), 0, s[0], s[1]); ctx.stroke(); } };
      ctx.globalAlpha = al; ctx.lineCap = 'round';
      arc(w.r, 'rgba(190,120,255,.28)', 11); arc(w.r, 'rgba(30,8,44,.55)', 6.5); arc(w.r - 2.6, 'rgba(255,120,200,.7)', 1.6); arc(w.r + 2.6, 'rgba(120,230,255,.7)', 1.6); arc(w.r, '#f0dcff', 3);
      ctx.lineCap = 'butt';
      for (const g of gs) for (const d of [-1, 1]) { const q = bxy(w.r, g + d * w.hw); circ(ctx, q[0], q[1], 3.6, '#9be7a5', OL, 1.2); }
      ctx.globalAlpha = 1;
    }
    if (b.gate) drawGate(ctx, b.gate, b.gate.t);
    /* entities */
    for (const e of b.ents) {
      if (e.k === 'deb') {
        const ra = Math.atan2(e.y - BCY, e.x - cx), st = 1 + clamp(48 / Math.max(1, e.r - 14), 0, 2.4);
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(ra); ctx.scale(st, 1 / Math.sqrt(st)); ctx.rotate(e.spin);
        if (st > 1.6) { ctx.globalAlpha = 0.35; ctx.save(); ctx.translate(-e.s * 0.8, 0); drawCandy(ctx, e.kind, e.s, e.t, e.hue); ctx.restore(); ctx.globalAlpha = 1; }
        drawCandy(ctx, e.kind, e.s, e.t, e.hue); ctx.restore();
      } else if (e.k === 'coin') { const fade = e.life < 2 ? (Math.sin(e.t * 20) > 0 ? 1 : 0.3) : 1; ctx.globalAlpha = fade; coinIcon(ctx, e.x, e.y, 4.6, e.t * 4); ctx.globalAlpha = 1; }
      else if (e.k === 'heart') { ctx.save(); ctx.translate(e.x, e.y); const s = 1 + 0.12 * Math.sin(e.t * 6); ctx.scale(s, s); heartPath(ctx, 0, 2, 0.9); ctx.fillStyle = '#ff6f9c'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.3; ctx.stroke(); ctx.restore(); }
      else if (e.k === 'crys') {
        const bo = Math.min(1, e.t * 2.5); ctx.save(); ctx.globalAlpha = bo; ctx.translate(e.x, e.y); ctx.scale(bo, bo);
        ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { const a = e.t * 2 + i * TAU / 3; circ(ctx, Math.cos(a) * 14, Math.sin(a) * 9, 1.4, '#c9a0ff'); } ctx.globalCompositeOperation = 'source-over';
        drawGem(ctx, 0, Math.sin(e.t * 3) * 1.5, 7.5, e.t, true); ctx.restore();
        if (e.t < 3 || Math.sin(e.t * 5) > 0) { ctx.globalAlpha = 0.9; circ(ctx, e.x, e.y, 18 + Math.sin(e.t * 6) * 2, null, 'rgba(159,240,255,.55)', 1.2); ctx.globalAlpha = 1; }
      }
    }
    for (const s of b.shots) { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(s.vy, s.vx)); rr(ctx, -7, -1.4, 14, 2.8, 1.4); ctx.fillStyle = '#7dffb0'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(-3, -0.5, 7, 1); ctx.restore(); }
    /* rocket */
    if (b.phase !== 'boom' && b.phase !== 'tunnel') {
      const fall = b.phase === 'fall', sc = fall ? Math.max(0.05, 1 - b.pt / 2) : (b.suck ? 1 - b.suck * 0.85 : 1);
      const ra = Math.atan2(b.py - BCY, b.px - cx);
      if (fall) { ctx.save(); ctx.translate(b.px, b.py); ctx.rotate(ra); ctx.scale(1 + b.pt * 1.5, 1 / (1 + b.pt)); ctx.rotate(-ra); ctx.translate(-b.px, -b.py); }
      const danger = b.r < RDANGER, mood = fall || danger ? 'surprised' : (b.phase === 'open' || b.phase === 'dock' ? 'happy' : undefined);
      drawRocket(ctx, b.px, b.py, b.ang, {lo: b.lo, t: b.t, thrust: b.thrust, dive: b.dive, blink: b.inv > 0 && ((b.t * 12) | 0) % 2 === 0, scale: sc * 1.3, mood, opts: b.opts});
      if (b.shield > 0 && !fall) { ctx.save(); ctx.translate(b.px, b.py); ctx.rotate(b.ang); ell(ctx, 3, -2, 38, 26, 0, 'rgba(143,211,255,.14)', 'rgba(255,255,255,' + (0.5 + 0.25 * Math.sin(t * 8)) + ')', 1.4); ctx.restore(); }
      if (fall) ctx.restore();
      /* little pointer toward the current goal */
      const goal = b.phase === 'gate' && b.gate ? b.gate : b.ents.find(e => e.k === 'crys');
      if (goal && (b.phase === 'play' || b.phase === 'gate')) { const dx = goal.x - b.px, dy = goal.y - b.py, d = Math.hypot(dx, dy); if (d > 60) { const ux = dx / d, uy = dy / d, px = b.px + ux * 30, py = b.py + uy * 30; ctx.save(); ctx.translate(px, py); ctx.rotate(Math.atan2(uy, ux)); ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 8); ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-3, -4.5); ctx.lineTo(-1, 0); ctx.lineTo(-3, 4.5); ctx.closePath(); ctx.fillStyle = b.phase === 'gate' ? '#9be7a5' : '#9ff0ff'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1; } }
    }
    pDraw(ctx, b.parts);
    /* vignette, danger glow, flash */
    const vg = ctx.createRadialGradient(cx, VH / 2, VH * 0.45, cx, VH / 2, W * 0.62); vg.addColorStop(0, 'rgba(8,2,20,0)'); vg.addColorStop(1, 'rgba(8,2,20,.7)'); ctx.fillStyle = vg; ctx.fillRect(-20, -20, W + 40, VH + 40);
    if (dz > 0.25 && (b.phase === 'play' || b.phase === 'gate' || b.phase === 'fall')) { const a = (dz - 0.25) * 0.7 * (0.6 + 0.4 * Math.sin(t * 10)); const rg = ctx.createRadialGradient(cx, VH / 2, VH * 0.35, cx, VH / 2, W * 0.6); rg.addColorStop(0, 'rgba(255,40,80,0)'); rg.addColorStop(1, 'rgba(255,40,80,' + a + ')'); ctx.fillStyle = rg; ctx.fillRect(-20, -20, W + 40, VH + 40); }
    if (b.phase === 'fall' || b.phase === 'boom') { ctx.fillStyle = 'rgba(0,0,0,' + ease((b.pt - 0.6) / 1.3) + ')'; ctx.fillRect(-20, -20, W + 40, VH + 40); }
    if (b.flash > 0) { ctx.fillStyle = 'rgba(255,250,255,' + Math.min(1, b.flash) * 0.7 + ')'; ctx.fillRect(-20, -20, W + 40, VH + 40); }
    if (b.phase === 'open' && b.pt > 1.2) { ctx.fillStyle = 'rgba(255,255,255,' + ease((b.pt - 1.2) / 0.4) + ')'; ctx.fillRect(-20, -20, W + 40, VH + 40); }
    ctx.restore();
  }
  function drawEarth(ctx, x, y, r, t) {
    const at = ctx.createRadialGradient(x, y, r * 0.95, x, y, r * 1.12); at.addColorStop(0, 'rgba(140,210,255,.7)'); at.addColorStop(1, 'rgba(140,210,255,0)'); ctx.fillStyle = at; ctx.beginPath(); ctx.arc(x, y, r * 1.12, 0, TAU); ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.5, r * 0.1, x, y, r); g.addColorStop(0, '#9fe0ff'); g.addColorStop(0.45, '#3a8ee0'); g.addColorStop(1, '#173c86'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    const land = [[-0.5, -0.62, 0.32, 0.16, 0.3], [-0.05, -0.75, 0.22, 0.12, -0.2], [0.35, -0.55, 0.28, 0.14, 0.4], [-0.25, -0.38, 0.18, 0.1, 0.1], [0.62, -0.3, 0.14, 0.2, 0.2]];
    for (const l of land) { const lx = x + (l[0] - 0.15 + t * 0.012) * r; ell(ctx, lx, y + l[1] * r, l[2] * r, l[3] * r, l[4], '#5cc46a'); ell(ctx, lx + l[2] * r * 0.2, y + l[1] * r - l[3] * r * 0.3, l[2] * r * 0.5, l[3] * r * 0.4, l[4], '#8fe08a'); }
    ctx.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 7; i++) ell(ctx, x + ((i * 0.31 + t * 0.03) % 1.6 - 0.8) * r, y - r * (0.45 + (i % 3) * 0.12), r * 0.2, r * 0.035, 0.1, 'rgba(255,255,255,.7)');
    const sh = ctx.createLinearGradient(x - r, y - r, x + r, y + r * 0.2); sh.addColorStop(0.5, 'rgba(5,10,40,0)'); sh.addColorStop(1, 'rgba(5,10,40,.55)'); ctx.fillStyle = sh; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }
  function drawTunnel(ctx) {
    const b = B, W = VW(), tt = b.tt;
    if (tt < 5.4) {
      const vx = W / 2 + Math.sin(tt * 1.3) * 40, vy = VH / 2 - 10 + Math.sin(tt * 0.9 + 1) * 22, hue = (tt * 60) % 360;
      const bg = ctx.createRadialGradient(vx, vy, 0, vx, vy, W * 0.8); bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.06, 'hsl(' + hue + ',100%,82%)'); bg.addColorStop(0.28, 'hsl(' + ((hue + 60) % 360) + ',70%,35%)'); bg.addColorStop(0.65, '#1a0a3a'); bg.addColorStop(1, '#05020f'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, VH);
      const rs = b.rings.slice().sort((p, q) => q.z - p.z);
      for (const r of rs) {
        const k = 1 / r.z, rad = 44 * k, f = clamp(r.z / 4.2, 0, 1), x = lerp(W / 2, vx, f), y = lerp(VH / 2 + 10, vy, f), al = clamp((4.3 - r.z) / 1.4, 0, 1) * clamp(r.z / 0.35, 0, 1);
        if (rad > W * 1.5) continue; ctx.globalAlpha = al; const col = 'hsl(' + ((r.h + tt * 140) % 360) + ',95%,66%)';
        ctx.beginPath(); ctx.ellipse(x, y, rad * 1.3, rad, r.rot + tt * 0.5, 0, TAU); ctx.strokeStyle = col; ctx.lineWidth = Math.max(0.8, 2.6 * k); ctx.stroke();
        ctx.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + r.rot + tt * 0.5; const c = Math.cos(r.rot + tt * 0.5), s = Math.sin(r.rot + tt * 0.5), ex = Math.cos(a - r.rot - tt * 0.5) * rad * 1.3, ey = Math.sin(a - r.rot - tt * 0.5) * rad; circ(ctx, x + ex * c - ey * s, y + ex * s + ey * c, Math.max(0.6, 1.4 * k), '#fff'); }
      }
      ctx.globalAlpha = 1; ctx.lineCap = 'round';
      for (const s of b.streaks) { const r1 = s.d * W * 0.7, r2 = r1 * (1.1 + tt * 0.05); ctx.globalAlpha = clamp(s.d, 0, 1); ctx.strokeStyle = s.c; ctx.lineWidth = 0.6 + s.d * 1.8; ctx.beginPath(); ctx.moveTo(vx + Math.cos(s.a) * r1, vy + Math.sin(s.a) * r1 * 0.8); ctx.lineTo(vx + Math.cos(s.a) * r2, vy + Math.sin(s.a) * r2 * 0.8); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.lineCap = 'butt';
      drawRocket(ctx, W / 2 + Math.sin(tt * 7) * 2.5, VH / 2 + 46 + Math.cos(tt * 9) * 2, -0.12 + Math.sin(tt * 2) * 0.08, {lo: b.lo, t: b.t + tt, thrust: 1, scale: 1.7, mood: tt < 2.6 ? 'surprised' : 'happy', opts: b.opts});
      if (tt < 0.5) { ctx.fillStyle = 'rgba(255,255,255,' + (1 - tt / 0.5) + ')'; ctx.fillRect(0, 0, W, VH); }
      if (tt > 4.7) { ctx.fillStyle = 'rgba(255,255,255,' + ease((tt - 4.7) / 0.7) + ')'; ctx.fillRect(0, 0, W, VH); }
    } else {
      const et = tt - 5.4, bg = ctx.createLinearGradient(0, 0, 0, VH); bg.addColorStop(0, '#02020c'); bg.addColorStop(1, '#101640'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, VH);
      for (const s of b.stars) { const x = ((s.x + 450) / 900) * W, y = ((s.y + 280) / 560) * VH; ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(tt + s.tw)); ctx.fillStyle = s.c; ctx.fillRect(x, y, s.s, s.s); }
      ctx.globalAlpha = 1;
      const sun = ctx.createRadialGradient(W * 0.1, 34, 0, W * 0.1, 34, 110); sun.addColorStop(0, 'rgba(255,250,220,1)'); sun.addColorStop(0.12, 'rgba(255,230,160,.8)'); sun.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = sun; ctx.fillRect(0, 0, W, VH);
      const k = ease(et / 2.4); drawEarth(ctx, W * 0.66, VH + 120 - k * 34, 200 + k * 40, et);
      const rx = lerp(W * 0.16, W * 0.5, k), ry = lerp(VH * 0.36, VH * 0.62, k);
      drawRocket(ctx, rx, ry, 0.45, {lo: b.lo, t: b.t + tt, thrust: 0.7, scale: lerp(1.4, 0.75, k), mood: 'happy', pose: et > 0.8 ? 'victory' : 'idle', opts: b.opts});
      outlined(ctx, tr('Zurück auf der Erde!', 'Back on Earth!'), W / 2, 56, 20, '#ffd84a'); outlined(ctx, tr('Mallo ist bei dir. Jetzt nur noch nach Hause …', 'Mallo is with you. Now just the way home …'), W / 2, 78, 10, '#fff4e0');
      if (et < 0.6) { ctx.fillStyle = 'rgba(255,255,255,' + (1 - et / 0.6) + ')'; ctx.fillRect(0, 0, W, VH); }
    }
  }
  function bhHud(ctx) {
    const b = B, W = VW(), t = b.t;
    if (b.phase === 'tunnel') return;
    heartsHud(ctx, 16, 14, b.hp, b.maxHp, t);
    if (b.shield > 0) { const sx = 16 + b.maxHp * 15 + 4; circ(ctx, sx, 15, 6, 'rgba(143,211,255,.35)', '#fff', 1.2); circ(ctx, sx - 2, 13, 1.5, '#fff'); }
    moneyHud(ctx, 11, 32, b.money);
    for (let i = 0; i < 5; i++) drawGem(ctx, W - 16 - (4 - i) * 16, 15, 5, t, i < b.crystals);
    outlined(ctx, tr('Zeitkristalle', 'Time crystals'), W - 12, 32, 8, '#bff4ff', 'right');
    if (b.msg) { const k = b.msg.t / b.msg.life, al = Math.min(1, b.msg.t * 3, (b.msg.life - b.msg.t) * 6 + 0.2), s = 1 + Math.max(0, (k - 0.85)) * 2; ctx.save(); ctx.globalAlpha = al; ctx.translate(W / 2, BCY - 8); ctx.scale(s, s); outlined(ctx, b.msg.text, 0, 0, 15, '#ffd84a'); if (b.msg.sub) outlined(ctx, b.msg.sub, 0, 17, 9, '#fff4e0'); ctx.restore(); }
    const kb = !b.opts.isTouch;
    if (b.r < RDANGER && (b.phase === 'play' || b.phase === 'gate')) { const p = 1 + 0.08 * Math.sin(t * 14); ctx.save(); ctx.translate(W / 2, VH - 44); ctx.scale(p, p); outlined(ctx, tr('ZU NAH! ', 'TOO CLOSE! ') + (kb ? '▲' : 'A') + tr(' = Schub!', ' = thrust!'), 0, 0, 13, '#ff6f9c'); ctx.restore(); }
    let hint = null, al = 1;
    if (b.hint > 0) { hint = kb ? tr('◀ ▶ Tempo · ▲ Schub nach außen · ▼ abtauchen · X Laser', '◀ ▶ speed · ▲ thrust out · ▼ dive · X laser') : tr('◀ ▶ Tempo · A Schub nach außen · ▼ abtauchen · B Laser', '◀ ▶ speed · A thrust out · ▼ dive · B laser'); al = Math.min(1, b.hint); }
    else if (b.gapHint > 0) { hint = tr('Gravitationswelle! Flieg in die grüne Lücke', 'Gravity wave! Fly into the green gap'); al = Math.min(1, b.gapHint); }
    else if (b.phase === 'gate') hint = tr('Flieg ins Wurmloch-Tor (grüner Pfeil)', 'Fly into the wormhole gate (green arrow)');
    /* the bottom of the orbit runs under the pill: fade it while the rocket is there */
    if (hint && b.py > VH - 58 && Math.abs(b.px - W / 2) < (W - 270) / 2) al = Math.min(al, 0.28);
    hintPill(ctx, hint, al, t);
  }

  G.modes.blackhole = {
    start(opts) { try { bhStart(opts); } catch (e) { console.log('MODE_ERROR blackhole start ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } },
    update() { if (!B || B.finished) return; try { bhUpdate(); } catch (e) { if (!B.err) { B.err = true; console.log('MODE_ERROR blackhole ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } } },
    frame(ctx) {
      if (!B) return;
      try {
        if (B.phase === 'tunnel') drawTunnel(ctx);
        else withRipple(ctx, B.ripple * (B.phase === 'fall' ? 1.6 : 1), B.t, c => bhScene(c));
        bhHud(ctx);
      } catch (e) { if (!B.ferr) { B.ferr = true; console.log('MODE_ERROR blackhole frame ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } }
    },
    debugWin() { if (B && !B.finished) { B.crystals = 5; bhFinish('clear'); } },
  };

  /* ======================================================================================================== */
  /*                                                CHASE                                                     */
  /* ======================================================================================================== */
  const RT = 172, GF = 189, GN = 208, RB = 218;
  const LEN = 24000, BR0 = 5400, BR1 = 7700, CZ0 = 11400, CZ1 = 13400, T0 = 16300, T1 = 19000, SIGN = 22300, ORTS = 19500;
  const LIMOS = [{x: 1700, shootOnly: true}, {x: 4300}, {x: 7000, ramFirst: true}, {x: 9400}, {x: 10600}, {x: 13900}, {x: 17300}, {x: 20000}, {x: 21300, ramFirst: true}];
  const NEON = tr('PRALINEN|KINO|PIZZA|HOTEL|KAKAO|DONUTS|JAZZ|BAR|TANZ|EIS|NUDELN|CAFÉ', 'CANDY|MOVIES|PIZZA|HOTEL|COCOA|DONUTS|JAZZ|DINER|DANCE|GELATO|NOODLES|CAFÉ').split('|');
  /* van lettering and honk bubble (drawTraffic's parameter is called tr, so these are made here) */
  const VAN_TXT = tr('KAKAO-EXPRESS', 'COCOA EXPRESS'), HONK_TXT = tr('HUP!', 'HONK!');
  const NEONC = ['#ff6fd0', '#6ff0ff', '#9bff8a', '#ffd84a', '#ff8a5a', '#c9a0ff'];
  const SKY = {duskT: [64, 44, 116], duskM: [222, 104, 132], duskB: [255, 186, 112], nightT: [8, 10, 36], nightM: [26, 24, 72], nightB: [64, 42, 104], sunT: [84, 52, 150], sunM: [255, 116, 96], sunB: [255, 212, 120]};
  let C = null;
  const zoneOf = x => (x >= T0 - 260 && x <= T1 + 160) ? 'tunnel' : (x >= BR0 && x <= BR1) ? 'bridge' : (x >= CZ0 && x <= CZ1) ? 'cz' : (x > T1 ? 'hw' : 'city');
  const TRAFFIC = [{k: 'taxi', len: 46, roof: 25, c: '#ffd23a', c2: '#c99a10'}, {k: 'mini', len: 40, roof: 23, c: '#7fe0b0', c2: '#3a9a70'}, {k: 'van', len: 54, roof: 30, c: '#7ab0ff', c2: '#3a64b0'}, {k: 'bug', len: 42, roof: 24, c: '#ff9a5a', c2: '#b85a2a'}];

  function chaseBuild() {
    const R = mkRng(20261015), obs = [], coins = [], trig = [];
    const coinRow = (x, n, h) => { for (let i = 0; i < n; i++) coins.push({x: x + i * 24, h: h || 12}); };
    const ramp = x => { obs.push({k: 'ramp', x}); obs.push({k: 'bar', x: x + 128}); obs.push({k: 'bar', x: x + 172}); for (let i = 1; i <= 6; i++) { const f = i * 28 / 3.3; coins.push({x: x + 56 + i * 28, h: 22 + 7.0 * f - 0.135 * f * f}); } };
    let x = 1100;
    while (x < LEN - 900) {
      const z = zoneOf(x), r = R(); let gap = 360 + R() * 200;
      if (x > 1500 && x < 2900) { coinRow(x, 5); x += 460; continue; }
      if (z === 'cz') { gap = 250 + R() * 110; if (r < 0.38) { obs.push({k: 'hole', x, w: 34 + R() * 10}); coins.push({x, h: 46}); } else if (r < 0.74) { obs.push({k: 'bar', x}); coins.push({x, h: 48}); } else { ramp(x); gap += 240; } }
      else if (z === 'bridge') { if (r < 0.45) { trig.push({x}); gap += 520; } else if (r < 0.72) { ramp(x); gap += 240; } else coinRow(x, 6); }
      else if (z === 'tunnel') { gap = 420 + R() * 200; if (r < 0.45) coinRow(x, 6, R() < 0.5 ? 12 : 42); else if (r < 0.75) obs.push({k: 'bar', x}); else { trig.push({x}); gap += 520; } }
      else if (z === 'hw' && x > LEN - 1400) { coinRow(x, 6); }
      else { if (r < 0.22) { obs.push({k: 'hole', x, w: 32 + R() * 10}); coins.push({x, h: 46}); } else if (r < 0.42) obs.push({k: 'bar', x}); else if (r < 0.66) { trig.push({x}); gap += 520; } else if (r < 0.82) { ramp(x); gap += 240; } else coinRow(x, 5); }
      x += gap;
    }
    for (const hx of [8700, 14700, 20700]) coins.push({x: hx, h: 34, heart: true});
    obs.sort((a, b) => a.x - b.x); coins.sort((a, b) => a.x - b.x);
    return {obs, coins, trig, ramps: obs.filter(o => o.k === 'ramp')};
  }
  function rampAt(x) { for (const r of C.ramps) if (x >= r.x && x <= r.x + 56) return r; return null; }
  function rampH(x) { const r = rampAt(x); return r ? (x - r.x) / 56 * 20 : 0; }
  function stepVert(o, px) {
    const g = rampH(o.x);
    /* driving off the top of a ramp: the car was on the ramp surface last step (h == ramp height there) and is past its end now */
    if (o.vh <= 0.01) {
      const rp = rampAt(px);
      if (rp && !rampAt(o.x) && o.x > rp.x + 56 && o.h > 8 && Math.abs(o.h - rampH(px)) < 1.2) { o.vh = 5.4 + o.v * 0.45; o.h = 20; return 'launch'; }
    }
    if (o.h <= g + 0.6 && o.vh <= 0.01) { o.h = g; o.vh = 0; return 'ground'; }
    o.vh -= 0.27; o.h += o.vh; const g2 = rampH(o.x);
    if (o.h > 62 && o.x > T0 - 20 && o.x < T1 + 20) { o.h = 62; if (o.vh > 0) o.vh = -0.6; }
    if (o.h <= g2) { const hard = o.vh < -3; o.h = g2; o.vh = 0; return hard ? 'land' : 'ground'; }
    return 'air';
  }
  function chaseHint(key, text, sec, urgent) { const c = C; if (c.hintSeen[key]) return; c.hintSeen[key] = true; const h = {text, t: sec || 3.5}; if (urgent) c.hints = [h].concat(c.hints.slice(1)); else c.hints.push(h); }

  function chaseStart(opts) {
    opts = opts || {}; const bld = chaseBuild();
    C = {opts, sfx: sfxOf(opts), t: 0, phase: 'play', pt: 0, cam: 0, shake: 0,
      car: {x: 200, v: 2.4, h: 0, vh: 0, duck: 0, squash: 0, wheel: 0, inv: 0, hp: 3, maxHp: 3, tilt: 0, throwT: 0, cool: 0, spin: 0},
      obs: bld.obs, coins: bld.coins, trig: bld.trig, ramps: bld.ramps, limoTrig: LIMOS.map(l => Object.assign({}, l)), traffic: [], far: [], limos: [], pralines: [], bullets: [], parts: [],
      money: 0, kills: 0, hits: 0, auto: !!opts.autoplay, hints: [], hintSeen: {}, finished: false, farT: 1.2, gaveUp: false, kb: !opts.isTouch, rng: mkRng(77)};
    C.cam = C.car.x - VW() * 0.42;
    chaseHint('drive', tr('▶ Gas · ◀ Bremse · ', '▶ Gas · ◀ Brake · ') + (C.kb ? tr('Leertaste', 'Space') : 'A') + tr(' hüpfen', ' = jump'), 4.5);
    /* Mallo, from the back seat, once the banner is gone: who is behind all this */
    C.say = {text: tr('Die Schoko-Mafia! Der Pate hat Bitterbart angeheuert – er will mein Geheimrezept!', 'The Choco Mafia! The Chocfather hired Captain Bitterbeard – he wants my secret recipe!'), t0: 2.7, t1: 8.2};
    tone(523, 0.1, {type: 'square', gain: 0.05}); tone(659, 0.16, {type: 'square', gain: 0.05, delay: 0.12});
    try { opts.banner && opts.banner(tr('Großstadt', 'Big City'), 2.6, tr('Die Schoko-Mafia ist hinter euch her! Ab zur Ranch!', 'The Choco Mafia is after you! Off to the ranch!')); } catch (e) {}
    try { opts.speak && opts.speak('Mallo, hold on!'); } catch (e) {}
  }
  function chaseFinish(result) {
    const c = C; if (!c || c.finished) return; c.finished = true;
    const info = {score: c.money * 10 + c.kills * 500 + (result === 'clear' ? c.car.hp * 500 + 3000 : 0), money: c.money, stars: [result === 'clear', c.hits <= 1, c.kills >= 3]};
    try { if (c.opts.done) c.opts.done(result, result === 'clear' ? info : undefined); } catch (e) {}
  }
  function chMoney(n, x, y) { const c = C; c.money += n; try { c.opts.money && c.opts.money(n); } catch (e) {} popText(c.parts, x, y, '+' + n, '#ffd84a'); }
  function hurtCar(x, y) {
    const c = C, car = c.car; if (c.auto || car.inv > 0 || c.phase !== 'play') return false;
    car.hp--; c.hits++; car.inv = 1.6; c.shake = 6; c.sfx('hurt'); stars(c.parts, x, y, 4); burst(c.parts, x, y, 8, '#fff', 2);
    if (car.hp <= 0) { c.phase = 'crash'; c.pt = 0; car.vh = 4; car.h = Math.max(car.h, 1); c.sfx('die'); try { c.opts.speak && c.opts.speak('Oh no... Mallo...'); } catch (e) {} }
    else if (car.hp === 1) chaseHint('low', tr('Das Auto qualmt! Sammle ein Herz ♥', 'The car is smoking! Grab a heart ♥'), 3);
    return true;
  }
  function hitLimo(l, how) {
    const c = C; if (l.inv > 0 || l.st === 'spin') return; l.hp--; l.inv = 0.4; l.flash = 0.25; c.sfx('bossHit');
    const y = GN - l.h - 26; for (let i = 0; i < 10; i++) { const a = Math.random() * TAU; c.parts.push({k: 'blob', x: l.x, y, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2 - 1, g: 0.12, t: 0, life: 0.7, r: 2 + Math.random() * 2, c: Math.random() < 0.5 ? '#6b3a1f' : '#a0643a'}); }
    stars(c.parts, l.x, y, 3);
    if (l.hp <= 0) { l.st = 'spin'; l.lean = 0; c.kills++; c.sfx('boom'); c.parts.push({k: 'flash', x: l.x, y: y + 10, t: 0, life: 0.4, r: 40}); chMoney(5, l.x, y - 10); popText(c.parts, l.x, y - 24, how === 'stomp' ? tr('Plattgehüpft!', 'Squashed!') : tr('Limo erledigt!', 'Limo stopped!'), '#ff9eb0', 10); }
    else popText(c.parts, l.x, y - 14, tr('Treffer!', 'Hit!'), '#fff4e0', 9);
  }
  function fireBullet(l) {
    const c = C, s = 1 - 0.1 * l.laneK; c.bullets.push({x: l.x + 34, y: 27 + l.h, vx: l.v + 4.2}); c.sfx('shoot');
    c.parts.push({k: 'flash', x: l.x + 36, y: GN - l.h - 27 * s - l.laneK * (GN - GF), t: 0, life: 0.15, r: 14, c: 'rgba(255,220,120,.9)'});
  }
  function spawnLimo(o) {
    const c = C; c.limos.push({x: c.cam - 80, v: c.car.v + 1.6, h: 0, vh: 0, st: 'enter', stT: 0, hp: 2, inv: 0, flash: 0, lean: 0, acts: 0, maxActs: 3 + (c.rng() < 0.4 ? 1 : 0), laneK: 0, laneT: 0, rot: 0, t: 0, shootOnly: !!o.shootOnly, ramFirst: !!o.ramFirst, shots: 0, rev: 0, fist: 0, smokeT: 0});
    c.sfx('cannonLoad'); tone(330, 0.12, {type: 'square', gain: 0.05}); tone(262, 0.18, {type: 'square', gain: 0.05, delay: 0.14});
    if (c.limos.length === 1 && !c.hintSeen.limo) chaseHint('limo', tr('Achtung: Mafia-Limousine von hinten!', 'Look out: a mafia limo behind you!'), 2.6);
  }
  function limoStep(l) {
    const c = C, car = c.car; l.t += DT; l.stT -= DT; if (l.flash > 0) l.flash -= DT; if (l.inv > 0) l.inv -= DT;
    const follow = gap => car.v + clamp((car.x - gap - l.x) * 0.03, -1.3, 1.7);
    let tv = car.v, accl = 0.12;
    switch (l.st) {
      case 'enter': tv = follow(126); if (Math.abs(car.x - 126 - l.x) < 16) { l.st = 'follow'; l.stT = 0.9; } break;
      case 'follow': tv = follow(126);
        if (l.stT <= 0) {
          if (l.acts >= l.maxActs) { l.st = 'leave'; popText(c.parts, l.x, GN - 50, 'Grrr!', '#fff', 9); }
          else if (l.shootOnly || (!l.ramFirst && c.rng() < 0.6) || (l.ramFirst && l.acts % 2 === 1)) { l.st = 'aim'; l.stT = 1.0; }
          else { l.st = 'rev'; l.stT = 1.1; c.sfx('cannonLoad'); noise(0.9, {type: 'lowpass', freq: 180, freqTo: 420, gain: 0.18}); }
        } break;
      case 'aim': tv = follow(126); if (!c.hintSeen.duck) chaseHint('duck', tr('▼ halten = ducken! Die Kugeln fliegen drüber', 'Hold ▼ = duck! The bullets fly over you'), 3.2, true); if (l.stT <= 0) { l.st = 'fire'; l.shots = 3; l.stT = 0; } break;
      case 'fire': tv = follow(126); if (l.stT <= 0) { if (l.shots > 0) { fireBullet(l); l.shots--; l.stT = 0.27; } else { l.st = 'follow'; l.stT = 1.6 + c.rng(); l.acts++; chaseHint('throw', (c.kb ? 'X' : 'B') + tr(' = Mallo wirft Pralinen nach hinten!', ' = Mallo throws pralines back!'), 3.6); } } break;
      case 'rev': tv = follow(150); if (!c.hintSeen.ram) chaseHint('ram', tr('Sie will rammen! ', 'It wants to ram you! ') + (c.kb ? tr('Leertaste', 'Space') : 'A') + tr(' = hüpfen!', ' = jump!'), 2.8, true); if (l.stT <= 0) { l.st = 'ram'; c.sfx('jet'); } break;
      case 'ram': tv = car.v + 2.6; accl = 0.25; if (l.x - 52 > car.x + 34) { l.st = 'pass'; } if (l.x > car.x + 300) l.st = 'pass'; break;
      case 'pass': tv = car.v + 1.0; if (l.x - 52 > car.x + 40) l.laneT = 1; if (l.laneK > 0.95) { l.st = 'back'; l.fist = 1; } break;
      case 'back': tv = car.v - 1.6; if (l.x < car.x - 175) { l.laneT = 0; l.fist = 0; if (l.laneK < 0.05) { l.st = 'follow'; l.stT = 1.2; l.acts++; } } break;
      case 'leave': tv = car.v - 2.4; break;
      case 'spin': tv = car.v - 3.2; l.rot += 0.26; l.smokeT -= DT; if (l.smokeT <= 0) { l.smokeT = 0.06; c.parts.push({k: 'smoke', x: l.x, y: GN - l.h - 20, vx: -0.5, vy: -0.6, t: 0, life: 0.9, r: 6 + Math.random() * 4, c: '#5a5464'}); } break;
    }
    l.lean += ((l.st === 'aim' || l.st === 'fire' ? 1 : (l.st === 'back' ? 0.7 : 0)) - l.lean) * 0.18;
    l.rev = l.st === 'rev' ? 1 : l.rev * 0.9;
    l.v += clamp(tv - l.v, -accl, accl); l.v = Math.max(0, l.v);
    const px = l.x; l.x += l.v; stepVert(l, px);
    l.laneK += clamp(l.laneT - l.laneK, -0.035, 0.035);
    if (l.st === 'rev' && (G.S && G.S.frames || 0) % 5 === 0) c.parts.push({k: 'smoke', x: l.x - 54, y: GN - l.h - 6, vx: -1, vy: -0.4, t: 0, life: 0.6, r: 3 + Math.random() * 2, c: '#c8c0d0', a: 0.6});
    if ((l.st === 'leave' || l.st === 'spin') && l.x < c.cam - 170) l.gone = true;
    /* limos knock barriers away */
    if (l.laneK < 0.5) for (const o of c.obs) { if (o.x > l.x + 80) break; if (o.k === 'bar' && !o.knock && Math.abs(o.x - l.x) < 50 && l.h < 15) { o.knock = {x: 0, y: 0, vx: l.v + 1.5, vy: -3.5, r: 0}; c.sfx('bump'); } }
  }
  function chaseBot() {
    const c = C, car = c.car, o = {right: true, left: false, jump: false, down: false, fire: false};
    for (const ob of c.obs) {
      if (ob.x < car.x - 60) continue; if (ob.x > car.x + 160) break;
      if (ob.k === 'hole' && !ob.hit) { const d = ob.x - 14 - car.x; if (d > 4 && d < 34) o.jump = true; }
      if (ob.k === 'bar' && !ob.knock && !rampAt(car.x) && car.h < 5) { const d = ob.x - 20 - car.x; if (d > 10 && d < 30) o.jump = true; }
    }
    for (const t of c.traffic) if (t.laneK < 0.4) { const d = t.x - (t.len / 2 + 30) - car.x; if (d > 2 && d < 26) o.jump = true; if (d > 26 && d < 60 && car.h > 1) o.right = false; }
    for (const l of c.limos) {
      if (l.st === 'ram' && l.laneK < 0.4) { const d = car.x - 82 - l.x; if (d < 46) o.jump = true; }
      if ((l.st === 'aim' && l.stT < 0.35) || l.st === 'fire') o.down = true;
      if (l.laneK < 0.4 && l.st !== 'spin' && l.x < car.x - 60 && l.x > car.x - 220 && car.cool <= 0 && c.rng() < 0.08) o.fire = true;
    }
    for (const b of c.bullets) if (b.x < car.x + 30 && b.x > car.x - 150) o.down = true;
    if (o.down && o.jump && car.h < 1) o.jump = c.limos.some(l => l.st === 'ram');
    return o;
  }

  function chaseUpdate() {
    const c = C; if (!c || c.finished) return; const I = G.input || {}, car = c.car, W = VW(), fr = (G.S && G.S.frames) || 0;
    c.t += DT; c.pt += DT; if (c.shake > 0) c.shake = Math.max(0, c.shake - 0.4);
    c.parts = pUpdate(c.parts);
    if (c.hints.length) { c.hints[0].t -= DT; if (c.hints[0].t <= 0) c.hints.shift(); }
    for (const o of c.obs) if (o.knock) { const k = o.knock; k.x += k.vx; k.y += k.vy; k.vy += 0.25; k.r += 0.2; }
    if (c.phase === 'crash') {
      car.spin += 0.22; car.v *= 0.965; const px = car.x; car.x += car.v; stepVert(car, px); c.cam += (car.x - W * 0.42 - c.cam) * 0.1;
      if (fr % 4 === 0) c.parts.push({k: 'smoke', x: car.x, y: GN - car.h - 14, vx: -0.4, vy: -0.8, t: 0, life: 1, r: 7, c: '#4a4454'});
      for (const l of c.limos) limoStep(l); if (c.pt > 2.0) chaseFinish('dead'); return;
    }
    let R = !!I.right, L = !!I.left, J = !!I.jumpEdge, D = !!I.down, F = !!(I.runEdge || (I.run && c.kb));
    if (c.auto) { const b = chaseBot(); R = b.right; L = b.left; J = b.jump; D = b.down; F = b.fire; }
    if (c.phase === 'end') { R = true; L = J = D = F = false; }
    let tv = R ? 4.3 : (L ? 1.6 : 3.0); if (car.duck > 0.5 && c.phase === 'play') tv = Math.min(tv, 2.6);
    car.v += clamp(tv - car.v, -0.09, 0.045);
    const px = car.x; car.x += car.v; car.wheel += car.v * 0.16;
    const ev = stepVert(car, px);
    if (ev === 'launch') { c.sfx('bigJump'); burst(c.parts, car.x - 20, GN - 20, 8, '#ffd84a', 2); chaseHint('ramp', tr('Juhuu! Schneller = weiter springen', 'Wheee! Faster = longer jumps'), 2.4); }
    else if (ev === 'land') { c.sfx('land'); car.squash = 0.45; for (let i = 0; i < 4; i++) c.parts.push({k: 'smoke', x: car.x + (i - 1.5) * 14, y: GN - 2, vx: (i - 1.5) * 0.7, vy: -0.35, t: 0, life: 0.4, r: 2.6, c: '#d8c8d8', a: 0.4, drag: 0.92}); }
    if (ev !== 'air' && ev !== 'launch' && J && c.phase === 'play') { car.vh = 4.7; car.squash = -0.35; c.sfx('jump'); }
    car.squash *= 0.82;
    const onR = rampAt(car.x) && car.h <= rampH(car.x) + 0.6;
    car.tilt += ((onR ? -0.34 : (car.h > 0.5 ? clamp(-car.vh * 0.035, -0.25, 0.3) : 0)) - car.tilt) * 0.25;
    car.duck += ((D ? 1 : 0) - car.duck) * 0.35;
    if (car.inv > 0) car.inv -= DT; if (car.throwT > 0) car.throwT -= DT; car.cool -= DT;
    if (F && car.cool <= 0 && c.phase === 'play') {
      car.cool = 0.75; car.throwT = 0.3; c.pralines.push({x: car.x - 16, h: car.h + 30, vx: car.v - 3.6, vh: 2.6, rot: 0}); c.sfx('throwIt');
    }
    if (car.hp <= 1 && fr % 6 === 0) c.parts.push({k: 'smoke', x: car.x + 24, y: GN - car.h - 16, vx: -car.v * 0.4 - 0.4, vy: -0.7, t: 0, life: 0.9, r: 3.5, c: '#6a6474'});
    if (car.v > 3.9 && fr % 3 === 0) c.parts.push({k: 's', x: car.x - 34, y: GN - car.h - 6 - Math.random() * 14, vx: -1.5, vy: 0, t: 0, life: 0.25, r: 0.8, c: 'rgba(255,255,255,.6)'});
    const lookA = (car.v - 3) * 14;
    if (c.phase !== 'end') c.cam += (car.x - W * 0.42 + lookA - c.cam) * 0.2;

    /* spawns */
    while (c.trig.length && c.trig[0].x < c.cam + W + 90) { const tr = c.trig.shift(), k = TRAFFIC[Math.floor(c.rng() * TRAFFIC.length)]; c.traffic.push(Object.assign({x: tr.x, v: 1.6 + c.rng() * 0.5, laneK: 0, laneT: 0, squash: 0, honk: 0, blink: 0}, k)); }
    while (c.limoTrig.length && car.x >= c.limoTrig[0].x) { const o = c.limoTrig.shift(); if (c.phase === 'play' && c.limos.filter(l => l.st !== 'spin' && l.st !== 'leave').length < 2) spawnLimo(o); }
    c.farT -= DT;
    if (c.farT <= 0) { c.farT = 2.2 + c.rng() * 3; const k = TRAFFIC[Math.floor(c.rng() * TRAFFIC.length)], fromR = c.rng() < 0.6, sx = fromR ? c.cam + W + 60 : c.cam - 60; if (!c.far.some(f => Math.abs(f.x - sx) < 110)) c.far.push(Object.assign({x: fromR ? c.cam + W + 60 : c.cam - 60, v: fromR ? 1.3 + c.rng() * 0.8 : car.v + 1.2, laneK: 1, squash: 0, honk: 0, blink: 0}, k)); }
    for (const f of c.far) for (const g of c.far) if (g !== f && g.x > f.x && g.x - f.x < (f.len + g.len) / 2 + 12) f.v = Math.min(f.v, g.v);
    for (const f of c.far) { f.x += f.v; if (f.x < c.cam - 120 || f.x > c.cam + W + 160) f.gone = true; } c.far = c.far.filter(f => !f.gone);

    /* traffic in the near lane */
    for (const t of c.traffic) {
      t.x += t.v; t.squash *= 0.85; if (t.honk > 0) t.honk -= DT;
      if (t.laneT === 0) { let blocked = car.x - 40 > t.x; for (const o of c.obs) { if (o.x > t.x + 100) break; if (o.x > t.x + 20 && !o.knock && !o.hit) blocked = true; } if (blocked) { t.laneT = 1; t.blink = 1; } }
      t.laneK += clamp(t.laneT - t.laneK, -0.03, 0.03);
      if (t.laneK < 0.4 && Math.abs(car.x - t.x) < 30 + t.len / 2 && c.phase !== 'crash') {
        if (car.h >= 8) { if (car.vh <= 0) { car.h = Math.max(car.h, t.roof); car.vh = 5.0; t.squash = 1; c.sfx('spring'); if (!t.bounced) { t.bounced = true; chMoney(1, t.x, GN - t.roof - 16); } } }
        else { t.honk = 1; if (hurtCar(car.x + 26, GN - car.h - 14)) { car.x = t.x - t.len / 2 - 31; car.v = Math.min(car.v, t.v - 0.3); tone(392, 0.15, {type: 'square', gain: 0.05}); tone(330, 0.2, {type: 'square', gain: 0.05, delay: 0.16}); } }
      }
      if (t.x < c.cam - 150 || t.x > c.cam + W + 700) t.gone = true;
    }
    c.traffic = c.traffic.filter(t => !t.gone);
    if (c.traffic.some(t => t.laneK < 0.3 && t.x > car.x && t.x - car.x < 220)) chaseHint('roof', tr('Langsames Auto! Hüpf drauf, dann drüber', 'Slow car! Hop on top, then over it'), 2.6);

    /* static obstacles */
    for (const o of c.obs) {
      if (o.x < car.x - 80) continue; if (o.x > car.x + 80) break;
      if (o.k === 'hole' && !o.hit && car.h < 1 && Math.abs(car.x - o.x) < o.w / 2 - 4) { o.hit = true; car.vh = 2.6; car.h = 0.7; c.sfx('thud'); burst(c.parts, o.x, GN, 8, '#5a5060', 1.6); hurtCar(car.x, GN - 20); }
      if (o.k === 'bar' && !o.knock && Math.abs(car.x - o.x) < 20 && car.h < 15) { o.knock = {x: 0, y: 0, vx: car.v + 2, vy: -4, r: 0}; c.sfx('bump'); hurtCar(car.x + 20, GN - 16); }
    }
    /* coins and hearts */
    for (const k of c.coins) {
      if (k.x < car.x - 60) continue; if (k.x > car.x + 60) break;
      if (!k.got && Math.abs(k.x - car.x) < 28 && k.h > car.h - 6 && k.h < car.h + 42) { k.got = true; if (k.heart) { car.hp = Math.min(car.maxHp, car.hp + 1); c.sfx('heart'); popText(c.parts, k.x, GN - k.h - 12, '+1 ♥', '#ff9eb0', 10); } else { chMoney(1, k.x, GN - k.h - 10); c.sfx('coin'); } }
    }
    /* limos */
    for (const l of c.limos) {
      limoStep(l);
      if (l.laneK < 0.4 && l.st !== 'spin' && l.st !== 'leave' && Math.abs(l.x - car.x) < 82 && l.h < car.h + 12 && c.phase === 'play') {
        if (car.h >= 10) { if (car.vh <= 0) { car.h = Math.max(car.h, l.h + 34); car.vh = 5.2; c.sfx('spring'); hitLimo(l, 'stomp'); } }
        else if (l.st === 'ram' || l.v > car.v + 0.5) { if (hurtCar(car.x - 26, GN - car.h - 14)) car.v += 1.0; l.v = car.v - 1.8; l.st = 'follow'; l.stT = 1.6; l.acts++; c.sfx('thud'); }
        else if (l.x < car.x) l.x = car.x - 82;
      }
    }
    c.limos = c.limos.filter(l => !l.gone);
    if (!c.gaveUp && car.x > LEN - 1100) { c.gaveUp = true; for (const l of c.limos) if (l.st !== 'spin') l.st = 'leave'; c.limoTrig = []; if (c.limos.length) popText(c.parts, car.x - 120, GN - 60, tr('Die Mafia gibt auf!', 'The mafia gives up!'), '#ffd84a', 11); }
    /* bullets */
    for (const b of c.bullets) {
      b.x += b.vx; if (b.x > c.cam + W + 30) { b.dead = true; continue; }
      if (b.x > car.x - 26 && b.x < car.x + 30 && c.phase === 'play') {
        const headLo = car.h + 19 + car.duck * 9, headHi = car.h + 34, bodyLo = car.h + 2, bodyHi = car.h + 18;
        const hitHead = car.duck < 0.6 && b.y >= headLo && b.y <= headHi, hitBody = b.y >= bodyLo && b.y <= bodyHi;
        if ((hitHead || hitBody) && !c.auto) { b.dead = true; for (let i = 0; i < 6; i++) c.parts.push({k: 'blob', x: b.x, y: GN - b.y, vx: -Math.random() * 2, vy: -Math.random() * 2, g: 0.15, t: 0, life: 0.5, r: 1.5 + Math.random(), c: '#5a2a14'}); hurtCar(b.x, GN - b.y); }
        else if (!b.passed && b.x > car.x + 20) { b.passed = true; if (car.duck > 0.6) popText(c.parts, car.x - 6, GN - car.h - 40, tr('Knapp!', 'Close one!'), '#9be7a5', 9); }
      }
    }
    c.bullets = c.bullets.filter(b => !b.dead);
    /* pralines */
    for (const p of c.pralines) {
      p.x += p.vx; p.vh -= 0.16; p.h += p.vh; p.rot += 0.3;
      for (const l of c.limos) if (!p.dead && l.laneK < 0.5 && l.st !== 'spin' && Math.abs(p.x - l.x) < 50 && p.h < l.h + 36 && p.h > l.h - 4) { p.dead = true; c.sfx('smallBoom'); burst(c.parts, p.x, GN - p.h, 10, '#a0643a', 2.2); c.parts.push({k: 'ring', x: p.x, y: GN - p.h, t: 0, life: 0.35, r: 22, c: '#ffd84a'}); hitLimo(l, 'praline'); }
      if (!p.dead && p.h <= 0) { p.dead = true; c.sfx('smallBoom'); burst(c.parts, p.x, GN - 2, 10, '#a0643a', 2); c.parts.push({k: 'ring', x: p.x, y: GN - 4, t: 0, life: 0.35, r: 24, c: '#ffd84a'}); for (const l of c.limos) if (l.laneK < 0.5 && Math.abs(p.x - l.x) < 70 && l.h < 10) { hitLimo(l, 'praline'); break; } }
      if (p.x < c.cam - 60) p.dead = true;
    }
    c.pralines = c.pralines.filter(p => !p.dead);
    /* the end */
    if (c.phase === 'play' && car.x >= LEN) { c.phase = 'end'; c.pt = 0; c.sfx('clear'); try { c.opts.banner && c.opts.banner(tr('Geschafft!', 'Made it!'), 2.6, tr('Die Mafia ist abgehängt. Auf zur Ranch!', 'You lost the mafia. On to the ranch!')); } catch (e) {} try { c.opts.speak && c.opts.speak('Yay! I did it!'); } catch (e) {} }
    if (c.phase === 'end') { car.v = Math.min(5.5, car.v + 0.05); if (c.pt > 3.2) chaseFinish('clear'); }
  }

  /* ---------------------------------- chase art ---------------------------------- */
  function skyCols(x) {
    if (x > (T0 + T1) / 2) return {top: SKY.sunT, mid: SKY.sunM, bot: SKY.sunB, night: 0, sunset: true};
    const n = ease((x - 1200) / 11000); return {top: mixA(SKY.duskT, SKY.nightT, n), mid: mixA(SKY.duskM, SKY.nightM, n), bot: mixA(SKY.duskB, SKY.nightB, n), night: n, sunset: false};
  }
  function drawWindowsGrid(ctx, x, y, w, h, seed, lit, nightK) {
    const cols = Math.max(1, Math.floor((w - 8) / 9)), rows = Math.max(1, Math.floor((h - 16) / 12)), ox = x + (w - cols * 9 + 3) / 2;
    ctx.beginPath(); for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) if (hash(seed + q, r, 9) < lit) ctx.rect(ox + q * 9, y + 9 + r * 12, 6, 7);
    ctx.fillStyle = nightK > 0.4 ? '#ffd77a' : 'rgba(255,226,160,' + (0.5 + nightK) + ')'; ctx.fill();
    ctx.beginPath(); for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) if (hash(seed + q, r, 9) >= lit) ctx.rect(ox + q * 9, y + 9 + r * 12, 6, 7);
    ctx.fillStyle = 'rgba(20,14,40,.35)'; ctx.fill();
  }
  function drawCityBg(ctx, cam, sk, t) {
    const W = VW(), n = sk.night;
    /* very far skyline silhouette */
    ctx.fillStyle = mix([122, 74, 140], [30, 30, 70], n);
    const f0 = 0.06, o0 = cam * f0; ctx.beginPath(); ctx.moveTo(-10, 162);
    for (let i = Math.floor((o0 - 40) / 30); i <= Math.ceil((o0 + W + 40) / 30); i++) { const x = i * 30 - o0, h = 40 + hash(i, 4, 2) * 60; ctx.lineTo(x, 162 - h); ctx.lineTo(x + 26, 162 - h); if (hash(i, 5, 2) < 0.15) { ctx.lineTo(x + 13, 162 - h - 22); } ctx.lineTo(x + 30, 162 - h * 0.6); }
    ctx.lineTo(W + 10, 162); ctx.closePath(); ctx.fill();
    /* far buildings */
    const f1 = 0.15, o1 = cam * f1, sp1 = 50;
    for (let i = Math.floor((o1 - 70) / sp1); i <= Math.ceil((o1 + W + 70) / sp1); i++) {
      const w = 36 + hash(i, 2, 3) * 16, h = 55 + hash(i, 1, 3) * 75, x = i * sp1 - o1, y = 164 - h;
      ctx.fillStyle = mix([150, 86, 150], [36, 38, 84], n); ctx.fillRect(x, y, w, h);
      ctx.fillStyle = mix([180, 110, 160], [50, 52, 104], n); ctx.fillRect(x, y, 3, h);
      if (n > 0.15) { ctx.globalAlpha = n * 0.9; ctx.fillStyle = '#ffd77a'; for (let r = 0; r < 8; r++) for (let q = 0; q < 3; q++) if (hash(i * 7 + q, r, 5) < 0.3) ctx.fillRect(x + 5 + q * 10, y + 6 + r * 10, 3, 4); ctx.globalAlpha = 1; }
      if (hash(i, 9, 3) < 0.2) { ctx.fillStyle = mix([150, 86, 150], [36, 38, 84], n); ctx.fillRect(x + w / 2 - 1, y - 14, 2, 14); circ(ctx, x + w / 2, y - 14, 1.6, (t * 2 | 0) % 2 ? '#ff4060' : '#7a2030'); }
    }
    /* mid buildings with windows and neon */
    const f2 = 0.35, o2 = cam * f2, sp2 = 86, pal = [[[120, 64, 110], [44, 36, 92]], [[100, 70, 130], [34, 46, 96]], [[140, 80, 100], [56, 34, 84]]];
    for (let i = Math.floor((o2 - 100) / sp2); i <= Math.ceil((o2 + W + 100) / sp2); i++) {
      const w = 58 + hash(i, 2, 7) * 22, h = 72 + hash(i, 1, 7) * 78, x = i * sp2 - o2 + hash(i, 3, 7) * 6, y = 166 - h, p = pal[Math.floor(hash(i, 4, 7) * 3)];
      ctx.fillStyle = mix(p[0], p[1], n); ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,200,150,' + (0.22 * (1 - n)) + ')'; ctx.fillRect(x, y, 4, h);
      ctx.fillStyle = 'rgba(0,0,20,.18)'; ctx.fillRect(x + w - 5, y, 5, h); ctx.fillRect(x - 2, y - 3, w + 4, 4);
      drawWindowsGrid(ctx, x, y, w, h, i * 131, 0.18 + 0.5 * n, n);
      if (hash(i, 6, 7) < 0.3) { ctx.fillStyle = mix(p[0], p[1], n * 0.8 + 0.1); rr(ctx, x + w * 0.6, y - 12, 12, 12, 2); ctx.fill(); ctx.fillRect(x + w * 0.6 + 2, y - 2, 2, 2); ctx.fillRect(x + w * 0.6 + 8, y - 2, 2, 2); }
      if (hash(i, 5, 7) < 0.55) {
        const word = NEON[Math.floor(hash(i, 8, 7) * NEON.length)], col = NEONC[Math.floor(hash(i, 9, 7) * NEONC.length)], on = n > 0.05 && !(hash(i, (t * 8) | 0, 3) < 0.04), vert = hash(i, 10, 7) < 0.4;
        ctx.save(); font(ctx, 7.5, 700); ctx.textAlign = 'center';
        if (vert && word.length <= 6) { const sx = x + w - 10, sy = y + 12, hh = word.length * 9 + 6; rr(ctx, sx - 6, sy, 12, hh, 3); ctx.fillStyle = 'rgba(30,14,40,.9)'; ctx.fill(); ctx.strokeStyle = col; ctx.globalAlpha = on ? 0.45 + 0.4 * n : 0.25; ctx.lineWidth = 2.5; ctx.stroke(); ctx.globalAlpha = 1; for (let k = 0; k < word.length; k++) { if (on) { ctx.fillStyle = col; ctx.globalAlpha = 0.35 * n; ctx.fillRect(sx - 4.5, sy + 4 + k * 9, 9, 8); ctx.globalAlpha = 1; } ctx.fillStyle = on ? '#fff' : col; ctx.fillText(word[k], sx, sy + 8.5 + k * 9); } }
        else { const tw = ctx.measureText(word).width + 10, sx = x + w / 2 - tw / 2, sy = y + h * 0.28; rr(ctx, sx, sy, tw, 12, 4); ctx.fillStyle = 'rgba(30,14,40,.9)'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.globalAlpha = on ? 0.5 + 0.4 * n : 0.3; ctx.stroke(); if (on) { ctx.globalAlpha = 0.3 * n; ctx.fillStyle = col; ctx.fillRect(sx - 3, sy - 3, tw + 6, 18); } ctx.globalAlpha = 1; if (on) { ctx.lineWidth = 1.6; ctx.strokeStyle = col; ctx.strokeText(word, sx + tw / 2, sy + 6.5); } ctx.fillStyle = on ? '#fff' : col; ctx.fillText(word, sx + tw / 2, sy + 6.5); }
        ctx.restore();
      }
    }
  }
  function drawHighwayBg(ctx, cam, t) {
    const W = VW();
    /* the sun setting behind the hills */
    const sx = W * 0.72, sy = 136; const sg = ctx.createRadialGradient(sx, sy, 10, sx, sy, 150); sg.addColorStop(0, 'rgba(255,240,180,.9)'); sg.addColorStop(0.25, 'rgba(255,180,110,.4)'); sg.addColorStop(1, 'rgba(255,150,100,0)'); ctx.fillStyle = sg; ctx.fillRect(0, 0, W, 172);
    circ(ctx, sx, sy, 30, '#fff1b0'); circ(ctx, sx, sy, 30, null, 'rgba(255,200,120,.6)', 3);
    ctx.fillStyle = 'rgba(255,150,120,.35)'; for (let i = 0; i < 4; i++) ctx.fillRect(sx - 40 + i * 4, sy + 6 + i * 6, 80 - i * 8, 2);
    const hill = (f, base, amp, col, seed) => { const o = cam * f; ctx.beginPath(); ctx.moveTo(-10, 175); for (let x = -10; x <= W + 10; x += 8) { const wx = (x + o) / 90; ctx.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin(wx + seed) * Math.cos(wx * 0.37 + seed * 2))); } ctx.lineTo(W + 10, 175); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); };
    hill(0.05, 140, 40, '#8a4a8a', 1); hill(0.12, 150, 30, '#a0507a', 3);
    /* the ranch on a hill near the end of the road */
    const rx = (LEN + 900 - cam) * 0.2 + W * 0.3; if (rx > -80 && rx < W + 80) drawRanch(ctx, rx, 146);
    hill(0.2, 160, 22, '#6a3a5a', 5);
    /* trees on the mid hills */
    const o3 = cam * 0.3; for (let i = Math.floor((o3 - 40) / 70); i <= Math.ceil((o3 + W + 40) / 70); i++) { if (hash(i, 1, 11) < 0.45) continue; const x = i * 70 - o3 + hash(i, 2, 11) * 30, y = 166; ctx.fillStyle = '#4a2a40'; ctx.fillRect(x - 1, y - 8, 2, 8); circ(ctx, x, y - 12, 6 + hash(i, 3, 11) * 3, '#5a3050'); }
  }
  function drawRanch(ctx, x, y) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#c8402a'; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-18, -14); ctx.lineTo(-8, -22); ctx.lineTo(2, -14); ctx.lineTo(2, 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#fff4e0'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = '#fff4e0'; ctx.fillRect(-11, -8, 6, 8); ctx.fillStyle = '#c8402a'; ctx.fillRect(-10, -7, 4, 7);
    rr(ctx, 4, -22, 7, 22, 3); ctx.fillStyle = '#d8d0e0'; ctx.fill(); ctx.fillStyle = '#9a90a8'; ctx.fillRect(4, -12, 7, 1);
    ctx.strokeStyle = '#4a2a40'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(18, -18); ctx.lineTo(20, 0); ctx.stroke(); ctx.save(); ctx.translate(18, -18); ctx.rotate(C ? C.t * 2 : 0); for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.fillStyle = '#fff4e0'; ctx.fillRect(0, -1, 8, 2); } ctx.restore();
    ctx.restore();
  }
  function drawLamp(ctx, x, n, t) {
    ctx.fillStyle = '#2a2240'; ctx.fillRect(x - 1.5, 106, 3, 60); ctx.fillRect(x - 3, 162, 6, 4);
    ctx.strokeStyle = '#2a2240'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x, 108); ctx.quadraticCurveTo(x, 100, x + 10, 101); ctx.stroke();
    rr(ctx, x + 6, 99, 12, 5, 2); ctx.fillStyle = '#2a2240'; ctx.fill(); ctx.fillStyle = n > 0.2 ? '#fff2b0' : '#c8b8a0'; ctx.fillRect(x + 8, 103.5, 8, 1.6);
    if (n > 0.2) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x + 12, 104, 0, x + 12, 104, 26); g.addColorStop(0, 'rgba(255,220,140,' + 0.6 * n + ')'); g.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = g; ctx.fillRect(x - 14, 78, 52, 52);
      ctx.beginPath(); ctx.moveTo(x + 8, 105); ctx.lineTo(x + 16, 105); ctx.lineTo(x + 40, GN + 4); ctx.lineTo(x - 16, GN + 4); ctx.closePath(); const cg = ctx.createLinearGradient(0, 105, 0, GN); cg.addColorStop(0, 'rgba(255,220,140,' + 0.22 * n + ')'); cg.addColorStop(1, 'rgba(255,220,140,' + 0.05 * n + ')'); ctx.fillStyle = cg; ctx.fill(); ctx.restore();
    }
  }
  function drawVerge(ctx, cam, sk, t) {
    const W = VW(), n = sk.night, x0 = cam - 40, x1 = cam + W + 40, hw = sk.sunset;
    /* back verge: sidewalk in the city, grass + fence on the highway */
    if (!hw) {
      ctx.fillStyle = mix([150, 120, 150], [60, 50, 84], n); ctx.fillRect(x0, 160, x1 - x0, RT - 160);
      ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 1; ctx.beginPath(); for (let x = Math.floor(x0 / 22) * 22; x < x1; x += 22) { ctx.moveTo(x, 161); ctx.lineTo(x - 3, RT); } ctx.stroke();
      for (let x = Math.floor(x0 / 230) * 230 + 40; x < x1; x += 230) if (!(x > BR0 && x < BR1)) drawLamp(ctx, x, n, t);
      for (let x = Math.floor(x0 / 170) * 170 + 100; x < x1; x += 170) { if (x > BR0 && x < BR1) continue; const h = hash(x, 1, 5); if (h < 0.3) { rr(ctx, x - 3, 156, 6, 10, 2); ctx.fillStyle = '#e8443a'; ctx.fill(); ctx.fillStyle = '#ff8a7a'; ctx.fillRect(x - 3, 158, 6, 1.5); } else if (h < 0.55) { ctx.fillStyle = mix([90, 140, 90], [30, 60, 50], n); circ(ctx, x, 156, 7); ctx.fill(); circ(ctx, x + 6, 158, 5); ctx.fill(); } }
    } else {
      ctx.fillStyle = '#7a9a4a'; ctx.fillRect(x0, 160, x1 - x0, RT - 160); ctx.fillStyle = '#9ab85a'; ctx.fillRect(x0, 160, x1 - x0, 2);
      ctx.fillStyle = '#6a4a3a'; for (let x = Math.floor(x0 / 40) * 40; x < x1; x += 40) ctx.fillRect(x, 150, 2.5, 14); ctx.fillRect(x0, 153, x1 - x0, 1.6); ctx.fillRect(x0, 158, x1 - x0, 1.6);
      for (let x = Math.floor(x0 / 320) * 320 + 60; x < x1; x += 320) { ctx.fillStyle = '#5a3a2a'; ctx.fillRect(x - 1.5, 92, 3, 72); ctx.fillRect(x - 8, 96, 16, 2); }
      ctx.strokeStyle = 'rgba(40,20,30,.55)'; ctx.lineWidth = 0.7; ctx.beginPath(); for (let x = Math.floor(x0 / 320) * 320 + 60; x < x1 + 320; x += 320) { for (const d of [-6, 6]) { ctx.moveTo(x + d, 96); ctx.quadraticCurveTo(x + 160 + d, 108, x + 320 + d, 96); } } ctx.stroke();
      for (let x = Math.floor(x0 / 37) * 37; x < x1; x += 37) { const h = hash(x, 2, 3); if (h < 0.4) { circ(ctx, x, 166, 1.6, h < 0.2 ? '#ffd84a' : '#ff9eb0'); } }
    }
    if (ORTS > x0 - 40 && ORTS < x1 + 40) drawOrtsende(ctx, ORTS);
    if (SIGN > x0 - 60 && SIGN < x1 + 60) drawRanchSign(ctx, SIGN, t);
  }
  function drawRoad(ctx, cam, sk, t) {
    const W = VW(), n = sk.night, x0 = cam - 40, x1 = cam + W + 40, hw = sk.sunset;
    const rg = ctx.createLinearGradient(0, RT, 0, RB); rg.addColorStop(0, hw ? '#5a4a5a' : mix([84, 70, 96], [40, 36, 56], n)); rg.addColorStop(1, hw ? '#4a3a4a' : mix([70, 58, 82], [30, 28, 44], n)); ctx.fillStyle = rg; ctx.fillRect(x0, RT, x1 - x0, RB - RT);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x0, RT, x1 - x0, 1.5);
    ctx.fillStyle = hw ? '#ffd84a' : 'rgba(255,255,255,.75)'; for (let x = Math.floor(x0 / 44) * 44; x < x1; x += 44) ctx.fillRect(x, 198, 22, 2);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x0, RB - 3, x1 - x0, 1.4);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let x = Math.floor(x0 / 60) * 60; x < x1; x += 60) { const h = hash(x, 7, 1); if (h < 0.3) ell(ctx, x + h * 40, 180 + h * 60, 10, 2, 0, 'rgba(0,0,0,.1)'); }
  }
  function drawOrtsende(ctx, x) {
    ctx.fillStyle = '#7a7a8a'; ctx.fillRect(x - 1.2, 132, 2.4, 34);
    rr(ctx, x - 22, 118, 44, 20, 2); ctx.fillStyle = '#ffd23a'; ctx.fill(); ctx.strokeStyle = '#222'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#222'; font(ctx, 7.5, 700); ctx.textAlign = 'center'; ctx.fillText(tr('Großstadt', 'Big City'), x, 128.5);
    ctx.strokeStyle = '#d8202a'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x - 20, 136); ctx.lineTo(x + 20, 120); ctx.stroke();
  }
  function drawRanchSign(ctx, x, t) {
    ctx.fillStyle = '#6a6a7a'; ctx.fillRect(x - 24, 120, 3, 46); ctx.fillRect(x + 21, 120, 3, 46);
    rr(ctx, x - 34, 96, 68, 32, 4); ctx.fillStyle = '#1f8a4a'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; rr(ctx, x - 31.5, 98.5, 63, 27, 3); ctx.stroke();
    ctx.fillStyle = '#fff'; font(ctx, 11, 700); ctx.textAlign = 'center'; ctx.fillText('Ranch', x - 4, 107.5); font(ctx, 9, 700); ctx.fillText('5 km', x - 4, 119);
    ctx.beginPath(); ctx.moveTo(x + 20, 108); ctx.lineTo(x + 27, 113); ctx.lineTo(x + 20, 118); ctx.closePath(); ctx.fill();
    heartPath(ctx, x + 23, 99 + Math.sin(t * 4), 0.5); ctx.fillStyle = '#ff6f9c'; ctx.fill();
  }
  function drawForeground(ctx, cam, sk, t) {
    const W = VW(), n = sk.night, x0 = cam - 40, x1 = cam + W + 40;
    ctx.fillStyle = sk.sunset ? '#8a7a8a' : mix([170, 150, 170], [80, 72, 100], n); ctx.fillRect(x0, RB, x1 - x0, 5);
    if (sk.sunset) {
      ctx.fillStyle = '#6a8a3a'; ctx.fillRect(x0, RB + 5, x1 - x0, VH - RB); ctx.fillStyle = '#5a7a30'; for (let x = Math.floor(x0 / 14) * 14; x < x1; x += 14) { const h = hash(x, 3, 3); ell(ctx, x, 236 + h * 30, 7, 2, 0, '#5a7a30'); if (h < 0.15) circ(ctx, x + 4, 240 + h * 120, 1.5, '#ffd84a'); }
      ctx.fillStyle = '#c8c8d8'; ctx.fillRect(x0, 226, x1 - x0, 4); ctx.fillStyle = '#9a9aa8'; ctx.fillRect(x0, 230, x1 - x0, 1.5); for (let x = Math.floor(x0 / 60) * 60; x < x1; x += 60) ctx.fillRect(x, 226, 3, 16);
    } else {
      ctx.fillStyle = mix([120, 96, 130], [44, 40, 64], n); ctx.fillRect(x0, RB + 5, x1 - x0, VH - RB);
      ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.lineWidth = 1; ctx.beginPath(); for (let x = Math.floor(x0 / 26) * 26; x < x1; x += 26) { ctx.moveTo(x, RB + 6); ctx.lineTo(x + 6, VH); } ctx.moveTo(x0, 246); ctx.lineTo(x1, 246); ctx.stroke();
      for (let x = Math.floor(x0 / 110) * 110; x < x1; x += 110) {
        if ((x > BR0 - 20 && x < BR1 + 20) || (x > T0 - 20 && x < T1 + 20)) continue; const h = hash(x, 5, 9), bx = x + h * 50;
        if (h < 0.3) { ctx.fillStyle = mix([70, 120, 80], [24, 52, 44], n); circ(ctx, bx, 262, 12); ctx.fill(); circ(ctx, bx + 12, 265, 10); ctx.fill(); circ(ctx, bx - 11, 266, 9); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.12)'; circ(ctx, bx - 3, 255, 4); ctx.fill(); if (h < 0.12) { circ(ctx, bx + 4, 258, 1.6, '#ff9eb0'); circ(ctx, bx - 6, 262, 1.6, '#ffd84a'); } }
        else if (h < 0.5) { for (let k = 0; k < 3; k++) { rr(ctx, bx + k * 16 - 2.5, 236, 5, 16, 2.5); ctx.fillStyle = mix([200, 180, 200], [90, 84, 110], n); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = '#ff6f9c'; ctx.fillRect(bx + k * 16 - 2.5, 240, 5, 2); } }
        else if (h < 0.62) { rr(ctx, bx - 14, 238, 28, 4, 2); ctx.fillStyle = '#8a5a3a'; ctx.fill(); rr(ctx, bx - 14, 231, 28, 4, 2); ctx.fill(); ctx.fillStyle = '#3a2a3a'; ctx.fillRect(bx - 12, 242, 2, 9); ctx.fillRect(bx + 10, 242, 2, 9); }
      }
    }
    /* bridge: water below the deck, girder, towers and cables are drawn in drawBridgeBack */
    if (x1 > BR0 && x0 < BR1) {
      const a = Math.max(x0, BR0), b = Math.min(x1, BR1);
      const wg = ctx.createLinearGradient(0, RB, 0, VH); wg.addColorStop(0, mix([120, 80, 150], [20, 26, 70], n)); wg.addColorStop(1, mix([60, 40, 110], [8, 10, 34], n)); ctx.fillStyle = wg; ctx.fillRect(a, RB + 12, b - a, VH - RB);
      for (let i = 0; i < 26; i++) { const x = a + ((hash(i, 1, 4) * 900 + t * 8 * (i % 3 + 1)) % Math.max(1, b - a)), y = RB + 20 + hash(i, 2, 4) * 44; ctx.fillStyle = i % 3 === 0 ? 'rgba(255,215,120,' + (0.25 + 0.5 * n) + ')' : (i % 3 === 1 ? 'rgba(255,111,208,' + 0.4 * n + ')' : 'rgba(255,255,255,.25)'); ctx.fillRect(x, y, 8 + hash(i, 3, 4) * 14, 1.4); }
      ctx.fillStyle = '#4a3a5a'; ctx.fillRect(a, RB, b - a, 12); ctx.strokeStyle = '#7a6a8a'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let x = Math.floor(a / 20) * 20; x < b; x += 20) { ctx.moveTo(x, RB + 1); ctx.lineTo(x + 10, RB + 11); ctx.lineTo(x + 20, RB + 1); } ctx.stroke();
    }
    /* tunnel cut-away: rock below the road */
    if (x1 > T0 && x0 < T1) { const a = Math.max(x0, T0), b = Math.min(x1, T1); drawRock(ctx, a, RB + 5, b - a, VH - RB - 5, 3); }
  }
  function drawBridgeBack(ctx, cam, sk, t) {
    const W = VW(), x0 = cam - 60, x1 = cam + W + 60; if (x1 < BR0 || x0 > BR1) return;
    const n = sk.night, tA = BR0 + 260, tB = BR1 - 260, top = 30, col = mix([200, 70, 90], [150, 50, 80], n);
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(BR0, RT - 2); ctx.quadraticCurveTo((BR0 + tA) / 2, RT - 30, tA, top + 6); ctx.quadraticCurveTo((tA + tB) / 2, RT + 40, tB, top + 6); ctx.quadraticCurveTo((tB + BR1) / 2, RT - 30, BR1, RT - 2); ctx.stroke();
    ctx.lineWidth = 0.8; ctx.beginPath(); for (let x = Math.ceil(Math.max(x0, BR0) / 24) * 24; x < Math.min(x1, BR1); x += 24) { let y; if (x < tA) { const k = (x - BR0) / (tA - BR0); y = (1 - k) * (1 - k) * (RT - 2) + 2 * (1 - k) * k * (RT - 30) + k * k * (top + 6); } else if (x < tB) { const k = (x - tA) / (tB - tA); y = (1 - k) * (1 - k) * (top + 6) + 2 * (1 - k) * k * (RT + 40) + k * k * (top + 6); } else { const k = (x - tB) / (BR1 - tB); y = (1 - k) * (1 - k) * (top + 6) + 2 * (1 - k) * k * (RT - 30) + k * k * (RT - 2); } ctx.moveTo(x, y); ctx.lineTo(x, RT); } ctx.stroke();
    for (const tx of [tA, tB]) { if (tx < x0 - 30 || tx > x1 + 30) continue; ctx.fillStyle = col; rr(ctx, tx - 7, top, 14, RT - top, 3); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.2; ctx.stroke(); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(tx - 7, top + 40, 14, 6); ctx.fillRect(tx - 7, top + 90, 14, 6); circ(ctx, tx, top - 2, 2.4, (t * 2 | 0) % 2 ? '#ff4060' : '#7a2030'); }
  }
  function drawBridgeRail(ctx, cam, sk) {
    const W = VW(), x0 = cam - 60, x1 = cam + W + 60, n = sk.night; if (x1 < BR0 || x0 > BR1) return;
    ctx.fillStyle = mix([120, 80, 150], [20, 26, 70], n); ctx.fillRect(Math.max(x0, BR0), 160, Math.min(x1, BR1) - Math.max(x0, BR0), RT - 160);
    ctx.fillStyle = mix([230, 200, 220], [120, 110, 150], n); ctx.fillRect(Math.max(x0, BR0), 164, Math.min(x1, BR1) - Math.max(x0, BR0), 2); for (let x = Math.ceil(Math.max(x0, BR0) / 12) * 12; x < Math.min(x1, BR1); x += 12) ctx.fillRect(x, 164, 1.5, 8);
  }
  function drawRock(ctx, x, y, w, h, seed) {
    ctx.fillStyle = '#5a3a3a'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#6a4642'; for (let i = 0; i < 4; i++) ctx.fillRect(x, y + h * (0.15 + i * 0.22), w, h * 0.06);
    for (let gx = Math.floor(x / 34) * 34; gx < x + w; gx += 34) for (let gy = 0; gy < 4; gy++) { const hh = hash(gx, gy, seed); if (hh < 0.45) { const sx = gx + hh * 30, sy = y + 6 + gy * (h / 4) + hh * 6; if (sx > x && sx < x + w) ell(ctx, sx, sy, 3 + hh * 5, 2 + hh * 3, 0, hh < 0.2 ? '#7a5a52' : '#4a2e2e'); } }
  }
  function drawTunnelHill(ctx, cam, t) {
    const W = VW(), x0 = cam - 60, x1 = cam + W + 60; if (x1 < T0 - 200 || x0 > T1 + 200) return;
    /* the hill over the tunnel (outside the portals) */
    ctx.fillStyle = '#6a8a4a'; ctx.beginPath(); ctx.moveTo(T0 - 220, 166); ctx.quadraticCurveTo(T0 - 120, 30, T0 + 60, -20); ctx.lineTo(T1 - 60, -20); ctx.quadraticCurveTo(T1 + 120, 30, T1 + 220, 166); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4e6e38'; ctx.beginPath(); ctx.moveTo(T0 - 180, 166); ctx.quadraticCurveTo(T0 - 100, 70, T0, 40); ctx.lineTo(T0, 166); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(T1 + 180, 166); ctx.quadraticCurveTo(T1 + 100, 70, T1, 40); ctx.lineTo(T1, 166); ctx.closePath(); ctx.fill();
  }
  function drawTunnelInside(ctx, cam, t) {
    const W = VW(), x0 = cam - 60, x1 = cam + W + 60; if (x1 < T0 - 200 || x0 > T1 + 200) return;
    const a = Math.max(x0, T0), b = Math.min(x1, T1);
    if (b > a) {
      drawRock(ctx, a, -10, b - a, 98, 7);
      ctx.fillStyle = '#8a8296'; ctx.fillRect(a, 86, b - a, 8); ctx.fillStyle = '#6a6278'; ctx.fillRect(a, 92, b - a, 2);
      const wg = ctx.createLinearGradient(0, 94, 0, RT); wg.addColorStop(0, '#2a2638'); wg.addColorStop(1, '#3e3850'); ctx.fillStyle = wg; ctx.fillRect(a, 94, b - a, RT - 94);
      ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1; ctx.beginPath(); for (let y = 104; y < RT; y += 12) { ctx.moveTo(a, y); ctx.lineTo(b, y); } for (let x = Math.floor(a / 24) * 24; x < b; x += 24) { ctx.moveTo(x, 94); ctx.lineTo(x, RT); } ctx.stroke();
      ctx.fillStyle = '#d8902a'; ctx.fillRect(a, 140, b - a, 3);
      for (let x = Math.floor(a / 140) * 140 + 30; x < b; x += 140) { rr(ctx, x - 9, 95, 18, 5, 2); ctx.fillStyle = '#ffb04a'; ctx.fill(); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, 100, 0, x, 100, 60); g.addColorStop(0, 'rgba(255,170,70,.45)'); g.addColorStop(1, 'rgba(255,150,60,0)'); ctx.fillStyle = g; ctx.fillRect(x - 60, 94, 120, 120); ctx.restore(); }
    }
    /* portals */
    for (const px of [T0, T1]) { if (px < x0 - 40 || px > x1 + 40) continue; const d = px === T0 ? -1 : 1; ctx.fillStyle = '#b8b0c4'; ctx.fillRect(px + (d < 0 ? -14 : 0), 74, 14, RT - 74); ctx.fillStyle = '#9a92a8'; ctx.fillRect(px + (d < 0 ? -14 : 0), 74, 14, 5); ctx.strokeStyle = OL; ctx.lineWidth = 1; ctx.strokeRect(px + (d < 0 ? -14 : 0), 74, 14, RT - 74); for (let y = 82; y < RT; y += 10) { ctx.fillStyle = (y / 10 | 0) % 2 ? '#ffd23a' : '#2a2030'; ctx.fillRect(px + (d < 0 ? -3 : 0), y, 3, 10); } if (d < 0) { rr(ctx, px - 40, 60, 46, 13, 3); ctx.fillStyle = '#1f6ad0'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = '#fff'; font(ctx, 8, 700); ctx.textAlign = 'center'; ctx.fillText('TUNNEL', px - 17, 67); } }
  }
  function drawConvertible(ctx, x, y, o) {
    const t = o.t, duck = o.duck || 0, sq = o.squash || 0, opts = o.opts, red = '#e8343a', red2 = '#b81e2a';
    ctx.save(); ctx.translate(x, y); if (o.spin) ctx.rotate(o.spin); else ctx.rotate(o.tilt || 0); ctx.scale(1 + sq * 0.14, 1 - sq * 0.14);
    if (o.blink) ctx.globalAlpha = 0.5;
    const by = -9 + duck * 9, mood = duck > 0.5 ? 'surprised' : (o.hurt ? 'sad' : undefined);
    /* Mallo in the back seat with fluttering bow ribbons, Toffo at the wheel */
    ctx.lineCap = 'round'; for (let k = 0; k < 2; k++) { const bx = -13 + 2, byy = by - 1 - 16.5; ctx.beginPath(); ctx.moveTo(bx, byy); for (let i = 1; i <= 6; i++) ctx.lineTo(bx - 4 - i * 2.8, byy - 2 + k * 2.2 + Math.sin(t * 22 - i * 0.9 + k) * (0.4 + i * 0.4)); ctx.strokeStyle = OL; ctx.lineWidth = 2.6; ctx.stroke(); ctx.strokeStyle = '#ff6f9c'; ctx.lineWidth = 1.4; ctx.stroke(); } ctx.lineCap = 'butt';
    bear(opts, ctx, -13, by - 1, {scale: 0.78, facing: 1, frame: t * 6, pose: o.throwing ? 'victory' : 'idle', white: true, bow: true, t: t + 2.1, mood: mood || 'happy'});
    if (o.throwing) { circ(ctx, -14, by - 25, 3, '#6b3a1f', OL, 0.8); }
    bear(opts, ctx, 1, by, {scale: 0.8, facing: 1, frame: t * 6, pose: 'idle', outfit: wookieOutfit('wiese'), t, mood: mood || 'determined'});
    /* steering wheel */
    ctx.strokeStyle = OL; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(10, -16); ctx.lineTo(7, -21); ctx.stroke(); ell(ctx, 7, -21.5, 1.4, 3.6, 0.3, '#3a3040', OL, 1);
    /* body */
    ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-31, -6); ctx.lineTo(-32, -15); ctx.quadraticCurveTo(-31, -19, -25, -19); ctx.lineTo(9, -18.5); ctx.quadraticCurveTo(22, -17.5, 30, -13); ctx.quadraticCurveTo(33, -11, 32, -6); ctx.closePath();
    const bg = ctx.createLinearGradient(0, -19, 0, -5); bg.addColorStop(0, '#ff6a5a'); bg.addColorStop(0.45, red); bg.addColorStop(1, red2); ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; rr(ctx, -26, -17.5, 30, 1.6, 0.8); ctx.fill(); rr(ctx, 12, -16.6, 12, 1.4, 0.7); ctx.fill();
    ctx.strokeStyle = 'rgba(90,10,20,.6)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-6, -17.5); ctx.lineTo(-6, -7); ctx.moveTo(8, -18); ctx.lineTo(8, -7); ctx.stroke(); rr(ctx, -2, -14, 5, 1.6, 0.8); ctx.fillStyle = '#f0e0e8'; ctx.fill();
    ctx.fillStyle = '#e8e4f0'; rr(ctx, 26, -8.5, 8, 3, 1.5); ctx.fill(); rr(ctx, -34, -8.5, 6, 3, 1.5); ctx.fill();
    circ(ctx, 30, -12.5, 2, '#fff6b0', OL, 0.8); rr(ctx, -33, -14.5, 2.5, 3.5, 1); ctx.fillStyle = '#ff3a5a'; ctx.fill();
    /* windshield */
    ctx.strokeStyle = OL; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(12, -18); ctx.lineTo(16, -29); ctx.stroke(); ctx.fillStyle = 'rgba(190,235,255,.35)'; ctx.beginPath(); ctx.moveTo(12.6, -18); ctx.lineTo(16.4, -28.5); ctx.lineTo(19, -28); ctx.lineTo(16, -18); ctx.closePath(); ctx.fill();
    /* wheels */
    for (const wx of [-19, 20]) { circ(ctx, wx, -6.5, 7, '#2a2232', OL, 1.2); circ(ctx, wx, -6.5, 4, '#d8d4e4'); ctx.strokeStyle = '#8a86a0'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = o.wheel + i * Math.PI / 3; ctx.moveTo(wx + Math.cos(a) * 3.6, -6.5 + Math.sin(a) * 3.6); ctx.lineTo(wx - Math.cos(a) * 3.6, -6.5 - Math.sin(a) * 3.6); } ctx.stroke(); circ(ctx, wx, -6.5, 1.2, '#ff6f9c'); }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function drawMafioso(ctx, x, y, o) {
    /* shoulders at y, facing right */
    rr(ctx, x - 7, y - 1, 13, 10, 4); ctx.fillStyle = '#2a2836'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - 1, y - 1); ctx.lineTo(x + 3, y - 1); ctx.lineTo(x + 1, y + 4); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ff6f9c'; ctx.fillRect(x + 0.4, y, 1.2, 4);
    if (o.aim > 0.2) {
      const ax = x + 4, ay = y + 2; ctx.strokeStyle = '#2a2836'; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + 9 * o.aim, ay - 1); ctx.stroke(); ctx.lineCap = 'butt';
      circ(ctx, ax + 9 * o.aim + 1, ay - 1, 1.8, '#f3c7a0', OL, 0.6); rr(ctx, ax + 9 * o.aim + 1, ay - 3.4, 8, 3, 1); ctx.fillStyle = '#4a4a5a'; ctx.fill(); ctx.fillStyle = '#ff6f9c'; ctx.fillRect(ax + 9 * o.aim + 8, ay - 3.2, 1.6, 2.6);
    }
    if (o.fist) { const fy = y - 6 + Math.sin(o.t * 18) * 1.6; ctx.strokeStyle = '#2a2836'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + 3, y + 1); ctx.lineTo(x + 7, fy); ctx.stroke(); ctx.lineCap = 'butt'; circ(ctx, x + 7, fy - 1, 2, '#f3c7a0', OL, 0.6); }
    const hy = y - 6.5; circ(ctx, x, hy, 5.4, '#f3c7a0', OL, 1); circ(ctx, x + 4.6, hy + 0.6, 1.4, '#e8a888'); circ(ctx, x - 2, hy + 2, 1.2, 'rgba(255,120,120,.35)');
    ctx.fillStyle = '#3a2a2a'; ctx.beginPath(); ctx.moveTo(x + 1.5, hy + 2.6); ctx.quadraticCurveTo(x + 4, hy + 1.6, x + 5.6, hy + 3); ctx.quadraticCurveTo(x + 3.5, hy + 3.6, x + 1.5, hy + 2.6); ctx.fill();
    rr(ctx, x - 1, hy - 2.2, 7, 2.8, 1.2); ctx.fillStyle = '#111'; ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x + 3.6, hy - 1.8, 1.4, 0.8);
    ell(ctx, x + 0.5, hy - 4.4, 8, 1.7, 0, '#26222e', OL, 0.8); rr(ctx, x - 4, hy - 9.6, 9, 5.6, 2.5); ctx.fillStyle = '#26222e'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 0.8; ctx.stroke(); ctx.fillStyle = '#c9305f'; ctx.fillRect(x - 4, hy - 6, 9, 1.4);
  }
  function drawLimo(ctx, l, t, cam) {
    const s = 1 - 0.1 * l.laneK, gy = lerp(GN, GF, l.laneK), y = gy - l.h * s, sh = l.rev > 0.1 ? (Math.random() - 0.5) * 1.4 * l.rev : 0;
    ell(ctx, l.x, gy + 1, 50 * s, 3.5 * s, 0, 'rgba(0,0,0,.28)');
    ctx.save(); ctx.translate(l.x + sh, y + sh * 0.5); ctx.scale(s, s); if (l.rot) { ctx.translate(0, -14); ctx.rotate(Math.sin(l.rot) * 0.5); ctx.translate(0, 14); }
    if (l.laneK > 0.5) ctx.globalAlpha = 0.92;
    ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-52, -6); ctx.lineTo(-53, -17); ctx.quadraticCurveTo(-52, -21, -45, -21.5); ctx.lineTo(-37, -22); ctx.lineTo(-33, -33); ctx.quadraticCurveTo(-32, -35, -28, -35); ctx.lineTo(14, -35); ctx.quadraticCurveTo(18, -35, 20, -33); ctx.lineTo(27, -22.5); ctx.lineTo(44, -20.5); ctx.quadraticCurveTo(52, -19, 53, -13); ctx.lineTo(53, -6); ctx.closePath();
    const bg = ctx.createLinearGradient(0, -35, 0, -5); bg.addColorStop(0, '#4a4658'); bg.addColorStop(0.35, '#1d1b26'); bg.addColorStop(1, '#0e0d14'); ctx.fillStyle = l.flash > 0 ? '#fff' : bg; ctx.fill(); ctx.strokeStyle = '#05040a'; ctx.lineWidth = 1.6; ctx.stroke();
    /* windows */
    const win = (x0, x1, open) => { ctx.beginPath(); ctx.moveTo(x0, -23.5); ctx.lineTo(x0 + (x0 < -30 ? 3 : 0), -32.5); ctx.lineTo(x1 - (x1 > 15 ? 3 : 0), -32.5); ctx.lineTo(x1, -23.5); ctx.closePath(); ctx.fillStyle = open ? '#120e1a' : '#34405a'; ctx.fill(); if (!open) { ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 + 3, -23); ctx.lineTo(x0 + 9, -33); ctx.stroke(); ctx.restore(); } };
    win(-34, -14, false); win(-11, 3, false); win(6, 22, l.lean > 0.1);
    /* driver silhouette behind the windshield */
    ctx.fillStyle = '#0a0910'; ell(ctx, 20, -26.5, 2.8, 2.8, 0); ctx.fill(); ell(ctx, 20, -29, 4.4, 1, 0); ctx.fill(); rr(ctx, 17.6, -32.6, 5, 3.6, 1.5); ctx.fill();
    ctx.fillStyle = '#d8d4e4'; ctx.fillRect(-50, -14.5, 100, 1.4); rr(ctx, 49, -17, 4.5, 9, 1.5); ctx.fill(); rr(ctx, -55, -9, 8, 3, 1.5); ctx.fill(); rr(ctx, 46, -9, 9, 3, 1.5); ctx.fill();
    const hl = l.rev > 0.1 && ((t * 12) | 0) % 2 ? '#ff5050' : '#fff6c0'; circ(ctx, 51, -15.5, 2.2, hl, OL, 0.8); rr(ctx, -53.5, -15, 2.5, 4, 1); ctx.fillStyle = '#ff3a5a'; ctx.fill();
    ctx.fillStyle = '#d8d4e4'; ctx.beginPath(); ctx.moveTo(44, -21); ctx.lineTo(46, -24.5); ctx.lineTo(47.5, -20.8); ctx.closePath(); ctx.fill();
    for (const wx of [-34, 34]) { circ(ctx, wx, -7, 7.5, '#14121a', '#05040a', 1.2); circ(ctx, wx, -7, 5, '#f0eef6'); circ(ctx, wx, -7, 3.4, '#8a86a0'); ctx.strokeStyle = '#4a4658'; ctx.lineWidth = 0.9; ctx.beginPath(); const a = (l.x * 0.15) % TAU; ctx.moveTo(wx + Math.cos(a) * 3, -7 + Math.sin(a) * 3); ctx.lineTo(wx - Math.cos(a) * 3, -7 - Math.sin(a) * 3); ctx.stroke(); }
    if (l.lean > 0.05) drawMafioso(ctx, 13 + l.lean * 2, -24 - l.lean * 3, {aim: l.st === 'aim' || l.st === 'fire' ? l.lean : 0, fist: l.fist, t});
    if (l.st === 'spin') { for (let i = 0; i < 3; i++) { const a = t * 6 + i * TAU / 3; starPath(ctx, Math.cos(a) * 14, -42 + Math.sin(a) * 4, 3, 1.3, 5); ctx.fillStyle = '#ffd84a'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 0.6; ctx.stroke(); } }
    ctx.restore(); ctx.globalAlpha = 1;
    /* telegraphs */
    if (l.st === 'aim' && l.laneK < 0.3) { const k = 1 - Math.max(0, l.stT) / 1.0; outlined(ctx, '!', l.x + 18, y - 52 - Math.sin(t * 20) * 1.5, 13, '#ff6f9c'); const car = C.car; ctx.save(); ctx.setLineDash([3, 3]); ctx.lineDashOffset = -t * 30; ctx.strokeStyle = 'rgba(255,60,90,' + (0.3 + 0.5 * k) + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(l.x + 36, y - 27); ctx.lineTo(car.x - 6, GN - car.h - 27); ctx.stroke(); ctx.restore(); }
    if (l.st === 'rev') outlined(ctx, '!!', l.x + 10, y - 48 - Math.sin(t * 24) * 1.5, 13, '#ffd84a');
  }
  function drawTraffic(ctx, tr, t) {
    const s = 1 - 0.12 * tr.laneK, gy = lerp(GN, GF, tr.laneK), L = tr.len / 2, H = tr.roof;
    ell(ctx, tr.x, gy + 1, L * s, 3 * s, 0, 'rgba(0,0,0,.25)');
    ctx.save(); ctx.translate(tr.x, gy); ctx.scale(s * (1 + tr.squash * 0.1), s * (1 - tr.squash * 0.18)); if (tr.laneK > 0.5) ctx.globalAlpha = 0.9;
    ctx.lineJoin = 'round'; ctx.beginPath();
    if (tr.k === 'van') { ctx.moveTo(-L, -5); ctx.lineTo(-L, -H + 3); ctx.quadraticCurveTo(-L, -H, -L + 4, -H); ctx.lineTo(L - 12, -H); ctx.lineTo(L - 3, -14); ctx.lineTo(L, -5); }
    else if (tr.k === 'bug') { ctx.moveTo(-L, -5); ctx.quadraticCurveTo(-L - 1, -H + 6, -L * 0.3, -H); ctx.quadraticCurveTo(L * 0.4, -H, L * 0.7, -13); ctx.quadraticCurveTo(L + 1, -11, L, -5); }
    else { ctx.moveTo(-L, -5); ctx.lineTo(-L + 1, -14); ctx.lineTo(-L * 0.5, -15); ctx.lineTo(-L * 0.36, -H); ctx.lineTo(L * 0.3, -H); ctx.lineTo(L * 0.5, -15); ctx.lineTo(L - 1, -13); ctx.lineTo(L, -5); }
    ctx.closePath(); ctx.fillStyle = tr.c; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(-L + 3, -12, tr.len - 6, 1.4);
    ctx.fillStyle = '#9fd8ff'; if (tr.k === 'van') { rr(ctx, L - 13, -H + 3, 8, 9, 2); ctx.fill(); } else if (tr.k === 'bug') { ell(ctx, 1, -H + 6, 8, 4.5, 0, '#9fd8ff'); } else { rr(ctx, -L * 0.3, -H + 3, L * 0.55, 8, 2); ctx.fill(); }
    circ(ctx, tr.k === 'van' ? L - 9 : (tr.k === 'bug' ? 3 : L * 0.05), -H + 9, 2.6, '#f3c7a0', OL, 0.7);
    if (tr.k === 'taxi') { rr(ctx, -6, -H - 5, 12, 5, 1.5); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 0.8; ctx.stroke(); ctx.fillStyle = '#222'; font(ctx, 3.8, 700); ctx.textAlign = 'center'; ctx.fillText('TAXI', 0, -H - 2.3); ctx.fillStyle = '#222'; for (let i = 0; i < 6; i++) ctx.fillRect(-L + 4 + i * 6, -9, 3, 2); }
    if (tr.k === 'van') { ctx.fillStyle = '#fff'; font(ctx, 5, 700); ctx.textAlign = 'center'; ctx.fillText(VAN_TXT, -6, -H * 0.5); }
    circ(ctx, L - 1.5, -9.5, 1.6, '#fff6b0'); ctx.fillStyle = '#ff3a5a'; ctx.fillRect(-L - 0.5, -11, 2, 3);
    if (tr.blink > 0 && ((t * 6) | 0) % 2) { circ(ctx, -L + 1, -14, 1.8, '#ffb020'); circ(ctx, L - 2, -14, 1.8, '#ffb020'); }
    for (const wx of [-L + 9, L - 9]) { circ(ctx, wx, -5, 5.2, '#2a2232', OL, 1); circ(ctx, wx, -5, 2.4, '#c8c4d4'); }
    ctx.restore(); ctx.globalAlpha = 1;
    if (tr.honk > 0) outlined(ctx, HONK_TXT, tr.x + 4, gy - H - 12, 8, '#fff');
  }
  function drawObstacle(ctx, o, t) {
    if (o.k === 'hole') { ell(ctx, o.x, GN + 2, o.w / 2, 4.6, 0, '#7a6a80'); ell(ctx, o.x, GN + 2.4, o.w / 2 - 2, 3.6, 0, '#120c18'); ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(o.x - o.w / 2, GN + 2); ctx.lineTo(o.x - o.w / 2 - 5, GN - 1); ctx.moveTo(o.x + o.w / 2, GN + 2); ctx.lineTo(o.x + o.w / 2 + 6, GN + 5); ctx.stroke(); }
    else if (o.k === 'ramp') {
      ctx.beginPath(); ctx.moveTo(o.x, GN); ctx.lineTo(o.x + 56, GN - 20); ctx.lineTo(o.x + 56, GN); ctx.closePath(); ctx.fillStyle = '#ffcf3a'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.save(); ctx.clip(); ctx.fillStyle = '#2a2030'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(o.x + i * 11, GN); ctx.lineTo(o.x + i * 11 + 6, GN - 20); ctx.lineTo(o.x + i * 11 + 11, GN - 20); ctx.lineTo(o.x + i * 11 + 5, GN); ctx.fill(); } ctx.restore();
      ctx.fillStyle = '#8a5a2b'; ctx.fillRect(o.x + 52, GN - 20, 4, 20); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(o.x + 2, GN - 1); ctx.lineTo(o.x + 55, GN - 20.5); ctx.lineTo(o.x + 55, GN - 19); ctx.closePath(); ctx.fill();
    } else if (o.k === 'bar') {
      ctx.save(); const k = o.knock; ctx.translate(o.x + (k ? k.x : 0), GN + (k ? k.y : 0)); if (k) ctx.rotate(k.r);
      ctx.strokeStyle = OL; ctx.lineWidth = 1.2; ctx.fillStyle = '#e8e4f0'; for (const d of [-8, 8]) { ctx.beginPath(); ctx.moveTo(d * 0.6, -16); ctx.lineTo(d, 0); ctx.lineWidth = 2; ctx.strokeStyle = '#6a6278'; ctx.stroke(); }
      rr(ctx, -10, -15, 20, 7, 1.5); ctx.fillStyle = '#fff'; ctx.fill(); ctx.save(); ctx.clip(); ctx.fillStyle = '#e8343a'; for (let i = -2; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-10 + i * 7, -15); ctx.lineTo(-6 + i * 7, -15); ctx.lineTo(-10 + i * 7, -8); ctx.lineTo(-14 + i * 7, -8); ctx.fill(); } ctx.restore(); rr(ctx, -10, -15, 20, 7, 1.5); ctx.strokeStyle = OL; ctx.lineWidth = 1.1; ctx.stroke();
      const on = ((t * 3) | 0) % 2 === 0; circ(ctx, 0, -18, 2.4, on ? '#ffb020' : '#a06010', OL, 0.8); if (on) { ctx.globalAlpha = 0.35; circ(ctx, 0, -18, 6, '#ffb020'); ctx.globalAlpha = 1; }
      ctx.restore();
    }
  }
  function chaseScene(ctx) {
    const c = C, W = VW(), t = c.t, car = c.car, cam = c.cam, sk = skyCols(cam + W / 2);
    ctx.save(); if (c.shake > 0) ctx.translate((Math.random() - 0.5) * c.shake, (Math.random() - 0.5) * c.shake);
    const sg = ctx.createLinearGradient(0, 0, 0, 170); sg.addColorStop(0, rgbS(sk.top)); sg.addColorStop(0.6, rgbS(sk.mid)); sg.addColorStop(1, rgbS(sk.bot)); ctx.fillStyle = sg; ctx.fillRect(-10, -10, W + 20, 190);
    if (sk.night > 0.1) { for (let i = 0; i < 60; i++) { const x = (hash(i, 1, 2) * W * 1.3 - cam * 0.02 % (W * 1.3) + W * 1.3) % (W * 1.3), y = hash(i, 2, 2) * 110; ctx.globalAlpha = sk.night * (0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i))); ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 1.2, 1.2); } ctx.globalAlpha = 1; const mx = W * 0.82, my = 40; ctx.globalAlpha = sk.night; circ(ctx, mx, my, 13, '#fff6dc'); circ(ctx, mx + 5, my - 4, 11, rgbS(sk.top)); ctx.globalAlpha = 1; }
    if (!sk.sunset && sk.night < 0.6) { const k = 1 - sk.night / 0.6; ctx.globalAlpha = k; const sx = W * 0.25, sy = 150; const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 90); g.addColorStop(0, 'rgba(255,230,160,.9)'); g.addColorStop(1, 'rgba(255,170,120,0)'); ctx.fillStyle = g; ctx.fillRect(0, 50, W, 130); circ(ctx, sx, sy, 22, '#ffe0a0'); ctx.globalAlpha = 1; }
    if (sk.sunset) drawHighwayBg(ctx, cam, t); else drawCityBg(ctx, cam, sk, t);
    ctx.save(); ctx.translate(-cam, 0);
    drawBridgeBack(ctx, cam, sk, t);
    drawTunnelHill(ctx, cam, t);
    drawVerge(ctx, cam, sk, t);
    drawBridgeRail(ctx, cam, sk);
    drawTunnelInside(ctx, cam, t);
    drawRoad(ctx, cam, sk, t);
    for (const o of c.obs) { if (o.x < cam - 80) continue; if (o.x > cam + W + 80) break; if (o.k !== 'bar') drawObstacle(ctx, o, t); }
    /* far lane first, then the near lane */
    for (const f of c.far) drawTraffic(ctx, f, t);
    for (const tr of c.traffic) if (tr.laneK >= 0.5) drawTraffic(ctx, tr, t);
    for (const l of c.limos) if (l.laneK >= 0.5) drawLimo(ctx, l, t, cam);
    for (const o of c.obs) { if (o.x < cam - 200) continue; if (o.x > cam + W + 80) break; if (o.k === 'bar') drawObstacle(ctx, o, t); }
    for (const k of c.coins) { if (k.got || k.x < cam - 20) continue; if (k.x > cam + W + 20) break; const y = GN - k.h - 6 + Math.sin(t * 4 + k.x) * 1.5; if (k.heart) { ctx.save(); ctx.translate(k.x, y); const s = 1 + 0.12 * Math.sin(t * 6); ctx.scale(s, s); heartPath(ctx, 0, 2, 1); ctx.fillStyle = '#ff6f9c'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.3; ctx.stroke(); circ(ctx, -3, -2, 1.3, '#fff'); ctx.restore(); } else coinIcon(ctx, k.x, y, 5, t * 4 + k.x * 0.05); }
    for (const tr of c.traffic) if (tr.laneK < 0.5) drawTraffic(ctx, tr, t);
    for (const l of c.limos) if (l.laneK < 0.5) drawLimo(ctx, l, t, cam);
    /* the player's car */
    ell(ctx, car.x, GN + 1, 30 * clamp(1 - car.h / 120, 0.4, 1), 3.5, 0, 'rgba(0,0,0,.3)');
    if (sk.night > 0.3 || (cam + W / 2 > T0 && cam + W / 2 < T1)) { const k = Math.max(sk.night, cam + W / 2 > T0 && cam + W / 2 < T1 ? 1 : 0); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const hx = car.x + 30, hy = GN - car.h - 12; const g = ctx.createLinearGradient(hx, 0, hx + 130, 0); g.addColorStop(0, 'rgba(255,240,180,' + 0.35 * k + ')'); g.addColorStop(1, 'rgba(255,240,180,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(hx, hy - 2); ctx.lineTo(hx + 130, hy - 18); ctx.lineTo(hx + 130, hy + 14); ctx.closePath(); ctx.fill(); ctx.restore(); }
    drawConvertible(ctx, car.x, GN - car.h, {t, duck: car.duck, squash: car.squash, tilt: car.tilt, wheel: car.wheel, blink: car.inv > 0 && ((t * 12) | 0) % 2 === 0, throwing: car.throwT > 0, spin: c.phase === 'crash' ? car.spin : 0, hurt: car.inv > 0.8, opts: c.opts});
    for (const p of c.pralines) { ctx.save(); ctx.translate(p.x, GN - p.h); ctx.rotate(p.rot); circ(ctx, 0, 0, 3.6, '#6b3a1f', OL, 1); ctx.strokeStyle = '#c8945a'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-2.4, -1); ctx.quadraticCurveTo(0, 1, 2.4, -1); ctx.stroke(); circ(ctx, -1.2, -1.6, 0.8, 'rgba(255,255,255,.6)'); ctx.restore(); }
    for (const b of c.bullets) { const y = GN - b.y; ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(b.x - 16, y - 0.6, 12, 1.2); rr(ctx, b.x - 4, y - 1.6, 8, 3.2, 1.6); ctx.fillStyle = '#4a2414'; ctx.fill(); ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 0.6; ctx.stroke(); }
    drawForeground(ctx, cam, sk, t);
    pDraw(ctx, c.parts);
    ctx.restore();
    if (c.say && c.phase === 'play' && t > c.say.t0 && t < c.say.t1) sayBubble(ctx, car.x - cam - 13, GN - car.h - 40, c.say.text, 168, 7.5, Math.min(1, (t - c.say.t0) * 4, (c.say.t1 - t) * 3));
    if (c.phase === 'crash') { ctx.fillStyle = 'rgba(0,0,0,' + ease((c.pt - 0.8) / 1.2) + ')'; ctx.fillRect(-10, -10, W + 20, VH + 20); }
    if (c.phase === 'end' && c.pt > 2.2) { ctx.fillStyle = 'rgba(255,236,200,' + ease((c.pt - 2.2) / 1.0) + ')'; ctx.fillRect(-10, -10, W + 20, VH + 20); }
    ctx.restore();
  }
  function chaseHud(ctx) {
    const c = C, W = VW(), t = c.t, car = c.car;
    heartsHud(ctx, 16, 14, car.hp, car.maxHp, t);
    /* praline indicator */
    const px = 16 + car.maxHp * 15 + 8, rdy = car.cool <= 0;
    circ(ctx, px, 15, 7.5, 'rgba(74,34,58,.85)', rdy ? '#ffd84a' : 'rgba(255,255,255,.3)', 1.3);
    if (!rdy) { ctx.beginPath(); ctx.moveTo(px, 15); ctx.arc(px, 15, 7.5, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - car.cool / 0.75)); ctx.closePath(); ctx.fillStyle = 'rgba(255,216,74,.35)'; ctx.fill(); }
    circ(ctx, px, 15, 3.6, '#6b3a1f', OL, 0.9); circ(ctx, px - 1.2, 13.6, 0.9, 'rgba(255,255,255,.6)');
    rr(ctx, px + 8, 16, 9, 9, 2.5); ctx.fillStyle = rdy ? '#ffd84a' : 'rgba(255,255,255,.35)'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1; ctx.stroke(); font(ctx, 6.5, 700); ctx.textAlign = 'center'; ctx.fillStyle = OL; ctx.fillText(c.kb ? 'X' : 'B', px + 12.5, 20.8);
    moneyHud(ctx, 11, 32, c.money);
    /* progress to the ranch */
    const bw = Math.min(118, W * 0.22), bx = W - 14 - bw, by = 11, k = clamp(car.x / LEN, 0, 1);
    rr(ctx, bx, by, bw, 7, 3.5); ctx.fillStyle = 'rgba(42,21,48,.75)'; ctx.fill();
    ctx.fillStyle = 'rgba(155,231,165,.45)'; ctx.fillRect(bx + bw * BR0 / LEN, by + 1, bw * (BR1 - BR0) / LEN, 5); ctx.fillStyle = 'rgba(20,10,20,.8)'; ctx.fillRect(bx + bw * T0 / LEN, by + 1, bw * (T1 - T0) / LEN, 5);
    rr(ctx, bx, by, Math.max(7, bw * k), 7, 3.5); ctx.fillStyle = '#ff6f9c'; ctx.fill(); rr(ctx, bx, by, bw, 7, 3.5); ctx.strokeStyle = OL; ctx.lineWidth = 1.2; ctx.stroke();
    rr(ctx, bx + bw * k - 5, by - 1.5, 10, 6, 2); ctx.fillStyle = '#e8343a'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 0.9; ctx.stroke(); circ(ctx, bx + bw * k - 2.5, by + 4.8, 1.6, '#2a2232'); circ(ctx, bx + bw * k + 2.5, by + 4.8, 1.6, '#2a2232');
    ctx.fillStyle = '#c8402a'; ctx.beginPath(); ctx.moveTo(bx + bw + 1, by + 7); ctx.lineTo(bx + bw + 1, by - 1); ctx.lineTo(bx + bw + 5, by - 5); ctx.lineTo(bx + bw + 9, by - 1); ctx.lineTo(bx + bw + 9, by + 7); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 0.8; ctx.stroke();
    outlined(ctx, 'Ranch', bx + bw + 5, by + 15, 7, '#fff4e0', 'right');
    /* warning arrow for a limo arriving from the left */
    for (const l of c.limos) if (l.st === 'enter' && l.x < c.cam + 10) { ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 12); outlined(ctx, '◀ Limo!', 10, 150, 10, '#ff6f9c', 'left'); ctx.globalAlpha = 1; break; }
    if (c.hints.length) { const h = c.hints[0]; hintPill(ctx, h.text, Math.min(1, h.t * 2), t); }
  }

  G.modes.chase = {
    start(opts) { try { chaseStart(opts); } catch (e) { console.log('MODE_ERROR chase start ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } },
    update() { if (!C || C.finished) return; try { chaseUpdate(); } catch (e) { if (!C.err) { C.err = true; console.log('MODE_ERROR chase ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } } },
    frame(ctx) { if (!C) return; try { chaseScene(ctx); chaseHud(ctx); } catch (e) { if (!C.ferr) { C.ferr = true; console.log('MODE_ERROR chase frame ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } } },
    debugWin() { if (C && !C.finished) { C.car.x = LEN; chaseFinish('clear'); } },
  };
})();
