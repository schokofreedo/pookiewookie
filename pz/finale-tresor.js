/* The Starway Home puzzle: "Der Tresor des Paten" (world finale, slot 1).
   Mastermind: a secret code of 4 different pralines out of 6, 8 attempts. Gold bean = right praline, right place;
   silver bean = right praline, wrong place (beans are unordered). Solved -> the dial spins and the door swings open. */
(function () {
  const G = window.PW = window.PW || {};
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de);
  const TAU = Math.PI * 2, FONT = '"Fredoka", sans-serif';
  const INK = '#1c1a22', PINK = '#ff9eb0', ROSE = '#ff6f9c', PLUM = '#7a3b57', GOLD = '#ffd84a', CREAM = '#fff4e0';
  const NAMES = tr(['Trüffel', 'Herz', 'Nougat', 'Stern', 'Nuss', 'Himbeere'], ['Truffle', 'Heart', 'Nougat', 'Star', 'Nut', 'Raspberry']);
  const TRIES = 8;

  function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function T(c, s, x, y, px, col, o) {
    o = o || {}; c.font = (o.w || 700) + ' ' + px + 'px ' + FONT; c.textAlign = o.a || 'center'; c.textBaseline = 'middle';
    if (o.stroke) { c.lineJoin = 'round'; c.lineWidth = o.sw || px * 0.3; c.strokeStyle = o.stroke; c.strokeText(s, x, y); }
    c.fillStyle = col; c.fillText(s, x, y);
  }
  function star(c, x, y, r, col, inner) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * (inner || 0.45) : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); if (col) { c.fillStyle = col; c.fill(); } }
  function heart(c, x, y, r) { c.beginPath(); c.moveTo(x, y + r * 0.85); c.bezierCurveTo(x - r * 1.25, y - r * 0.05, x - r * 0.75, y - r * 1.05, x, y - r * 0.45); c.bezierCurveTo(x + r * 0.75, y - r * 1.05, x + r * 1.25, y - r * 0.05, x, y + r * 0.85); c.closePath(); }
  function shade(c, x, y, r, a, b) { const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
  /* the same six pralines as in the chocolate world (type 1..6) */
  function drawPraline(c, v, x, y, r, o) {
    o = o || {}; const lw = Math.max(1.2, r * 0.11);
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = lw; c.strokeStyle = '#2a1508';
    if (o.shadow !== false) { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x, y + r * 0.85, r * 0.8, r * 0.22, 0, 0, TAU); c.fill(); }
    if (v === 1) {
      c.beginPath(); c.arc(x, y, r * 0.86, 0, TAU); c.fillStyle = shade(c, x, y, r, '#7a4a32', '#2e160b'); c.fill(); c.stroke();
      c.fillStyle = 'rgba(190,140,105,.75)'; for (const d of [[-0.3, -0.2], [0.25, -0.35], [0.4, 0.15], [-0.1, 0.35], [-0.45, 0.2], [0.05, -0.05], [0.15, 0.45], [-0.25, -0.5]]) { c.beginPath(); c.arc(x + d[0] * r, y + d[1] * r, r * 0.07, 0, TAU); c.fill(); }
      c.beginPath(); c.ellipse(x - r * 0.32, y - r * 0.42, r * 0.22, r * 0.12, -0.6, 0, TAU); c.fillStyle = 'rgba(255,255,255,.35)'; c.fill();
    } else if (v === 2) {
      heart(c, x, y + r * 0.05, r * 0.92); c.fillStyle = shade(c, x, y, r, '#ff7a8a', '#b01e3c'); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(x - r * 0.45, y - r * 0.15); c.quadraticCurveTo(x - r * 0.15, y - r * 0.05, x - r * 0.3, y + r * 0.25); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = lw * 1.1; c.stroke();
      c.beginPath(); c.ellipse(x - r * 0.42, y - r * 0.38, r * 0.16, r * 0.09, -0.6, 0, TAU); c.fillStyle = 'rgba(255,255,255,.6)'; c.fill();
    } else if (v === 3) {
      const s = r * 1.5; rr(c, x - s / 2, y - s / 2, s, s, r * 0.22); c.fillStyle = '#d8a46a'; c.fill();
      c.save(); rr(c, x - s / 2, y - s / 2, s, s, r * 0.22); c.clip();
      c.fillStyle = '#7a4524'; c.fillRect(x - s / 2, y - s / 2, s, s * 0.22); c.fillRect(x - s / 2, y + s * 0.12, s, s * 0.12);
      c.fillStyle = '#f3d9a8'; c.fillRect(x - s / 2, y - s * 0.12, s, s * 0.12);
      c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x - s / 2, y - s / 2 + s * 0.04, s, s * 0.05);
      c.restore(); rr(c, x - s / 2, y - s / 2, s, s, r * 0.22); c.stroke();
    } else if (v === 4) {
      star(c, x, y + r * 0.05, r * 1.0, null, 0.5); c.fillStyle = shade(c, x, y, r, '#ffffff', '#f0dcb8'); c.fill(); c.stroke();
      star(c, x, y + r * 0.05, r * 0.42, 'rgba(255,216,74,.85)', 0.5);
      c.beginPath(); c.arc(x - r * 0.22, y - r * 0.35, r * 0.08, 0, TAU); c.fillStyle = '#fff'; c.fill();
    } else if (v === 5) {
      for (const b of [[-0.42, 0.2], [0.42, 0.2], [0, 0.35], [-0.22, -0.25], [0.24, -0.27]]) { c.beginPath(); c.arc(x + b[0] * r, y + b[1] * r, r * 0.44, 0, TAU); c.fillStyle = shade(c, x + b[0] * r, y + b[1] * r, r * 0.44, '#c68a55', '#7a4524'); c.fill(); c.stroke(); }
      for (const b of [[-0.22, -0.3], [0.26, -0.3], [0.02, 0.3]]) { c.beginPath(); c.ellipse(x + b[0] * r, y + b[1] * r, r * 0.2, r * 0.14, 0.4, 0, TAU); c.fillStyle = '#f0c27a'; c.fill(); c.lineWidth = lw * 0.7; c.stroke(); c.lineWidth = lw; }
    } else if (v === 6) {
      c.beginPath(); c.arc(x, y + r * 0.2, r * 0.88, Math.PI, 0); c.quadraticCurveTo(x + r * 0.88, y + r * 0.62, x, y + r * 0.62); c.quadraticCurveTo(x - r * 0.88, y + r * 0.62, x - r * 0.88, y + r * 0.2); c.closePath();
      c.fillStyle = shade(c, x, y, r, '#ffc2d6', '#ff5f95'); c.fill(); c.stroke();
      c.fillStyle = 'rgba(214,40,100,.55)'; for (const d of [[-0.45, 0.05], [-0.15, -0.25], [0.18, -0.3], [0.45, 0.0], [0.15, 0.15], [-0.2, 0.25], [0.45, 0.35], [-0.5, 0.38]]) { c.beginPath(); c.arc(x + d[0] * r, y + d[1] * r, r * 0.1, 0, TAU); c.fill(); }
      c.beginPath(); c.ellipse(x - r * 0.1, y - r * 0.72, r * 0.26, r * 0.12, -0.5, 0, TAU); c.fillStyle = '#5fd38a'; c.fill(); c.lineWidth = lw * 0.8; c.stroke();
      c.beginPath(); c.ellipse(x - r * 0.35, y - r * 0.3, r * 0.14, r * 0.08, -0.6, 0, TAU); c.fillStyle = 'rgba(255,255,255,.6)'; c.fill();
    }
    c.restore();
  }
  function bean(c, x, y, r, kind) {
    if (!kind) { c.beginPath(); c.arc(x, y, r * 0.42, 0, TAU); c.fillStyle = 'rgba(0,0,0,.45)'; c.fill(); c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,.08)'; c.stroke(); return; }
    c.save(); c.translate(x, y); c.rotate(-0.5);
    c.beginPath(); c.ellipse(0, 0, r, r * 0.68, 0, 0, TAU);
    const g = c.createLinearGradient(-r, -r, r, r);
    if (kind === 2) { g.addColorStop(0, '#fff3a8'); g.addColorStop(0.5, '#ffd84a'); g.addColorStop(1, '#c48a1a'); } else { g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#cfd6e0'); g.addColorStop(1, '#808a99'); }
    c.fillStyle = g; c.fill(); c.lineWidth = Math.max(1, r * 0.18); c.strokeStyle = INK; c.stroke();
    c.beginPath(); c.moveTo(-r * 0.55, 0); c.quadraticCurveTo(0, r * 0.25, r * 0.55, 0); c.lineWidth = Math.max(0.8, r * 0.12); c.strokeStyle = kind === 2 ? 'rgba(140,90,10,.7)' : 'rgba(90,100,115,.7)'; c.stroke();
    c.beginPath(); c.ellipse(-r * 0.35, -r * 0.3, r * 0.22, r * 0.12, 0, 0, TAU); c.fillStyle = 'rgba(255,255,255,.75)'; c.fill();
    c.restore();
  }
  function dial(c, x, y, r, ang, glow) {
    if (glow) { const g = c.createRadialGradient(x, y, r * 0.5, x, y, r * 1.6); g.addColorStop(0, 'rgba(255,216,74,.45)'); g.addColorStop(1, 'rgba(255,216,74,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 1.6, 0, TAU); c.fill(); }
    c.beginPath(); c.arc(x, y, r, 0, TAU); const g2 = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); g2.addColorStop(0, '#fff1a8'); g2.addColorStop(0.6, '#e8b53a'); g2.addColorStop(1, '#a8741a'); c.fillStyle = g2; c.fill(); c.lineWidth = Math.max(1.5, r * 0.07); c.strokeStyle = INK; c.stroke();
    c.save(); c.translate(x, y); c.rotate(ang);
    for (let k = 0; k < 24; k++) { const a = k / 24 * TAU, l = k % 6 === 0 ? 0.22 : 0.12; c.beginPath(); c.moveTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92); c.lineTo(Math.cos(a) * r * (0.92 - l), Math.sin(a) * r * (0.92 - l)); c.lineWidth = Math.max(1, r * (k % 6 ? 0.03 : 0.05)); c.strokeStyle = 'rgba(60,35,5,.8)'; c.stroke(); }
    c.beginPath(); c.arc(0, 0, r * 0.5, 0, TAU); c.fillStyle = '#2b2730'; c.fill(); c.lineWidth = Math.max(1, r * 0.05); c.strokeStyle = '#c99a2e'; c.stroke();
    rr(c, -r * 0.09, -r * 0.48, r * 0.18, r * 0.96, r * 0.08); c.fillStyle = '#e8b53a'; c.fill();
    c.restore();
    c.beginPath(); c.moveTo(x, y - r - r * 0.05); c.lineTo(x - r * 0.1, y - r - r * 0.25); c.lineTo(x + r * 0.1, y - r - r * 0.25); c.closePath(); c.fillStyle = ROSE; c.fill(); c.lineWidth = 1; c.strokeStyle = INK; c.stroke();
  }

  /* in-level station: a black mafia safe with a gold dial */
  function station(c, x, y, t, solved) {
    c.save();
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x, y, 17, 3, 0, 0, TAU); c.fill();
    rr(c, x - 15, y - 36, 30, 33, 4); c.fillStyle = '#26232c'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#0c0b10'; c.stroke();
    rr(c, x - 12, y - 33, 24, 27, 3); c.lineWidth = 1.2; c.strokeStyle = '#d4a63a'; c.stroke();
    c.fillStyle = '#3a3642'; c.fillRect(x - 11, y - 32, 6, 25);
    for (const [rx, ry] of [[-13, -34], [13, -34], [-13, -5], [13, -5]]) { c.beginPath(); c.arc(x + rx, y + ry, 1.1, 0, TAU); c.fillStyle = '#d4a63a'; c.fill(); }
    rr(c, x - 13, y - 3, 6, 3, 1); c.fillStyle = '#111'; c.fill(); rr(c, x + 7, y - 3, 6, 3, 1); c.fill();
    if (solved) { c.fillStyle = 'rgba(255,216,74,.5)'; c.fillRect(x - 11, y - 32, 22, 25); }
    dial(c, x + 2, y - 20, 6.5, solved ? t * 4 : Math.sin(t * 1.3) * 0.6, solved);
    c.beginPath(); c.arc(x + 9, y - 28, 1.4, 0, TAU); c.fillStyle = solved ? '#9be7a5' : '#ff5f6d'; c.fill();
    if (!solved) { c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4); T(c, '?', x + 17, y - 40, 9, GOLD, {stroke: INK, sw: 2.5}); c.globalAlpha = 1; }
    else { for (let i = 0; i < 3; i++) { const k = (t * 0.8 + i / 3) % 1; c.globalAlpha = 1 - k; star(c, x - 10 + i * 10, y - 40 - k * 9, 2.4, GOLD); } c.globalAlpha = 1; }
    c.restore();
  }

  function mount(root, api) {
    const rng = api.rng || Math.random;
    const cv = document.createElement('canvas'); cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none';
    root.appendChild(cv);
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, Lay = null, alive = true, raf = 0, last = performance.now(), time = 0, hits = [];
    const timers = [];
    const later = (fn, ms) => { const id = setTimeout(() => { if (alive) fn(); }, ms); timers.push(id); };
    const sfx = n => { try { api.sfx(n); } catch (e) {} };
    const tone = (f, d, o) => { try { if (G.audio && G.audio.tone) G.audio.tone(f, d, o); } catch (e) {} };
    const S = {code: [], hist: [], cur: [0, 0, 0, 0], cursor: 0, busy: false, won: false, openT: 0, dialA: 0, dialV: 0, reveal: 0, parts: [], hover: null, auto: false, pop: [0, 0, 0, 0], flashRow: -1};

    function newCode() {
      const k = [1, 2, 3, 4, 5, 6]; for (let i = 5; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [k[i], k[j]] = [k[j], k[i]]; }
      S.code = k.slice(0, 4); S.hist = []; S.cur = [0, 0, 0, 0]; S.cursor = 0; S.reveal = 0;
    }
    function score(g) { let gold = 0, silver = 0; g.forEach((v, i) => { if (S.code[i] === v) gold++; else if (S.code.includes(v)) silver++; }); return {gold, silver}; }

    function layout() {
      const w = Math.max(320, root.clientWidth), h = Math.max(180, root.clientHeight);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      if (w !== W || h !== H || cv.width !== Math.round(w * dpr)) { W = w; H = h; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      const pad = 8, small = H < 300;
      const rightW = Math.round(Math.max(220, Math.min(290, W * 0.31)));
      const dx = pad, dy = pad, dw = W - rightW - pad * 3, dh = H - pad * 2;
      Lay = {pad, small, rightW, dx, dy, dw, dh, rx: W - rightW - pad};
    }

    /* ---------- actions ---------- */
    function burst(x, y, n, cols, sp) { for (let k = 0; k < n; k++) { const a = rng() * TAU, v = (0.3 + rng()) * (sp || 110); S.parts.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0, max: 0.45 + rng() * 0.6, col: cols[k % cols.length], r: 1.5 + rng() * 2.5}); } }
    function place(v) {
      if (S.busy || S.won) return;
      const j = S.cur.indexOf(v); if (j >= 0) S.cur[j] = 0;
      let i = S.cursor; if (i < 0 || i > 3) i = S.cur.indexOf(0); if (i < 0) i = 3;
      S.cur[i] = v; S.pop[i] = 1; tone(520 + v * 70, 0.07, {type: 'triangle', gain: 0.1}); sfx('select');
      const nx = S.cur.indexOf(0); S.cursor = nx >= 0 ? nx : i;
      const p = slotPos(i); if (p) burst(p.x, p.y, 5, [GOLD, CREAM], 70);
      api.msg('');
    }
    function tapSlot(i) {
      if (S.busy || S.won) return;
      if (S.cur[i]) { S.cur[i] = 0; sfx('pop'); }
      else sfx('tick');
      S.cursor = i;
    }
    function clearRow() { if (S.busy || S.won) return; S.cur = [0, 0, 0, 0]; S.cursor = 0; sfx('pop'); }
    function check() {
      if (S.busy || S.won) return;
      if (S.cur.includes(0)) { api.msg(tr('Leg erst in alle vier Fächer eine Praline.', 'First put a praline in all four slots.'), 'bad'); sfx('bump'); return; }
      const key = S.cur.join('');
      if (S.hist.some(h => h.g.join('') === key)) { api.msg(tr('Diesen Code hast du schon probiert – der Tresor sagt dasselbe.', 'You already tried this code – the safe will say the same thing.'), 'bad'); sfx('bump'); return; }
      const r = score(S.cur), row = {g: S.cur.slice(), gold: r.gold, silver: r.silver, at: performance.now()};
      S.hist.push(row); S.cur = [0, 0, 0, 0]; S.cursor = 0; S.busy = true; S.dialV += 14; sfx('tick');
      const n = r.gold + r.silver;
      for (let k = 0; k < Math.max(1, n); k++) later(() => { if (n) tone(k < r.gold ? 880 : 620, 0.09, {type: 'sine', gain: 0.12}); else sfx('thud'); }, 220 + k * 140);
      later(() => {
        S.busy = false;
        if (r.gold === 4) { win(); return; }
        if (S.hist.length >= TRIES) {
          S.busy = true; S.reveal = 1;
          api.wrong(tr('Acht Versuche vorbei – der Tresor verriegelt sich und stellt einen neuen Code ein!', 'All eight tries are used up – the safe locks itself and sets a new code!'));
          later(() => { newCode(); S.busy = false; sfx('appear'); api.msg(tr('Neuer Code! Du hast wieder 8 Versuche.', 'New code! You have 8 tries again.'), 'info'); draw(); }, 2600);
        } else api.msg(tr(r.gold + ' Gold, ' + r.silver + ' Silber. Noch ' + (TRIES - S.hist.length) + (TRIES - S.hist.length === 1 ? ' Versuch.' : ' Versuche.'), r.gold + ' gold, ' + r.silver + ' silver. ' + (TRIES - S.hist.length) + (TRIES - S.hist.length === 1 ? ' try left.' : ' tries left.')), 'info');
        draw();
      }, 260 + Math.max(1, n) * 140);
    }
    function win() {
      S.won = true; S.wonAt = performance.now(); S.busy = true; S.dialV += 40; sfx('star');
      for (let k = 1; k <= 6; k++) later(() => draw(), k * 160);
      try { if (G.audio && G.audio.sfx && G.audio.sfx.gate) G.audio.sfx.gate(); } catch (e) {}
      api.msg(tr('Klick-klack … der Tresor ist offen!', 'Click-clack … the safe is open!'), 'good');
      later(() => { const L = Lay; burst(L.dx + L.dw / 2, L.dy + L.dh / 2, 40, [GOLD, '#fff', PINK, '#fff3a8'], 230); draw(); }, 500);
      later(() => api.solved(), 1250);
    }

    /* ---------- drawing ---------- */
    let geo = null;
    function slotPos(i) { return geo ? {x: geo.sx + i * geo.sstep, y: geo.sy, r: geo.sr} : null; }
    function button(x, y, w, h, fn, id, label, o) {
      o = o || {}; const hov = S.hover === id, dis = !!o.disabled;
      rr(ctx, x, y + 3, w, h, h / 2); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
      rr(ctx, x, y + (hov && !dis ? 1 : 0), w, h, h / 2); ctx.fillStyle = dis ? 'rgba(255,255,255,.12)' : o.col || CREAM; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = dis ? 'rgba(255,255,255,.2)' : INK; ctx.stroke();
      T(ctx, label, x + w / 2, y + h / 2 + 1 + (hov && !dis ? 1 : 0), Math.min(15, h * 0.42), dis ? 'rgba(255,255,255,.4)' : o.ink || INK, {stroke: o.stroke, sw: 3});
      if (!dis && fn) hits.push({x, y, w, h, fn, id});
    }
    function drawDoor() {
      const L = Lay, x = L.dx, y = L.dy, w = L.dw, h = L.dh, small = L.small;
      /* vault interior (seen when the door opens) */
      rr(ctx, x, y, w, h, 16); ctx.fillStyle = '#120f16'; ctx.fill();
      if (S.won) {
        ctx.save(); rr(ctx, x, y, w, h, 16); ctx.clip();
        const g = ctx.createRadialGradient(x + w / 2, y + h * 0.55, 10, x + w / 2, y + h * 0.55, w * 0.6); g.addColorStop(0, 'rgba(255,216,74,.85)'); g.addColorStop(1, 'rgba(255,150,40,.08)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
        /* gold bars and pralines */
        const bw = Math.min(60, w * 0.12), bh = bw * 0.42, by = y + h * 0.78;
        for (let r = 0; r < 3; r++) for (let k = 0; k < 4 - r; k++) { const bx = x + w / 2 - (4 - r) * bw * 0.55 + k * bw * 1.1, yy = by - r * bh; ctx.beginPath(); ctx.moveTo(bx + bw * 0.12, yy - bh); ctx.lineTo(bx + bw * 0.88, yy - bh); ctx.lineTo(bx + bw, yy); ctx.lineTo(bx, yy); ctx.closePath(); ctx.fillStyle = '#ffcf3a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#8a5a10'; ctx.stroke(); }
        S.code.forEach((v, i) => drawPraline(ctx, v, x + w / 2 + (i - 1.5) * Math.min(56, w * 0.13), y + h * 0.3 + Math.sin(time * 4 + i) * 5, Math.min(22, h * 0.07)));
        ctx.restore();
      }
      /* door swings open around its left hinge */
      const k = S.won ? Math.min(1, (performance.now() - S.wonAt) / 900) : 0, e = k * k * (3 - 2 * k), sk = 1 - e * 0.88;
      ctx.save(); ctx.translate(x, 0); ctx.transform(sk, -e * 0.08, 0, 1, 0, 0); ctx.translate(-x, 0);
      const dg = ctx.createLinearGradient(x, y, x + w, y + h); dg.addColorStop(0, '#4a4656'); dg.addColorStop(0.5, '#2e2b36'); dg.addColorStop(1, '#1d1b23');
      rr(ctx, x, y, w, h, 16); ctx.fillStyle = dg; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#0c0b10'; ctx.stroke();
      rr(ctx, x + 7, y + 7, w - 14, h - 14, 11); ctx.lineWidth = 2; ctx.strokeStyle = '#d4a63a'; ctx.stroke();
      for (const [rx, ry] of [[14, 14], [w - 14, 14], [14, h - 14], [w - 14, h - 14]]) { ctx.beginPath(); ctx.arc(x + rx, y + ry, 3.5, 0, TAU); ctx.fillStyle = '#e8c15a'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#6a4a10'; ctx.stroke(); }
      /* bolts on the right edge */
      for (const f of [0.25, 0.75]) { rr(ctx, x + w - 6, y + h * f - 9, 12, 18, 4); ctx.fillStyle = '#8a8f9c'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#0c0b10'; ctx.stroke(); }
      /* header plate */
      const ph = small ? 20 : 24, pw2 = Math.min(w * 0.5, 230);
      rr(ctx, x + w / 2 - pw2 / 2, y + 12, pw2, ph, 6); ctx.fillStyle = '#d4a63a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#6a4a10'; ctx.stroke();
      T(ctx, tr('Versuch ', 'Try ') + Math.min(TRIES, S.hist.length + (S.won ? 0 : 1)) + ' / ' + TRIES, x + w / 2, y + 12 + ph / 2 + 1, small ? 11.5 : 13.5, '#2b1d05');
      /* history: two columns of four */
      const top = y + 12 + ph + (small ? 6 : 10), bottomArea = small ? 58 : 76;
      const gh = y + h - 12 - bottomArea - top, rowH = gh / 4, colW = (w - 40) / 2;
      const rr2 = Math.min(rowH * 0.36, colW / 12.5);
      for (let n = 0; n < TRIES; n++) {
        const cx = x + 20 + Math.floor(n / 4) * colW, cy = top + (n % 4) * rowH, hrow = S.hist[n], active = n === S.hist.length && !S.won;
        rr(ctx, cx + 2, cy + 2, colW - 8, rowH - 4, rowH * 0.3); ctx.fillStyle = active ? 'rgba(255,216,74,.12)' : 'rgba(0,0,0,.32)'; ctx.fill();
        if (active) { ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,216,74,.5)'; ctx.stroke(); }
        T(ctx, String(n + 1), cx + 14, cy + rowH / 2 + 1, small ? 10 : 12, hrow ? '#d4a63a' : 'rgba(212,166,58,.4)');
        const pst = rr2 * 2.5, br = Math.min(rr2 * 0.5, rowH * 0.2), cwid = 4 * pst + br * 5, px0 = cx + 26 + Math.max(0, (colW - 34 - cwid) / 2) + rr2;
        for (let i = 0; i < 4; i++) {
          const px = px0 + i * pst, py = cy + rowH / 2;
          if (hrow) drawPraline(ctx, hrow.g[i], px, py, rr2 * 0.95, {shadow: false});
          else { ctx.beginPath(); ctx.arc(px, py, rr2 * 0.55, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fill(); }
        }
        /* beans 2x2 */
        const bx = px0 + 4 * pst - rr2 * 0.6 + br;
        const beans = []; if (hrow) { for (let q = 0; q < hrow.gold; q++) beans.push(2); for (let q = 0; q < hrow.silver; q++) beans.push(1); }
        while (beans.length < 4) beans.push(0);
        beans.forEach((b, q) => { const appear = hrow ? Math.min(1, Math.max(0, ((performance.now() - hrow.at) / 1000 - 0.2 - q * 0.14) / 0.15)) : 1; const bxx = bx + (q % 2) * br * 2.5, byy = cy + rowH / 2 + (Math.floor(q / 2) - 0.5) * br * 2.2; if (b && appear < 1) { bean(ctx, bxx, byy, br, 0); if (appear > 0) bean(ctx, bxx, byy, br * appear * 1.2, b); } else bean(ctx, bxx, byy, br, b); });
      }
      /* current row */
      const sy = y + h - 12 - bottomArea / 2, sr = Math.min(bottomArea * 0.36, (w * 0.5) / 9), sstep = sr * 2.6;
      const sx = x + w / 2 - sstep * 1.5 - (small ? 0 : 0);
      geo = {sx, sy, sr, sstep};
      rr(ctx, sx - sr * 1.6, sy - sr * 1.25, sstep * 3 + sr * 3.2, sr * 2.5, sr * 0.6); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#d4a63a'; ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const px = sx + i * sstep, v = S.cur[i], selc = i === S.cursor && !S.won && !S.busy, hov = S.hover === 's' + i;
        ctx.beginPath(); ctx.arc(px, sy, sr, 0, TAU); ctx.fillStyle = hov ? '#2c2934' : '#1a1820'; ctx.fill();
        ctx.lineWidth = selc ? 3 : 2; ctx.strokeStyle = selc ? 'rgba(255,216,74,' + (0.6 + 0.4 * Math.sin(time * 6)) + ')' : '#555060'; ctx.stroke();
        if (v) drawPraline(ctx, v, px, sy - 1, sr * 0.8 * (1 + Math.sin(Math.min(1, S.pop[i]) * Math.PI) * 0.22));
        else T(ctx, String(i + 1), px, sy + 1, sr * 0.6, 'rgba(255,255,255,.18)');
        hits.push({x: px - sr, y: sy - sr, w: sr * 2, h: sr * 2, id: 's' + i, fn: () => tapSlot(i)});
      }
      if (S.reveal && !S.won && S.hist.length >= TRIES) {
        const bw = Math.min(w - 40, 330), bh = small ? 44 : 54, bx = x + w / 2 - bw / 2, byy = y + h / 2 - bh / 2;
        rr(ctx, bx, byy, bw, bh, 12); ctx.fillStyle = 'rgba(255,95,109,.95)'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
        T(ctx, tr('Der Code war:', 'The code was:'), bx + bw * 0.3, byy + bh / 2 + 1, small ? 13 : 15, '#fff', {stroke: 'rgba(0,0,0,.35)', sw: 3});
        S.code.forEach((v, i) => drawPraline(ctx, v, bx + bw * 0.58 + i * bh * 0.62, byy + bh / 2, bh * 0.26, {shadow: false}));
      }
      ctx.restore();
    }
    function drawRight() {
      const L = Lay, x = L.rx, w = L.rightW, small = L.small;
      let y = L.pad;
      /* dial + legend card */
      const cardH = small ? Math.round(Math.max(54, Math.min(70, H * 0.27))) : 104;
      rr(ctx, x, y, w, cardH, 14); ctx.fillStyle = 'rgba(30,27,36,.92)'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#d4a63a'; ctx.stroke();
      const dr = small ? Math.min(24, cardH * 0.34) : 34; dial(ctx, x + 12 + dr, y + cardH / 2 + 3, dr, S.dialA, S.won);
      const lx = x + dr * 2 + 24, ly = y + cardH / 2, fz = small ? 11 : 12.5;
      bean(ctx, lx + 6, ly - (small ? 13 : 18), small ? 6 : 7.5, 2); T(ctx, tr('richtig am richtigen Platz', 'right one, right spot'), lx + 18, ly - (small ? 13 : 18) + 1, fz, '#ffe9a8', {a: 'left', w: 600});
      bean(ctx, lx + 6, ly + (small ? 13 : 18), small ? 6 : 7.5, 1); T(ctx, tr('richtig, falscher Platz', 'right one, wrong spot'), lx + 18, ly + (small ? 13 : 18) + 1, fz, '#dfe5ee', {a: 'left', w: 600});
      if (!small) T(ctx, tr('Bohnen-Reihenfolge ist egal', 'Bean order does not matter'), lx + 6, ly + 1, 10.5, 'rgba(255,255,255,.5)', {a: 'left', w: 500});
      y += cardH + (small ? 6 : 10);
      /* tray */
      const btnH = small ? 36 : 42, trayH = H - L.pad - btnH - (small ? 6 : 10) - y;
      rr(ctx, x, y, w, trayH, 14); ctx.fillStyle = '#e9e4ec'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      rr(ctx, x + 6, y + 6, w - 12, trayH - 12, 10); ctx.fillStyle = '#c9c1cf'; ctx.fill();
      const cols = trayH < 110 ? 6 : 3;   /* very short screens: one row of six keeps the pralines tappable */
      const cw = (w - 12) / cols, ch = (trayH - 12) / (6 / cols);
      for (let v = 1; v <= 6; v++) {
        const cx = x + 6 + ((v - 1) % cols) * cw, cy = y + 6 + Math.floor((v - 1) / cols) * ch, used = S.cur.includes(v), hov = S.hover === 'v' + v;
        if (hov && !used) { rr(ctx, cx + 3, cy + 3, cw - 6, ch - 6, 9); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); }
        ctx.beginPath(); ctx.ellipse(cx + cw / 2, cy + ch / 2 + 2, Math.min(cw, ch) * 0.34, Math.min(cw, ch) * 0.3, 0, 0, TAU); ctx.fillStyle = '#b3aabb'; ctx.fill();
        ctx.globalAlpha = used ? 0.3 : 1;
        drawPraline(ctx, v, cx + cw / 2, cy + ch / 2 - (small ? 0 : 5), Math.min(cw, ch) * 0.27);
        if (!small) T(ctx, NAMES[v - 1], cx + cw / 2, cy + ch - 10, 10.5, '#4a4056', {w: 600});
        ctx.globalAlpha = 1;
        hits.push({x: cx, y: cy, w: cw, h: ch, id: 'v' + v, fn: () => place(v)});
      }
      y += trayH + (small ? 6 : 10);
      const full = !S.cur.includes(0);
      button(x, y, w * 0.36, btnH, clearRow, 'clr', tr('Leeren', 'Clear'), {disabled: S.busy || S.won || !S.cur.some(v => v)});
      button(x + w * 0.36 + 8, y, w * 0.64 - 8, btnH, check, 'go', tr('Prüfen', 'Check'), {col: full ? ROSE : '#a5677f', ink: '#fff', stroke: 'rgba(0,0,0,.3)', disabled: S.busy || S.won});
    }
    function draw() {
      if (!Lay) layout();
      hits = [];
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      drawDoor(); drawRight();
      for (const p of S.parts) { ctx.globalAlpha = Math.max(0, 1 - p.life / p.max); star(ctx, p.x, p.y, p.r * 1.5, p.col); } ctx.globalAlpha = 1;
    }
    function step(dt) {
      time += dt;
      S.dialA += S.dialV * dt; S.dialV *= Math.pow(0.08, dt); if (S.won) S.dialV = Math.max(S.dialV, 3);
      for (let i = 0; i < 4; i++) S.pop[i] = Math.max(0, S.pop[i] - dt * 3.5);
      for (const p of S.parts) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; }
      S.parts = S.parts.filter(p => p.life < p.max);
    }
    function loop(now) { if (!alive) return; const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; step(dt); draw(); raf = requestAnimationFrame(loop); }

    function pos(e) { const r = cv.getBoundingClientRect(); return {x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height)}; }
    function hitAt(p) { for (let k = hits.length - 1; k >= 0; k--) { const h = hits[k]; if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) return h; } return null; }
    function onDown(e) { if (S.auto) return; const h = hitAt(pos(e)); if (h) { h.fn(); draw(); } }
    function onMove(e) { const h = hitAt(pos(e)), id = h ? h.id : null; cv.style.cursor = h ? 'pointer' : 'default'; if (id !== S.hover) { S.hover = id; draw(); } }
    function onKey(e) {
      if (S.auto) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 6) place(n);
      else if (e.key === 'Backspace') { let i = -1; for (let k = 3; k >= 0; k--) if (S.cur[k]) { i = k; break; } if (i >= 0) tapSlot(i); }
      else if (e.key === 'Enter') check();
      else return;
      e.preventDefault(); draw();
    }
    cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); window.addEventListener('keydown', onKey);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { layout(); draw(); }) : null; if (ro) ro.observe(root);

    newCode(); layout(); draw();
    raf = requestAnimationFrame(loop);
    return {
      destroy() { alive = false; cancelAnimationFrame(raf); timers.forEach(clearTimeout); if (ro) ro.disconnect(); window.removeEventListener('keydown', onKey); },
      _state: () => S,
      autoSolve() {
        if (S.won) return; S.auto = true;
        const go = () => {
          S.reveal = 0; if (S.hist.length >= TRIES) S.hist = [];
          S.cur = [0, 0, 0, 0]; S.cursor = 0; draw();
          S.code.forEach((v, i) => later(() => { S.cursor = i; place(v); draw(); }, 80 + i * 110));
          later(() => { check(); draw(); }, 80 + 4 * 110 + 120);
        };
        const wait = () => { if (S.busy) later(wait, 150); else go(); }; wait();
      },
    };
  }

  const DEF = {
    id: 'finale-tresor', world: 'finale', slot: 1,
    title: tr('Der Tresor des Paten', 'The Chocfather’s Safe'),
    intro: tr('Der Code besteht aus 4 verschiedenen der 6 Pralinen. Leg einen Tipp in die Fächer und drück „Prüfen“: Goldbohne = richtige Praline am richtigen Platz, Silberbohne = richtige Praline, falscher Platz. 8 Versuche!', 'The code is 4 different pralines out of the 6. Put a guess in the slots and press “Check”: gold bean = right praline in the right spot, silver bean = right praline, wrong spot. 8 tries!'),
    letter: tr('Ein Tresor lügt nie, Toffo. Ändere immer nur eine Sache auf einmal – dann verrät er dir alles.', 'A safe never lies, Toffo. Change just one thing at a time – then it tells you everything.'),
    hint: tr('Starte mit Trüffel · Herz · Nougat · Stern. Alle Bohnen zusammen verraten, wie viele dieser vier im Code stecken (sind es nur 2 oder 3, sind dafür Nuss und/oder Himbeere dabei). Danach tausche nur EINE Praline oder vertausche ZWEI Plätze und vergleiche: Wird ein Gold zu Silber, hast du eine richtige Stelle verschoben.', 'Start with Truffle · Heart · Nougat · Star. All the beans together tell you how many of these four are in the code (if it is only 2 or 3, then Nut and/or Raspberry are in it). After that, change only ONE praline or swap TWO spots and compare: if a gold turns into silver, you moved a correct spot.'),
    station, mount,
  };
  if (G.PZ) G.PZ.register(DEF);
  else window.addEventListener('DOMContentLoaded', () => { if (G.PZ) G.PZ.register(DEF); });
})();
