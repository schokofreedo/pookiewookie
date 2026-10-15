/* The Starway Home puzzle: "Pralinen-Sudoku" (world schoko, slot 1).
   6x6 sudoku with 2x3 boxes and six drawn pralines. Each mount generates a fresh puzzle: full grid by shuffled backtracking,
   givens removed while the solution stays unique, 12-14 givens kept, and only puzzles that need hidden singles (but no guessing)
   are accepted. Everything is drawn on one canvas. */
(function () {
  const G = window.PW = window.PW || {};
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de);
  const TAU = Math.PI * 2, FONT = '"Fredoka", sans-serif';
  const INK = '#2a1508', PINK = '#ff9eb0', ROSE = '#ff6f9c', PLUM = '#7a3b57', GOLD = '#ffd84a', MINT = '#9be7a5', CREAM = '#fff4e0';
  const NAMES = tr(['Trüffel', 'Herz', 'Nougat', 'Stern', 'Nuss', 'Himbeere'], ['Truffle', 'Heart', 'Nougat', 'Star', 'Hazelnut', 'Raspberry']);

  /* ---------- sudoku core (cells 0..35, values 1..6, 0 = empty) ---------- */
  const ROW = i => Math.floor(i / 6), COL = i => i % 6, BOX = i => Math.floor(ROW(i) / 2) * 2 + Math.floor(COL(i) / 3);
  const PEERS = [];
  for (let i = 0; i < 36; i++) { const p = []; for (let j = 0; j < 36; j++) if (j !== i && (ROW(j) === ROW(i) || COL(j) === COL(i) || BOX(j) === BOX(i))) p.push(j); PEERS.push(p); }
  const UNITS = [];
  for (let k = 0; k < 6; k++) { UNITS.push([0, 1, 2, 3, 4, 5].map(c => k * 6 + c)); UNITS.push([0, 1, 2, 3, 4, 5].map(r => r * 6 + k)); }
  for (let b = 0; b < 6; b++) { const r0 = Math.floor(b / 2) * 2, c0 = (b % 2) * 3, u = []; for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) u.push((r0 + r) * 6 + c0 + c); UNITS.push(u); }
  function cands(g, i) { if (g[i]) return []; const used = new Set(PEERS[i].map(j => g[j])); const out = []; for (let v = 1; v <= 6; v++) if (!used.has(v)) out.push(v); return out; }
  function shuffle(a, rng) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function fill(g, rng) {
    let best = -1, bc = null;
    for (let i = 0; i < 36; i++) if (!g[i]) { const c = cands(g, i); if (!c.length) return false; if (!bc || c.length < bc.length) { best = i; bc = c; } }
    if (best < 0) return true;
    for (const v of shuffle(bc.slice(), rng)) { g[best] = v; if (fill(g, rng)) return true; }
    g[best] = 0; return false;
  }
  function count(g, limit) {
    let best = -1, bc = null;
    for (let i = 0; i < 36; i++) if (!g[i]) { const c = cands(g, i); if (!c.length) return 0; if (!bc || c.length < bc.length) { best = i; bc = c; } }
    if (best < 0) return 1;
    let n = 0; for (const v of bc) { g[best] = v; n += count(g, limit - n); if (n >= limit) break; }
    g[best] = 0; return n;
  }
  /* human-style solver: naked singles (+ hidden singles if allowed). Returns {solved, hidden} */
  function logic(g0, allowHidden) {
    const g = g0.slice(); let hidden = 0, progress = true;
    while (progress) {
      progress = false;
      for (let i = 0; i < 36; i++) if (!g[i]) { const c = cands(g, i); if (c.length === 1) { g[i] = c[0]; progress = true; } }
      if (progress || !allowHidden) continue;
      for (const u of UNITS) {
        for (let v = 1; v <= 6; v++) {
          if (u.some(i => g[i] === v)) continue;
          const spots = u.filter(i => !g[i] && cands(g, i).includes(v));
          if (spots.length === 1) { g[spots[0]] = v; hidden++; progress = true; break; }
        }
        if (progress) break;
      }
    }
    return {solved: g.every(v => v), hidden};
  }
  function generate(rng) {
    let fallback = null;
    for (let attempt = 0; attempt < 400; attempt++) {
      const sol = new Array(36).fill(0); fill(sol, rng);
      const puz = sol.slice();
      for (const i of shuffle([...Array(36).keys()], rng)) { const v = puz[i]; puz[i] = 0; if (count(puz.slice(), 2) !== 1) puz[i] = v; }
      let givens = puz.filter(v => v).length;
      if (givens > 14) continue;
      const empty = shuffle([...Array(36).keys()].filter(i => !puz[i]), rng);
      while (givens < 12) { const i = empty.pop(); puz[i] = sol[i]; givens++; }
      if (count(puz.slice(), 2) !== 1) continue;
      const lg = logic(puz, true);
      if (!lg.solved) continue;
      if (!fallback) fallback = {sol, puz, givens};
      if (logic(puz, false).solved) continue;   /* too easy: naked singles alone finish it */
      if (lg.hidden < 2) continue;
      return {sol, puz, givens, hidden: lg.hidden, attempt};
    }
    return fallback;
  }

  /* ---------- drawing helpers ---------- */
  function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function T(c, s, x, y, px, col, o) {
    o = o || {}; c.font = (o.w || 700) + ' ' + px + 'px ' + FONT; c.textAlign = o.a || 'center'; c.textBaseline = 'middle';
    if (o.stroke) { c.lineJoin = 'round'; c.lineWidth = o.sw || px * 0.3; c.strokeStyle = o.stroke; c.strokeText(s, x, y); }
    c.fillStyle = col; c.fillText(s, x, y);
  }
  function star(c, x, y, r, col, inner) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * (inner || 0.45) : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); if (col) { c.fillStyle = col; c.fill(); } }
  function heart(c, x, y, r) { c.beginPath(); c.moveTo(x, y + r * 0.85); c.bezierCurveTo(x - r * 1.25, y - r * 0.05, x - r * 0.75, y - r * 1.05, x, y - r * 0.45); c.bezierCurveTo(x + r * 0.75, y - r * 1.05, x + r * 1.25, y - r * 0.05, x, y + r * 0.85); c.closePath(); }
  function shade(c, x, y, r, a, b) { const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
  /* praline type 1..6 at centre (x, y), radius r */
  function drawPraline(c, v, x, y, r, o) {
    o = o || {}; const lw = Math.max(1.2, r * 0.11);
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = lw; c.strokeStyle = INK;
    if (o.shadow !== false) { c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(x, y + r * 0.85, r * 0.8, r * 0.22, 0, 0, TAU); c.fill(); }
    if (v === 1) { /* dark truffle with cocoa dust */
      c.beginPath(); c.arc(x, y, r * 0.86, 0, TAU); c.fillStyle = shade(c, x, y, r, '#7a4a32', '#2e160b'); c.fill(); c.stroke();
      c.fillStyle = 'rgba(190,140,105,.75)'; const D = [[-0.3, -0.2], [0.25, -0.35], [0.4, 0.15], [-0.1, 0.35], [-0.45, 0.2], [0.05, -0.05], [0.15, 0.45], [-0.25, -0.5]];
      for (const d of D) { c.beginPath(); c.arc(x + d[0] * r, y + d[1] * r, r * 0.07, 0, TAU); c.fill(); }
      c.beginPath(); c.ellipse(x - r * 0.32, y - r * 0.42, r * 0.22, r * 0.12, -0.6, 0, TAU); c.fillStyle = 'rgba(255,255,255,.35)'; c.fill();
    } else if (v === 2) { /* ruby heart */
      heart(c, x, y + r * 0.05, r * 0.92); c.fillStyle = shade(c, x, y, r, '#ff7a8a', '#b01e3c'); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(x - r * 0.45, y - r * 0.15); c.quadraticCurveTo(x - r * 0.15, y - r * 0.05, x - r * 0.3, y + r * 0.25); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = lw * 1.1; c.stroke();
      c.beginPath(); c.ellipse(x - r * 0.42, y - r * 0.38, r * 0.16, r * 0.09, -0.6, 0, TAU); c.fillStyle = 'rgba(255,255,255,.6)'; c.fill();
    } else if (v === 3) { /* layered nougat square */
      const s = r * 1.5; rr(c, x - s / 2, y - s / 2, s, s, r * 0.22); c.fillStyle = '#d8a46a'; c.fill();
      c.save(); rr(c, x - s / 2, y - s / 2, s, s, r * 0.22); c.clip();
      c.fillStyle = '#7a4524'; c.fillRect(x - s / 2, y - s / 2, s, s * 0.22); c.fillRect(x - s / 2, y + s * 0.12, s, s * 0.12);
      c.fillStyle = '#f3d9a8'; c.fillRect(x - s / 2, y - s * 0.12, s, s * 0.12);
      c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x - s / 2, y - s / 2 + s * 0.04, s, s * 0.05);
      c.restore(); rr(c, x - s / 2, y - s / 2, s, s, r * 0.22); c.stroke();
    } else if (v === 4) { /* white chocolate star */
      star(c, x, y + r * 0.05, r * 1.0, null, 0.5); c.fillStyle = shade(c, x, y, r, '#ffffff', '#f0dcb8'); c.fill(); c.stroke();
      star(c, x, y + r * 0.05, r * 0.42, 'rgba(255,216,74,.85)', 0.5);
      c.beginPath(); c.arc(x - r * 0.22, y - r * 0.35, r * 0.08, 0, TAU); c.fillStyle = '#fff'; c.fill();
    } else if (v === 5) { /* hazelnut cluster */
      const B = [[-0.42, 0.2], [0.42, 0.2], [0, 0.35], [-0.22, -0.25], [0.24, -0.27]];
      for (const b of B) { c.beginPath(); c.arc(x + b[0] * r, y + b[1] * r, r * 0.44, 0, TAU); c.fillStyle = shade(c, x + b[0] * r, y + b[1] * r, r * 0.44, '#c68a55', '#7a4524'); c.fill(); c.stroke(); }
      for (const b of [[-0.22, -0.3], [0.26, -0.3], [0.02, 0.3]]) { c.beginPath(); c.ellipse(x + b[0] * r, y + b[1] * r, r * 0.2, r * 0.14, 0.4, 0, TAU); c.fillStyle = '#f0c27a'; c.fill(); c.lineWidth = lw * 0.7; c.stroke(); c.lineWidth = lw; }
    } else if (v === 6) { /* pink raspberry dome */
      c.beginPath(); c.arc(x, y + r * 0.2, r * 0.88, Math.PI, 0); c.quadraticCurveTo(x + r * 0.88, y + r * 0.62, x, y + r * 0.62); c.quadraticCurveTo(x - r * 0.88, y + r * 0.62, x - r * 0.88, y + r * 0.2); c.closePath();
      c.fillStyle = shade(c, x, y, r, '#ffc2d6', '#ff5f95'); c.fill(); c.stroke();
      c.fillStyle = 'rgba(214,40,100,.55)'; for (const d of [[-0.45, 0.05], [-0.15, -0.25], [0.18, -0.3], [0.45, 0.0], [0.15, 0.15], [-0.2, 0.25], [0.45, 0.35], [-0.5, 0.38]]) { c.beginPath(); c.arc(x + d[0] * r, y + d[1] * r, r * 0.1, 0, TAU); c.fill(); }
      c.beginPath(); c.ellipse(x - r * 0.1, y - r * 0.72, r * 0.26, r * 0.12, -0.5, 0, TAU); c.fillStyle = '#5fd38a'; c.fill(); c.lineWidth = lw * 0.8; c.stroke();
      c.beginPath(); c.ellipse(x - r * 0.35, y - r * 0.3, r * 0.14, r * 0.08, -0.6, 0, TAU); c.fillStyle = 'rgba(255,255,255,.6)'; c.fill();
    }
    c.restore();
  }
  function cup(c, x, y, r) { /* fluted gold paper cup under a given */
    c.save(); c.beginPath(); const n = 14; for (let k = 0; k <= n; k++) { const a = k / n * TAU, q = r * (k % 2 ? 1.0 : 0.92); c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath();
    c.fillStyle = '#e8b54a'; c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#8a5a14'; c.stroke();
    c.beginPath(); c.arc(x, y, r * 0.78, 0, TAU); c.fillStyle = '#c98f2a'; c.fill(); c.restore();
  }

  /* in-level station: a chocolatier display cabinet with a tray */
  function station(c, x, y, t, solved) {
    c.save();
    c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(x, y, 16, 3, 0, 0, TAU); c.fill();
    rr(c, x - 14, y - 30, 28, 30, 4); c.fillStyle = '#7a4524'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke();
    rr(c, x - 11, y - 27, 22, 18, 2); c.fillStyle = 'rgba(200,235,255,.55)'; c.fill(); c.lineWidth = 1; c.stroke();
    c.fillStyle = '#5a2f14'; c.fillRect(x - 11, y - 18.5, 22, 1.4);
    const cols = [1, 2, 6, 4, 5, 3];
    for (let i = 0; i < 3; i++) drawPraline(c, cols[i], x - 7 + i * 7, y - 22, 2.6, {shadow: false});
    for (let i = 0; i < 3; i++) drawPraline(c, cols[i + 3], x - 7 + i * 7, y - 13, 2.6, {shadow: false});
    c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.moveTo(x - 9, y - 26); c.lineTo(x - 5, y - 26); c.lineTo(x - 10, y - 11); c.lineTo(x - 11, y - 14); c.closePath(); c.fill();
    rr(c, x - 12, y - 7, 24, 5, 2); c.fillStyle = '#c98657'; c.fill(); c.stroke();
    /* tray on top */
    c.beginPath(); c.ellipse(x, y - 31, 13, 3, 0, 0, TAU); c.fillStyle = '#e8e8f0'; c.fill(); c.lineWidth = 1.2; c.stroke();
    const b = solved ? Math.abs(Math.sin(t * 5)) * 2 : 0;
    drawPraline(c, 2, x - 5, y - 35 - b, 3.2, {shadow: false}); drawPraline(c, 1, x + 5, y - 35, 3.2, {shadow: false});
    if (solved) { for (let i = 0; i < 3; i++) { const k = (t * 0.8 + i / 3) % 1; c.globalAlpha = 1 - k; star(c, x - 10 + i * 10, y - 40 - k * 9, 2.4, GOLD); } c.globalAlpha = 1; }
    else { c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4); T(c, '?', x + 15, y - 38, 9, GOLD, {stroke: INK, sw: 2.5}); c.globalAlpha = 1; }
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
    const S = {sol: null, giv: null, val: null, notes: null, sel: -1, notesMode: false, won: false, wonT: 0, pop: new Array(36).fill(0), bad: new Array(36).fill(false), parts: [], hover: null, auto: false, lastWrongKey: ''};

    function newPuzzle() {
      const p = generate(rng);
      S.sol = p.sol; S.giv = p.puz.map(v => v > 0); S.val = p.puz.slice(); S.notes = S.val.map(() => 0);
      S.sel = -1; S.won = false; S.bad.fill(false); S.lastWrongKey = '';
      console.log('PZ_SUDOKU givens=' + p.givens + ' hiddenSingles=' + (p.hidden || 0) + ' unique=' + (count(p.puz.slice(), 2) === 1));
      for (let i = 0; i < 36; i++) S.pop[i] = S.giv[i] ? 0.6 + (ROW(i) + COL(i)) * 0.05 : 0;
    }

    function layout() {
      const w = Math.max(320, root.clientWidth), h = Math.max(180, root.clientHeight);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      if (w !== W || h !== H || cv.width !== Math.round(w * dpr)) { W = w; H = h; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      const pad = 8, small = H < 300;
      const B = Math.floor(Math.min(H - pad * 2 - 14, W * 0.46) / 6) * 6, cell = B / 6;
      const palW = Math.round(Math.max(170, Math.min(250, W * 0.27)));
      const infoW = Math.min(240, W - B - 14 - palW - pad * 4), showInfo = infoW >= 140;
      const free = W - palW - pad * 2 - (showInfo ? infoW + pad : 0);
      const bx = Math.round((showInfo ? pad + infoW : 0) + (free - B) / 2), by = Math.round((H - B) / 2);
      Lay = {pad, small, B, cell, palW, infoW, bx, by, px: W - palW - pad, showInfo};
    }

    /* ---------- game logic ---------- */
    function conflicts() {
      S.bad.fill(false);
      for (let i = 0; i < 36; i++) if (S.val[i]) for (const j of PEERS[i]) if (S.val[j] === S.val[i]) { S.bad[i] = true; break; }
    }
    function cellCenter(i) { return {x: Lay.bx + (COL(i) + 0.5) * Lay.cell, y: Lay.by + (ROW(i) + 0.5) * Lay.cell}; }
    function burst(x, y, n, cols, sp) { for (let k = 0; k < n; k++) { const a = rng() * TAU, v = (0.3 + rng()) * (sp || 110); S.parts.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0, max: 0.45 + rng() * 0.5, col: cols[k % cols.length], r: 1.5 + rng() * 2.5}); } }
    function put(v) {
      const i = S.sel; if (S.won) return;
      if (i < 0) { api.msg(tr('Tippe zuerst auf ein Feld in der Schachtel – dann auf die Praline.', 'First tap a square in the box – then the chocolate.'), 'info'); sfx('bump'); return; }
      if (S.giv[i]) { api.msg(tr('Diese Praline liegt fest im Goldförmchen.', 'This chocolate is fixed in its gold cup.'), 'info'); sfx('bump'); return; }
      if (S.notesMode && v) { if (S.val[i]) return; S.notes[i] ^= (1 << v); tone(700 + v * 60, 0.05, {type: 'sine', gain: 0.08}); return; }
      if (!v) { if (!S.val[i] && !S.notes[i]) return; S.val[i] = 0; S.notes[i] = 0; sfx('pop'); conflicts(); return; }
      if (S.val[i] === v) { S.val[i] = 0; sfx('pop'); conflicts(); return; }
      S.val[i] = v; S.notes[i] = 0; S.pop[i] = 1;
      for (const j of PEERS[i]) S.notes[j] &= ~(1 << v);
      conflicts();
      const c = cellCenter(i);
      if (S.bad[i]) { tone(180, 0.15, {type: 'square', gain: 0.06}); }
      else { try { if (G.audio && G.audio.sfx && G.audio.sfx.choco) G.audio.sfx.choco(); else sfx('pop'); } catch (e) {} burst(c.x, c.y, 7, [GOLD, CREAM, PINK], 90); }
      afterChange();
    }
    function afterChange() {
      if (S.val.every(v => v)) {
        if (S.bad.some(b => b)) { const key = S.val.join(''); if (key !== S.lastWrongKey) { S.lastWrongKey = key; api.wrong(tr('Alle Plätze voll – aber manche Pralinen stehen doppelt. Schau auf die roten!', 'Every spot is full – but some chocolates appear twice. Look at the red ones!')); } }
        else if (S.val.every((v, i) => v === S.sol[i])) win();
        else win(); /* a conflict-free full grid is always the unique solution */
      }
    }
    function win() {
      if (S.won) return; S.won = true; S.sel = -1; S.wonT = 0;
      sfx('star');
      for (let d = 0; d < 11; d++) later(() => { for (let i = 0; i < 36; i++) if (ROW(i) + COL(i) === d) { S.pop[i] = 1; const c = cellCenter(i); burst(c.x, c.y, 4, [GOLD, '#fff', PINK], 120); } tone(392 * Math.pow(2, d / 12 * 1.5), 0.1, {type: 'triangle', gain: 0.1}); draw(); }, d * 70);
      api.msg(tr('Perfekt sortiert – jede Praline am richtigen Platz!', 'Perfectly sorted – every chocolate in the right spot!'), 'good');
      later(() => api.solved(), 950);
    }
    function clearAll() { if (S.won) return; for (let i = 0; i < 36; i++) if (!S.giv[i]) { S.val[i] = 0; S.notes[i] = 0; } conflicts(); sfx('pop'); api.msg(tr('Alles weggeräumt – nur die Goldförmchen bleiben.', 'All cleared – only the gold cups stay.'), 'info'); }
    function fresh() { if (S.won) return; newPuzzle(); sfx('appear'); api.msg(tr('Neues Pralinen-Rätsel!', 'New chocolate puzzle!'), 'info'); }

    /* ---------- drawing ---------- */
    function button(x, y, w, h, fn, id, draw2, o) {
      o = o || {}; const hov = S.hover === id, on = !!o.on;
      rr(ctx, x, y + 3, w, h, 12); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fill();
      rr(ctx, x, y + (hov ? 1 : 0), w, h, 12); ctx.fillStyle = on ? '#ffe58a' : o.col || (hov ? '#fffaf0' : CREAM); ctx.fill(); ctx.lineWidth = on ? 3 : 2.2; ctx.strokeStyle = on ? '#c08a00' : INK; ctx.stroke();
      draw2(x, y + (hov ? 1 : 0), w, h);
      if (fn) hits.push({x, y, w, h, fn, id});
    }
    function drawInfo() {
      const L = Lay; if (!L.showInfo) return;
      const x = L.pad, y = L.by - 7, w = L.infoW, h = L.B + 14;
      rr(ctx, x, y, w, h, 14); ctx.fillStyle = 'rgba(255,244,224,.95)'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      rr(ctx, x, y, w, L.small ? 24 : 30, 14); ctx.fillStyle = '#c98657'; ctx.fill(); ctx.stroke();
      T(ctx, tr('Pralinen-Karte', 'Chocolate Guide'), x + w / 2, y + (L.small ? 12.5 : 15.5), L.small ? 13 : 15, CREAM, {stroke: 'rgba(42,21,8,.5)', sw: 3});
      const top = y + (L.small ? 30 : 40), rows = 6, rh = Math.min(L.small ? 24 : 30, (h - (top - y) - (L.small ? 48 : 70)) / rows);
      const cnt = [0, 0, 0, 0, 0, 0, 0]; for (const v of S.val) if (v) cnt[v]++;
      for (let v = 1; v <= 6; v++) {
        const yy = top + (v - 1) * rh + rh / 2, full = cnt[v] === 6;
        drawPraline(ctx, v, x + 20, yy, rh * 0.36, {shadow: false});
        T(ctx, NAMES[v - 1], x + 36, yy + 1, L.small ? 11.5 : 13, full ? '#3f8f57' : PLUM, {a: 'left', w: 600});
        T(ctx, cnt[v] + '/6', x + w - 12, yy + 1, L.small ? 10.5 : 12, full ? '#3f8f57' : 'rgba(122,59,87,.6)', {a: 'right', w: 600});
      }
      const ry = top + rows * rh + 6, lines = L.small ? tr(['1× pro Reihe, Spalte', 'und 2×3-Kästchen'], ['1× per row, column', 'and 2×3 box']) : tr(['Jede Praline genau 1×', 'pro Reihe, pro Spalte', 'und pro 2×3-Kästchen.'], ['Each chocolate exactly 1×', 'per row, per column', 'and per 2×3 box.']);
      ctx.strokeStyle = 'rgba(122,59,87,.25)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 10, ry); ctx.lineTo(x + w - 10, ry); ctx.stroke(); ctx.setLineDash([]);
      lines.forEach((ln, k) => T(ctx, ln, x + w / 2, ry + 12 + k * (L.small ? 13 : 15), L.small ? 10.5 : 12, PLUM, {w: 500}));
    }
    function drawBoard() {
      const L = Lay, x0 = L.bx, y0 = L.by, B = L.B, cs = L.cell;
      /* tray */
      rr(ctx, x0 - 7, y0 - 7, B + 14, B + 14, 14); ctx.fillStyle = '#5a2f14'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      rr(ctx, x0 - 4, y0 - 5, B + 8, 4, 2); ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fill();
      const selV = S.sel >= 0 ? S.val[S.sel] : 0;
      for (let i = 0; i < 36; i++) {
        const cx = x0 + COL(i) * cs, cy = y0 + ROW(i) * cs, inBox = BOX(i) % 2 === (Math.floor(BOX(i) / 2)) % 2;
        let bg = inBox ? '#fff1dc' : '#f6e0c0';
        if (S.giv[i]) bg = inBox ? '#efd3a8' : '#e6c492';
        if (S.sel >= 0 && (ROW(i) === ROW(S.sel) || COL(i) === COL(S.sel) || BOX(i) === BOX(S.sel))) bg = S.giv[i] ? '#f0cf9a' : '#ffe7c2';
        ctx.fillStyle = bg; ctx.fillRect(cx, cy, cs, cs);
        if (selV && S.val[i] === selV) { ctx.fillStyle = 'rgba(255,216,74,.35)'; ctx.fillRect(cx, cy, cs, cs); }
        if (S.bad[i]) { const a = 0.35 + 0.2 * Math.sin(time * 8); ctx.fillStyle = 'rgba(255,70,90,' + a + ')'; ctx.fillRect(cx, cy, cs, cs); }
        if (i === S.sel) { ctx.save(); ctx.lineWidth = 3.5; ctx.strokeStyle = ROSE; rr(ctx, cx + 2.5, cy + 2.5, cs - 5, cs - 5, 8); ctx.stroke(); ctx.restore(); }
        hits.push({x: cx, y: cy, w: cs, h: cs, id: 'cell', fn: () => { S.sel = S.sel === i ? -1 : i; sfx('select'); }});
      }
      /* grid lines */
      ctx.strokeStyle = 'rgba(90,47,20,.35)'; ctx.lineWidth = 1;
      for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.moveTo(x0 + k * cs, y0); ctx.lineTo(x0 + k * cs, y0 + B); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x0, y0 + k * cs); ctx.lineTo(x0 + B, y0 + k * cs); ctx.stroke(); }
      ctx.strokeStyle = '#5a2f14'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(x0 + 3 * cs, y0); ctx.lineTo(x0 + 3 * cs, y0 + B); ctx.stroke();
      for (const k of [2, 4]) { ctx.beginPath(); ctx.moveTo(x0, y0 + k * cs); ctx.lineTo(x0 + B, y0 + k * cs); ctx.stroke(); }
      /* pralines */
      for (let i = 0; i < 36; i++) {
        const c = cellCenter(i), v = S.val[i], p = S.pop[i];
        if (v) {
          if (S.giv[i]) cup(ctx, c.x, c.y + cs * 0.02, cs * 0.44);
          const k = 1 + Math.sin(Math.min(1, p) * Math.PI) * 0.25, wob = S.won ? Math.sin(time * 8 + i * 0.6) * cs * 0.04 : 0;
          drawPraline(ctx, v, c.x, c.y + wob - (S.giv[i] ? cs * 0.02 : 0), cs * 0.33 * k, {shadow: !S.giv[i]});
        } else if (S.notes[i]) {
          for (let n = 1; n <= 6; n++) if (S.notes[i] & (1 << n)) { const nx = c.x + ((n - 1) % 3 - 1) * cs * 0.3, ny = c.y + (Math.floor((n - 1) / 3) - 0.5) * cs * 0.38; drawPraline(ctx, n, nx, ny, cs * 0.11, {shadow: false}); }
        }
      }
    }
    function drawPalette() {
      const L = Lay, x = L.px, w = L.palW, small = L.small;
      const gap = small ? 6 : 8, bw = (w - gap * 2) / 3, avail = H - L.pad * 2 - (small ? 0 : 26);
      const textH = small ? Math.max(28, Math.min(34, avail * 0.15)) : 38;
      const bh = Math.max(26, Math.min(bw, small ? 52 : 64, (avail - textH * 2 - gap * 4) / 3));   /* always fits, even on very short screens */
      const total = bh * 3 + gap * 2 + gap + textH * 2 + gap + (small ? 0 : 26);
      let y = Math.max(L.pad, Math.round((H - total) / 2));
      if (!small) { T(ctx, S.notesMode ? tr('Notiz-Modus: kleine Merk-Pralinen', 'Notes mode: tiny reminders') : tr('Feld antippen, dann Praline', 'Tap a square, then a chocolate'), x + w / 2, y + 9, 12, S.notesMode ? GOLD : '#e6c9d6', {w: 600}); y += 26; }
      const cnt = [0, 0, 0, 0, 0, 0, 0]; for (const v of S.val) if (v) cnt[v]++;
      for (let v = 1; v <= 6; v++) {
        const bx = x + ((v - 1) % 3) * (bw + gap), by = y + Math.floor((v - 1) / 3) * (bh + gap);
        button(bx, by, bw, bh, () => put(v), 'v' + v, (X, Y, W2, H2) => {
          drawPraline(ctx, v, X + W2 / 2, Y + H2 / 2 - 1, Math.min(W2, H2) * 0.3);
          if (cnt[v] >= 6) { ctx.beginPath(); ctx.arc(X + W2 - 9, Y + 9, 7, 0, TAU); ctx.fillStyle = '#3f8f57'; ctx.fill(); T(ctx, '✓', X + W2 - 9, Y + 9.5, 9, '#fff'); }
        }, {on: S.notesMode ? false : (S.sel >= 0 && S.val[S.sel] === v)});
      }
      const ry = y + 2 * (bh + gap);
      button(x, ry, bw, bh, () => put(0), 'erase', (X, Y, W2, H2) => {
        ctx.save(); ctx.translate(X + W2 / 2, Y + H2 / 2); ctx.rotate(-0.5); rr(ctx, -W2 * 0.22, -H2 * 0.12, W2 * 0.44, H2 * 0.24, 4); ctx.fillStyle = '#ff9eb0'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); ctx.fillStyle = '#8fd3ff'; rr(ctx, -W2 * 0.22, -H2 * 0.12, W2 * 0.16, H2 * 0.24, 4); ctx.fill(); ctx.stroke(); ctx.restore();
        if (!small) T(ctx, tr('weg', 'erase'), X + W2 / 2, Y + H2 - 9, 10, PLUM, {w: 600});
      });
      button(x + bw + gap, ry, bw * 2 + gap, bh, () => { S.notesMode = !S.notesMode; sfx('select'); }, 'notes', (X, Y, W2, H2) => {
        ctx.save(); ctx.translate(X + 20, Y + H2 / 2); ctx.rotate(0.6); rr(ctx, -3, -12, 6, 20, 2); ctx.fillStyle = GOLD; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = INK; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-3, 8); ctx.lineTo(0, 13); ctx.lineTo(3, 8); ctx.fillStyle = CREAM; ctx.fill(); ctx.stroke(); ctx.restore();
        T(ctx, S.notesMode ? tr('Notizen: AN', 'Notes: ON') : tr('Notizen: aus', 'Notes: off'), X + W2 / 2 + 10, Y + H2 / 2 + 1, small ? 12 : 14, INK, {w: 700});
      }, {on: S.notesMode});
      const ty = ry + bh + gap + 2;
      const tb = (yy, label, fn, id, col) => button(x, yy, w, textH, fn, id, (X, Y, W2, H2) => T(ctx, label, X + W2 / 2, Y + H2 / 2 + 1, small ? 12.5 : 14, col === ROSE ? '#fff' : INK, {stroke: col === ROSE ? 'rgba(42,21,8,.35)' : null, sw: 3}), {col});
      tb(ty, tr('Alles leeren', 'Clear all'), clearAll, 'clear');
      tb(ty + textH + gap, tr('Neues Rätsel', 'New puzzle'), fresh, 'new', ROSE);
    }
    function draw() {
      if (!Lay) layout();
      hits = [];
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      /* chocolate backdrop: drips along the top */
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(90,47,20,.55)'); g.addColorStop(1, 'rgba(42,21,8,.35)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#6b3a1c'; ctx.beginPath(); ctx.moveTo(0, 0); for (let x = 0; x <= W; x += 24) { const d = 6 + ((x * 37) % 17) * 0.6 + Math.sin(time * 1.2 + x) * 1.5; ctx.lineTo(x, d); ctx.arc(x + 6, d, 6, Math.PI, 0, true); ctx.lineTo(x + 12, 4); } ctx.lineTo(W, 0); ctx.closePath(); ctx.fill();
      drawInfo(); drawBoard(); drawPalette();
      for (const p of S.parts) { ctx.globalAlpha = Math.max(0, 1 - p.life / p.max); star(ctx, p.x, p.y, p.r * 1.5, p.col); } ctx.globalAlpha = 1;
    }
    function step(dt) {
      time += dt;
      for (let i = 0; i < 36; i++) if (S.pop[i] > 0) S.pop[i] = Math.max(0, S.pop[i] - dt * 3.2);
      for (const p of S.parts) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; }
      S.parts = S.parts.filter(p => p.life < p.max);
    }
    function loop(now) { if (!alive) return; const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; step(dt); draw(); raf = requestAnimationFrame(loop); }

    function pos(e) { const r = cv.getBoundingClientRect(); return {x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height)}; }
    function hitAt(p) { for (let k = hits.length - 1; k >= 0; k--) { const h = hits[k]; if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) return h; } return null; }
    function onDown(e) { if (S.auto || S.won) return; const h = hitAt(pos(e)); if (h) { h.fn(); draw(); } }
    function onMove(e) { const h = hitAt(pos(e)), id = h ? h.id : null; cv.style.cursor = h ? 'pointer' : 'default'; if (id !== S.hover) { S.hover = id; draw(); } }
    function onKey(e) {
      if (S.auto || S.won) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 6) put(n);
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') put(0);
      else if (e.key === 'n' || e.key === 'N') S.notesMode = !S.notesMode;
      else if (e.key.startsWith('Arrow')) { if (S.sel < 0) S.sel = 0; else { const r = ROW(S.sel), c = COL(S.sel); S.sel = e.key === 'ArrowLeft' ? r * 6 + (c + 5) % 6 : e.key === 'ArrowRight' ? r * 6 + (c + 1) % 6 : e.key === 'ArrowUp' ? ((r + 5) % 6) * 6 + c : ((r + 1) % 6) * 6 + c; } e.preventDefault(); }
      else return;
      draw();
    }
    cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); window.addEventListener('keydown', onKey);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { layout(); draw(); }) : null; if (ro) ro.observe(root);

    newPuzzle(); layout(); draw();
    raf = requestAnimationFrame(loop);
    return {
      destroy() { alive = false; cancelAnimationFrame(raf); timers.forEach(clearTimeout); if (ro) ro.disconnect(); window.removeEventListener('keydown', onKey); },
      _state: () => S,
      autoSolve() {
        if (S.won) return; S.auto = true; S.sel = -1; S.notesMode = false;
        const todo = []; for (let i = 0; i < 36; i++) if (!S.giv[i] && S.val[i] !== S.sol[i]) todo.push(i);
        todo.sort((a, b) => (ROW(a) + COL(a)) - (ROW(b) + COL(b)));
        todo.forEach((i, k) => later(() => { S.val[i] = S.sol[i]; S.notes[i] = 0; S.pop[i] = 1; conflicts(); const c = cellCenter(i); burst(c.x, c.y, 4, [GOLD, CREAM], 80); tone(500 + (k % 6) * 70, 0.05, {type: 'sine', gain: 0.07}); draw(); }, 40 + k * 40));
        later(() => { conflicts(); win(); }, 120 + todo.length * 40);
      },
    };
  }

  const DEF = {
    id: 'schoko-sudoku', world: 'schoko', slot: 1,
    title: tr('Pralinen-Sudoku', 'Chocolate Sudoku'),
    intro: tr('Füll die Pralinenschachtel: Jede der sechs Pralinen darf in jeder Reihe, jeder Spalte und jedem dicken 2×3-Kästchen genau einmal liegen. Die Goldförmchen liegen schon fest.', 'Fill the box of chocolates: each of the six chocolates must sit exactly once in every row, every column and every thick 2×3 box. The ones in gold cups are already fixed.'),
    letter: tr('Jede Praline wohnt in jeder Reihe, jeder Spalte und jedem Kästchen genau einmal. Fang dort an, wo nur noch ein Plätzchen frei ist.', 'Each chocolate lives exactly once in every row, every column and every box. Start where only one little spot is left.'),
    hint: tr('Nimm dir EINE Praline vor (z. B. das Herz) und schau in jedes 2×3-Kästchen: Wo darf sie dort überhaupt noch hin? Wenn nur ein Feld übrig bleibt, gehört sie dorthin. Mit „Notizen“ kannst du dir die Möglichkeiten klein vormerken.', 'Pick ONE chocolate (e.g. the heart) and look into every 2×3 box: where can it still go in there? If only one square is left, that’s where it belongs. With “Notes” you can pencil in the options in small.'),
    station, mount,
  };
  if (G.PZ) G.PZ.register(DEF);
  else window.addEventListener('DOMContentLoaded', () => { if (G.PZ) G.PZ.register(DEF); });
})();
