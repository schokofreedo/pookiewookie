/* The Starway Home: the warp rooms. Every world's level-select hub is a themed portal room in the spirit of Crash Bandicoot's warp rooms:
   each level is a portal that looks different per world (cotton-candy lollipops, giant clams, diving bells, monkey idols, praline boxes,
   ice mirrors, obsidian rings, cloud arches, teleporter pads) with idle animation, done / next / near / boss states, scenery per world and
   the warp animation that pulls Toffo in. Loaded before p/hub.js; hub.js asks G.hubart for the layout and the hooks here draw everything:
   G.art.world (scenery + portals, behind Toffo), G.fx.playerFront (the warping Toffo), G.fx.overlay (the warp flash). */
(function () {
  const G = window.PW = window.PW || {}, T = 16, PI = Math.PI, TAU = PI * 2, GY = 13 * T;   /* GY: world y of the ground line */
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de);
  const S = () => G.S, P = () => G.P;
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v), lerp = (a, b, k) => a + (b - a) * k, mod = (a, n) => ((a % n) + n) % n;
  const ease = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  function rnd(seed) { let s = (seed * 9301 + 49297) % 233280 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function rgba(col, a) { if (col[0] !== '#') return col; const n = parseInt(col.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function rr(c, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.01, r), 0, TAU); }
  function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); }
  function fs(c, fill, stroke, lw) { if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); } }
  function rad(c, x, y, r0, r1, st) { const g = c.createRadialGradient(x, y, r0, x, y, r1); for (let i = 0; i < st.length; i += 2) g.addColorStop(st[i], st[i + 1]); return g; }
  function lin(c, x0, y0, x1, y1, st) { const g = c.createLinearGradient(x0, y0, x1, y1); for (let i = 0; i < st.length; i += 2) g.addColorStop(st[i], st[i + 1]); return g; }
  function glow(c, x, y, r, col, a) { if (!(a > 0.01)) return; c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rad(c, x, y, 0, r, [0, rgba(col, Math.min(1, a)), 0.45, rgba(col, Math.min(1, a) * 0.4), 1, rgba(col, 0)]); c.fillRect(x - r, y - r, r * 2, r * 2); c.restore(); }
  function star(c, x, y, r, n, inner) { c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -PI / 2 + i * PI / n, q = i % 2 ? r * (inner || 0.45) : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); }
  function line(c, x0, y0, x1, y1, col, lw) { c.strokeStyle = col; c.lineWidth = lw || 1; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
  const font = (c, px) => { c.font = 'bold ' + px + 'px "Fredoka", sans-serif'; c.textBaseline = 'middle'; c.textAlign = 'center'; };
  function tag(c, text, x, y, px, bg, col, border) { font(c, px); const w = c.measureText(text).width + px * 1.5, h = px * 1.8; rr(c, x - w / 2, y - h / 2, w, h, h / 2); fs(c, bg, border, 1); c.fillStyle = col; c.fillText(text, x, y + px * 0.08); return w; }
  /* a swirling vortex disc: radial gradient, rotating spiral arms and a bright core, clipped to the circle (sq squashes it vertically) */
  function vortex(c, x, y, r, t, cols, arms, dir, sq) {
    c.save(); c.translate(x, y); c.scale(1, sq || 1); circ(c, 0, 0, r); c.clip();
    c.fillStyle = rad(c, 0, 0, 0, r, [0, cols[0], 0.5, cols[1], 1, cols[2]]); c.fillRect(-r, -r, r * 2, r * 2);
    c.strokeStyle = cols[3]; c.lineCap = 'round'; c.globalAlpha = 0.6;
    for (let a = 0; a < arms; a++) { c.beginPath(); for (let k = 0; k <= 18; k++) { const u = k / 18, q = r * (0.06 + 0.98 * u), ang = (dir || 1) * (t * 2.6 + a * TAU / arms - u * 4.2); const px = Math.cos(ang) * q, py = Math.sin(ang) * q; if (k) c.lineTo(px, py); else c.moveTo(px, py); } c.lineWidth = 1 + r * 0.07; c.stroke(); }
    c.globalAlpha = 1; c.fillStyle = rad(c, 0, 0, 0, r * 0.4, [0, 'rgba(255,255,255,.85)', 1, 'rgba(255,255,255,0)']); c.fillRect(-r, -r, r * 2, r * 2);
    c.restore();
  }
  /* menacing boss eyes: glowing slits with angry brows, blinking now and then */
  function menace(c, x, y, dx, r, col, fr, noBrow) {
    const blink = fr % 170 < 7; glow(c, x, y, r * 5, col, 0.3);
    for (const d of [-1, 1]) { const ex = x + d * dx; if (blink) { line(c, ex - r, y, ex + r, y, col, 1.4); continue; } ell(c, ex, y, r, r * 0.75); fs(c, col); circ(c, ex + d * r * 0.2 + Math.sin(fr * 0.04) * r * 0.25, y + r * 0.1, r * 0.38); fs(c, '#1a0a14'); if (!noBrow) { c.lineCap = 'round'; line(c, ex + d * r * 1.15, y - r * 1.35, ex - d * r * 0.95, y - r * 0.6, '#1a0a14', r * 0.55); } }
  }
  function crown(c, x, y, r) { c.beginPath(); c.moveTo(x - r, y + r * 0.6); c.lineTo(x - r, y - r * 0.3); c.lineTo(x - r * 0.5, y + r * 0.1); c.lineTo(x, y - r * 0.85); c.lineTo(x + r * 0.5, y + r * 0.1); c.lineTo(x + r, y - r * 0.3); c.lineTo(x + r, y + r * 0.6); c.closePath(); fs(c, '#ffd84a', '#a0741a', 0.8); }
  function chain(c, x0, y0, x1, y1, n, col) { const dx = (x1 - x0) / n, dy = (y1 - y0) / n, ang = Math.atan2(dy, dx); c.strokeStyle = col; c.lineWidth = 1.1; for (let i = 0; i < n; i++) { ell(c, x0 + dx * (i + 0.5), y0 + dy * (i + 0.5), 2.4, 1.4, ang + (i % 2 ? PI / 2 : 0)); c.stroke(); } }
  function bolt(c, x0, y0, x1, y1, seed, segs, jag) { const r = rnd(seed); c.beginPath(); c.moveTo(x0, y0); for (let i = 1; i < segs; i++) { const u = i / segs; c.lineTo(lerp(x0, x1, u) + (r() - 0.5) * jag, lerp(y0, y1, u) + (r() - 0.5) * jag); } c.lineTo(x1, y1); }
  /* a cloud: a row of circles over a flat base, centred on x with its bottom at y */
  function puff(c, x, y, w, h) { c.beginPath(); const n = Math.max(2, Math.round(w / (h * 0.8))); for (let i = 0; i < n; i++) { const u = i / (n - 1), cx = x - w / 2 + h * 0.45 + u * (w - h * 0.9), r = h * (0.4 + 0.25 * Math.sin(u * PI)); c.moveTo(cx + r, y - r * 0.9); c.arc(cx, y - r * 0.9, r, 0, TAU); } c.rect(x - w / 2 + h * 0.2, y - h * 0.5, w - h * 0.4, h * 0.5); }
  function palm(c, x, y, h, lean, fr) {
    c.strokeStyle = '#b9793f'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + lean * 0.3, y - h * 0.55, x + lean, y - h); c.stroke();
    c.strokeStyle = 'rgba(90,50,20,.35)'; c.lineWidth = 1; for (let i = 1; i < 6; i++) { const u = i / 6, px = x + lean * (0.6 * u * u + 0.4 * u), py = y - h * u; c.beginPath(); c.moveTo(px - 2.5, py); c.lineTo(px + 2.5, py); c.stroke(); }
    const tx = x + lean, ty = y - h, sway = Math.sin(fr * 0.03 + x) * 0.06;
    for (let i = 0; i < 6; i++) { const a = -PI * 0.1 - i * PI * 0.16 + sway, len = 26 + (i % 2) * 6; c.save(); c.translate(tx, ty); c.rotate(a); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -6, len, 4); c.quadraticCurveTo(len * 0.5, 2, 0, 0); c.closePath(); fs(c, i % 2 ? '#3fbf6b' : '#2f9a56'); c.restore(); }
    for (let i = 0; i < 3; i++) { circ(c, tx - 4 + i * 4, ty + 3 + (i % 2) * 2, 2.6); fs(c, '#8a5a2b', '#5a3a1a', 0.8); }
  }
  /* offscreen cache keyed by the context scale (static scenery) */
  const cache = new Map();
  function scaleOf(c) { let a = 1; try { const m = c.getTransform(); a = Math.hypot(m.a, m.b); } catch (e) {} return clamp(Math.round(a * 4) / 4, 1, 4); }
  function spr(c, key, w, h, fn) { const sk = scaleOf(c), k = key + '@' + sk; let s = cache.get(k); if (s) return s; if (cache.size > 40) cache.clear(); const cv = document.createElement('canvas'); cv.width = Math.ceil(w * sk); cv.height = Math.ceil(h * sk); const g = cv.getContext('2d'); g.setTransform(sk, 0, 0, sk, 0, 0); g.lineJoin = 'round'; g.lineCap = 'round'; fn(g, w, h); s = {c: cv, w, h}; cache.set(k, s); return s; }
  const blit = (c, s, x, y) => c.drawImage(s.c, x, y, s.w, s.h);

  /* ================= layouts: ground profile (row of the ground top per column), portal columns and decor ================= */
  function flat() { return Array(52).fill(13); }
  function raise(tops, a, b, top) { for (let x = a; x <= b; x++) tops[x] = top; return tops; }
  const LAYOUT = {
    wiese: () => ({tops: flat(), signCols: [10, 20, 30, 41], deco: [[7, 'h'], [12, 'd'], [15, 'p'], [25, 'h'], [27, 'd'], [35, 'p'], [45, 'h']]}),
    insel: () => ({tops: flat(), signCols: [10, 20, 30, 41], deco: [[7, 'h'], [13, 'd'], [15, 'p'], [33, 'd'], [44, 'h']]}),
    unterwasser: () => ({tops: flat(), signCols: [10, 20, 30, 41], deco: [[7, 'h'], [26, 'd'], [36, 'h'], [45, 'h']]}),
    dschungel: () => ({tops: raise(raise(raise(flat(), 18, 27, 12), 28, 35, 11), 36, 44, 12), signCols: [10, 22, 32, 41], deco: [[7, 'h'], [14, 'd'], [16, 'p'], [26, 'h'], [27, 'p'], [37, 'd'], [45, 'h']]}),
    schoko: () => ({tops: flat(), signCols: [10, 20, 30, 41], deco: [[7, 'h'], [13, 'd'], [15, 'p'], [35, 'p'], [38, 'd'], [45, 'h']]}),
    schnee: () => ({tops: flat(), signCols: [10, 20, 30, 41], deco: [[7, 'h'], [13, 'd'], [15, 'p'], [25, 'p'], [36, 'd'], [45, 'h']]}),
    lava: () => ({tops: raise(raise(raise(flat(), 12, 27, 12), 28, 33, 11), 34, 37, 12), signCols: [10, 21, 31, 41], deco: [[7, 'h'], [14, 'p'], [16, 'd'], [26, 'p'], [27, 'd'], [36, 'p'], [45, 'h']]}),
    himmel: () => ({tops: raise(raise(raise(flat(), 16, 24, 11), 28, 34, 10), 35, 38, 12), signCols: [10, 20, 31, 41], deco: [[7, 'h'], [13, 'd'], [16, 'p'], [26, 'd'], [36, 'h'], [45, 'h']]}),
    weltraum: () => ({tops: flat(), signCols: [10, 20, 30, 41], deco: [[7, 'h'], [14, 'p'], [25, 'd'], [36, 'p'], [45, 'h']]}),
  };
  /* where the portal mouth is (offset from the portal's ground point) and its radius: the warp pulls Toffo there */
  const MOUTH = {wiese: [0, -46, 14], insel: [0, -24, 10], unterwasser: [0, -36, 12], dschungel: [0, -18, 11], schoko: [0, -30, 12], schnee: [0, -38, 14], lava: [0, -42, 16], himmel: [0, -34, 14], weltraum: [0, -34, 12]};

  /* ================= portals: each draws at (x = centre, y = ground line) and returns badge / top positions ================= */
  const PORTAL = {};
  const COLS3 = [['#ffb3c6', '#ff8fb0', '#ff6f9c'], ['#8fd3ff', '#6ab8f0', '#4a9ae0'], ['#c9b8f0', '#b39ae8', '#9a7ad8']];

  /* Zuckerwattewiese: cotton candy on giant lollipop sticks */
  PORTAL.wiese = function (c, x, y, st, fr) {
    const t = fr / 60, col = st.boss ? ['#c7ef6b', '#9ac84a', '#5a7a2a'] : COLS3[st.i], cy = y - 46, r = 20 + st.pulse * 1.2 + st.k * 2.5;
    ell(c, x, y - 2, 22, 6); fs(c, '#fff', '#e6c9d6', 1); ell(c, x, y - 3, 16, 3.5); fs(c, '#ffe6f0');
    c.fillStyle = '#fff'; rr(c, x - 2.6, y - 32, 5.2, 31, 2.6); c.fill(); c.save(); rr(c, x - 2.6, y - 32, 5.2, 31, 2.6); c.clip(); c.strokeStyle = st.boss ? '#7a3b57' : '#e23a3a'; c.lineWidth = 2; for (let i = -34; i < 4; i += 6) line(c, x - 5, y + i, x + 5, y + i - 7, c.strokeStyle, 2); c.restore(); rr(c, x - 2.6, y - 32, 5.2, 31, 2.6); fs(c, null, 'rgba(122,59,87,.45)', 0.8);
    glow(c, x, cy, r * 2.4, col[1], st.glow);
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + t * 0.35, q = r * 0.76; circ(c, x + Math.cos(a) * q, cy + Math.sin(a) * q * 0.92, r * 0.43); fs(c, i % 2 ? col[0] : col[1]); }
    circ(c, x, cy, r * 0.9); fs(c, col[0]);
    vortex(c, x, cy, r * 0.62, t * (st.near ? 1.7 : 1), ['#fff', col[1], col[2], 'rgba(255,255,255,.95)'], 3, 1);
    for (let i = 0; i < 6; i++) { const a = t * 1.2 + i * TAU / 6, px = x + Math.cos(a) * (r + 7), py = cy + Math.sin(a) * (r * 0.55 + 3) - 2; star(c, px, py, 1.8 + (i % 2) * 1.2, 4, 0.4); fs(c, 'rgba(255,255,255,.9)'); }
    if (st.boss) { menace(c, x, cy - 3, 7, 3.4, '#f4ff9a', fr); c.lineCap = 'round'; line(c, x - 5, cy + 7, x + 5, cy + 7, '#2a1a3a', 1.6); }
    return {top: cy - r - 6, badge: [x - r + 1, cy - r + 7]};
  };
  /* Kokosinsel: giant clam shells with a glowing pearl */
  PORTAL.insel = function (c, x, y, st, fr) {
    const t = fr / 60, open = clamp(0.45 + st.k * 0.4 + (st.next ? st.pulse * 0.12 : 0) + st.warp * 0.3, 0, 1), sh = st.boss ? ['#4a2a5a', '#2e1a3a', '#6a4a7a'] : [['#ffb3c6', '#e8738f', '#ffe0ea'], ['#ffd27a', '#e0a040', '#fff0c8'], ['#bfe2ff', '#7fb8e6', '#eaf6ff']][st.i];
    ell(c, x, y - 1, 32, 6); fs(c, '#f3d9a4');
    const py = y - 24, pr = 8.5 + st.k * 1.5, lidH = 9 + 24 * open;
    /* the lid: a half ellipse that rises as it opens, pearly inside */
    c.beginPath(); c.ellipse(x, y - 12, 27, lidH, 0, PI, TAU); c.closePath(); fs(c, lin(c, x, y - 12 - lidH, x, y - 12, [0, sh[0], 1, sh[2]]), sh[1], 1.3);
    c.save(); c.beginPath(); c.ellipse(x, y - 12, 27, lidH, 0, PI, TAU); c.clip(); c.strokeStyle = rgba(sh[1], 0.5); c.lineWidth = 1; for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(x, y - 12); c.lineTo(x + i * 7, y - 12 - lidH - 2); c.stroke(); } c.restore();
    glow(c, x, py, 36, st.boss ? '#c060ff' : '#fff6c0', st.glow + 0.1);
    if (st.boss) { for (const d of [-1, 1]) { c.lineCap = 'round'; line(c, x + d * 5, y - 14, x + d * 9, y - 34 + Math.sin(t * 3 + d) * 2, '#c43a1f', 2.4); circ(c, x + d * 9, y - 35 + Math.sin(t * 3 + d) * 2, 3.2); fs(c, '#ff6a4a', '#7a1a0a', 0.8); circ(c, x + d * 9.6, y - 35 + Math.sin(t * 3 + d) * 2, 1.4); fs(c, '#1a0a14'); } }
    vortex(c, x, py, pr + 5, t, [st.boss ? '#e0c0ff' : '#fff', st.boss ? '#8a4ab0' : '#ffd6e2', st.boss ? '#4a2a7a' : '#e8738f', 'rgba(255,255,255,.9)'], 3, -1);
    circ(c, x, py, pr); fs(c, rad(c, x - 2, py - 3, 1, pr, [0, '#fff', 0.6, st.boss ? '#d8b0ff' : '#ffe9f0', 1, st.boss ? '#8a5ab0' : '#f0a8c0'])); circ(c, x - 3, py - 3, 2); fs(c, 'rgba(255,255,255,.95)');
    /* the bottom shell with ridges */
    c.beginPath(); c.ellipse(x, y - 9, 27, 11, 0, 0, PI); c.closePath(); fs(c, lin(c, x, y - 9, x, y + 2, [0, sh[0], 1, sh[1]]), sh[1], 1.3);
    c.save(); c.beginPath(); c.ellipse(x, y - 9, 27, 11, 0, 0, PI); c.clip(); c.strokeStyle = rgba(sh[1], 0.55); for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(x, y - 9); c.lineTo(x + i * 7, y + 4); c.stroke(); } c.restore();
    for (let i = 0; i < 4; i++) { const u = mod(t * 0.5 + i * 0.25, 1); circ(c, x + Math.sin(u * 7 + i) * 10, py - 10 - u * 28, 1.5 + (i % 2) * 0.8); fs(c, 'rgba(255,255,255,' + (0.8 * (1 - u)) + ')'); }
    return {top: y - 12 - lidH - 6, badge: [x - 30, y - 16]};
  };
  /* Korallenmeer: brass diving bells hanging from a crane */
  PORTAL.unterwasser = function (c, x, y, st, fr) {
    const t = fr / 60, br = st.boss ? ['#5a4a6a', '#2a1a3a', '#8a7a9a'] : ['#e0a040', '#b07820', '#fff0c8'], sw = Math.sin(t * 1.3 + st.i) * 1.2;
    rr(c, x - 24, y - 6, 48, 6, 2); fs(c, '#b9793f', '#8a5a2b', 1); for (let i = 0; i < 5; i++) line(c, x - 20 + i * 10, y - 6, x - 20 + i * 10, y, 'rgba(90,50,20,.4)', 1);
    /* the harbour crane: mast, boom, brace and pulley; the bell hangs from its cable */
    rr(c, x + 29, y - 126, 6, 126, 2); fs(c, '#4a4a54', '#2a2a30', 1); c.fillStyle = '#ffd84a'; for (let i = 0; i < 6; i++) c.fillRect(x + 29, y - 120 + i * 20, 6, 6);
    rr(c, x - 8, y - 128, 44, 5, 2); fs(c, '#5a5a66', '#2a2a30', 1); line(c, x + 32, y - 100, x + 2, y - 124, '#5a5a66', 2.5); rr(c, x + 24, y - 20, 16, 8, 2); fs(c, '#3a3a44', '#2a2a30', 1);
    circ(c, x - 2, y - 124, 4); fs(c, '#8a94a8', '#2a2a30', 1); circ(c, x - 2, y - 124, 1.4); fs(c, '#2a2a30');
    line(c, x - 2, y - 122, x + sw * 0.4, y - 68, '#3a3a44', 1.6); circ(c, x + sw * 0.4, y - 66, 3.5); fs(c, '#8a94a8', '#3a3a44', 1);
    c.save(); c.translate(sw * 0.3, 0);
    c.beginPath(); c.moveTo(x - 14, y - 60); c.quadraticCurveTo(x - 24, y - 50, x - 22, y - 8); c.lineTo(x + 22, y - 8); c.quadraticCurveTo(x + 24, y - 50, x + 14, y - 60); c.closePath(); fs(c, lin(c, x - 22, 0, x + 22, 0, [0, br[1], 0.35, br[0], 0.7, br[2], 1, br[1]]), '#5a3a10', 1.3);
    rr(c, x - 24, y - 14, 48, 8, 3); fs(c, br[1], '#3a2a10', 1); rr(c, x - 16, y - 64, 32, 7, 3); fs(c, br[1], '#3a2a10', 1);
    c.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 5; i++) { circ(c, x - 18 + i * 9, y - 11, 1); c.fill(); circ(c, x - 12 + i * 6, y - 60, 0.9); c.fill(); }
    glow(c, x, y - 36, 34, st.boss ? '#c060ff' : '#5ff6ff', st.glow);
    circ(c, x, y - 36, 13); fs(c, '#1a3a5a'); vortex(c, x, y - 36, 12, t, st.boss ? ['#e0c0ff', '#6a3aa0', '#2a1050', 'rgba(220,180,255,.9)'] : ['#dff8ff', '#3aa0e8', '#0a3a7a', 'rgba(255,255,255,.95)'], 3, 1);
    circ(c, x, y - 36, 13); fs(c, null, '#5a3a10', 3); circ(c, x, y - 36, 13); fs(c, null, br[0], 1.4); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; circ(c, x + Math.cos(a) * 13, y - 36 + Math.sin(a) * 13, 1.1); fs(c, '#5a3a10'); }
    if (st.boss) { menace(c, x, y - 38, 5, 2.6, '#ff9eff', fr); for (const d of [-1, 1]) { c.strokeStyle = '#8a4ab0'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + d * 20, y - 6); c.quadraticCurveTo(x + d * 30, y - 30 + Math.sin(t * 2 + d) * 3, x + d * 12, y - 52); c.stroke(); c.fillStyle = '#d8a0ff'; for (let k = 0; k < 4; k++) { const u = k / 4 + 0.1, px = x + d * (20 + (30 - 20) * (1 - u) * 2 * u * 2 - 8 * u * u) * 0.9, py = y - 6 - 46 * u; circ(c, px, py, 1.1); c.fill(); } } }
    for (let i = 0; i < 5; i++) { const u = mod(t * 0.45 + i * 0.2, 1); circ(c, x - 10 + i * 5 + Math.sin(u * 9 + i) * 3, y - 22 - u * 60, 1.2 + (i % 3) * 0.6); fs(c, 'rgba(255,255,255,' + (0.7 * (1 - u)) + ')'); }
    c.restore();
    return {top: y - 76, badge: [x - 22, y - 58]};
  };
  /* Dschungel: ancient stone monkey idols, the open mouth is the doorway */
  PORTAL.dschungel = function (c, x, y, st, fr) {
    const t = fr / 60, stone = st.boss ? ['#5a5a54', '#3a3a36', '#7a7a70'] : ['#9a9a88', '#6e6e60', '#b8b8a6'], eye = st.boss ? '#ff4a3a' : (st.done ? '#9be7a5' : '#ffd84a');
    rr(c, x - 28, y - 6, 56, 6, 2); fs(c, stone[1], '#2a2a24', 1);
    for (const d of [-1, 1]) { circ(c, x + d * 23, y - 44, 10); fs(c, stone[0], '#2a2a24', 1.2); circ(c, x + d * 23, y - 44, 5.5); fs(c, stone[1]); }
    rr(c, x - 22, y - 66, 44, 62, 10); fs(c, lin(c, x - 22, 0, x + 22, 0, [0, stone[1], 0.4, stone[0], 1, stone[1]]), '#2a2a24', 1.3);
    c.fillStyle = 'rgba(40,120,60,.55)'; ell(c, x - 12, y - 62, 9, 4, 0.3); c.fill(); ell(c, x + 14, y - 30, 6, 3, -0.4); c.fill(); ell(c, x - 18, y - 20, 5, 3, 0.2); c.fill();
    c.strokeStyle = 'rgba(42,42,36,.5)'; c.lineWidth = 1; for (let i = 0; i < 3; i++) line(c, x - 20, y - 56 + i * 14, x + 20, y - 56 + i * 14, c.strokeStyle, 1);
    rr(c, x - 16, y - 56, 32, 8, 3); fs(c, stone[1], '#2a2a24', 1);
    for (const d of [-1, 1]) { ell(c, x + d * 9, y - 46, 6.5, 5.5); fs(c, '#1e1e1a'); glow(c, x + d * 9, y - 46, 12, eye, 0.5 + st.k * 0.4 + st.pulse * 0.2); circ(c, x + d * 9 + Math.sin(t * 1.1) * 1.5, y - 46, 3.2 + st.pulse * 0.6); fs(c, eye); circ(c, x + d * 9 + Math.sin(t * 1.1) * 1.5 - 1, y - 47, 1); fs(c, '#fff'); }
    c.beginPath(); c.moveTo(x - 3, y - 40); c.lineTo(x + 3, y - 40); c.lineTo(x + 5, y - 33); c.lineTo(x - 5, y - 33); c.closePath(); fs(c, stone[1]);
    /* the mouth: an arched doorway with a swirling glow and teeth */
    c.save(); c.beginPath(); c.moveTo(x - 13, y - 4); c.lineTo(x - 13, y - 20); c.arc(x, y - 20, 13, PI, 0); c.lineTo(x + 13, y - 4); c.closePath(); c.clip();
    c.fillStyle = '#0e1a10'; c.fillRect(x - 14, y - 36, 28, 34); vortex(c, x, y - 17, 13, t, st.boss ? ['#ffd0a0', '#c0402a', '#3a0a0a', 'rgba(255,200,120,.9)'] : ['#eaffd0', '#4fa65a', '#143a1a', 'rgba(200,255,160,.9)'], 3, 1, 1.25);
    c.restore(); c.beginPath(); c.moveTo(x - 13, y - 4); c.lineTo(x - 13, y - 20); c.arc(x, y - 20, 13, PI, 0); c.lineTo(x + 13, y - 4); fs(c, null, '#2a2a24', 1.5);
    c.fillStyle = '#e8e8d8'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x - 9 + i * 6, y - 31); c.lineTo(x - 6 + i * 6, y - 25); c.lineTo(x - 3 + i * 6, y - 31); c.closePath(); c.fill(); }
    glow(c, x, y - 18, 30, st.boss ? '#ff8a3a' : '#9be7a5', st.glow * 0.8);
    if (st.boss) { crown(c, x, y - 70, 9); c.lineCap = 'round'; line(c, x - 8, y - 38, x + 8, y - 38, '#1a0a0a', 2.2); }
    c.strokeStyle = '#3a9a46'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - 24, y - 70); c.quadraticCurveTo(x - 30, y - 40 + Math.sin(t) * 2, x - 26, y - 12); c.stroke(); c.beginPath(); c.moveTo(x + 18, y - 72); c.quadraticCurveTo(x + 30, y - 50, x + 26, y - 30 + Math.sin(t + 1) * 2); c.stroke();
    c.fillStyle = '#4fbf5f'; for (const [lx, ly] of [[x - 29, y - 50], [x - 27, y - 24], [x + 27, y - 44], [x + 24, y - 60]]) { ell(c, lx, ly, 4, 2.2, 0.5); c.fill(); }
    return {top: y - 78, badge: [x - 20, y - 70]};
  };
  /* Schokoladenland: praline boxes with an open lid and a chocolate whirl; the boss gate is a dark-chocolate dragon mouth */
  PORTAL.schoko = function (c, x, y, st, fr) {
    const t = fr / 60;
    if (st.boss) {
      rr(c, x - 30, y - 6, 60, 6, 2); fs(c, '#3a1a0c', '#1a0a04', 1);
      for (const d of [-1, 1]) { c.save(); c.translate(x + d * 18, y - 66); c.rotate(d * 0.5); rr(c, -2.2, -14, 4.4, 16, 2); fs(c, '#e8b878', '#5a3a10', 1); c.restore(); }
      rr(c, x - 28, y - 70, 56, 66, 16); fs(c, lin(c, x - 28, 0, x + 28, 0, [0, '#2e1408', 0.4, '#4a2210', 1, '#2e1408']), '#120602', 1.5);
      for (const d of [-1, 1]) { ell(c, x + d * 13, y - 52, 7, 6); fs(c, '#1a0a04'); glow(c, x + d * 13, y - 52, 14, '#ff9a2a', 0.5 + st.k * 0.4); ell(c, x + d * 13, y - 52, 4.5, 3.6); fs(c, '#ffb347'); circ(c, x + d * 13 + 1, y - 52, 1.6); fs(c, '#3a0a0a'); c.lineCap = 'round'; line(c, x + d * 20, y - 62, x + d * 7, y - 57, '#120602', 2.4); }
      for (const d of [-1, 1]) { circ(c, x + d * 4, y - 40, 1.6); fs(c, '#120602'); }
      c.save(); rr(c, x - 18, y - 36, 36, 34, 6); c.clip(); c.fillStyle = '#1a0602'; c.fillRect(x - 18, y - 36, 36, 34); vortex(c, x, y - 19, 18, t, ['#fff2a0', '#ff8a2a', '#5a1a08', 'rgba(255,230,160,.9)'], 4, 1, 0.9); c.restore();
      rr(c, x - 18, y - 36, 36, 34, 6); fs(c, null, '#120602', 1.6); glow(c, x, y - 20, 34, '#ff9a2a', st.glow);
      c.fillStyle = '#fff1dc'; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(x - 15 + i * 7, y - 36); c.lineTo(x - 12 + i * 7, y - 29); c.lineTo(x - 9 + i * 7, y - 36); c.closePath(); c.fill(); c.beginPath(); c.moveTo(x - 13 + i * 7, y - 2); c.lineTo(x - 10 + i * 7, y - 9); c.lineTo(x - 7 + i * 7, y - 2); c.closePath(); c.fill(); }
      return {top: y - 84, badge: [x - 26, y - 76]};
    }
    const box = [['#ff6f9c', '#c9305f', '#ffb3c6'], ['#ffd84a', '#c89a1a', '#fff0b0'], ['#b39ae8', '#6f55b8', '#d9ccf7']][st.i], open = clamp(0.55 + st.k * 0.35 + (st.next ? st.pulse * 0.1 : 0) + st.warp * 0.2, 0, 1), lidH = 6 + 16 * open;
    ell(c, x, y - 1, 28, 5); fs(c, 'rgba(60,30,10,.25)');
    /* the lid, hinged at the back, pearly inside, with a bow on top */
    ell(c, x, y - 30 - lidH, 24, lidH); fs(c, lin(c, x, y - 30 - lidH * 2, x, y - 30, [0, box[0], 1, box[2]]), box[1], 1.2); ell(c, x, y - 30 - lidH, 20, lidH * 0.75); fs(c, rgba(box[2], 0.8));
    c.save(); c.translate(x, y - 30 - lidH * 2 + 2); for (const d of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(d * 5, -7, d * 9, -2); c.quadraticCurveTo(d * 7, 2, 0, 0); c.closePath(); fs(c, '#fff', box[1], 0.8); } circ(c, 0, 0, 2); fs(c, box[1]); c.restore();
    /* the box: round, with a gold band and the chocolate whirl inside */
    rr(c, x - 24, y - 30, 48, 30, 5); fs(c, lin(c, x - 24, 0, x + 24, 0, [0, box[1], 0.3, box[0], 0.7, box[0], 1, box[1]]), box[1], 1.2);
    c.fillStyle = '#ffd84a'; c.fillRect(x - 24, y - 18, 48, 4); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x - 24, y - 17, 48, 1);
    ell(c, x, y - 30, 24, 7); fs(c, '#3a1a0c', box[1], 1.2);
    vortex(c, x, y - 30, 21, t * (st.near ? 1.5 : 1), ['#fff1dc', '#8a5030', '#2e1408', 'rgba(255,230,200,.85)'], 4, 1, 0.3);
    glow(c, x, y - 30, 30, '#ffb347', st.glow);
    for (let i = 0; i < 4; i++) { const px = x - 15 + i * 10, u = mod(t * 0.4 + i * 0.3, 1); c.fillStyle = '#5a2e14'; ell(c, px, y - 30 - u * 14, 1.6, 2.2 + u); c.fill(); }
    for (let i = 0; i < 3; i++) { circ(c, x - 10 + i * 10, y - 6 + (i % 2) * 2, 3.2); fs(c, i === 1 ? '#fff1dc' : '#5a2e14', '#2e1408', 0.7); circ(c, x - 11 + i * 10, y - 7 + (i % 2) * 2, 1); fs(c, 'rgba(255,255,255,.5)'); }
    return {top: y - 34 - lidH * 2 - 4, badge: [x - 24, y - 36]};
  };
  /* Schneeland: tall ice mirrors that reflect Toffo; the boss mirror is cracked with yeti eyes behind the glass */
  PORTAL.schnee = function (c, x, y, st, fr) {
    const t = fr / 60, p = P(), fr0 = st.boss ? ['#6a7ab0', '#3a4a80', '#9ab0e0'] : ['#bfe2ff', '#7fb8e6', '#ffffff'];
    rr(c, x - 24, y - 7, 48, 7, 3); fs(c, lin(c, x, y - 7, x, y, [0, '#eaf6ff', 1, '#9fd0f0']), '#5aa0d0', 1); rr(c, x - 18, y - 11, 36, 4, 2); fs(c, '#dbeaff', '#7fb8e6', 1);
    glow(c, x, y - 40, 44, st.boss ? '#8fa0ff' : '#bfe2ff', st.glow * 0.9);
    rr(c, x - 21, y - 76, 42, 66, 8); fs(c, lin(c, x - 21, 0, x + 21, 0, [0, fr0[1], 0.3, fr0[0], 0.7, fr0[2], 1, fr0[1]]), '#4a80b0', 1.4);
    for (const d of [-1, 1]) { circ(c, x + d * 20, y - 76, 4); fs(c, fr0[2], '#5aa0d0', 1); circ(c, x + d * 20, y - 12, 4); fs(c, fr0[2], '#5aa0d0', 1); }
    const gx = x - 16, gy = y - 71, gw = 32, gh = 56;
    rr(c, gx, gy, gw, gh, 5); fs(c, st.boss ? lin(c, 0, gy, 0, gy + gh, [0, '#1a2a5a', 0.5, '#2a4a8a', 1, '#4a7ab0']) : lin(c, 0, gy, 0, gy + gh, [0, '#eaf6ff', 0.5, '#aad6ff', 1, '#7fc0f0']));
    c.save(); rr(c, gx, gy, gw, gh, 5); c.clip();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(gx + 2, gy + 30); c.lineTo(gx + 14, gy); c.lineTo(gx + 20, gy); c.lineTo(gx + 2, gy + 42); c.closePath(); c.fill(); c.beginPath(); c.moveTo(gx + 10, gy + gh); c.lineTo(gx + gw, gy + 20); c.lineTo(gx + gw, gy + 26); c.lineTo(gx + 16, gy + gh); c.closePath(); c.fill();
    if (st.boss) { menace(c, x, y - 44, 7, 3.6, '#e8f4ff', fr); c.fillStyle = '#fff'; for (const d of [-1, 1]) { c.beginPath(); c.moveTo(x + d * 6, y - 30); c.lineTo(x + d * 4, y - 23); c.lineTo(x + d * 2, y - 30); c.closePath(); c.fill(); } c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1; for (const [ax, ay, bx, by] of [[gx + 4, gy + 6, x - 2, y - 44], [x - 2, y - 44, x + 9, y - 60], [x - 2, y - 44, x - 6, y - 24], [x - 2, y - 44, gx + gw - 3, y - 36], [x - 6, y - 24, gx + 3, y - 18]]) line(c, ax, ay, bx, by, c.strokeStyle, 1); }
    else if (st.k > 0.03 && G.draw && G.draw.drawBearAt && p && !p.hidden) {
      /* the reflection: a bluish mirrored Toffo in the glass, same pose, mirrored about the centre and a little higher so it peeks out behind him */
      const pose = !p.onGround ? (p.vy < 0 ? 'jump' : 'fall') : (Math.abs(p.vx) > 0.1 ? 'run' : 'idle'), rx = x - (p.x + 6 - x) * 0.6;
      c.globalAlpha = 0.65 * clamp(st.k * 1.4, 0, 1);
      try { G.draw.drawBearAt(c, rx, p.y + p.h - 19, {scale: 0.82, facing: -(p.facing || 1), pose, t, frame: p.anim || 0, speed: clamp(Math.abs(p.vx) / 2.6, 0, 1), outfit: S().outfit, pal: {fur: '#9fc0f0', dark: '#6a8ad0', belly: '#dbeaff', ear: '#bcd6ff', outline: '#3a5a9a'}}); } catch (e) {}
      c.globalAlpha = 1;
    }
    c.restore(); rr(c, gx, gy, gw, gh, 5); fs(c, null, 'rgba(255,255,255,.7)', 1);
    for (let i = 0; i < 5; i++) { const u = mod(t * 0.25 + i * 0.2, 1), px = x - 22 + Math.sin(u * 6 + i * 2) * 4 + i * 11, py = y - 10 - u * 72; star(c, px, py, 1.5 + (i % 2), 4, 0.3); fs(c, 'rgba(255,255,255,' + (0.9 * Math.sin(u * PI)) + ')'); }
    star(c, x, y - 82, 7, 6, 0.5); fs(c, '#fff', '#7fb8e6', 1); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU - PI / 2; line(c, x, y - 82, x + Math.cos(a) * 6, y - 82 + Math.sin(a) * 6, '#7fb8e6', 0.8); }
    return {top: y - 92, badge: [x - 26, y - 74]};
  };
  /* Lavawelt: obsidian rings with swirling magma, embers and chains */
  PORTAL.lava = function (c, x, y, st, fr) {
    const t = fr / 60, cy = y - 42, R = st.boss ? 28 : 25, ri = st.boss ? 20 : 18;
    rr(c, x - 30, y - 8, 60, 8, 3); fs(c, lin(c, x, y - 8, x, y, [0, '#3a2a30', 1, '#1a1014']), '#0a0608', 1); c.strokeStyle = '#ff7a2a'; c.lineWidth = 0.8; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x - 24 + i * 18, y - 1); c.lineTo(x - 20 + i * 18, y - 5); c.lineTo(x - 16 + i * 18, y - 2); c.stroke(); }
    for (const d of [-1, 1]) { chain(c, x + d * (R - 2), cy + 6, x + d * 36, y - 4, 6, '#6a5a60'); circ(c, x + d * 36, y - 4, 2.5); fs(c, '#3a2a30', '#0a0608', 1); }
    glow(c, x, cy, R * 2.4, st.boss ? '#ff3a1a' : '#ff9a2a', st.glow);
    circ(c, x, cy + 2, R + 2); fs(c, 'rgba(0,0,0,.25)');
    circ(c, x, cy, R); fs(c, lin(c, x - R, cy - R, x + R, cy + R, [0, '#3a2a36', 0.5, '#120a10', 1, '#2a1a24']), '#0a0608', 1.4);
    c.save(); circ(c, x, cy, ri); c.clip(); c.fillStyle = '#2a0a04'; c.fillRect(x - ri, cy - ri, ri * 2, ri * 2); vortex(c, x, cy, ri, t * (st.near ? 1.6 : 1), ['#fff6c0', '#ff9a2a', '#8a1a0a', 'rgba(255,240,160,.9)'], 4, -1);
    if (st.boss) { c.fillStyle = '#5a0a0a'; ell(c, x, cy + 6, 11, 7); c.fill(); menace(c, x, cy - 2, 6, 3.4, '#fff2a0', fr); c.fillStyle = '#1a0a0a'; c.beginPath(); c.moveTo(x - 6, cy + 5); c.quadraticCurveTo(x, cy + 11 + st.pulse * 2, x + 6, cy + 5); c.closePath(); c.fill(); }
    c.restore(); circ(c, x, cy, ri); fs(c, null, '#0a0608', 1.5);
    c.strokeStyle = '#ff9a2a'; c.lineCap = 'round'; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + t * 0.2, q = (R + ri) / 2, px = x + Math.cos(a) * q, py = cy + Math.sin(a) * q, on = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.3); c.globalAlpha = 0.35 + on * 0.65; line(c, px - Math.cos(a + 1.2) * 2.2, py - Math.sin(a + 1.2) * 2.2, px + Math.cos(a + 1.2) * 2.2, py + Math.sin(a + 1.2) * 2.2, i % 2 ? '#ffd84a' : '#ff7a2a', 1.4); } c.globalAlpha = 1;
    circ(c, x, cy, R); fs(c, null, 'rgba(255,255,255,.12)', 1);
    for (let i = 0; i < 7; i++) { const u = mod(t * 0.5 + i * 0.14, 1), px = x + Math.sin(u * 8 + i * 1.7) * (8 + i * 2) + (i - 3) * 5, py = cy - 6 - u * 54; circ(c, px, py, 1.6 * (1 - u * 0.6)); fs(c, 'rgba(255,' + Math.round(160 + 90 * (1 - u)) + ',60,' + (0.9 * (1 - u)) + ')'); }
    return {top: cy - R - 6, badge: [x - R + 2, cy - R + 6]};
  };
  /* Wolkenschloss: cloud arches with a rainbow and a crackling lightning ring */
  PORTAL.himmel = function (c, x, y, st, fr) {
    const t = fr / 60, cy = y - 34, dark = st.boss;
    puff(c, x, y + 2, 60, 12); fs(c, dark ? '#9a9ac0' : '#fff', dark ? '#6a6a9a' : '#d8ccf5', 1);
    if (!dark) { const RB = ['#ff6f9c', '#ffb347', '#ffe94a', '#9be7a5', '#8fd3ff', '#c9b8f0']; c.lineWidth = 2.2; c.globalAlpha = 0.85; RB.forEach((col, i) => { c.strokeStyle = col; c.beginPath(); c.arc(x, cy + 4, 40 - i * 2.2, PI * 1.05, PI * 1.95); c.stroke(); }); c.globalAlpha = 1; }
    glow(c, x, cy, 40, dark ? '#8a8aff' : '#c9b8f0', st.glow);
    c.save(); circ(c, x, cy, 15); c.clip(); c.fillStyle = dark ? '#1a1040' : '#3b2a6a'; c.fillRect(x - 16, cy - 16, 32, 32); vortex(c, x, cy, 15, t, dark ? ['#ffffff', '#5a4a9a', '#100828', 'rgba(255,255,255,.8)'] : ['#ffffff', '#b39ae8', '#3b2a6a', 'rgba(255,255,255,.9)'], 3, 1);
    if (dark) { menace(c, x, cy - 2, 5.5, 3, '#e8f0ff', fr); crown(c, x, cy - 10, 6); }
    c.restore();
    /* the electric ring: jittering bolts around the mouth */
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; const n = 9; for (let i = 0; i < n; i++) { const a0 = i / n * TAU + t * 1.5, a1 = a0 + TAU / n, q = 16 + Math.sin(t * 6 + i) * 1.5; bolt(c, x + Math.cos(a0) * q, cy + Math.sin(a0) * q, x + Math.cos(a1) * q, cy + Math.sin(a1) * q, (fr >> 2) * 7 + i * 13 + st.i, 4, 7); c.strokeStyle = (i + (fr >> 3)) % 3 ? (dark ? '#c0c8ff' : '#ffe94a') : '#fff'; c.lineWidth = 1.3; c.globalAlpha = 0.7 + st.k * 0.3; c.stroke(); } c.restore();
    /* the arch of cloud puffs */
    for (let i = 0; i < 9; i++) { const a = PI + i / 8 * PI, q = 27 + (i % 2) * 2, px = x + Math.cos(a) * q, py = cy + 6 + Math.sin(a) * q; circ(c, px, py + 1.5, 8 + (i % 2) * 2); fs(c, dark ? '#6a6a9a' : '#d8ccf5'); circ(c, px, py, 8 + (i % 2) * 2); fs(c, dark ? '#8a8ab0' : '#fff'); }
    if (dark && (fr % 90) < 8) { c.save(); c.globalCompositeOperation = 'lighter'; bolt(c, x - 20, cy - 34, x + 6, cy + 22, fr * 3, 6, 14); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); c.restore(); }
    for (let i = 0; i < 4; i++) { const a = t * 0.9 + i * TAU / 4, px = x + Math.cos(a) * 34, py = cy - 2 + Math.sin(a) * 10; star(c, px, py, 2.2, 4, 0.35); fs(c, 'rgba(255,255,255,' + (0.5 + 0.5 * Math.sin(t * 4 + i)) + ')'); }
    return {top: cy - 40, badge: [x - 30, cy - 10]};
  };
  /* Weltraum: station teleporter pads with rotating holograms of the destinations */
  PORTAL.weltraum = function (c, x, y, st, fr) {
    const t = fr / 60, hue = st.boss ? '#ff6fb0' : '#5ff6ff', spin = Math.cos(t * 1.4 + st.i), hx = x, hy = y - 40;
    ell(c, x, y - 2, 26, 7); fs(c, lin(c, x, y - 9, x, y + 5, [0, '#c0c8d8', 1, '#5a6274']), '#2a3040', 1.2); ell(c, x, y - 3, 20, 5); fs(c, '#3a4258', '#8a94a8', 1);
    if (st.boss) { c.save(); ell(c, x, y - 2, 26, 7); c.clip(); c.fillStyle = '#ffd84a'; for (let i = -4; i < 5; i++) { c.beginPath(); c.moveTo(x + i * 10, y + 5); c.lineTo(x + i * 10 + 5, y + 5); c.lineTo(x + i * 10 + 9, y - 9); c.lineTo(x + i * 10 + 4, y - 9); c.closePath(); c.fill(); } c.restore(); ell(c, x, y - 3, 20, 5); fs(c, '#3a4258', '#8a94a8', 1); }
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.12 + st.glow * 0.3; c.fillStyle = lin(c, 0, y - 78, 0, y - 4, [0, rgba(hue, 0), 1, rgba(hue, 1)]); rr(c, x - 17, y - 78, 34, 74, 6); c.fill();
    c.globalAlpha = 0.25 + st.k * 0.3; c.strokeStyle = hue; c.lineWidth = 1; for (let i = 0; i < 6; i++) { const yy = y - 8 - mod(t * 22 + i * 12, 70); c.beginPath(); c.moveTo(x - 15, yy); c.lineTo(x + 15, yy); c.stroke(); }
    c.globalAlpha = 0.6 + st.pulse * 0.4; ell(c, x, y - 3, 21, 5.5); c.strokeStyle = hue; c.lineWidth = 1.8; c.stroke(); c.restore();
    glow(c, x, y - 4, 30, hue, st.glow * 0.7);
    /* the hologram: a flat object turned about its vertical axis */
    c.save(); c.translate(hx, hy + Math.sin(t * 2) * 2); c.scale(Math.max(0.12, Math.abs(spin)), 1); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.85 + Math.sin(t * 17) * 0.08;
    if (st.i === 0) { rr(c, -6, -18, 12, 30, 5); fs(c, rgba(hue, 0.55), hue, 1.2); c.beginPath(); c.moveTo(-6, -14); c.quadraticCurveTo(0, -30, 6, -14); c.closePath(); fs(c, rgba(hue, 0.7), hue, 1); for (const d of [-1, 1]) { c.beginPath(); c.moveTo(d * 6, 2); c.lineTo(d * 12, 14); c.lineTo(d * 6, 12); c.closePath(); fs(c, rgba(hue, 0.6), hue, 1); } circ(c, 0, -6, 2.6); fs(c, '#fff'); c.beginPath(); c.moveTo(-3, 12); c.lineTo(0, 18 + st.pulse * 5); c.lineTo(3, 12); c.closePath(); fs(c, '#ffe94a'); }
    else if (st.i === 1) { circ(c, 0, 0, 15); fs(c, rgba('#d8d8e6', 0.6), hue, 1.2); c.fillStyle = rgba('#8a8aa8', 0.7); for (const [cx2, cy2, r2] of [[-5, -4, 3.5], [6, 3, 2.5], [-2, 7, 2], [7, -7, 1.8]]) { circ(c, cx2, cy2, r2); c.fill(); } }
    else if (st.i === 2) { circ(c, 0, 0, 15); fs(c, rgba('#ff7a3a', 0.65), hue, 1.2); c.fillStyle = rgba('#a8441c', 0.7); ell(c, -4, 2, 6, 3.5, 0.3); c.fill(); ell(c, 7, -6, 3, 2, 0); c.fill(); c.fillStyle = 'rgba(255,255,255,.8)'; ell(c, 0, -13, 5, 2); c.fill(); }
    else { ell(c, 0, 2, 22, 6, -0.25); fs(c, null, rgba('#ffd27a', 0.8), 2.5); circ(c, 0, 0, 13); fs(c, rgba('#f0b86a', 0.7), hue, 1.2); c.strokeStyle = rgba('#c08040', 0.7); c.lineWidth = 1.2; for (let i = -1; i <= 1; i++) line(c, -11, i * 5, 11, i * 5 + 1, c.strokeStyle, 1.2); c.save(); c.beginPath(); c.ellipse(0, 2, 22, 6, -0.25, 0, PI); c.strokeStyle = rgba('#ffd27a', 0.9); c.lineWidth = 2.5; c.stroke(); c.restore(); c.strokeStyle = hue; c.lineWidth = 1.4; for (let i = -2; i <= 2; i++) line(c, i * 7, -20, i * 7, 20, hue, 1.4); line(c, -16, -20, 16, -20, hue, 1.6); line(c, -16, 20, 16, 20, hue, 1.6); }
    c.restore();
    if (st.boss) menace(c, x, y - 70, 5, 2.6, '#ff9eff', fr);
    /* the control post with its blinking lights and label */
    rr(c, x - 36, y - 24, 10, 24, 2); fs(c, '#4a5264', '#2a3040', 1); rr(c, x - 35, y - 22, 8, 6, 1); fs(c, (fr >> 4) % 2 ? hue : '#1a2030'); for (let i = 0; i < 3; i++) { circ(c, x - 31, y - 12 + i * 4, 1); fs(c, ['#ff4a4a', '#ffd84a', '#5fcf6a'][(i + (fr >> 5)) % 3]); }
    return {top: y - 84, badge: [x - 31, y - 32]};
  };

  /* ================= scenery per world (behind the portals) ================= */
  const SCENE = {};
  SCENE.wiese = function (c, cam, VW, fr) {
    const t = fr / 60;
    c.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 4; i++) { const x = mod(i * 230 + t * 5 + 80, 1000) - 60, y = 52 + (i * 37) % 50; if (x < cam - 80 || x > cam + VW + 80) continue; circ(c, x, y, 13); c.fill(); circ(c, x + 14, y + 3, 10); c.fill(); circ(c, x - 13, y + 4, 9); c.fill(); }
    [[120, '#ff6f9c'], [236, '#8fd3ff'], [300, '#9be7a5'], [372, '#ffd84a'], [446, '#ff9a2a'], [560, '#c9b8f0'], [612, '#ff6f9c'], [700, '#9be7a5']].forEach(([gx, col], i) => { const r = 5 + (i % 3); c.beginPath(); c.moveTo(gx - r, GY + 2); c.quadraticCurveTo(gx - r, GY - r * 1.9, gx, GY - r * 2); c.quadraticCurveTo(gx + r, GY - r * 1.9, gx + r, GY + 2); c.closePath(); fs(c, col, 'rgba(90,40,60,.35)', 0.8); c.fillStyle = 'rgba(255,255,255,.7)'; for (let k = 0; k < 4; k++) { circ(c, gx - r * 0.6 + k * r * 0.4, GY - r * 1.2 + (k % 2) * r * 0.5, 0.7); c.fill(); } });
    /* the candy carousel */
    const cx = 408, by = GY - 2; if (cx > cam - 80 && cx < cam + VW + 80) {
      ell(c, cx, by, 38, 9); fs(c, '#ff9eb0', '#e8738f', 1); ell(c, cx, by - 3, 36, 8); fs(c, '#ffd6e2'); ell(c, cx, by - 4, 30, 6); fs(c, '#fff');
      const seats = []; for (let i = 0; i < 4; i++) { const a = t * 0.8 + i * TAU / 4; seats.push({i, a, depth: (Math.sin(a) + 1) / 2, hx: cx + Math.cos(a) * 28, hy: by - 8 + Math.sin(a) * 5 - Math.abs(Math.sin(t * 3 + i)) * 3}); }
      seats.sort((p, q) => p.depth - q.depth);
      const seat = s => { const sc = 0.72 + s.depth * 0.38, col = ['#ff6f9c', '#8fd3ff', '#ffd84a', '#9be7a5'][s.i]; line(c, s.hx, by - 50 + Math.sin(s.a) * 5, s.hx, s.hy - 16 * sc, '#ffd84a', 1.6); c.save(); c.translate(s.hx, s.hy); c.scale(sc, sc); rr(c, -2, -16, 4, 16, 2); fs(c, '#fff', '#e8738f', 0.8); circ(c, 0, -17, 7.5); fs(c, col, '#7a3b57', 1); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.5; c.beginPath(); for (let k = 0; k < 24; k++) { const q = k / 24 * 6, ang = k / 24 * TAU * 2 + t * 2; c.lineTo(Math.cos(ang) * q, -17 + Math.sin(ang) * q); } c.stroke(); c.restore(); };
      seats.filter(s => s.depth < 0.5).forEach(seat);
      c.fillStyle = '#fff'; c.fillRect(cx - 2.5, by - 62, 5, 60); c.fillStyle = '#ffb3c6'; for (let i = 0; i < 9; i++) c.fillRect(cx - 2.5, by - 60 + i * 7, 5, 3);
      seats.filter(s => s.depth >= 0.5).forEach(seat);
      c.beginPath(); c.moveTo(cx - 44, by - 50); c.lineTo(cx, by - 80); c.lineTo(cx + 44, by - 50); c.closePath(); fs(c, '#ff6f9c', '#c9305f', 1);
      c.save(); c.beginPath(); c.moveTo(cx - 44, by - 50); c.lineTo(cx, by - 80); c.lineTo(cx + 44, by - 50); c.closePath(); c.clip(); c.fillStyle = '#fff'; for (let i = -2; i <= 2; i += 2) { c.beginPath(); c.moveTo(cx + i * 11 - 5, by - 50); c.lineTo(cx, by - 80); c.lineTo(cx + i * 11 + 5, by - 50); c.closePath(); c.fill(); } c.restore();
      ell(c, cx, by - 50, 44, 7); fs(c, '#ffb3c6', '#c9305f', 1); c.fillStyle = '#ffd84a'; for (let i = 0; i < 9; i++) { circ(c, cx - 40 + i * 10, by - 44 + Math.abs(Math.sin(i * 1.3)) * 2, 1.8); c.fill(); }
      circ(c, cx, by - 84, 4); fs(c, '#ffd84a', '#c9305f', 1); star(c, cx, by - 84, 2.4, 5, 0.5); fs(c, '#fff');
    }
  };
  SCENE.insel = function (c, cam, VW, fr) {
    const t = fr / 60;
    /* parasol, towel and beach ball near the start */
    rr(c, 96, GY - 4, 30, 5, 2); fs(c, '#ff9eb0', '#e8738f', 1); c.fillStyle = '#fff'; for (let i = 0; i < 3; i++) c.fillRect(98 + i * 10, GY - 3, 4, 3);
    line(c, 120, GY - 2, 126, GY - 40, '#fff', 2); c.beginPath(); c.moveTo(104, GY - 36); c.quadraticCurveTo(126, GY - 60, 148, GY - 36); c.closePath(); fs(c, '#ff6f9c', '#c9305f', 1); c.save(); c.beginPath(); c.moveTo(104, GY - 36); c.quadraticCurveTo(126, GY - 60, 148, GY - 36); c.closePath(); c.clip(); c.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(126, GY - 60); c.lineTo(104 + i * 16, GY - 36); c.lineTo(110 + i * 16, GY - 36); c.closePath(); c.fill(); } c.restore();
    circ(c, 138, GY - 7, 7); fs(c, '#fff', '#c9305f', 1); c.save(); circ(c, 138, GY - 7, 7); c.clip(); c.fillStyle = '#ff6f9c'; c.beginPath(); c.moveTo(138, GY - 14); c.quadraticCurveTo(146, GY - 7, 138, GY); c.lineTo(145, GY); c.lineTo(145, GY - 14); c.fill(); c.fillStyle = '#8fd3ff'; c.beginPath(); c.moveTo(138, GY - 14); c.quadraticCurveTo(130, GY - 7, 138, GY); c.lineTo(131, GY); c.lineTo(131, GY - 14); c.fill(); c.restore();
    star(c, 300, GY - 4, 6, 5, 0.5); fs(c, '#ff9a5a', '#c05a2a', 0.8); star(c, 598, GY - 3, 5, 5, 0.5); fs(c, '#ffb3c6', '#c05a6a', 0.8);
    /* the hammock between two palms */
    palm(c, 372, GY, 54, -8, fr); palm(c, 444, GY, 50, 10, fr);
    c.strokeStyle = '#8a5a2b'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(372, GY - 36); c.quadraticCurveTo(408, GY - 10 + Math.sin(t * 1.2) * 2, 444, GY - 34); c.stroke();
    c.beginPath(); c.moveTo(380, GY - 33); c.quadraticCurveTo(408, GY - 12 + Math.sin(t * 1.2) * 2, 436, GY - 31); c.quadraticCurveTo(408, GY - 2 + Math.sin(t * 1.2) * 2, 380, GY - 33); c.closePath(); fs(c, '#ffe9a8', '#c9a05a', 1);
    c.strokeStyle = 'rgba(160,120,60,.5)'; c.lineWidth = 0.8; for (let i = 1; i < 6; i++) { const u = i / 6; c.beginPath(); c.moveTo(lerp(380, 436, u), lerp(GY - 33, GY - 31, u) + 1); c.lineTo(lerp(380, 436, u), GY - 12 + Math.sin(t * 1.2) * 2 + Math.sin(u * PI) * 6); c.stroke(); }
    rr(c, 400, GY - 26 + Math.sin(t * 1.2) * 2, 16, 7, 3); fs(c, '#ff9eb0', '#e8738f', 0.8);
    /* the pier behind the beach */
    const px0 = 556, px1 = 650; if (px1 > cam - 40 && px0 < cam + VW + 40) {
      c.fillStyle = '#8a5a2b'; for (let x = px0 + 6; x < px1; x += 22) c.fillRect(x, GY - 22, 4, 22);
      rr(c, px0, GY - 26, px1 - px0, 6, 2); fs(c, '#c98a4a', '#7a4a1a', 1); c.strokeStyle = 'rgba(90,50,20,.4)'; for (let x = px0 + 8; x < px1; x += 8) line(c, x, GY - 26, x, GY - 20, c.strokeStyle, 1);
      c.fillStyle = '#7a4a1a'; for (let x = px0 + 4; x < px1; x += 30) { c.fillRect(x, GY - 42, 2.5, 16); } line(c, px0 + 4, GY - 40, px1 - 4, GY - 40, '#7a4a1a', 2);
      for (const lx of [px0 + 14, px1 - 14]) { rr(c, lx - 3, GY - 50, 6, 8, 2); fs(c, '#ffe9a8', '#7a4a1a', 1); glow(c, lx, GY - 46, 10, '#ffd84a', 0.4 + Math.sin(t * 5 + lx) * 0.15); line(c, lx, GY - 50, lx, GY - 42, '#7a4a1a', 1.5); }
      c.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ell(c, px0 - 10 + i * 40 + Math.sin(t * 2 + i) * 3, GY - 12, 6, 1.5); c.fill(); }
    }
  };
  SCENE.unterwasser = function (c, cam, VW, fr) {
    const t = fr / 60;
    /* the harbour railing along the dock */
    for (let x = 24; x < 740; x += 48) { if (x < cam - 20 || x > cam + VW + 20) continue; rr(c, x - 2, GY - 24, 4, 24, 1.5); fs(c, '#8a5a2b', '#5a3a1a', 0.8); circ(c, x, GY - 25, 2.5); fs(c, '#a56f3a', '#5a3a1a', 0.8); }
    c.strokeStyle = '#d9b870'; c.lineWidth = 1.6; for (let x = 24; x < 700; x += 48) { if (x + 48 < cam - 20 || x > cam + VW + 20) continue; c.beginPath(); c.moveTo(x, GY - 20); c.quadraticCurveTo(x + 24, GY - 10, x + 48, GY - 20); c.stroke(); }
    for (const lx of [150, 400, 650]) { line(c, lx, GY - 24, lx, GY - 52, '#5a3a1a', 2); rr(c, lx - 4, GY - 60, 8, 10, 2); fs(c, '#ffe9a8', '#5a3a1a', 1); glow(c, lx, GY - 55, 14, '#ffd84a', 0.45 + Math.sin(t * 4 + lx) * 0.15); }
    /* the yellow submarine, moored behind the dock */
    const sx = 250, sy = GY - 30 + Math.sin(t * 1.1) * 2.5; if (sx > cam - 100 && sx < cam + VW + 100) {
      c.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 5; i++) { ell(c, sx - 40 + i * 20 + Math.sin(t * 2 + i) * 3, GY - 14, 7, 1.6); c.fill(); }
      line(c, sx + 36, sy + 2, 300, GY - 4, '#d9b870', 1.4); rr(c, 296, GY - 8, 8, 8, 2); fs(c, '#5a3a1a');
      c.save(); c.translate(sx, sy);
      c.fillStyle = '#c89a1a'; for (let i = 0; i < 3; i++) { c.save(); c.translate(-38, 0); c.rotate(t * 9 + i * TAU / 3); ell(c, 0, -5, 2.2, 5); c.fill(); c.restore(); }
      ell(c, 0, 0, 38, 15); fs(c, lin(c, 0, -15, 0, 15, [0, '#ffe94a', 0.6, '#f5c242', 1, '#c89a1a']), '#7a5a10', 1.3);
      rr(c, -10, -26, 22, 14, 4); fs(c, '#f5c242', '#7a5a10', 1.2); line(c, 4, -26, 4, -36, '#7a5a10', 2); rr(c, 2, -39, 9, 4, 2); fs(c, '#7a5a10');
      for (let i = 0; i < 3; i++) { circ(c, -18 + i * 16, 0, 5); fs(c, '#8fd3ff', '#7a5a10', 1.5); circ(c, -20 + i * 16, -2, 1.5); fs(c, 'rgba(255,255,255,.8)'); }
      c.fillStyle = '#e23a3a'; c.fillRect(-30, 6, 60, 3); c.restore();
    }
    for (const [bx, col] of [[352, '#e23a3a'], [560, '#ffd84a']]) { const by = GY - 10 + Math.sin(t * 1.6 + bx) * 2; c.beginPath(); c.moveTo(bx - 7, by + 2); c.lineTo(bx + 7, by + 2); c.lineTo(bx + 4, by - 16); c.lineTo(bx - 4, by - 16); c.closePath(); fs(c, col, '#5a2a1a', 1); c.fillStyle = '#fff'; c.fillRect(bx - 5.5, by - 7, 11, 3); line(c, bx, by - 16, bx, by - 22, '#5a2a1a', 1.5); circ(c, bx, by - 23, 2); fs(c, (fr >> 4) % 2 ? '#fff' : '#ff6f9c'); }
  };
  SCENE.dschungel = function (c, cam, VW, fr) {
    const t = fr / 60;
    /* the stepped temple behind the boss idol */
    const tx = 660; if (tx > cam - 160 && tx < cam + VW + 160) { for (let i = 0; i < 4; i++) { const w = 150 - i * 34, y = GY - 24 - i * 22; rr(c, tx - w / 2, y - 22, w, 24, 3); fs(c, i % 2 ? '#5a6a52' : '#4e5c48', '#2e3a2a', 1); c.strokeStyle = 'rgba(46,58,42,.5)'; for (let x = tx - w / 2 + 12; x < tx + w / 2; x += 14) line(c, x, y - 22, x, y, c.strokeStyle, 1); } rr(c, tx - 12, GY - 134, 24, 24, 3); fs(c, '#5a6a52', '#2e3a2a', 1); c.fillStyle = '#1e2a1c'; rr(c, tx - 6, GY - 128, 12, 16, 5); c.fill(); c.fillStyle = 'rgba(80,170,90,.6)'; ell(c, tx - 40, GY - 50, 10, 4, 0.2); c.fill(); ell(c, tx + 30, GY - 92, 8, 3, -0.3); c.fill(); }
    /* mossy wall segments behind the steps */
    for (const [wx, ww] of [[280, 120], [560, 60]]) { if (wx + ww < cam - 20 || wx > cam + VW + 20) continue; for (let r = 0; r < 3; r++) for (let x = wx + (r % 2) * 10; x < wx + ww; x += 20) { rr(c, x, GY - 50 + r * 16, 19, 15, 2); fs(c, r % 2 ? '#6e7a66' : '#627058', '#3a4a36', 0.8); } c.fillStyle = 'rgba(80,170,90,.55)'; ell(c, wx + 30, GY - 48, 12, 4); c.fill(); ell(c, wx + ww - 20, GY - 20, 9, 3); c.fill(); }
    /* vines swaying from above */
    for (const [vx, len, ph] of [[90, 110, 0], [250, 90, 1], [330, 130, 2], [470, 100, 3], [600, 120, 4], [720, 95, 5]]) { if (vx < cam - 40 || vx > cam + VW + 40) continue; const sw = Math.sin(t * 0.8 + ph) * 6; c.strokeStyle = '#3a9a46'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(vx, -30); c.quadraticCurveTo(vx + sw, -30 + len * 0.5, vx + sw * 1.6, -30 + len); c.stroke(); c.fillStyle = '#4fbf5f'; for (let i = 1; i <= 4; i++) { const u = i / 4.5, lx = vx + sw * (2 * u * u) * 0.8, ly = -30 + len * u; ell(c, lx + (i % 2 ? 5 : -5), ly, 5, 2.4, i % 2 ? 0.5 : -0.5); c.fill(); } circ(c, vx + sw * 1.6, -30 + len + 2, 3); fs(c, ph % 2 ? '#e04a7a' : '#ffd84a'); }
  };
  SCENE.schoko = function (c, cam, VW, fr) {
    const t = fr / 60;
    for (const [px, col] of [[120, '#5a2e14'], [236, '#fff1dc'], [300, '#8a5030'], [560, '#5a2e14'], [612, '#fff1dc'], [700, '#8a5030']]) { c.beginPath(); c.moveTo(px - 7, GY + 1); c.quadraticCurveTo(px - 7, GY - 10, px, GY - 11); c.quadraticCurveTo(px + 7, GY - 10, px + 7, GY + 1); c.closePath(); fs(c, col, '#2e1408', 0.8); c.strokeStyle = col === '#fff1dc' ? '#8a5030' : '#fff1dc'; c.lineWidth = 1; c.beginPath(); c.moveTo(px - 4, GY - 6); c.quadraticCurveTo(px, GY - 9, px + 4, GY - 5); c.stroke(); }
    for (const cx of [150, 640]) { c.strokeStyle = '#fff'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx, GY - 2); c.lineTo(cx, GY - 26); c.arc(cx + 5, GY - 26, 5, PI, 0); c.stroke(); c.save(); c.strokeStyle = '#e23a3a'; c.lineWidth = 4; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(cx, GY - 2); c.lineTo(cx, GY - 26); c.arc(cx + 5, GY - 26, 5, PI, 0); c.stroke(); c.restore(); }
    /* the chocolate fountain */
    const fx = 408; if (fx > cam - 80 && fx < cam + VW + 80) {
      ell(c, fx, GY - 2, 40, 9); fs(c, '#fff1dc', '#d9b88a', 1); ell(c, fx, GY - 3, 34, 6); fs(c, '#5a2e14');
      const tier = (y, rx) => { ell(c, fx, y, rx, rx * 0.3); fs(c, '#fff1dc', '#d9b88a', 1); ell(c, fx, y - 1, rx - 3, (rx - 3) * 0.3); fs(c, '#6a3a1e'); c.lineCap = 'round'; for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, sx = fx + Math.cos(a) * (rx - 1), sy = y + Math.sin(a) * (rx * 0.3), dl = 16 + Math.sin(t * 4 + i) * 2; for (const [col, lw, dx] of [['#5a2e14', 3.2, 0], ['#a8643a', 1, -0.8]]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(sx + dx, sy); c.quadraticCurveTo(sx + dx + (sx - fx) * 0.08, sy + dl * 0.6, sx + dx + (sx - fx) * 0.12, sy + dl); c.stroke(); } } };
      c.fillStyle = '#ffe9c8'; c.fillRect(fx - 2.5, GY - 60, 5, 58);
      tier(GY - 20, 28); tier(GY - 38, 20); tier(GY - 54, 12);
      circ(c, fx, GY - 62 + Math.sin(t * 6) * 0.8, 5); fs(c, '#8a5030', '#4a2210', 1); c.fillStyle = 'rgba(255,255,255,.4)'; circ(c, fx - 2, GY - 64, 1.5); c.fill();
      for (let i = 0; i < 4; i++) { const u = mod(t * 0.6 + i * 0.25, 1); circ(c, fx + (i - 1.5) * 9, GY - 3 - u * 8, 1.6); fs(c, 'rgba(255,241,220,' + (0.8 * (1 - u)) + ')'); }
      circ(c, 230, GY - 8, 6); fs(c, '#e23a3a', '#7a1a14', 1); c.fillStyle = '#ffe94a'; for (let i = 0; i < 5; i++) { circ(c, 227 + (i % 3) * 3, GY - 10 + Math.floor(i / 3) * 3, 0.5); c.fill(); } c.fillStyle = '#3fa15e'; ell(c, 230, GY - 14, 4, 1.8, 0.2); c.fill();
    }
  };
  SCENE.schnee = function (c, cam, VW, fr) {
    const t = fr / 60;
    /* the ice palace behind the right half */
    const px = 540; if (px + 300 > cam - 20 && px < cam + VW + 20) {
      const s = spr(c, 'icepalace', 300, 150, (g, w, h) => {
        const base = h; g.fillStyle = 'rgba(214,236,255,.82)'; rr(g, 20, base - 70, 260, 70, 4); g.fill(); g.strokeStyle = '#8fc0e6'; g.lineWidth = 1.2; g.stroke();
        for (const [tx, th, tw] of [[50, 120, 34], [150, 145, 42], [250, 118, 34]]) { rr(g, tx - tw / 2, base - th, tw, th, 3); fs(g, 'rgba(226,242,255,.9)', '#8fc0e6', 1.2); g.beginPath(); g.moveTo(tx - tw / 2 - 4, base - th); g.quadraticCurveTo(tx - tw / 2, base - th - 18, tx, base - th - 26); g.quadraticCurveTo(tx + tw / 2, base - th - 18, tx + tw / 2 + 4, base - th); g.closePath(); fs(g, '#8fd3ff', '#5aa0d0', 1.2); g.fillStyle = '#ffd84a'; circ(g, tx, base - th - 28, 2.2); g.fill(); for (let r = 0; r < 3; r++) { rr(g, tx - 4, base - th + 14 + r * 26, 8, 12, 4); fs(g, '#ffe9a8', '#5aa0d0', 0.8); } }
        for (let i = 0; i < 6; i++) { rr(g, 36 + i * 40, base - 50, 10, 16, 5); fs(g, '#ffe9a8', '#5aa0d0', 0.8); } rr(g, 136, base - 36, 28, 36, 14); fs(g, '#5aa0d0', '#3a7aa0', 1); rr(g, 140, base - 32, 20, 32, 10); fs(g, '#dbeaff');
        g.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 7; i++) { ell(g, 30 + i * 40, base - 70, 14, 4); g.fill(); }
      });
      blit(c, s, px, GY - 150);
      for (const [wx, wy] of [[px + 41, GY - 72], [px + 150, GY - 86], [px + 250, GY - 64]]) glow(c, wx, wy, 16, '#ffd84a', 0.35 + Math.sin(t * 3 + wx) * 0.12);
    }
    c.fillStyle = 'rgba(255,255,255,.8)'; for (const [dx, dw] of [[120, 50], [330, 70], [460, 40]]) { if (dx < cam - 80 || dx > cam + VW + 80) continue; ell(c, dx, GY - 1, dw, 6); c.fill(); }
    for (const [ix, ih] of [[130, 18], [346, 24], [470, 14]]) { if (ix < cam - 40 || ix > cam + VW + 40) continue; c.beginPath(); c.moveTo(ix - 6, GY); c.lineTo(ix - 3, GY - ih); c.lineTo(ix, GY - ih - 8); c.lineTo(ix + 3, GY - ih); c.lineTo(ix + 6, GY); c.closePath(); fs(c, 'rgba(191,226,255,.85)', '#7fb8e6', 1); line(c, ix - 2, GY - 3, ix - 1, GY - ih + 2, 'rgba(255,255,255,.9)', 1.2); }
  };
  SCENE.lava = function (c, cam, VW, fr) {
    const t = fr / 60;
    for (const [hx, ph] of [[140, 0], [420, 1.5], [600, 3]]) { if (hx < cam - 60 || hx > cam + VW + 60) continue; const sw = Math.sin(t * 0.9 + ph) * 8; chain(c, hx, -30, hx + sw, 70, 14, '#6a5a60'); circ(c, hx + sw, 74, 4); fs(c, '#3a2a30', '#0a0608', 1); glow(c, hx + sw, 74, 10, '#ff7a2a', 0.3 + Math.sin(t * 5 + ph) * 0.15); }
    /* the rope bridge high in the background between two rock pillars */
    const bx0 = 180, bx1 = 300; if (bx1 > cam - 40 && bx0 < cam + VW + 40) {
      for (const px of [bx0 - 10, bx1 + 10]) { rr(c, px - 10, 96, 20, GY - 96, 4); fs(c, '#3a2a2e', '#1a1014', 1); }
      c.strokeStyle = '#8a6a4a'; c.lineWidth = 1.4; for (const dy of [0, -12]) { c.beginPath(); c.moveTo(bx0, 100 + dy); c.quadraticCurveTo((bx0 + bx1) / 2, 112 + dy, bx1, 100 + dy); c.stroke(); }
      for (let i = 0; i <= 10; i++) { const u = i / 10, px = lerp(bx0, bx1, u), py = 100 + 6 * Math.sin(u * PI); c.fillStyle = i % 2 ? '#6a4a2a' : '#5a3a1a'; c.fillRect(px - 5, py - 1, 10, 3); line(c, px, py - 12 + 6 * Math.sin(u * PI) * 0, px, py, '#8a6a4a', 0.8); }
    }
    /* the crater glowing behind the boss ring */
    const vx = 656; if (vx > cam - 160 && vx < cam + VW + 160) { c.beginPath(); c.moveTo(vx - 120, GY); c.lineTo(vx - 30, 70); c.lineTo(vx + 30, 70); c.lineTo(vx + 120, GY); c.closePath(); fs(c, '#2a1016'); glow(c, vx, 66, 70, '#ff6a1a', 0.45 + Math.sin(t * 2) * 0.1); c.fillStyle = '#ff7a2a'; ell(c, vx, 70, 30, 5); c.fill(); c.strokeStyle = '#ff9a2a'; c.lineWidth = 2.5; c.lineCap = 'round'; for (const [dx, len] of [[-22, 40], [10, 60], [26, 30]]) { c.beginPath(); c.moveTo(vx + dx, 72); c.quadraticCurveTo(vx + dx * 1.4, 72 + len * 0.6, vx + dx * 1.9, 72 + len); c.stroke(); } for (let i = 0; i < 6; i++) { const u = mod(t * 0.3 + i * 0.17, 1); circ(c, vx + (i - 2.5) * 12 + Math.sin(u * 7 + i) * 6, 66 - u * 50, 1.8 * (1 - u * 0.5)); fs(c, 'rgba(255,200,80,' + (0.9 * (1 - u)) + ')'); } }
  };
  SCENE.himmel = function (c, cam, VW, fr) {
    const t = fr / 60;
    const RB = ['#ff6f9c', '#ffb347', '#ffe94a', '#9be7a5', '#8fd3ff', '#c9b8f0']; c.globalAlpha = 0.3; c.lineWidth = 5; RB.forEach((col, i) => { c.strokeStyle = col; c.beginPath(); c.arc(430, 230, 170 - i * 5, PI * 1.1, PI * 1.9); c.stroke(); }); c.globalAlpha = 1;
    for (const [ix, iy, iw, ph] of [[200, 92, 70, 0], [470, 64, 90, 2], [690, 100, 60, 4]]) { if (ix < cam - 100 || ix > cam + VW + 100) continue; const y = iy + Math.sin(t * 0.7 + ph) * 3; puff(c, ix, y, iw, 16); fs(c, '#fff', '#d8ccf5', 1); rr(c, ix - 9, y - 30, 18, 20, 3); fs(c, '#d8ccf5', '#a893e0', 1); c.beginPath(); c.moveTo(ix - 12, y - 30); c.lineTo(ix, y - 42); c.lineTo(ix + 12, y - 30); c.closePath(); fs(c, '#ff9eb0', '#e8738f', 1); rr(c, ix - 3, y - 24, 6, 8, 2); fs(c, '#ffe9a8'); for (const d of [-1, 1]) { rr(c, ix + d * 18 - 3, y - 20, 6, 12, 2); fs(c, '#d8ccf5', '#a893e0', 1); } }
    for (const [bx, by, col, ph] of [[150, 110, '#ff6f9c', 1], [330, 130, '#ffd84a', 2.5], [590, 120, '#9be7a5', 4]]) { if (bx < cam - 40 || bx > cam + VW + 40) continue; const x = bx + Math.sin(t * 0.5 + ph) * 6, y = by + Math.sin(t * 0.9 + ph) * 5; line(c, x, y + 11, x + 2, y + 30, '#fff', 1); ell(c, x, y, 8, 10); fs(c, lin(c, x - 8, 0, x + 8, 0, [0, col, 1, rgba(col, 0.6)]), 'rgba(90,40,60,.3)', 0.8); ell(c, x - 3, y - 4, 2, 3); fs(c, 'rgba(255,255,255,.6)'); }
    for (let i = 0; i < 10; i++) { const x = (i * 83) % 820, y = 20 + (i * 47) % 120; if (x < cam - 10 || x > cam + VW + 10) continue; star(c, x, y, 2 + (i % 2), 4, 0.35); fs(c, 'rgba(255,255,255,' + (0.4 + 0.5 * Math.abs(Math.sin(t * 2 + i))) + ')'); }
  };
  SCENE.weltraum = function (c, cam, VW, fr) {
    const t = fr / 60;
    for (const [py, col] of [[2, '#5a6274'], [12, '#8a94a8']]) { c.fillStyle = col; c.fillRect(cam - 10, py, VW + 20, 5); c.fillStyle = '#3a4258'; for (let x = Math.floor(cam / 64) * 64; x < cam + VW + 64; x += 64) c.fillRect(x, py - 1, 6, 7); }
    /* the sign over the teleporters */
    const sx = 400; if (sx > cam - 120 && sx < cam + VW + 120) { rr(c, sx - 54, 72, 108, 18, 5); fs(c, '#1a2030', '#5ff6ff', 1.2); glow(c, sx, 81, 60, '#5ff6ff', 0.25 + Math.sin(t * 3) * 0.08); font(c, 10); c.fillStyle = (fr % 120) < 4 ? '#8fd3ff' : '#5ff6ff'; c.fillText(tr('TELEPORTER', 'TELEPORTERS'), sx, 81.5); }
    /* consoles between the pads */
    for (const kx of [248, 408, 568]) { if (kx < cam - 60 || kx > cam + VW + 60) continue; rr(c, kx - 20, GY - 34, 40, 34, 4); fs(c, lin(c, kx, GY - 34, kx, GY, [0, '#8a94a8', 1, '#4a5264']), '#2a3040', 1.2); rr(c, kx - 16, GY - 30, 32, 16, 2); fs(c, '#0a1a3a', '#4a6ad0', 1); c.strokeStyle = '#5ff6ff'; c.lineWidth = 1.2; c.beginPath(); for (let i = 0; i <= 12; i++) { const px = kx - 14 + i * 2.3, py = GY - 22 + Math.sin(t * 5 + i * 0.9 + kx) * 4; if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.stroke(); for (let i = 0; i < 4; i++) { rr(c, kx - 14 + i * 8, GY - 10, 6, 4, 1); fs(c, ['#ff4a4a', '#ffd84a', '#5fcf6a', '#8fd3ff'][(i + (fr >> 4)) % 4]); } }
    c.fillStyle = 'rgba(255,216,74,.5)'; for (let x = 60; x < 760; x += 90) { if (x < cam - 20 || x > cam + VW + 20) continue; c.beginPath(); c.moveTo(x, GY - 1); c.lineTo(x + 6, GY - 4); c.lineTo(x, GY - 7); c.lineTo(x + 3, GY - 4); c.closePath(); c.fill(); }
  };

  /* ================= shared portal dressing: number badge, star plate, next marker and the near arrow ================= */
  function dress(c, x, y, st, fr, geo) {
    const bob = Math.sin(fr * 0.15) * 2;
    const [bx, by] = geo.badge; circ(c, bx, by, 6.5); fs(c, st.boss ? '#3a1a3a' : '#fff', st.boss ? '#ffd84a' : '#7a3b57', 1.2);
    if (st.boss) crown(c, bx, by + 0.5, 4.5); else { font(c, 8.5); c.fillStyle = '#7a3b57'; c.fillText(String(st.i + 1), bx, by + 0.6); }
    if (st.done) { circ(c, bx + 5, by - 5, 3.2); fs(c, '#5fcf6a', '#fff', 0.8); line(c, bx + 3.4, by - 5, bx + 4.6, by - 3.6, '#fff', 1); line(c, bx + 4.6, by - 3.6, bx + 6.8, by - 6.6, '#fff', 1); }
    const sy = y - 7; rr(c, x - 15, sy - 5.5, 30, 11, 5.5); fs(c, 'rgba(50,25,45,.6)', 'rgba(255,255,255,.25)', 0.8);
    st.stars.forEach((b, k) => { star(c, x - 8 + k * 8, sy, 3.6, 5, 0.5); fs(c, b ? '#ffd84a' : 'rgba(255,255,255,.3)', b ? '#a0741a' : null, 0.6); });
    if (st.warp > 0) return;
    if (st.near) { const ay = geo.top - 10 + bob; c.beginPath(); c.moveTo(x, ay + 7); c.lineTo(x - 6, ay); c.lineTo(x + 6, ay); c.closePath(); fs(c, '#ffd84a', '#7a3b57', 1); }
    else if (st.next) { const ty = geo.top - 10 + bob * 0.6; tag(c, tr('hier weiter', 'next'), x, ty, 7, 'rgba(255,216,74,.95)', '#5a3a1a', '#7a3b57'); c.beginPath(); c.moveTo(x, ty + 10); c.lineTo(x - 3.5, ty + 6); c.lineTo(x + 3.5, ty + 6); c.closePath(); fs(c, '#ffd84a', '#7a3b57', 1); }
  }

  /* ================= the frame: scenery, portals, warp streaks ================= */
  function keyOf() { const W = G.WORLDS && G.WORLDS[G.hub ? G.hub.wi : 0]; return W ? W.key : 'wiese'; }
  function portalAt(i) { const hub = G.hub, cx = hub.signCols[i], row = (hub.signRows && hub.signRows[i] !== undefined) ? hub.signRows[i] : 12; return {x: cx * T + 8, y: (row + 1) * T}; }
  function mouthOf(i) { const m = MOUTH[keyOf()] || MOUTH.wiese, p = portalAt(i); return {x: p.x + m[0], y: p.y + m[1], r: m[2]}; }
  function world(c, cam, camY, fr, VW) {
    const hub = G.hub; if (!hub || !hub.signCols) return;
    const key = keyOf(), wi = hub.wi, draw = PORTAL[key] || PORTAL.wiese, scene = SCENE[key];
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    try { if (scene) scene(c, cam, VW, fr); } catch (e) {}
    let next = -1; for (let i = 0; i < 4 && next < 0; i++) if (!(hub.doneFor && hub.doneFor(wi * 4 + i))) next = i;
    const w = hub.warp, wk = w ? clamp(w.t / w.dur, 0, 1) : 0;
    for (let i = 0; i < 4; i++) {
      const p = portalAt(i); if (p.x < cam - 90 || p.x > cam + VW + 90) continue;
      const k = hub.sel ? hub.sel[i] : (hub.near === i ? 1 : 0), done = !!(hub.doneFor && hub.doneFor(wi * 4 + i)), isNext = i === next, warp = w && w.i === i ? ease(wk) : 0;
      const pulse = 0.5 + 0.5 * Math.sin(fr * (isNext ? 0.14 : 0.06) + i * 1.7);
      const st = {i, boss: i === 3, done, next: isNext, near: hub.near === i && !w, k, pulse, warp, stars: hub.starsFor ? hub.starsFor(wi * 4 + i) : [false, false, false]};
      st.glow = (done ? 0.16 : 0.26) + (isNext ? 0.14 + pulse * 0.24 : 0) + k * 0.35 + warp * 0.6;
      let geo; try { geo = draw(c, p.x, p.y, st, fr); } catch (e) { geo = null; }
      try { dress(c, p.x, p.y, st, fr, geo || {top: p.y - 60, badge: [p.x - 20, p.y - 50]}); } catch (e) {}
    }
    /* the warp: streaks of light racing into the mouth, a ring closing in */
    if (w) {
      const m = mouthOf(w.i), e = ease(wk); c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
      for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + fr * 0.06 * (i % 2 ? 1 : -1), r0 = 8 + 70 * (1 - e) + (i % 3) * 6, r1 = r0 + 14 + 30 * e; c.globalAlpha = 0.25 + 0.55 * e; line(c, m.x + Math.cos(a) * r0, m.y + Math.sin(a) * r0 * 0.9, m.x + Math.cos(a) * r1, m.y + Math.sin(a) * r1 * 0.9, i % 3 ? '#fff' : '#ffe94a', 1.2 + e); }
      c.globalAlpha = 0.6; circ(c, m.x, m.y, m.r + 60 * (1 - e)); fs(c, null, '#fff', 2); c.globalAlpha = 0.3 + e * 0.5; glow(c, m.x, m.y, m.r * 3 + 20 * e, '#fff', 0.5 + e * 0.5); c.restore();
    }
    c.restore();
  }
  /* the warping Toffo, drawn in front of everything: pulled to the mouth while he shrinks and spins */
  function warpToffo(c, p, fr) {
    const hub = G.hub, w = hub && hub.warp; if (!w || !S() || S().mode !== 'hub') return;
    const k = clamp(w.t / w.dur, 0, 1), e = ease(k), m = mouthOf(w.i), x = lerp(w.cx, m.x, e), y = lerp(w.fy, m.y + 12, e), sc = lerp(1, 0.06, e), rot = e * e * TAU * 3 * (w.facing || 1);
    c.save(); c.translate(x, y - 12 * sc); c.rotate(rot); c.translate(0, 12 * sc); c.globalAlpha = 1 - Math.max(0, (k - 0.88) / 0.12);
    try { G.draw.drawBearAt(c, 0, 0, {scale: sc, facing: w.facing || 1, pose: 'jump', t: fr / 60, frame: fr * 0.2, outfit: S().outfit, mood: 'happy', sx: 1 - e * 0.25, sy: 1 + e * 0.35}); } catch (err) {}
    c.restore();
    c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) { const a = fr * 0.3 + i * TAU / 6, q = 14 * (1 - e) + 4; star(c, x + Math.cos(a) * q, y - 12 * sc + Math.sin(a) * q * 0.7, 2.4, 4, 0.4); fs(c, 'rgba(255,255,255,' + (0.4 + 0.6 * e) + ')'); } c.restore();
  }
  function flash(c, fr) {
    const hub = G.hub, w = hub && hub.warp; if (!w || !S() || S().mode !== 'hub') return;
    const a = clamp((w.t - (w.dur - 0.16)) / 0.16, 0, 1); if (a <= 0) return;
    c.fillStyle = 'rgba(255,255,255,' + a + ')'; c.fillRect(0, 0, G.VW || 480, 270);
  }
  G.hubart = {
    layout(key) { const f = LAYOUT[key]; return f ? f() : {tops: flat(), signCols: [10, 20, 30, 41], deco: [[7, 'h'], [14, 'd'], [25, 'h'], [35, 'p'], [44, 'h']]}; },
    mouth: mouthOf, world, warpToffo, flash,
  };
  /* hooks: scenery and portals behind Toffo; the warping Toffo and the flash in front */
  G.art = G.art || {}; G.fx = G.fx || {};
  const prevWorld = G.art.world, prevFront = G.fx.playerFront, prevOverlay = G.fx.overlay;
  G.art.world = (c, lv, cam, camY, fr, VW) => { if (lv && lv.hub && S() && S().mode === 'hub') { try { world(c, cam, camY, fr, VW || G.VW || 480); } catch (e) {} } if (prevWorld) prevWorld(c, lv, cam, camY, fr, VW); };
  G.fx.playerFront = (c, p, fr) => { if (prevFront) prevFront(c, p, fr); try { warpToffo(c, p, fr); } catch (e) {} };
  G.fx.overlay = (c, fr) => { if (prevOverlay) prevOverlay(c, fr); try { flash(c, fr); } catch (e) {} };
})();
