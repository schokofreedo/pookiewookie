/* Pookiewookie: the publisher intro. "Schokofreedo Games": a drop of chocolate falls, splashes into a glossy chocolate bar with a bite,
   the wordmark pops in letter by letter, a shine sweeps across, sparkles, fade. Also draws the start screen while the game waits for the first tap. */
(function () {
  const G = window.PW = window.PW || {}, VW = 480, VH = 270, TAU = Math.PI * 2;
  const A = () => G.audio;
  const ease = (t, a, b) => { const k = Math.max(0, Math.min(1, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
  const back = k => { const s = 1.70158; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); };
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function starPath(ctx, x, y, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.42 : r; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } ctx.closePath(); }
  const WORD = 'SCHOKOFREEDO', DUR = 3.6;
  let sparks = [];

  const brand = G.brand = {
    t: 0, done: null, fired: {}, started: false,
    start(done) { this.t = 0; this.done = done; this.fired = {}; this.started = true; sparks = []; for (let i = 0; i < 18; i++) sparks.push({a: Math.random() * TAU, d: 30 + Math.random() * 60, s: 1 + Math.random() * 2, p: Math.random()}); },
    skip() { if (this.started && this.t < DUR - 0.5) this.t = DUR - 0.5; },
    cue(name, at) { if (this.t >= at && !this.fired[name]) { this.fired[name] = true; const s = A() && A().sfx; if (s && s[name]) s[name](this.fired.bellN = (this.fired.bellN || 0)); } },
    update() {
      if (!this.started) return;
      this.t += 1 / 60; const t = this.t;
      this.cue('brandDrop', 0.05); this.cue('brandSplash', 0.62);
      for (let i = 0; i < WORD.length; i++) { const at = 1.0 + i * 0.075; if (t >= at && !this.fired['l' + i]) { this.fired['l' + i] = true; if (i % 3 === 0 && A()) A().sfx.brandBell(i / 3); } }
      this.cue('brandShine', 2.15); this.cue('brandChord', 2.2);
      if (t >= DUR && this.done) { const d = this.done; this.done = null; this.started = false; d(); }
    },
    /* the bar: rounded chocolate slab, 2x2 grooves, gloss, a bite, cream S */
    bar(ctx, x, y, s, bite) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.save(); if (bite > 0) { ctx.beginPath(); ctx.rect(-40, -40, 80, 80); ctx.arc(24, -22, 16 * bite, 0, TAU, true); ctx.clip('evenodd'); }
      rr(ctx, -28, -28, 56, 56, 9); ctx.fillStyle = '#2a1308'; ctx.fill();
      rr(ctx, -25, -25, 50, 50, 7); const g = ctx.createLinearGradient(-25, -25, 25, 25); g.addColorStop(0, '#7a4425'); g.addColorStop(0.5, '#4a2512'); g.addColorStop(1, '#3a1a0c'); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(0, 25); ctx.moveTo(-25, 0); ctx.lineTo(25, 0); ctx.stroke();
      for (const [px, py] of [[-12.5, -12.5], [12.5, -12.5], [-12.5, 12.5], [12.5, 12.5]]) { rr(ctx, px - 9, py - 9, 18, 18, 4); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill(); rr(ctx, px - 8, py - 8, 16, 5, 2.5); ctx.fillStyle = 'rgba(255,230,200,.22)'; ctx.fill(); }
      ctx.restore();
      if (bite > 0) { ctx.strokeStyle = '#1a0a04'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(24, -22, 16 * bite, Math.PI * 0.55, Math.PI * 1.45); ctx.stroke(); }
      ctx.font = '700 34px "Fredoka", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#2a1308'; ctx.lineWidth = 6; ctx.strokeText('S', -1, 3); ctx.fillStyle = '#fff1dc'; ctx.fillText('S', -1, 3);
      ctx.restore();
    },
    frame(ctx) {
      const t = this.started ? this.t : -1;
      const g = ctx.createRadialGradient(VW / 2, VH * 0.45, 20, VW / 2, VH * 0.45, 360); g.addColorStop(0, '#2b1409'); g.addColorStop(1, '#0a0503'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      if (t < 0) {
        /* start screen: pulsing prompt */
        const pulse = 0.75 + 0.25 * Math.sin(performance.now() / 300);
        this.bar(ctx, VW / 2, VH / 2 - 26, 0.9, 1); ctx.globalAlpha = pulse;
        ctx.font = '700 15px "Fredoka", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffd9b0'; ctx.fillText('Tippen oder Taste drücken', VW / 2, VH / 2 + 34);
        ctx.font = '600 9px "Fredoka", sans-serif'; ctx.fillStyle = '#b9865c'; ctx.fillText('Ton an · Handy quer halten', VW / 2, VH / 2 + 52); ctx.globalAlpha = 1;
        return;
      }
      const cx = VW / 2, barY = 104;
      /* drop and puddle */
      if (t < 0.72) { const k = ease(t, 0.05, 0.62), y = -20 + k * k * (barY + 20); ctx.fillStyle = '#5a2e14'; ctx.beginPath(); ctx.moveTo(cx, y - 14); ctx.bezierCurveTo(cx + 8, y - 2, cx + 7, y + 8, cx, y + 8); ctx.bezierCurveTo(cx - 7, y + 8, cx - 8, y - 2, cx, y - 14); ctx.fill(); }
      if (t > 0.6) { const k = ease(t, 0.6, 1.4); ctx.globalAlpha = 0.5 * (1 - k * 0.6); ctx.fillStyle = '#4a2512'; ctx.beginPath(); ctx.ellipse(cx, barY + 34, 20 + k * 110, 4 + k * 10, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; if (k < 1) { ctx.strokeStyle = 'rgba(255,214,170,' + (0.8 * (1 - k)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, barY + 34, 10 + k * 150, 3 + k * 16, 0, 0, TAU); ctx.stroke(); } }
      /* the bar pops in and takes a bite */
      if (t > 0.62) { const k = ease(t, 0.62, 1.0), s = back(k) * 1.0, bite = ease(t, 1.5, 1.75); this.bar(ctx, cx, barY, Math.max(0.01, s), bite); if (bite > 0 && bite < 1) for (let i = 0; i < 5; i++) { const a = -0.9 + i * 0.35, d = 22 + bite * 30; ctx.fillStyle = '#5a2e14'; ctx.beginPath(); ctx.arc(cx + 24 + Math.cos(a) * d, barY - 22 + Math.sin(a) * d, 2.5 * (1 - bite), 0, TAU); ctx.fill(); } }
      /* wordmark */
      ctx.save(); ctx.font = '700 36px "Fredoka", sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
      const widths = WORD.split('').map(ch => ctx.measureText(ch).width), total = widths.reduce((a, b) => a + b, 0) + (WORD.length - 1) * 1.5;
      let x = cx - total / 2, textY = 182;
      for (let i = 0; i < WORD.length; i++) {
        const at = 1.0 + i * 0.075, k = ease(t, at, at + 0.28), sc = k > 0 ? back(k) : 0, w = widths[i], lx = x + w / 2;
        if (k > 0) { ctx.save(); ctx.translate(lx, textY); ctx.scale(sc, sc); const grad = ctx.createLinearGradient(0, -18, 0, 18); grad.addColorStop(0, '#9a5a2e'); grad.addColorStop(0.5, '#5a2e14'); grad.addColorStop(1, '#2a1308'); ctx.strokeStyle = '#fff1dc'; ctx.lineWidth = 5; ctx.strokeText(WORD[i], 0, 0); ctx.fillStyle = grad; ctx.fillText(WORD[i], 0, 0); ctx.restore(); }
        x += w + 1.5;
      }
      ctx.restore();
      if (t > 2.0) { const k = ease(t, 2.0, 2.5); ctx.globalAlpha = k; ctx.font = '700 15px "Fredoka", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffd84a'; const txt = 'G A M E S'; ctx.fillText(txt, cx, 214 + (1 - k) * 8); ctx.fillStyle = 'rgba(255,216,74,.5)'; ctx.fillRect(cx - 70, 228, 140 * k, 1.5); ctx.globalAlpha = 1; }
      /* shine sweep across the wordmark */
      if (t > 2.15 && t < 2.9) { const k = (t - 2.15) / 0.75, sx = cx - 160 + k * 320; ctx.save(); ctx.beginPath(); ctx.rect(cx - 150, textY - 22, 300, 44); ctx.clip(); const sg = ctx.createLinearGradient(sx - 30, 0, sx + 30, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,.55)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sg; ctx.save(); ctx.transform(1, 0, -0.5, 1, 0, 0); ctx.fillRect(sx - 30 + textY * 0.5, textY - 22, 60, 44); ctx.restore(); ctx.restore(); }
      /* sparkles around the bar */
      if (t > 1.7) for (const s of sparks) { const life = ((t - 1.7) * 0.8 + s.p) % 1, r = s.s * Math.sin(life * Math.PI); starPath(ctx, cx + Math.cos(s.a) * s.d * (0.6 + life * 0.6), barY + Math.sin(s.a) * s.d * 0.55 * (0.6 + life * 0.6), Math.max(0.1, r * 1.8)); ctx.fillStyle = s.p > 0.5 ? '#ffd84a' : '#fff1dc'; ctx.fill(); }
      /* fade out */
      const fade = ease(t, DUR - 0.5, DUR); if (fade > 0) { ctx.fillStyle = 'rgba(0,0,0,' + fade + ')'; ctx.fillRect(0, 0, VW, VH); }
    },
  };
})();
