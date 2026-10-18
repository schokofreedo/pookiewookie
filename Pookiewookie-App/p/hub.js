/* The Starway Home: after picking a world on the globe, Toffo skydives through the clouds (the dive) and lands in that world's hub,
   a themed warp room with four portals (drawn by p/hubart.js); walk to a portal and stomp into it (or press up) to start the level. */
(function () {
  const G = window.PW = window.PW || {}, T = 16, VH = 270, MH = 15;
  const S = () => G.S, P = () => G.P, A = () => G.audio, E = () => G.eng;
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de);
  const TAU = Math.PI * 2;
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  const font = (ctx, px) => { ctx.font = 'bold ' + px + 'px "Fredoka", sans-serif'; ctx.textBaseline = 'middle'; };
  const fitPx = (ctx, t, px, maxW) => { font(ctx, px); const w = ctx.measureText(t).width; return w > maxW ? px * maxW / w : px; };   /* shrink long (English) texts to fit their box */
  const outlined = (ctx, t, x, y, px, col, align) => { font(ctx, px); ctx.textAlign = align || 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = px * 0.35; ctx.strokeStyle = 'rgba(74,34,58,.85)'; ctx.strokeText(t, x, y); ctx.fillStyle = col; ctx.fillText(t, x, y); };

  /* ---------------- the dive ---------------- */
  const dive = G.dive = {
    t: 0, W: null, wi: 0, clouds: [], done: null, spin: 0,
    start(wi, done) {
      this.wi = wi; this.W = G.WORLDS[wi]; this.t = 0; this.done = done; this.spin = 0; S().outfit = this.W.key;
      this.rocketMode = false; this.launching = !!this.W.rocket;
      if (this.launching) { G.rocket.launch(wi, done); return; }   /* space: the rocket lifts off instead of the cloud dive */
      this.clouds = []; for (let i = 0; i < 26; i++) this.clouds.push({x: Math.random() * G.VW, y: Math.random() * VH * 1.4 - VH * 0.2, s: 0.5 + Math.random() * 1.2, z: 0.4 + Math.random() * 0.9, w: 40 + Math.random() * 60});
      if (A()) { A().sfx.dive(); } G.flow.speak('Here I come, Mallo!', {happy: true});
    },
    update() {
      if (this.rocketMode) { G.rocket.update(); return; }
      if (this.launching) { G.rocket.launchUpdate(); return; }
      this.t += 1 / 60; const sp = 3 + Math.min(6, this.t * 2.5);
      for (const c of this.clouds) { c.y -= sp * c.z; if (c.y < -60) { c.y = VH + 40 + Math.random() * 40; c.x = Math.random() * G.VW; } }
      if (this.t >= 2.6 && this.done) { const d = this.done; this.done = null; d(); }
    },
    frame(ctx) {
      if (this.rocketMode) { G.rocket.frame(ctx); return; }
      if (this.launching) { G.rocket.launchFrame(ctx); return; }
      const W = this.W, t = this.t, k = Math.min(1, t / 2.6);
      const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, W.sky[0]); g.addColorStop(0.6, W.sky[1]); g.addColorStop(1, W.sky[2]); ctx.fillStyle = g; ctx.fillRect(0, 0, G.VW, VH);
      /* sun and far clouds */
      ctx.beginPath(); ctx.arc(400, 46 + k * 120, 22, 0, TAU); ctx.fillStyle = W.sun; ctx.fill(); ctx.beginPath(); ctx.arc(400, 46 + k * 120, 34, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (const c of this.clouds) { if (c.z > 0.9) continue; ctx.globalAlpha = 0.55 + c.z * 0.3; ctx.beginPath(); ctx.ellipse(c.x, c.y, c.w * c.s * 0.5, 10 * c.s, 0, 0, TAU); ctx.ellipse(c.x - c.w * 0.2, c.y + 3, c.w * c.s * 0.3, 8 * c.s, 0, 0, TAU); ctx.ellipse(c.x + c.w * 0.22, c.y + 2, c.w * c.s * 0.32, 9 * c.s, 0, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
      /* speed lines */
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 14; i++) { const x = (i * 97 + Math.floor(t * 400 * (1 + i % 3)) % 1000) % G.VW, y0 = ((i * 53 + t * 900) % (VH + 80)) - 40; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + 18 + (i % 3) * 8); ctx.stroke(); }
      /* Toffo, big, belly down, scarf streaming up; slight sway and spin */
      const sway = Math.sin(t * 3) * 6, rot = Math.sin(t * 1.7) * 0.12;
      ctx.save(); ctx.translate(G.VW / 2 + sway, VH * 0.5 + Math.sin(t * 2.2) * 4); ctx.rotate(rot);
      ctx.beginPath(); ctx.ellipse(0, 54, 30, 8, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fill();
      if (G.draw && G.draw.drawBearAt) G.draw.drawBearAt(ctx, 0, 36, {scale: 3.4, facing: 1, frame: t * 8, pose: 'skydive', outfit: W.key, t});
      else { ctx.fillStyle = '#b07c44'; ctx.fillRect(-20, -10, 40, 46); }
      ctx.restore();
      /* near clouds in front */
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      for (const c of this.clouds) { if (c.z <= 0.9) continue; ctx.beginPath(); ctx.ellipse(c.x, c.y, c.w * c.s * 0.7, 14 * c.s, 0, 0, TAU); ctx.ellipse(c.x - c.w * 0.3, c.y + 4, c.w * c.s * 0.4, 11 * c.s, 0, 0, TAU); ctx.ellipse(c.x + c.w * 0.3, c.y + 3, c.w * c.s * 0.42, 12 * c.s, 0, 0, TAU); ctx.fill(); }
      /* title and fade-out */
      outlined(ctx, tr('Welt ', 'World ') + (this.wi + 1), G.VW / 2, VH - 48, 15, '#ffd84a'); outlined(ctx, W.name, G.VW / 2, VH - 28, 12, '#fff');
      const fade = Math.max(0, (t - 2.15) / 0.45); if (fade > 0) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, fade) + ')'; ctx.fillRect(0, 0, G.VW, VH); }
    },
  };

  /* ---------------- the hub: the warp room ---------------- */
  const WARP_T = 0.72;   /* seconds Toffo is pulled into the portal before the level starts */
  const hub = G.hub = {
    wi: 0, near: -1, onStart: null, signCols: [], signRows: [], landed: false, labelT: 0, warp: null, sel: [0, 0, 0, 0],
    build(wi) {
      const W = G.WORLDS[wi], cols = [], empty = () => Array(MH).fill('-');
      const lay = (G.hubart && G.hubart.layout) ? G.hubart.layout(W.key) : {tops: Array(52).fill(13), signCols: [10, 20, 30, 40], deco: [[8, 'p'], [14, 'h'], [25, 'd'], [35, 'p'], [44, 'h']]};
      const tops = lay.tops;
      for (let x = 0; x < 52; x++) { const c = empty(); for (let y = tops[x]; y < MH; y++) c[y] = '#'; cols.push(c); }
      cols[3][tops[3] - 1] = 'R'; cols[1][tops[1] - 1] = 'Q'; cols[6][tops[6] - 1] = 'Y';   /* start, cottage / station module, Mallo's mailbox */
      this.signCols = lay.signCols.slice(); this.signRows = this.signCols.map(cx => tops[cx] - 1); this.signCols.forEach((cx, i) => { cols[cx][tops[cx] - 1] = String(i + 1); });
      for (const [x, ch] of lay.deco) { if (cols[x][tops[x] - 1] === '-') cols[x][tops[x] - 1] = ch; }
      cols[46][tops[46] - 1] = 'U';
      return {world: wi, index: 0, name: 'Hub ' + W.name, sub: W.name, par: 999, tower: false, cols, bonus: null, hub: true};
    },
    enter(wi, fromSky) {
      this.wi = wi; this.near = -1; this.landed = !fromSky; this.labelT = 0; this.warp = null; this.sel = [0, 0, 0, 0]; this.wasPound = false; this.prevGround = false;
      const S0 = S(); S0.wi = wi; const W = G.WORLDS[wi];
      if (W.rocket && fromSky) { fromSky = false; this.landed = true; G.flow.banner(tr('Welt ', 'World ') + (wi + 1) + ' · ' + W.name, 2.4, tr('Raumstation: Teleporter 1 startet die Rakete', 'Space station: teleporter 1 launches the rocket')); }
      E().load(wi, 0, false, this.build(wi)); S0.mode = 'hub'; S0.time = 999; S0.outfit = S0.outfitOverride || W.key;
      const p = P(); if (fromSky) { p.x = 3 * T + 2; p.y = -70; p.vy = 2.5; p.skydive = true; } else { p.skydive = false; }
      S0.cam = 0; if (A()) { A().setWorld(G.WORLDS[wi].music); A().startMusic(); }
    },
    /* the warp: Toffo is pulled into the portal (p/hubart.js draws it), input is ignored, then the level starts */
    startWarp(i) {
      const p = P(), input = G.input; input.up = false; input.jump = false; input.jumpEdge = false; input.jumpKeyEdge = false; input.downEdge = false;
      this.warp = {i, idx: this.wi * 4 + i, t: 0, dur: WARP_T, x: p.x, y: p.y, cx: p.x + p.w / 2, fy: p.y + p.h, facing: p.facing || 1};
      p.hidden = true; p.vx = 0; p.vy = 0; p.pound = false; p.poundT = 0; p.flip = 0; this.near = i;
      if (A()) { A().sfx.select(); this.warpSfx(); }
    },
    warpSfx() {
      const a = A(); if (!a || !a.ctx) return;
      a.noise(WARP_T, {type: 'bandpass', freq: 240, freqTo: 3600, q: 0.9, gain: 0.16});
      a.tone(170, WARP_T, {type: 'sawtooth', slide: 1500, slideDur: WARP_T - 0.08, gain: 0.05}); a.tone(340, WARP_T, {type: 'triangle', slide: 3000, slideDur: WARP_T - 0.08, gain: 0.05});
      [1047, 1319, 1568, 2093, 2637].forEach((f, i) => a.bell(f, 0.35, 0.08, 0.4 + i * 0.05));
      a.noise(0.3, {type: 'highpass', freq: 3000, gain: 0.12, delay: WARP_T - 0.1}); a.tone(1300, 0.3, {type: 'sine', slide: 260, gain: 0.1, delay: WARP_T - 0.06});
    },
    update() {
      const p = P(), s = S(), input = G.input;
      if (p.skydive) { if (p.onGround) { p.skydive = false; s.shake = 4; A().sfx.land(); E().puff(p.x + 6, p.y + p.h, 10, '#fff'); this.landed = true; G.flow.banner(tr('Welt ', 'World ') + (this.wi + 1) + ' · ' + G.WORLDS[this.wi].name, 2.2, input.touchMode ? tr('Lauf zu einem Portal und stampf hinein', 'Walk to a portal and stomp into it') : tr('Lauf zu einem Portal und drück ↑', 'Walk to a portal and press ↑')); } return; }
      this.labelT += 1 / 60;
      if (this.warp) {
        const w = this.warp; w.t += 1 / 60; p.x = w.x; p.y = w.y; p.vx = 0; p.vy = 0; p.hidden = true; p.pound = false; p.flip = 0;
        input.left = false; input.right = false; input.up = false; input.down = false; input.jump = false; input.jumpEdge = false; input.jumpKeyEdge = false; input.downEdge = false; input.runEdge = false;
        if (w.t >= w.dur) { this.warp = null; p.hidden = false; if (this.onStart) this.onStart(w.idx); }
        return;
      }
      /* in front of a portal (they are wider than the old signs); prevGround lets ↑ warp in the very frame the key also starts a hop */
      let near = -1; this.signCols.forEach((cx, i) => { if (Math.abs(p.x + 6 - (cx * T + 8)) < 22 && (p.onGround || p.pound || this.prevGround)) near = i; }); this.prevGround = p.onGround;
      if (near !== this.near) { this.near = near; if (near >= 0 && p.onGround) A().sfx.tick(); }
      for (let i = 0; i < 4; i++) this.sel[i] += ((near === i ? 1 : 0) - this.sel[i]) * 0.16;
      /* a ground pound into the portal starts the warp (↑ on a keyboard works too) */
      const pounded = this.wasPound && !p.pound && p.onGround; this.wasPound = p.pound;
      if (near >= 0 && this.onStart && (pounded || (input.up && !input.touchMode))) { this.startWarp(near); return; }
      /* the mailbox: read Mallo's letter */
      const nearMail = Math.abs(p.x + 6 - (6 * T + 8)) < 14 && p.onGround; this.nearMail = nearMail;
      if (nearMail && this.onLetter && (pounded || (input.up && !input.touchMode)) && !this.mailCd) { this.mailCd = 30; input.up = false; this.onLetter(this.wi); }
      if (this.mailCd > 0) this.mailCd--;
    },
    tile(ctx, ch, cx, cy, x, y, fr) {
      const i = +ch - 1; if (!(i >= 0 && i < 4)) return false;
      if (G.hubart) return true;   /* the portals are drawn by p/hubart.js behind Toffo (G.art.world) */
      /* fallback without the art file: the old wooden signpost */
      const tower = i === 3, sel = this.near === i, bob = sel ? Math.sin(fr * 0.2) * 1.5 : 0;
      ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x + 7, y + 2, 3, 14);
      rr(ctx, x - 6, y - 12 + bob, 28, 16, 4); ctx.fillStyle = tower ? '#7a3b57' : (sel ? '#ff6f9c' : '#ffb3c6'); ctx.fill(); ctx.strokeStyle = '#7a3b57'; ctx.lineWidth = 1; ctx.stroke();
      font(ctx, 10); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(tower ? '♜' : String(i + 1), x + 8, y - 4 + bob);
      const st = hub.starsFor ? hub.starsFor(this.wi * 4 + i) : [false, false, false];
      st.forEach((b, k) => { ctx.beginPath(); const sx = x + 1 + k * 7, sy = y + 8; for (let q = 0; q < 10; q++) { const a = -Math.PI / 2 + q * Math.PI / 5, rad = q % 2 ? 1.1 : 2.6; ctx.lineTo(sx + Math.cos(a) * rad, sy + Math.sin(a) * rad); } ctx.closePath(); ctx.fillStyle = b ? '#ffd84a' : 'rgba(255,255,255,.55)'; ctx.fill(); });
      if (sel) { ctx.beginPath(); ctx.moveTo(x + 8, y - 20 + bob); ctx.lineTo(x + 3, y - 26 + bob); ctx.lineTo(x + 13, y - 26 + bob); ctx.closePath(); ctx.fillStyle = '#ffd84a'; ctx.fill(); }
      return true;
    },
    hud(ctx, fr) {
      const W = G.WORLDS[this.wi];
      const ty = G.input.touchMode ? 30 : 6;   /* below the pause button on phones */
      rr(ctx, G.VW / 2 - 110, ty, 220, 22, 11); ctx.fillStyle = 'rgba(74,34,58,.72)'; ctx.fill();
      { const tt = tr('Welt ', 'World ') + (this.wi + 1) + ' · ' + W.name; outlined(ctx, tt, G.VW / 2, ty + 11, fitPx(ctx, tt, 11, 206), '#ffd84a'); }
      if (this.warp) {
        const name = W.levels[this.warp.i], k = Math.min(1, this.warp.t / 0.2);
        rr(ctx, G.VW / 2 - 100, ty + 28, 200, 30, 10); ctx.fillStyle = 'rgba(255,255,255,' + 0.92 * k + ')'; ctx.fill(); ctx.strokeStyle = 'rgba(255,158,176,' + k + ')'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.globalAlpha = k; const nt = (this.warp.i + 1) + '. ' + name; font(ctx, fitPx(ctx, nt, 10, 188)); ctx.textAlign = 'center'; ctx.fillStyle = '#7a3b57'; ctx.fillText(nt, G.VW / 2, ty + 37);
        const wt = tr('Warp! Los geht’s …', 'Warp! Here we go …'); font(ctx, fitPx(ctx, wt, 7.5, 188)); ctx.fillStyle = '#b06a85'; ctx.fillText(wt, G.VW / 2, ty + 49); ctx.globalAlpha = 1;
      } else if (this.near >= 0) {
        const name = W.levels[this.near], done = hub.doneFor ? hub.doneFor(this.wi * 4 + this.near) : false;
        rr(ctx, G.VW / 2 - 100, ty + 28, 200, 30, 10); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill(); ctx.strokeStyle = '#ff9eb0'; ctx.lineWidth = 1.5; ctx.stroke();
        const nt = (this.near + 1) + '. ' + name + (done ? '  ✓' : ''); font(ctx, fitPx(ctx, nt, 10, 188)); ctx.textAlign = 'center'; ctx.fillStyle = '#7a3b57'; ctx.fillText(nt, G.VW / 2, ty + 37);
        const ht = G.input.touchMode ? tr('Springen, dann ▼ Stampfer ins Portal', 'Jump, then ▼ stomp into the portal') : tr('↑ oder Stampfer (Sprung + ↓) ins Portal', '↑ or stomp (jump + ↓) into the portal'); font(ctx, fitPx(ctx, ht, 7.5, 188)); ctx.fillStyle = '#b06a85'; ctx.fillText(ht, G.VW / 2, ty + 49);
      } else if (this.nearMail) { rr(ctx, G.VW / 2 - 90, ty + 28, 180, 24, 10); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill(); ctx.strokeStyle = '#ff9eb0'; ctx.lineWidth = 1.5; ctx.stroke(); const mt = tr('Mallos Brief: ', "Mallo's letter: ") + (G.input.touchMode ? tr('springen + ▼ stampfen', 'jump + ▼ stomp') : tr('↑ oder stampfen', '↑ or stomp')); font(ctx, fitPx(ctx, mt, 9, 168)); ctx.textAlign = 'center'; ctx.fillStyle = '#7a3b57'; ctx.fillText(mt, G.VW / 2, ty + 40); }
      else if (this.landed) { const h = G.input.touchMode ? tr('◀ ▶ laufen · ins Portal stampfen = Level', '◀ ▶ walk · stomp into a portal = level') : tr('← → laufen · Portal = Level · Esc = Globus', '← → walk · portal = level · Esc = globe'); font(ctx, 7.5); ctx.textAlign = 'center'; ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(74,34,58,.7)'; ctx.strokeText(h, G.VW / 2, ty + 34); ctx.fillStyle = '#fff'; ctx.fillText(h, G.VW / 2, ty + 34); }
    },
  };
})();
