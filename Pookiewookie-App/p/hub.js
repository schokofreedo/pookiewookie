/* The Starway Home: after picking a world on the globe, Toffo skydives through the clouds (the dive) and lands in that world's hub,
   a small themed scene with four signposts; walk to a sign and press up to start the level. */
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

  /* ---------------- the hub ---------------- */
  const hub = G.hub = {
    wi: 0, near: -1, onStart: null, signCols: [], landed: false, labelT: 0,
    build(wi) {
      const W = G.WORLDS[wi], cols = [], empty = () => Array(MH).fill('-');
      const deco = ['p', 'h', 'd', 'h', 'p', 'd'];
      for (let x = 0; x < 52; x++) { const c = empty(); c[13] = '#'; c[14] = '#'; cols.push(c); }
      cols[3][12] = 'R'; cols[1][12] = 'Q'; cols[6][12] = 'Y';   /* Mallo's mailbox */
      this.signCols = [10, 20, 30, 40]; this.signCols.forEach((cx, i) => { cols[cx][12] = String(i + 1); });
      let di = 0; for (let x = 8; x < 50; x += 3) { if (this.signCols.some(s => Math.abs(s - x) < 2) || x === 46) continue; if ((x * 7) % 5 < 3) cols[x][12] = deco[di++ % deco.length]; }
      cols[46][12] = 'U';
      return {world: wi, index: 0, name: 'Hub ' + W.name, sub: W.name, par: 999, tower: false, cols, bonus: null, hub: true};
    },
    enter(wi, fromSky) {
      this.wi = wi; this.near = -1; this.landed = !fromSky; this.labelT = 0;
      const S0 = S(); S0.wi = wi; const W = G.WORLDS[wi];
      if (W.rocket && fromSky) { fromSky = false; this.landed = true; G.flow.banner(tr('Welt ', 'World ') + (wi + 1) + ' · ' + W.name, 2.4, tr('Raumstation: Schild 1 startet die Rakete', 'Space station: sign 1 launches the rocket')); }
      E().load(wi, 0, false, this.build(wi)); S0.mode = 'hub'; S0.time = 999; S0.outfit = S0.outfitOverride || W.key;
      const p = P(); if (fromSky) { p.x = 3 * T + 2; p.y = -70; p.vy = 2.5; p.skydive = true; } else { p.skydive = false; }
      S0.cam = 0; if (A()) { A().setWorld(G.WORLDS[wi].music); A().startMusic(); }
    },
    update() {
      const p = P(), s = S(), input = G.input;
      if (p.skydive) { if (p.onGround) { p.skydive = false; s.shake = 4; A().sfx.land(); E().puff(p.x + 6, p.y + p.h, 10, '#fff'); this.landed = true; G.flow.banner(tr('Welt ', 'World ') + (this.wi + 1) + ' · ' + G.WORLDS[this.wi].name, 2.2, tr('Lauf zu einem Schild und drück ↑', 'Walk to a sign and press ↑')); } return; }
      this.labelT += 1 / 60;
      let near = -1; this.signCols.forEach((cx, i) => { if (Math.abs(p.x + 6 - (cx * T + 8)) < 16 && (p.onGround || p.pound)) near = i; });
      if (near !== this.near) { this.near = near; if (near >= 0 && p.onGround) A().sfx.tick(); }
      /* a ground pound onto the signpost starts the level (↑ on a keyboard works too) */
      const pounded = this.wasPound && !p.pound && p.onGround; this.wasPound = p.pound;
      if (near >= 0 && this.onStart && (pounded || (input.up && !input.touchMode))) { const idx = this.wi * 4 + near; input.up = false; input.jump = false; input.jumpEdge = false; input.jumpKeyEdge = false; this.onStart(idx); }
      /* the mailbox: read Mallo's letter */
      const nearMail = Math.abs(p.x + 6 - (6 * T + 8)) < 14 && p.onGround; this.nearMail = nearMail;
      if (nearMail && this.onLetter && (pounded || (input.up && !input.touchMode)) && !this.mailCd) { this.mailCd = 30; input.up = false; this.onLetter(this.wi); }
      if (this.mailCd > 0) this.mailCd--;
    },
    tile(ctx, ch, cx, cy, x, y, fr) {
      const i = +ch - 1; if (!(i >= 0 && i < 4)) return false;
      const W = G.WORLDS[this.wi], tower = i === 3, sel = this.near === i, bob = sel ? Math.sin(fr * 0.2) * 1.5 : 0;
      /* wooden signpost with a number plate */
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
      if (this.near >= 0) {
        const name = W.levels[this.near], done = hub.doneFor ? hub.doneFor(this.wi * 4 + this.near) : false;
        rr(ctx, G.VW / 2 - 100, ty + 28, 200, 30, 10); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill(); ctx.strokeStyle = '#ff9eb0'; ctx.lineWidth = 1.5; ctx.stroke();
        const nt = (this.near + 1) + '. ' + name + (done ? '  ✓' : ''); font(ctx, fitPx(ctx, nt, 10, 188)); ctx.textAlign = 'center'; ctx.fillStyle = '#7a3b57'; ctx.fillText(nt, G.VW / 2, ty + 37);
        const ht = G.input.touchMode ? tr('Springen, dann ▼ Stampfer auf das Schild', 'Jump, then ▼ stomp on the sign') : tr('↑ oder Stampfer (Sprung + ↓) auf das Schild', '↑ or stomp (jump + ↓) on the sign'); font(ctx, fitPx(ctx, ht, 7.5, 188)); ctx.fillStyle = '#b06a85'; ctx.fillText(ht, G.VW / 2, ty + 49);
      } else if (this.nearMail) { rr(ctx, G.VW / 2 - 90, ty + 28, 180, 24, 10); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill(); ctx.strokeStyle = '#ff9eb0'; ctx.lineWidth = 1.5; ctx.stroke(); const mt = tr('Mallos Brief: ', "Mallo's letter: ") + (G.input.touchMode ? tr('springen + ▼ stampfen', 'jump + ▼ stomp') : tr('↑ oder stampfen', '↑ or stomp')); font(ctx, fitPx(ctx, mt, 9, 168)); ctx.textAlign = 'center'; ctx.fillStyle = '#7a3b57'; ctx.fillText(mt, G.VW / 2, ty + 40); }
      else if (this.landed) { const h = G.input.touchMode ? tr('◀ ▶ laufen · auf ein Schild stampfen = Level', '◀ ▶ walk · stomp on a sign = level') : tr('← → laufen · Schild = Level · Esc = Globus', '← → walk · sign = level · Esc = globe'); font(ctx, 7.5); ctx.textAlign = 'center'; ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(74,34,58,.7)'; ctx.strokeText(h, G.VW / 2, ty + 34); ctx.fillStyle = '#fff'; ctx.fillText(h, G.VW / 2, ty + 34); }
    },
  };
})();
