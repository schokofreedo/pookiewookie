/* The Starway Home: the main menu's living backdrop. A dreamy sky tinted by the hero on show, slow light rays, drifting islands and
   hills, rising sparkles, and the hero on a glowing pedestal: idles, cheers now and then, flips when tapped, drops in when switched.
   The HTML dashboard (pookie.html #title) sits on top; both share the layout below (logical px, 270 high, G.VW wide). */
(function () {
  const G = window.PW = window.PW || {}, VH = 270, TAU = Math.PI * 2;
  const SIDE = 236, PAD = 10;                       /* the dashboard's right column width and margins, in logical px */
  const THEMES = {
    wookie: {sky: ['#24123f', '#6a2f7e', '#ff86a8', '#ffcf9e'], glow: '#ffb0c8', hill: ['#6a3478', '#47205e', '#2a1240'], rim: '#ff9eb0'},
    flitz: {sky: ['#0f2442', '#22607e', '#ff9152', '#ffd389'], glow: '#ffbf78', hill: ['#25586a', '#173f50', '#0c2834'], rim: '#ffb46a'},
    rexi: {sky: ['#0c2a26', '#1f6448', '#a8d864', '#fff09c'], glow: '#d4ff98', hill: ['#25664a', '#174a32', '#0b2e1e'], rim: '#9be7a5'},
    bolt: {sky: ['#080c2c', '#24247a', '#6450f0', '#86d0ff'], glow: '#8fd3ff', hill: ['#232a72', '#161b56', '#0b0e38'], rim: '#8fd3ff'},
    hollo: {sky: ['#120a2a', '#3a1a5a', '#a2408a', '#ff9a3a'], glow: '#ffa24a', hill: ['#3a1c52', '#24103a', '#140826'], rim: '#ffa24a'},
  };
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgb = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a === undefined ? 1 : a) + ')';
  const flat = th => [].concat(th.sky, [th.glow], th.hill, [th.rim]).map(hex);
  let cols = flat(THEMES.wookie), last = 0;
  const motes = [], stars = [], islands = [];
  for (let i = 0; i < 46; i++) motes.push({x: Math.random() * 640, y: Math.random() * VH, r: 0.6 + Math.random() * 2.6, v: 0.08 + Math.random() * 0.3, p: Math.random() * TAU, spark: Math.random() < 0.3});
  for (let i = 0; i < 70; i++) stars.push({x: Math.random() * 640, y: Math.random() * 150, r: 0.3 + Math.random() * 0.9, p: Math.random() * TAU});
  for (let i = 0; i < 4; i++) islands.push({x: 80 + i * 170 + Math.random() * 40, y: 36 + Math.random() * 34, s: 0.35 + Math.random() * 0.35, p: Math.random() * TAU, v: 0.04 + Math.random() * 0.05});

  const M = G.menu = {
    hero: 'wookie', locked: false, t: 0, jumpT: -1, dropT: -1, cheerT: 0,
    layout() { const W = G.VW || 480; return {heroX: PAD + (W - SIDE - 3 * PAD) / 2, feetY: 194, side: SIDE, pad: PAD}; },
    setHero(id, locked) { if (id !== this.hero) this.dropT = 0; this.hero = id; this.locked = !!locked; },
    poke() { if (this.jumpT < 0 && this.dropT < 0) { this.jumpT = 0; try { G.audio.sfx.doubleJump(); } catch (e) {} } },
    frame(ctx) {
      const now = performance.now() / 1000, dt = last ? Math.min(0.05, now - last) : 1 / 60; last = now; this.t += dt;
      const t = this.t, W = G.VW || 480, {heroX: hx, feetY: fy} = this.layout();
      /* colours glide toward the theme of the hero on show */
      const target = flat(THEMES[this.hero] || THEMES.wookie), k = 1 - Math.exp(-dt * 3.5);
      for (let i = 0; i < cols.length; i++) for (let j = 0; j < 3; j++) cols[i][j] += (target[i][j] - cols[i][j]) * k;
      const [s0, s1, s2, s3, glow, h0, h1, h2, rim] = cols;
      /* sky */
      const sg = ctx.createLinearGradient(0, 0, 0, VH); sg.addColorStop(0, rgb(s0)); sg.addColorStop(0.42, rgb(s1)); sg.addColorStop(0.78, rgb(s2)); sg.addColorStop(1, rgb(s3));
      ctx.fillStyle = sg; ctx.fillRect(0, 0, W, VH);
      for (const s of stars) { if (s.x > W) continue; ctx.globalAlpha = (0.25 + 0.55 * Math.abs(Math.sin(t * 1.3 + s.p))) * (1 - s.y / 170); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
      /* glow and slow rays behind the hero */
      const cy = fy - 52, gg = ctx.createRadialGradient(hx, cy, 4, hx, cy, 190); gg.addColorStop(0, rgb(glow, 0.75)); gg.addColorStop(0.35, rgb(glow, 0.28)); gg.addColorStop(1, rgb(glow, 0));
      ctx.fillStyle = gg; ctx.fillRect(0, 0, W, VH);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(hx, cy); ctx.rotate(t * 0.06);
      for (let i = 0; i < 12; i++) { ctx.rotate(TAU / 12); ctx.fillStyle = rgb(glow, 0.05 + 0.025 * Math.sin(t * 0.9 + i)); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-30, -700); ctx.lineTo(30, -700); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      /* floating islands far away */
      for (const is of islands) {
        is.x -= is.v; if (is.x < -60) is.x = W + 60; const x = is.x, y = is.y + Math.sin(t * 0.7 + is.p) * 3, s = is.s;
        ctx.fillStyle = rgb(h0, 0.4); ctx.beginPath(); ctx.ellipse(x, y, 26 * s, 6 * s, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - 24 * s, y); ctx.quadraticCurveTo(x - 8 * s, y + 10 * s, x, y + 26 * s); ctx.quadraticCurveTo(x + 8 * s, y + 10 * s, x + 24 * s, y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = rgb(rim, 0.35); ctx.beginPath(); ctx.ellipse(x, y - 1.5 * s, 22 * s, 3.4 * s, 0, Math.PI, TAU); ctx.fill();
        ctx.fillStyle = rgb(h0, 0.6); ctx.beginPath(); ctx.arc(x + 8 * s, y - 9 * s, 6 * s, 0, TAU); ctx.fill(); ctx.fillRect(x + 7 * s, y - 6 * s, 2 * s, 6 * s);
      }
      /* rolling hills, three layers */
      const hill = (base, amp, len, speed, col, ph) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, VH); for (let x = 0; x <= W + 8; x += 8) ctx.lineTo(x, base + Math.sin((x + t * speed) / len + ph) * amp + Math.sin((x + t * speed * 0.7) / (len * 0.43) + ph * 2) * amp * 0.35); ctx.lineTo(W, VH); ctx.closePath(); ctx.fill(); };
      hill(186, 12, 70, 6, rgb(h0, 0.85), 1); hill(212, 9, 52, 12, rgb(h1), 2.3); hill(240, 7, 40, 20, rgb(h2), 4.1);
      if (this.halloween && G.art && G.art.menuHalloween) { try { G.art.menuHalloween(ctx, W, t); } catch (e) {} }   /* seasonal event dressing: moon, bats, pumpkins */
      /* rising motes and sparkles */
      for (const m of motes) {
        m.y -= m.v; m.x += Math.sin(t * 0.8 + m.p) * 0.12; if (m.y < -6) { m.y = VH + 6; m.x = Math.random() * W; } if (m.x > W) continue;
        const a = 0.25 + 0.35 * Math.abs(Math.sin(t * 1.6 + m.p));
        if (m.spark) { ctx.fillStyle = 'rgba(255,255,255,' + a + ')'; const r = m.r * 1.6; ctx.beginPath(); ctx.moveTo(m.x, m.y - r); ctx.lineTo(m.x + r * 0.28, m.y - r * 0.28); ctx.lineTo(m.x + r, m.y); ctx.lineTo(m.x + r * 0.28, m.y + r * 0.28); ctx.lineTo(m.x, m.y + r); ctx.lineTo(m.x - r * 0.28, m.y + r * 0.28); ctx.lineTo(m.x - r, m.y); ctx.lineTo(m.x - r * 0.28, m.y - r * 0.28); ctx.closePath(); ctx.fill(); }
        else { ctx.fillStyle = rgb(glow, a * 0.6); ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.fill(); }
      }
      /* pedestal */
      const pr = 50, pth = 11, pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
      const pg = ctx.createRadialGradient(hx, fy + 4, 4, hx, fy + 4, pr * 1.6); pg.addColorStop(0, rgb(rim, 0.45)); pg.addColorStop(1, rgb(rim, 0)); ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(hx, fy + 6, pr * 1.6, pr * 0.5, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx - pr, fy); ctx.lineTo(hx - pr, fy + pth); ctx.ellipse(hx, fy + pth, pr, pr * 0.24, 0, Math.PI, 0, true); ctx.lineTo(hx + pr, fy); ctx.ellipse(hx, fy, pr, pr * 0.24, 0, 0, Math.PI, false); ctx.closePath(); ctx.fillStyle = '#1c0f2a'; ctx.fill();
      const side = ctx.createLinearGradient(hx - pr, 0, hx + pr, 0); side.addColorStop(0, 'rgba(255,255,255,.05)'); side.addColorStop(0.35, 'rgba(255,255,255,.22)'); side.addColorStop(1, 'rgba(0,0,0,.25)'); ctx.fillStyle = side; ctx.fill();
      const top = ctx.createLinearGradient(0, fy - pr * 0.24, 0, fy + pr * 0.24); top.addColorStop(0, '#fff6fb'); top.addColorStop(1, '#e7c8e6'); ctx.fillStyle = top; ctx.beginPath(); ctx.ellipse(hx, fy, pr, pr * 0.24, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgb(rim, 0.6 + 0.4 * pulse); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(hx, fy, pr - 4, pr * 0.24 - 1.6, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = rgb(rim, 0.25 * (1 - pulse)); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(hx, fy, pr + 6 + pulse * 8, pr * 0.24 + 2 + pulse * 2, 0, 0, TAU); ctx.stroke();
      /* the hero: drop-in when switched, flip when tapped, a cheer every few seconds */
      let oy = 0, pose = 'idle', rot = 0, sx = 1, sy = 1, mood;
      if (this.dropT >= 0) { this.dropT += dt; const d = this.dropT; if (d < 0.38) { const k2 = d / 0.38; oy = -180 * (1 - k2 * k2); pose = 'fall'; } else if (d < 0.6) { const k2 = (d - 0.38) / 0.22; sx = 1 + 0.22 * Math.sin(k2 * Math.PI); sy = 1 - 0.2 * Math.sin(k2 * Math.PI); mood = 'happy'; } else this.dropT = -1; }
      else if (this.jumpT >= 0) { this.jumpT += dt; const d = this.jumpT, D = 0.85; if (d < D) { const k2 = d / D; oy = -78 * 4 * k2 * (1 - k2); rot = k2 > 0.25 && k2 < 0.8 ? ((k2 - 0.25) / 0.55) * TAU : 0; pose = k2 < 0.5 ? 'jump' : 'fall'; } else this.jumpT = -1; }
      else { this.cheerT += dt; const c = this.cheerT % 7; if (c > 5.6) pose = 'victory'; }
      const sh = 1 + oy / 160; ctx.fillStyle = 'rgba(20,6,30,.35)'; ctx.beginPath(); ctx.ellipse(hx, fy + 1, 26 * Math.max(0.3, sh), 6 * Math.max(0.3, sh), 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(hx, fy + oy - 48); ctx.rotate(rot); ctx.translate(-hx, -(fy + oy - 48));
      try { G.draw.drawBearAt(ctx, hx, fy + oy, {scale: 4, facing: 1, pose, t, frame: t * 8, speed: 0, sx, sy, mood, hero: this.hero, outfit: (G.S && G.S.outfitOverride) || 'wiese'}); } catch (e) {}
      ctx.restore();
      /* soft vignette */
      const vg = ctx.createRadialGradient(W / 2, VH / 2, VH * 0.35, W / 2, VH / 2, W * 0.75); vg.addColorStop(0, 'rgba(10,0,20,0)'); vg.addColorStop(1, 'rgba(10,0,20,.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, VH);
    },
  };
})();
