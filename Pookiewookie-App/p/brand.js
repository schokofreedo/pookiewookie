/* Pookiewookie: the publisher intro "Schokofreedo Games", starring Freedo, a chocolate praline with a big grin.
   A golden foil ball drops in and bursts open, Freedo blinks, hops across the screen and every landing splashes three chocolate
   letters out of the ground, he jumps onto the wordmark, GAMES is stamped in gold, sunglasses drop, thumbs up, the voice shouts
   "Schokofreedo Games!", a shine sweeps across and it fades. Also draws the start screen (before the first tap) and exposes
   Freedo for the app icon. */
(function () {
  const G = window.PW = window.PW || {}, VH = 270, TAU = Math.PI * 2;
  const A = () => G.audio, VW = () => G.VW || 480;
  const clamp01 = k => Math.max(0, Math.min(1, k));
  const ease = (t, a, b) => { const k = clamp01((t - a) / (b - a)); return k * k * (3 - 2 * k); };
  const back = k => { const s = 1.9; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); };
  const elastic = k => k >= 1 ? 1 : (k <= 0 ? 0 : Math.pow(2, -9 * k) * Math.sin((k * 9 - 0.75) * (TAU / 3)) + 1);
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function star4(ctx, x, y, r) { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, q = i % 2 ? r * 0.36 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } ctx.closePath(); }
  const WORD = 'SCHOKOFREEDO', DUR = 5.2;
  const HOPS = [{t: 1.75, g: 0}, {t: 2.05, g: 1}, {t: 2.35, g: 2}, {t: 2.65, g: 3}];   /* landing times, letter group (3 letters each) */
  let dust = [], sparks = [], foil = [], drips = [];

  /* ---------- Freedo ---------- */
  function freedo(ctx, x, y, s, o) {
    /* (x, y) = bottom centre of the gold cup; o = {sx, sy, eyes (0..1 open), look (-1..1), glasses (0..1), grin (0..1), thumb (0..1), wink} */
    o = o || {};
    const sx = o.sx || 1, sy = o.sy || 1, eyes = o.eyes === undefined ? 1 : o.eyes, look = o.look || 0, gl = o.glasses || 0, grin = o.grin === undefined ? 1 : o.grin;
    ctx.save(); ctx.translate(x, y); ctx.scale(s * sx, s * sy);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    /* shadow */
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, 1, 20, 3.5, 0, 0, TAU); ctx.fill();
    /* golden pleated cup */
    ctx.beginPath(); ctx.moveTo(-19, -12); ctx.lineTo(19, -12); ctx.lineTo(14, 0); ctx.lineTo(-14, 0); ctx.closePath();
    const cg = ctx.createLinearGradient(-19, 0, 19, 0); cg.addColorStop(0, '#9a6a10'); cg.addColorStop(0.3, '#ffe27a'); cg.addColorStop(0.55, '#f0b830'); cg.addColorStop(1, '#8a5a08'); ctx.fillStyle = cg; ctx.fill();
    ctx.strokeStyle = '#5a3a04'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.strokeStyle = 'rgba(90,58,4,.55)'; ctx.lineWidth = 1; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 5.2, -12); ctx.lineTo(i * 3.9, 0); ctx.stroke(); }
    /* chocolate ball */
    const R = 21, cy = -28;
    const bg = ctx.createRadialGradient(-7, cy - 9, 2, 0, cy, R); bg.addColorStop(0, '#9a5a30'); bg.addColorStop(0.45, '#5e3016'); bg.addColorStop(1, '#2e1408');
    ctx.beginPath(); ctx.arc(0, cy, R, 0, TAU); ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = '#1a0a04'; ctx.lineWidth = 2; ctx.stroke();
    /* white chocolate drizzle on top */
    ctx.save(); ctx.beginPath(); ctx.arc(0, cy, R - 1, 0, TAU); ctx.clip();
    ctx.strokeStyle = '#fff1dc'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-17, cy - 12); for (let i = 0; i < 7; i++) ctx.lineTo(-17 + (i + 1) * 5, cy - 12 + (i % 2 ? -4 : 3) - i * 0.3); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 14; i++) { const a = i * 2.39, d = 6 + (i * 7) % 13; ctx.beginPath(); ctx.arc(Math.cos(a) * d, cy + Math.sin(a) * d, 0.8, 0, TAU); ctx.fill(); }
    ctx.restore();
    /* gloss */
    ctx.fillStyle = 'rgba(255,240,220,.35)'; ctx.beginPath(); ctx.ellipse(-8, cy - 10, 7, 4, -0.6, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-10, cy - 12, 2.5, 1.4, -0.6, 0, TAU); ctx.fill();
    /* cheeks */
    ctx.fillStyle = 'rgba(255,111,156,.45)'; ctx.beginPath(); ctx.ellipse(-12, cy + 4, 4, 2.5, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(12, cy + 4, 4, 2.5, 0, 0, TAU); ctx.fill();
    /* eyes */
    for (const d of [-1, 1]) {
      const ex = d * 7.5, ey = cy - 3;
      if (o.wink && d === 1) { ctx.strokeStyle = '#1a0a04'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ex, ey + 1, 4, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); continue; }
      const h = 6.2 * Math.max(0.08, eyes);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, 5, h, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#1a0a04'; ctx.lineWidth = 1.4; ctx.stroke();
      if (eyes > 0.3) { ctx.fillStyle = '#1a0a04'; ctx.beginPath(); ctx.arc(ex + look * 1.8, ey + 1, 2.8, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + look * 1.8 - 1, ey - 0.4, 1.1, 0, TAU); ctx.fill(); }
    }
    /* eyebrows */
    ctx.strokeStyle = '#1a0a04'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-11, cy - 12 - grin); ctx.quadraticCurveTo(-7.5, cy - 14 - grin, -4, cy - 12); ctx.moveTo(4, cy - 12); ctx.quadraticCurveTo(7.5, cy - 14 - grin, 11, cy - 12 - grin); ctx.stroke();
    /* grin */
    ctx.beginPath(); ctx.moveTo(-8, cy + 6); ctx.quadraticCurveTo(0, cy + 6 + 9 * grin, 8, cy + 6); ctx.quadraticCurveTo(0, cy + 8 + 3 * grin, -8, cy + 6); ctx.closePath(); ctx.fillStyle = '#3a0a10'; ctx.fill(); ctx.strokeStyle = '#1a0a04'; ctx.lineWidth = 1.4; ctx.stroke();
    if (grin > 0.5) { ctx.fillStyle = '#ff6f9c'; ctx.beginPath(); ctx.ellipse(0, cy + 10.5 * grin, 3.2, 1.8, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(-4, cy + 6.3, 8, 1.6); }
    /* sunglasses drop in from above */
    if (gl > 0) {
      const gy = cy - 3 - (1 - gl) * 30; ctx.globalAlpha = Math.min(1, gl * 1.6);
      ctx.fillStyle = '#111'; rr(ctx, -14, gy - 4.5, 12, 9, 3.5); ctx.fill(); rr(ctx, 2, gy - 4.5, 12, 9, 3.5); ctx.fill(); ctx.fillRect(-2.5, gy - 3, 5, 2);
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-14, gy - 2); ctx.lineTo(-20, gy - 4); ctx.moveTo(14, gy - 2); ctx.lineTo(20, gy - 4); ctx.stroke();
      ctx.fillStyle = 'rgba(255,111,156,.75)'; ctx.beginPath(); ctx.moveTo(-12, gy - 3); ctx.lineTo(-8, gy - 3); ctx.lineTo(-11, gy + 2); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(4, gy - 3); ctx.lineTo(8, gy - 3); ctx.lineTo(5, gy + 2); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    /* white glove thumbs up */
    const th = o.thumb || 0;
    if (th > 0) {
      ctx.save(); ctx.translate(22, cy + 6 - th * 8); ctx.rotate(-0.3 + (1 - th) * 0.8); ctx.scale(th, th);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1a0a04'; ctx.lineWidth = 1.5; rr(ctx, -5, -4, 10, 9, 3.5); ctx.fill(); ctx.stroke(); rr(ctx, -3, -11, 4.5, 9, 2.2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  /* golden foil ball (before it bursts) */
  function foilBall(ctx, x, y, r, spin) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(spin);
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, 1, 0, 0, r); g.addColorStop(0, '#fff6c8'); g.addColorStop(0.35, '#ffd84a'); g.addColorStop(1, '#a8740c');
    ctx.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, q = r * (0.92 + ((i * 7) % 5) * 0.025); ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#6a4a04'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.6 + i * r * 0.3, -r * 0.5); ctx.lineTo(-r * 0.4 + i * r * 0.25, r * 0.6); ctx.stroke(); }
    ctx.restore();
  }
  /* one 3D chocolate letter */
  function letter(ctx, ch, x, y, scale, glow) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.font = '700 38px "Fredoka", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    ctx.lineWidth = 7; ctx.strokeStyle = '#fff1dc'; ctx.strokeText(ch, 0, 0);
    for (let d = 7; d >= 1; d--) { ctx.fillStyle = d > 3 ? '#1e0c05' : '#3a1a0c'; ctx.fillText(ch, 0, d); }
    const g = ctx.createLinearGradient(0, -30, 0, 0); g.addColorStop(0, '#a8643a'); g.addColorStop(0.55, '#5e3016'); g.addColorStop(1, '#4a2210'); ctx.fillStyle = g; ctx.fillText(ch, 0, 0);
    ctx.save(); ctx.beginPath(); ctx.rect(-22, -33, 44, 9); ctx.clip(); ctx.fillStyle = 'rgba(255,230,200,.5)'; ctx.fillText(ch, 0, 0); ctx.restore();
    if (glow > 0) { ctx.globalAlpha = glow; ctx.fillStyle = '#fff1dc'; ctx.fillText(ch, 0, 0); ctx.globalAlpha = 1; }
    ctx.restore();
  }
  const letterX = i => { const step = 31.5; return VW() / 2 - step * (WORD.length - 1) / 2 + i * step; };
  const groupX = g => (letterX(g * 3) + letterX(g * 3 + 2)) / 2;
  const BASE = 196, TOPY = 158;   /* letter baseline; Freedo stands on the letters at TOPY */
  /* Freedo's position over time */
  function freedoPos(t) {
    const W = VW(), cx = W / 2;
    if (t < 1.45) return {x: cx, y: 120, sx: 1, sy: 1};
    if (t < 1.55) return {x: cx, y: 120, sx: 1, sy: 1};
    /* from the centre to group 0, then hop group by group */
    const pts = [{t: 1.55, x: cx, y: 120}].concat(HOPS.map(h => ({t: h.t, x: groupX(h.g), y: TOPY}))).concat([{t: 3.05, x: cx, y: 122}]);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (t <= b.t) {
        const k = clamp01((t - a.t) / (b.t - a.t)), hop = i === pts.length - 2 ? 62 : 34;
        const land = t > b.t - 0.06 ? (t - (b.t - 0.06)) / 0.06 : 0;
        return {x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * hop, sx: 1 - 0.12 * Math.sin(k * Math.PI) + land * 0.1, sy: 1 + 0.14 * Math.sin(k * Math.PI) - land * 0.12};
      }
    }
    const after = t - 3.05, sq = after < 0.25 ? Math.sin(after / 0.25 * Math.PI) * 0.22 : 0;
    return {x: pts[pts.length - 1].x, y: 122, sx: 1 + sq, sy: 1 - sq};
  }
  const mkDust = () => { dust = []; for (let i = 0; i < 80; i++) dust.push({x: Math.random() * 640, y: Math.random() * VH, s: 0.5 + Math.random() * 1.6, v: 0.12 + Math.random() * 0.3, p: Math.random() * TAU}); };

  const brand = G.brand = {
    t: 0, done: null, fired: {}, started: false, shake: 0, freedo,
    start(done) { this.t = 0; this.done = done; this.fired = {}; this.started = true; this.shake = 0; sparks = []; foil = []; drips = []; mkDust(); },
    skip() { if (this.started && this.t < DUR - 0.6) this.t = DUR - 0.6; },
    once(id, fn) { if (!this.fired[id]) { this.fired[id] = true; try { fn(); } catch (e) {} } },
    sfx(name, arg) { const s = A() && A().sfx; if (s && s[name]) s[name](arg); },
    update() {
      if (!this.started) return;
      this.t += 1 / 60; const t = this.t, W = VW(), cx = W / 2;
      if (t > 0.05) this.once('swell', () => this.sfx('brandSwell'));
      if (t > 0.42) this.once('drop', () => this.sfx('brandWhoosh'));
      if (t > 0.86) this.once('bounce', () => { this.sfx('brandClack', 0); this.shake = 2; });
      if (t > 1.1) this.once('burst', () => { this.sfx('brandBurst'); this.shake = 4; for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + (i - 3.5) * 0.42; foil.push({x: cx, y: 98, vx: Math.cos(a) * (2.4 + Math.random()), vy: Math.sin(a) * (2.4 + Math.random()) - 1, r: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.4, t: 1.4}); } for (let i = 0; i < 26; i++) sparks.push({x: cx + (Math.random() - 0.5) * 30, y: 98 + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 4, vy: -1 - Math.random() * 3, t: 0.6 + Math.random() * 0.5, r: 1 + Math.random() * 2}); });
      if (t > 1.5) this.once('blink', () => this.sfx('brandBlink'));
      HOPS.forEach((h, i) => { if (t > h.t) this.once('hop' + i, () => { this.sfx('brandClack', i * 3 + 2); this.shake = 2.5; for (let k = 0; k < 10; k++) drips.push({x: groupX(h.g) + (Math.random() - 0.5) * 70, y: BASE + 4, vx: (Math.random() - 0.5) * 3, vy: -2 - Math.random() * 3, t: 0.6 + Math.random() * 0.4, r: 1.2 + Math.random() * 2}); }); });
      if (t > 3.05) this.once('land', () => { this.sfx('brandImpact'); this.shake = 6; });
      if (t > 3.2) this.once('stamp', () => this.sfx('brandStamp'));
      if (t > 3.45) this.once('glasses', () => this.sfx('brandShing'));
      if (t > 3.55) this.once('voice', () => { try { const a = A(); if (a && a.playFile) a.playFile('p/voice/brand.mp3', 1.0); } catch (e) {} });
      if (t > 3.75) this.once('sparkle', () => this.sfx('brandSparkle'));
      if (t > 3.7 && t < 4.6 && sparks.length < 90) for (let k = 0; k < 2; k++) sparks.push({x: Math.random() * W, y: -6, vx: (Math.random() - 0.5) * 0.8, vy: 1 + Math.random() * 1.4, t: 1.6, r: 1.2 + Math.random() * 2.2, conf: true, c: ['#ffd84a', '#ff9eb0', '#fff1dc', '#9be7a5', '#8fd3ff'][k + Math.floor(t * 10) % 4]});
      for (const d of dust) { d.y -= d.v; d.x += Math.sin(t * 0.8 + d.p) * 0.15; if (d.y < -4) { d.y = VH + 4; d.x = Math.random() * 640; } }
      for (const d of drips) { d.t -= 1 / 60; d.vy += 0.2; d.x += d.vx; d.y += d.vy; } drips = drips.filter(d => d.t > 0);
      for (const f of foil) { f.t -= 1 / 60; f.vy += 0.12; f.x += f.vx; f.y += f.vy; f.r += f.vr; } foil = foil.filter(f => f.t > 0);
      for (const s of sparks) { s.t -= 1 / 60; s.x += s.vx; s.y += s.vy; if (!s.conf) s.vy += 0.05; } sparks = sparks.filter(s => s.t > 0 && s.y < VH + 10);
      if (this.shake > 0) this.shake = Math.max(0, this.shake - 0.3);
      if (t >= DUR && this.done) { const d = this.done; this.done = null; this.started = false; d(); }
    },
    frame(ctx) {
      const t = this.started ? this.t : -1, W = VW(), cx = W / 2, fr = (G.S && G.S.frames) || 0;
      const g = ctx.createRadialGradient(cx, VH * 0.45, 10, cx, VH * 0.5, 430); g.addColorStop(0, '#45200e'); g.addColorStop(0.5, '#1e0d06'); g.addColorStop(1, '#070302'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, VH);
      if (!dust.length) mkDust();
      for (const d of dust) { if (d.x > W) continue; ctx.globalAlpha = 0.2 + 0.45 * Math.abs(Math.sin((t < 0 ? performance.now() / 1000 : t) * 1.5 + d.p)); ctx.fillStyle = d.s > 1.6 ? '#ffe9a8' : '#d9a066'; ctx.beginPath(); ctx.arc(d.x, d.y, d.s * 0.8, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1;
      if (t < 0) {
        /* start screen: Freedo waiting, breathing */
        const now = performance.now() / 1000, br = Math.sin(now * 2.2) * 0.03;
        ctx.fillStyle = 'rgba(255,190,110,.10)'; ctx.beginPath(); ctx.arc(cx, VH / 2 - 26, 70, 0, TAU); ctx.fill();
        freedo(ctx, cx, VH / 2 + 8, 1.35, {sx: 1 + br, sy: 1 - br, eyes: (now % 3.6) < 0.12 ? 0.1 : 1, look: Math.sin(now * 0.7) * 0.8, grin: 0.8});
        const pulse = 0.7 + 0.3 * Math.sin(now * 3.2);
        ctx.font = '700 16px "Fredoka", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = pulse; ctx.fillStyle = '#ffd9b0'; ctx.fillText('Tippen oder Taste drücken', cx, VH / 2 + 46);
        ctx.font = '600 9px "Fredoka", sans-serif'; ctx.fillStyle = '#b9865c'; ctx.fillText('Ton an · Handy quer halten', cx, VH / 2 + 64); ctx.globalAlpha = 1;
        return;
      }
      ctx.save(); if (this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
      /* spotlight */
      ctx.fillStyle = 'rgba(255,200,120,' + (0.07 + 0.05 * ease(t, 1.1, 1.6)) + ')'; ctx.beginPath(); ctx.moveTo(cx - 20, 0); ctx.lineTo(cx + 20, 0); ctx.lineTo(cx + 150, VH); ctx.lineTo(cx - 150, VH); ctx.closePath(); ctx.fill();
      /* the foil ball drops, bounces and bursts */
      if (t > 0.4 && t < 1.12) {
        const k = clamp01((t - 0.4) / 0.46), yA = -30 + k * k * 128, after = t - 0.86, y = t < 0.86 ? yA : 98 - Math.sin(clamp01(after / 0.26) * Math.PI) * 14;
        const sq = t > 0.86 && after < 0.08 ? 0.22 : 0; ctx.save(); ctx.translate(cx, y); ctx.scale(1 + sq, 1 - sq); foilBall(ctx, 0, 0, 22, t * 5); ctx.restore();
      }
      for (const f of foil) { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.r); ctx.globalAlpha = clamp01(f.t); ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(9, -3); ctx.lineTo(4, 8); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#8a5a08'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); } ctx.globalAlpha = 1;
      /* chocolate letters rise out of splashes where Freedo lands */
      HOPS.forEach(h => {
        for (let j = 0; j < 3; j++) {
          const i = h.g * 3 + j, at = h.t + j * 0.04, k = ease(t, at, at + 0.32); if (k <= 0) continue;
          const rise = (1 - back(k)) * 40, sc = 0.6 + 0.4 * back(k), glow = Math.max(0, 0.7 - (t - at - 0.3) * 1.6);
          letter(ctx, WORD[i], letterX(i), BASE + rise, sc, k >= 1 ? glow : 0);
        }
        const sk = t - h.t; if (sk > 0 && sk < 0.5) { ctx.globalAlpha = 1 - sk / 0.5; ctx.fillStyle = '#4a2210'; ctx.beginPath(); ctx.ellipse(groupX(h.g), BASE + 6, 26 + sk * 60, 4 + sk * 6, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
      });
      for (const d of drips) { ctx.globalAlpha = clamp01(d.t * 2); ctx.fillStyle = '#5a2e14'; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1;
      /* GAMES stamped in gold foil */
      if (t > 3.15) {
        const k = elastic(ease(t, 3.15, 3.5)), sc = 2.4 - 1.4 * k; ctx.save(); ctx.translate(cx, 226); ctx.scale(sc, sc); ctx.globalAlpha = clamp01((t - 3.15) / 0.12);
        rr(ctx, -60, -12, 120, 24, 12); const gg = ctx.createLinearGradient(-60, -12, 60, 12); gg.addColorStop(0, '#a8740c'); gg.addColorStop(0.35, '#ffe27a'); gg.addColorStop(0.6, '#f0b830'); gg.addColorStop(1, '#8a5a08'); ctx.fillStyle = gg; ctx.fill(); ctx.strokeStyle = '#4a2a04'; ctx.lineWidth = 2; ctx.stroke();
        ctx.font = '700 15px "Fredoka", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#4a2a04'; ctx.fillText('G A M E S', 0, 1);
        ctx.restore(); ctx.globalAlpha = 1;
      }
      /* shine across the wordmark */
      if (t > 3.75 && t < 4.5) { const k = (t - 3.75) / 0.75, sx = letterX(0) - 40 + k * (letterX(11) - letterX(0) + 80); ctx.save(); ctx.beginPath(); ctx.rect(letterX(0) - 22, BASE - 38, letterX(11) - letterX(0) + 44, 48); ctx.clip(); const sg = ctx.createLinearGradient(sx - 26, 0, sx + 26, 0); sg.addColorStop(0, 'rgba(255,240,200,0)'); sg.addColorStop(0.5, 'rgba(255,240,200,.65)'); sg.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = sg; ctx.transform(1, 0, -0.45, 1, 0, 0); ctx.fillRect(sx - 26 + BASE * 0.45, BASE - 38, 52, 48); ctx.restore(); }
      /* Freedo */
      if (t >= 1.1) {
        const p = freedoPos(t), eyes = t < 1.5 ? 0.08 : (t < 1.58 ? (t - 1.5) / 0.08 : ((t > 4.3 && t < 4.38) ? 0.1 : 1));
        const look = t < 1.75 ? Math.sin((t - 1.5) * 12) * 0.9 : (t < 3.05 ? 0.6 : 0), pop = t < 1.3 ? back(clamp01((t - 1.1) / 0.2)) : 1;
        freedo(ctx, p.x, p.y + 40, 0.95 * pop, {sx: p.sx, sy: p.sy, eyes, look, grin: t > 3.05 ? 1 : 0.7, glasses: ease(t, 3.45, 3.62), thumb: ease(t, 3.6, 3.85), wink: false});
      }
      for (const s of sparks) { ctx.globalAlpha = clamp01(s.t * 1.6); if (s.conf) { ctx.fillStyle = s.c; ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.t * 6); ctx.fillRect(-s.r, -s.r * 0.5, s.r * 2, s.r); ctx.restore(); } else { star4(ctx, s.x, s.y, s.r); ctx.fillStyle = s.r > 2.4 ? '#fff' : '#ffd84a'; ctx.fill(); } } ctx.globalAlpha = 1;
      ctx.restore();
      const vg = ctx.createRadialGradient(cx, VH / 2, VH * 0.4, cx, VH / 2, W * 0.7); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, VH);
      const fade = ease(t, DUR - 0.6, DUR); if (fade > 0) { ctx.fillStyle = 'rgba(0,0,0,' + fade + ')'; ctx.fillRect(0, 0, W, VH); }
      if (t < 0.4) { ctx.fillStyle = 'rgba(0,0,0,' + (1 - ease(t, 0, 0.4)) + ')'; ctx.fillRect(0, 0, W, VH); }
    },
  };
})();
