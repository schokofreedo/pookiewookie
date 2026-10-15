/* The Starway Home: Korallenmeer (world 'unterwasser'). Toffo pilots a little yellow submarine.
   li 0 Korallenriff (bright reef, teaches the controls), li 1 Das Schiffswrack (tight wreck, mines, eels, pump-console puzzle gate),
   li 2 Der Tiefseegraben (vertical descent into the dark with a headlight, temple puzzle gate), li 3 Die Krakenhöhle (boss "Kraken Krawall").
   Self-contained mode: own 16 px tile map (hand-designed sections + seeded variation), physics, enemies, rendering (cached chunks) and HUD. */
(function () {
  const G = window.PW = window.PW || {};
  G.modes = G.modes || {};
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de), KRAKEN = tr('Kraken Krawall', 'Kraken Kaboom');
  const T = 16, VH = 270, TAU = Math.PI * 2, DT = 1 / 60, CK = 16, CP = CK * T;
  const HW = 11, HH = 7;                      /* sub hit box half size */
  const VW = () => G.VW || 480;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
  const hash = (x, y, s) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul((s | 0) + 7, 1442695041)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  function mkRng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const font = (ctx, px, w) => { ctx.font = (w || 700) + ' ' + px + 'px "Fredoka", sans-serif'; ctx.textBaseline = 'middle'; };
  function outlined(ctx, t, x, y, px, col, align, ol) { font(ctx, px); ctx.textAlign = align || 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = px * 0.32; ctx.strokeStyle = ol || 'rgba(42,21,40,.9)'; ctx.strokeText(t, x, y); ctx.fillStyle = col; ctx.fillText(t, x, y); }
  function rr(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function circ(ctx, x, y, r, fill, stroke, lw) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, TAU); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); } }
  function ell(ctx, x, y, rx, ry, rot, fill, stroke, lw) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); } }
  function heartPath(ctx, x, y, s) { ctx.beginPath(); ctx.moveTo(x, y + 4 * s); ctx.bezierCurveTo(x - 8 * s, y - 2 * s, x - 4 * s, y - 8 * s, x, y - 4 * s); ctx.bezierCurveTo(x + 4 * s, y - 8 * s, x + 8 * s, y - 2 * s, x, y + 4 * s); ctx.closePath(); }
  function starPath(ctx, x, y, r1, r2, n, rot) { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = (rot || -Math.PI / 2) + i * Math.PI / n, r = i % 2 ? r2 : r1; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); }
  const OL = '#2a1530';

  /* ============================== tile map ============================== */
  /* 0 water, 1 rock, 2 wood (wreck), 3 door (solid until opened, drawn live), 4 sand */
  function mkMap(w, h) { return {w, h, c: new Uint8Array(w * h).fill(1), oob: 1}; }
  const get = (M, x, y) => (x < 0 || y < 0 || x >= M.w || y >= M.h ? (y < 0 && M.openTop && x >= 0 && x < M.w ? 0 : M.oob) : M.c[y * M.w + x]);
  const put = (M, x, y, v) => { if (x >= 0 && y >= 0 && x < M.w && y < M.h) M.c[y * M.w + x] = v; };
  const isWall = v => v === 1 || v === 2 || v === 4;
  function rect(M, x0, y0, x1, y1, v) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(M, x, y, v); }
  function disc(M, cx, cy, r, v) { for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r); x++) { const dx = x + 0.5 - cx, dy = y + 0.5 - cy; if (dx * dx + dy * dy <= r * r) put(M, x, y, v); } }
  function blob(M, cx, cy, rx, ry, v, R, rough) {
    rough = rough === undefined ? 0.2 : rough; const p1 = R() * TAU, p2 = R() * TAU;
    for (let y = Math.floor(cy - ry * 1.4); y <= Math.ceil(cy + ry * 1.4); y++) for (let x = Math.floor(cx - rx * 1.4); x <= Math.ceil(cx + rx * 1.4); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, a = Math.atan2(dy, dx), lim = 1 + rough * (Math.sin(a * 3 + p1) * 0.6 + Math.sin(a * 5 + p2) * 0.4);
      if (dx * dx + dy * dy <= lim * lim) put(M, x, y, v);
    }
  }
  function tube(M, pts, r, v, R, wob) {
    wob = wob === undefined ? 0.3 : wob; let s = 0; const ph = R() * TAU;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(len * 3));
      for (let j = 0; j <= n; j++) { const k = j / n; s += len / n; disc(M, a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, r + wob * Math.sin(s * 0.55 + ph) * (0.6 + 0.4 * Math.sin(s * 0.23)), v); }
    }
  }
  function pillarUp(M, cx, top, w, v) { const x0 = Math.round(cx - w / 2), x1 = x0 + w - 1; rect(M, x0, Math.ceil(top + w / 2), x1, M.h - 1, v); disc(M, cx, top + w / 2, w / 2, v); }
  function pillarDown(M, cx, bottom, w, v) { const x0 = Math.round(cx - w / 2), x1 = x0 + w - 1; rect(M, x0, 0, x1, Math.floor(bottom - w / 2), v); disc(M, cx, bottom - w / 2, w / 2, v); }
  function interp(pts, x, idx) { idx = idx || 1; if (x <= pts[0][0]) return pts[0][idx]; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; if (x <= b[0]) return lerp(a[idx], b[idx], (x - a[0]) / (b[0] - a[0])); } return pts[pts.length - 1][idx]; }
  function sandify(M, y0) { for (let y = M.h - 1; y >= 1; y--) for (let x = 0; x < M.w; x++) if (y >= y0 && get(M, x, y) === 1 && get(M, x, y - 1) === 0) { put(M, x, y, 4); if (get(M, x, y + 1) === 1) put(M, x, y + 1, 4); } }

  /* ============================== levels ============================== */
  const NAMES = [tr('Korallenriff', 'Coral Reef'), tr('Das Schiffswrack', 'The Shipwreck'), tr('Der Tiefseegraben', 'The Deep Trench'), tr('Die Krakenhöhle', "The Kraken's Lair")];   /* fallback; the HUD prefers the names from worlds.js */
  const THEMES = [
    {rock: ['#e59a7c', '#c47566', '#a35a5e'], hl: '#ffd2b4', sand: ['#f8dc9c', '#e6bf80', '#cfa36a'], sandHl: '#fff2cc', wood: ['#a5703f', '#7f522c', '#613c20'], woodHl: '#d09a60', ol: '#5a2a3a',
      bg: ['#9eeaff', '#4fc0ea', '#1d86c2'], ray: 0.34, snow: 'rgba(255,255,255,.55)', far: 'rgba(40,140,190,.45)', mid: 'rgba(25,110,150,.55)'},
    {rock: ['#6f8996', '#566d7c', '#435868'], hl: '#a7c6d0', sand: ['#c9b68e', '#ae9a72', '#8f7d5c'], sandHl: '#e6d6aa', wood: ['#9a6a3e', '#76502e', '#5a3b22'], woodHl: '#c48f5a', ol: '#1f2a33',
      bg: ['#5cc2c8', '#2a8a9e', '#123f5c'], ray: 0.22, snow: 'rgba(220,255,240,.45)', far: 'rgba(20,80,100,.5)', mid: 'rgba(14,60,80,.6)'},
    {rock: ['#41557a', '#33435f', '#263349'], hl: '#6f8cbc', sand: ['#4a5a78', '#3a4862', '#2c384e'], sandHl: '#7a90b8', wood: ['#5a4a3a', '#46382c', '#34281e'], woodHl: '#7a6a50', ol: '#0c1222',
      bg: ['#2a6aa8', '#123a6a', '#061428'], ray: 0.2, snow: 'rgba(190,230,255,.5)', far: 'rgba(10,30,60,.6)', mid: 'rgba(6,20,44,.7)'},
    {rock: ['#6e4a86', '#56386c', '#422a54'], hl: '#a07ac0', sand: ['#7a5a8a', '#624672', '#4c365a'], sandHl: '#b090c8', wood: ['#5a4a3a', '#46382c', '#34281e'], woodHl: '#7a6a50', ol: '#1a0c26',
      bg: ['#5a4aa0', '#2e2466', '#120c2e'], ray: 0.12, snow: 'rgba(230,200,255,.45)', far: 'rgba(40,20,70,.55)', mid: 'rgba(28,14,52,.65)'},
  ];

  function buildReef() {
    const R = mkRng(1101), M = mkMap(240, 29), ph = R() * TAU; M.openTop = true;
    const fl = [[0, 15], [14, 16], [26, 14], [34, 17], [46, 18], [60, 16], [70, 17], [112, 17], [124, 19], [140, 18], [156, 17], [160, 19], [208, 19], [222, 17], [240, 15]];
    for (let x = 0; x < M.w; x++) { const f = Math.round(interp(fl, x) + Math.sin(x * 0.45 + ph) * 0.6 + Math.sin(x * 0.17 + ph * 2) * 0.9); for (let y = 0; y < M.h; y++) put(M, x, y, y < f ? 0 : (y < f + 2 ? 4 : 1)); }
    pillarUp(M, 42.5, 7, 3, 1); pillarUp(M, 51, 9.5, 4, 1); pillarUp(M, 60.5, 6.5, 3, 1); pillarUp(M, 128.5, 10, 3, 1);
    rect(M, 72, 0, 110, 28, 1); for (let y = 2; y < 29; y += 3) { disc(M, 71.6 + R() * 0.8, y + R() * 2, 1.2 + R() * 0.9, 1); disc(M, 110.4 - R() * 0.8, y + R() * 2, 1.2 + R() * 0.9, 1); }
    blob(M, 140, 6.5, 4.5, 2, 1, R, 0.15);
    pillarDown(M, 166, 12.5, 4, 1); pillarUp(M, 176, 6, 4, 1); pillarDown(M, 186, 12.5, 4, 1); pillarUp(M, 196, 6, 4, 1);
    const path = [[6, 6], [16, 7.5], [26, 7], [34, 8], [42, 3.6], [51, 6], [60, 3.4], [66, 7], [66, 11], [70, 15], [76, 20.5], [86, 21], [96, 20.5], [103, 21], [106.5, 17], [106.5, 9], [106.5, 4.5], [113, 4.5], [120, 6], [131, 9], [140, 11.5], [152, 9], [156, 9.5], [162, 15.5], [170, 15.5], [172.6, 9], [173.3, 3.2], [179.5, 3.2], [181, 9], [183, 15.5], [190, 15.5], [192.6, 9], [193.3, 3.2], [199.5, 3.2], [203, 8], [215, 9], [230, 8]];
    tube(M, path.slice(8, 18), 2.1, 0, R, 0.25);
    tube(M, [[88, 21.5], [90, 25], [94, 26]], 1.5, 0, R, 0.15);
    tube(M, [[214, 15], [216, 20], [222, 23], [226, 22.5]], 1.5, 0, R, 0.15);
    return {M, theme: 0, path, surface: true,
      fish: [[112, 133, 4, 5, '#ff8a3a', '#fff'], [131, 160, 15, 6, '#4aa8ff', '#ffe14a'], [113, 125, 13, 5, '#ffd84a', '#3a7ad8'], [36, 66, 3, 6, '#ff8a3a', '#fff'], [206, 236, 12, 5, '#c98aff', '#fff']],
      jelly: [[47, 4], [56, 9], [122, 8], [147, 3], [150, 12], [211, 5], [222, 11]],
      urchin: [[80, 22.6], [92, 19.4], [100, 22.6], [166, 13], [186, 13], [176, 5.4], [196, 5.4], [51, 9]],
      air: [[98, 21], [146, 14], [205, 5]], stars: [[94, 26], [140, 3.1], [226, 22.5]], ring: [230, 8]};
  }

  const hullBot = x => Math.round(34 - Math.max(0, 44 - x) * 0.7 - Math.max(0, x - 186) * 0.6);
  function buildWreck() {
    const R = mkRng(2202), M = mkMap(232, 40);
    blob(M, 16, 18, 19, 11, 0, R, 0.12); blob(M, 216, 20, 15, 11, 0, R, 0.12);
    disc(M, 10, 6.5, 2.2, 0); disc(M, 214, 8.5, 2, 0);
    sandify(M, 14);
    for (let x = 30; x <= 200; x++) { const bot = hullBot(x); for (let y = 9; y <= bot; y++) put(M, x, y, 2); }
    rect(M, 33, 4, 33, 8, 2);
    const path = [[8, 16], [18, 20], [24, 21.5], [31, 21.5], [40, 21.5], [45, 22.5], [49.5, 22.5], [53, 21.5], [55, 20.3], [60, 20.3], [63, 21.5], [80, 21.5], [82, 24], [82, 28.5], [87, 28.5], [117, 28.5], [119.5, 26], [119.5, 22], [119.5, 15], [123, 14.5], [139.6, 14.5, 'dock'], [147, 14.5], [160, 14.5], [166, 19], [170, 22.5], [188, 22.5], [204, 22.5], [218, 18]];
    tube(M, [[24, 21.5], [31, 21.5], [80, 21.5]], 2.3, 0, R, 0);
    rect(M, 47, 19, 48, 20, 2); rect(M, 57, 22, 58, 23, 2);
    tube(M, [[70, 23], [70.5, 26.5], [66, 27.5]], 1.3, 0, R, 0);
    tube(M, [[80, 21.5], [82, 24], [82, 28.5]], 1.7, 0, R, 0);
    rect(M, 79, 27, 120, 32, 0); rect(M, 88, 30, 90, 32, 2); rect(M, 104, 30, 105, 32, 2); rect(M, 110, 30, 112, 32, 2);
    tube(M, [[117, 28.5], [119.5, 26], [119.5, 15], [123, 14.5]], 1.7, 0, R, 0);
    tube(M, [[119.5, 14.5], [160, 14.5]], 2.3, 0, R, 0);
    tube(M, [[160, 14.5], [166, 19], [170, 22.5]], 1.8, 0, R, 0);
    rect(M, 168, 19, 190, 26, 0);
    tube(M, [[188, 22.5], [204, 22.5]], 1.7, 0, R, 0);
    return {M, theme: 1, path,
      gates: [{id: 'unterwasser-rohre', kind: 'bulk', tiles: [143, 12, 144, 16], con: [140, 17]}],
      fish: [[4, 30, 24, 5, '#ffd84a', '#3a7ad8'], [205, 230, 26, 5, '#ff8a3a', '#fff']],
      jelly: [[12, 10], [220, 12], [26, 12]],
      mines: [[14, 11], [22, 26], [28, 14], [72, 21.5], [91, 28.2], [94, 30], [97, 28.6], [100, 29.6], [103, 28.3], [114, 29.6], [133, 14.2], [152, 15.5], [176, 21], [182, 24.6], [208, 14], [212, 26]],
      eels: [[67, 18, 0, 1], [75, 24, 0, -1], [93, 26, 0, 1], [128, 11, 0, 1], [155, 17, 0, -1], [178, 18, 0, 1]],
      air: [[100, 31.5], [165, 16], [206, 19]], stars: [[66, 27.5], [108, 31.5], [186, 25]], ring: [218, 18]};
  }

  function buildTrench() {
    const R = mkRng(3303), M = mkMap(44, 240), ph = R() * TAU; M.openTop = true;
    const prof = [[0, 3, 41], [10, 4, 40], [14, 12, 32], [60, 12, 32], [64, 6, 38], [100, 6, 38], [104, 19, 25], [140, 19, 25], [144, 10, 34], [196, 10, 34], [200, 4, 40], [221, 4, 40]];
    for (let y = 0; y < 222; y++) {
      let l = interp(prof, y, 1), r = interp(prof, y, 2);
      if (y >= 103 && y < 141) { const sh = Math.sin(y * 0.15) * 1.2; l += sh; r += sh; }
      else { l += Math.sin(y * 0.31 + ph) * 0.8 + Math.sin(y * 0.13) * 0.6; r += Math.sin(y * 0.27 + ph * 1.7) * 0.8 - Math.sin(y * 0.11) * 0.6; }
      for (let x = Math.round(l); x < Math.round(r); x++) put(M, x, y, 0);
    }
    for (const y of [20, 40]) { rect(M, 8, y - 1, 23, y + 1, 1); disc(M, 23.5, y, 1.5, 1); }
    for (const y of [30, 50]) { rect(M, 21, y - 1, 36, y + 1, 1); disc(M, 20.5, y, 1.5, 1); }
    for (const y of [152, 176]) { rect(M, 6, y - 1, 23, y + 1, 1); disc(M, 23.5, y, 1.5, 1); }
    for (const y of [164, 188]) { rect(M, 21, y - 1, 38, y + 1, 1); disc(M, 20.5, y, 1.5, 1); }
    blob(M, 22, 82, 5, 3, 1, R, 0.2); blob(M, 30, 71, 2, 1.5, 1, R, 0.2);
    blob(M, 6, 74, 3.5, 2.5, 0, R, 0.1); blob(M, 38, 90, 3.5, 2.5, 0, R, 0.1); blob(M, 8, 158, 3.2, 2.2, 0, R, 0.1); blob(M, 36, 170, 3.2, 2.2, 0, R, 0.1); blob(M, 8, 182, 3.2, 2.2, 0, R, 0.1);
    blob(M, 35, 45, 3, 2, 0, R, 0.1); blob(M, 36.5, 158, 3, 2.1, 0, R, 0.1);
    rect(M, 15, 224, 29, 235, 0); disc(M, 16.5, 225.5, 2, 0); disc(M, 27.5, 225.5, 2, 0); disc(M, 16.5, 233.5, 2, 0); disc(M, 27.5, 233.5, 2, 0); rect(M, 14, 226, 30, 233, 0);
    const path = [[22, 4], [22, 12], [28, 16], [28, 24], [16, 27], [16, 34], [28, 37], [28, 44], [16, 47], [16, 56], [22, 62], [22, 70], [14, 77], [14, 86], [22, 92], [22, 103], [22, 141], [29, 148], [29, 157], [15, 160], [15, 169], [29, 172], [29, 181], [15, 184], [15, 194], [18, 205], [15.5, 219.6, 'dock'], [22, 219.6], [22, 226], [22, 231]];
    return {M, theme: 2, path, vertical: true, dark: true,
      gates: [{id: 'unterwasser-fische', kind: 'temple', tiles: [20, 222, 23, 223], con: [15, 222]}],
      gjelly: [[30, 26], [14, 40], [30, 66], [12, 92], [32, 95], [18, 150], [26, 166], [14, 178], [30, 190], [10, 210], [34, 208]],
      angler: [[6, 74, 1], [38, 90, -1], [8, 158, 1], [36, 170, -1], [8, 182, 1]],
      urchin: [[24.6, 18.4], [19.4, 31.6], [24.6, 153.6], [19.4, 162.4]],
      rocks: [104, 140], air: [[27, 26], [22, 95], [22, 146], [29, 186]], stars: [[36, 45], [22, 87.6], [37, 158]], ring: [22, 231]};
  }

  function buildCave() {
    const R = mkRng(4404), M = mkMap(30, 17);
    blob(M, 15, 8.5, 15.6, 8.4, 0, R, 0.05); rect(M, 2, 2, 27, 14, 0); rect(M, 1, 4, 28, 12, 0);
    pillarUp(M, 12.5, 10, 3, 1); pillarDown(M, 18.5, 6, 3, 1);
    disc(M, 4.5, 15.6, 1.3, 1); disc(M, 22.5, 15.8, 1.4, 1); disc(M, 7, 0.8, 1.3, 1); disc(M, 25, 0.7, 1.5, 1);
    return {M, theme: 3, path: [[6, 8]], boss: true, stars: [], ring: null};
  }

  /* ============================== state ============================== */
  let st = null, L = null, s = null;
  const chunkCache = new Map(); let chunkK = 0;
  const say = (n, a) => { try { if (st && st.opts && st.opts.sfx) st.opts.sfx(n, a); else if (G.audio && G.audio.sfx && G.audio.sfx[n]) G.audio.sfx[n](a); } catch (e) {} };
  const tone = (f, d, o) => { try { if (G.audio && G.audio.tone) G.audio.tone(f, d, o); } catch (e) {} };
  const noise = (d, o) => { try { if (G.audio && G.audio.noise) G.audio.noise(d, o); } catch (e) {} };
  const input0 = {left: false, right: false, up: false, down: false, jump: false, run: false, jumpEdge: false, runEdge: false, downEdge: false};

  function tileAtPx(x, y) { return get(L.M, Math.floor(x / T), Math.floor(y / T)); }
  function solidPx(x, y) { return tileAtPx(x, y) !== 0; }
  function boxHit(x, y, hw, hh) {
    const x0 = Math.floor((x - hw) / T), x1 = Math.floor((x + hw - 0.01) / T), y0 = Math.floor((y - hh) / T), y1 = Math.floor((y + hh - 0.01) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (get(L.M, tx, ty) !== 0) return true;
    return false;
  }
  function snapWall(x, y) {   /* tile coords -> px position touching the nearest wall */
    const px = x * T, py = y * T; let best = null;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) for (let d = 1; d <= 40; d++) { if (solidPx(px + dx * d, py + dy * d)) { if (!best || d < best.d) best = {d, dx, dy}; break; } }
    if (!best) return {x: px, y: py, a: 0};
    return {x: px + best.dx * (best.d - 6), y: py + best.dy * (best.d - 6), a: Math.atan2(best.dy, best.dx)};
  }

  function build(li) {
    const lv = [buildReef, buildWreck, buildTrench, buildCave][clamp(li | 0, 0, 3)]();
    lv.path = lv.path.map(p => ({x: p[0] * T, y: p[1] * T, dock: p[2] === 'dock'}));
    /* safety pass: the bot's route always has room for the sub (logs if the design needed carving) */
    let carved = 0; const M = lv.M;
    for (let i = 0; i < lv.path.length - 1; i++) {
      const a = lv.path[i], b = lv.path[i + 1], n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4);
      for (let j = 0; j <= n; j++) { const x = lerp(a.x, b.x, j / n), y = lerp(a.y, b.y, j / n); for (let ty = Math.floor((y - HH - 2) / T); ty <= Math.floor((y + HH + 2) / T); ty++) for (let tx = Math.floor((x - HW - 2) / T); tx <= Math.floor((x + HW + 2) / T); tx++) if (get(M, tx, ty) !== 0) { put(M, tx, ty, 0); carved++; } }
    }
    lv.W = M.w * T; lv.H = M.h * T;
    return lv;
  }

  function placePearls(target) {
    const P = L.path; if (P.length < 2) return; const segs = []; let tot = 0;
    for (let i = 0; i < P.length - 1; i++) { const l = Math.hypot(P[i + 1].x - P[i].x, P[i + 1].y - P[i].y); segs.push({a: P[i], b: P[i + 1], l, s: tot}); tot += l; }
    const at = d => { for (const sg of segs) if (d <= sg.s + sg.l) { const k = sg.l ? (d - sg.s) / sg.l : 0; return {x: lerp(sg.a.x, sg.b.x, k), y: lerp(sg.a.y, sg.b.y, k), nx: -(sg.b.y - sg.a.y) / (sg.l || 1), ny: (sg.b.x - sg.a.x) / (sg.l || 1)}; } return {x: P[P.length - 1].x, y: P[P.length - 1].y, nx: 0, ny: 1}; };
    const groups = Math.round(target / 4), gap = (tot - 160) / groups;
    for (let gi = 0; gi < groups; gi++) {
      const d0 = 80 + gi * gap, off = Math.sin(gi * 1.7) * 10;
      for (let j = 0; j < 4; j++) {
        const p = at(d0 + j * 15), arc = Math.sin(j / 3 * Math.PI) * 6;
        let x = p.x + p.nx * (off + arc), y = p.y + p.ny * (off + arc);
        if (solidPx(x, y) || solidPx(x + 5, y) || solidPx(x - 5, y) || solidPx(x, y + 5) || solidPx(x, y - 5)) { x = p.x; y = p.y; }
        if (!solidPx(x, y)) st.items.push({k: 'pearl', x, y, t: Math.random() * 6});
      }
    }
  }

  function newEnt(o) { o.t = o.t || Math.random() * 6; o.flash = 0; o.dead = false; st.ents.push(o); return o; }

  function populate() {
    const lv = L;
    for (const f of lv.fish || []) { const g = {x0: f[0] * T, x1: f[1] * T, y: f[2] * T, x: lerp(f[0], f[1], 0.3) * T, dir: 1, sp: 0.55 + Math.random() * 0.2, c1: f[4], c2: f[5]}; st.groups.push(g); for (let i = 0; i < f[3]; i++) { const ox = ((i % 3) - 1) * 13 + (Math.random() - 0.5) * 4, oy = (Math.floor(i / 3) - 0.5) * 11 + (i % 2) * 4; newEnt({k: 'fish', g, ox, oy, x: g.x + ox, y: g.y + oy, r: 5, hp: 1, f: 1}); } }
    for (const j of lv.jelly || []) newEnt({k: 'jelly', bx: j[0] * T, by: j[1] * T, x: j[0] * T, y: j[1] * T, r: 8, hp: 1});
    for (const j of lv.gjelly || []) newEnt({k: 'gjelly', bx: j[0] * T, by: j[1] * T, x: j[0] * T, y: j[1] * T, r: 8, hp: 1, hue: Math.random() < 0.5 ? 0 : 1});
    for (const u of lv.urchin || []) { const p = snapWall(u[0], u[1]); newEnt({k: 'urchin', x: p.x, y: p.y, r: 7, hp: 99, a: p.a}); }
    for (const m of lv.mines || []) { const x = m[0] * T, y = m[1] * T; let ay = y; for (let d = 0; d < 160; d += 4) if (solidPx(x, y + d)) { ay = y + d; break; } newEnt({k: 'mine', x, y, by: y, ay, r: 7, hp: 1}); }
    for (const e of lv.eels || []) { const hx = (e[0] + 0.5) * T + e[2] * 8, hy = (e[1] + 0.5) * T + e[3] * 8; newEnt({k: 'eel', hx, hy, dx: e[2], dy: e[3], x: hx, y: hy, ext: 0, st: 'wait', cd: 0.5 + Math.random(), r: 6, hp: 2, len: 70}); }
    for (const a of lv.angler || []) newEnt({k: 'angler', hx: a[0] * T, hy: a[1] * T, x: a[0] * T, y: a[1] * T, f: a[2], st: 'idle', r: 10, hp: 2, vx: 0, vy: 0, cd: 0});
    for (const a of lv.air || []) st.items.push({k: 'air', x: a[0] * T, y: a[1] * T, t: Math.random() * 6});
    (lv.stars || []).forEach((p, i) => st.items.push({k: 'star', i, x: p[0] * T, y: p[1] * T, t: i}));
    st.gates = (lv.gates || []).map(g => {
      const gt = {id: g.id, kind: g.kind, x0: g.tiles[0], y0: g.tiles[1], x1: g.tiles[2], y1: g.tiles[3], cx: (g.con[0] + 0.5) * T, cy: g.con[1] * T, open: false, anim: 0, opening: false, req: false, reqT: 0};
      let pre = false; try { pre = !!(st.opts.isSolved && st.opts.isSolved(g.id)); } catch (e) {}
      if (pre) { gt.open = true; gt.anim = 1; } else rect(L.M, gt.x0, gt.y0, gt.x1, gt.y1, 3);
      return gt;
    });
    if (lv.dark) { for (let i = 0; i < 260; i++) { const x = Math.random() * lv.W, y = 120 + Math.random() * (lv.H - 200); if (!solidPx(x, y)) st.plank.push({x, y, t: Math.random() * 6, c: Math.random() < 0.6 ? 0 : 1, r: 0.8 + Math.random() * 1.2}); } }
    if (!lv.boss) placePearls(lv.theme === 2 ? 56 : 60);
    if (lv.ring) st.ring = {x: lv.ring[0] * T, y: lv.ring[1] * T, t: 0};
    if (L.theme === 2) { st.deco.push({k: 'statue', x: 16.6 * T, y: 236 * T, f: 1}, {k: 'statue', x: 28.4 * T, y: 236 * T, f: -1}, {k: 'gold', x: 19.5 * T, y: 236 * T}, {k: 'gold', x: 25 * T, y: 236 * T}); }
    /* live decorations: kelp, anemones, glow crystals, lanterns */
    const M = L.M;
    for (let y = 1; y < M.h; y++) for (let x = 0; x < M.w; x++) {
      const v = get(M, x, y); if (!isWall(v)) continue; const h = hash(x, y, L.theme * 7 + 3);
      if (get(M, x, y - 1) === 0 && get(M, x, y - 2) === 0) {
        if (L.theme === 0 && h < 0.09) st.deco.push({k: 'kelp', x: x * T + 8, y: y * T + 2, h: 26 + hash(x, y, 9) * 50, ph: h * 60});
        else if (L.theme === 0 && h < 0.15) st.deco.push({k: 'anem', x: x * T + 8, y: y * T + 2, c: hash(x, y, 5) < 0.5 ? '#ff7ab0' : '#ffb04a', ph: h * 60});
        else if (L.theme === 1 && v !== 2 && h < 0.12) st.deco.push({k: 'kelp', x: x * T + 8, y: y * T + 2, h: 20 + hash(x, y, 9) * 36, ph: h * 60, dark: true});
        else if ((L.theme === 2 || L.theme === 3) && h < 0.11) st.deco.push({k: 'crys', x: x * T + 8, y: y * T + 3, c: hash(x, y, 4) < 0.5 ? '#6ff0ff' : (L.theme === 3 ? '#ff8af0' : '#9bff9a'), ph: h * 60, up: 1});
        else if ((L.theme === 2) && h < 0.2) st.deco.push({k: 'worm', x: x * T + 8, y: y * T + 2, ph: h * 60});
      } else if (get(M, x, y + 1) === 0 && (L.theme === 2 || L.theme === 3) && h < 0.07) st.deco.push({k: 'crys', x: x * T + 8, y: y * T + 13, c: '#6ff0ff', ph: h * 60, up: -1});
      else if (L.theme === 1 && v === 2 && get(M, x, y + 1) === 0 && h < 0.05) st.deco.push({k: 'lamp', x: x * T + 8, y: y * T + 16, ph: h * 60});
      /* glowing moss on the trench's side walls, so the walls read in the dark */
      if (L.theme === 2 && v === 1) { const side = get(M, x - 1, y) === 0 ? -1 : (get(M, x + 1, y) === 0 ? 1 : 0); if (side && hash(x, y, 31) < 0.1) st.deco.push({k: 'moss', x: x * T + 8 + side * 8, y: y * T + 8, side, ph: h * 60}); }
    }
  }

  /* ============================== the mode ============================== */
  const mode = {
    start(opts) {
      const li = clamp((opts && opts.li) | 0, 0, 3);
      L = build(li); chunkCache.clear();
      const lo = (opts && opts.loadout) || {};
      st = {opts: opts || {}, li, t: 0, fr: 0, phase: 'play', ents: [], items: [], groups: [], parts: [], torps: [], deco: [], plank: [], gates: [], ring: null, cam: {x: 0, y: 0}, shake: 0,
        pearls: 0, bonus: 0, stars: [false, false, false], kills: 0, finished: false, toast: null, hintT: li === 0 ? 8 : 0, auto: !!(opts && opts.autoplay), bot: {i: 1, best: 1e9, stuck: 0, dockT: 0, fireT: 0},
        maxV: lo.turbo ? 2.3 : 2.0, coolT: lo.laser >= 3 ? 0.26 : (lo.laser === 2 ? 0.3 : 0.35), magnet: !!lo.magnet, deadT: 0, exitT: 0, splat: [], doorTipT: 0, boss: null, rockT: 1.5, deflT: 0};
      const p0 = L.path[0];
      s = st.sub = {x: p0.x, y: p0.y, vx: 0, vy: 0, f: 1, hp: lo.shield ? 4 : 3, maxHp: lo.shield ? 4 : 3, inv: 1.0, cool: 0, prop: 0, tilt: 0, bump: 0, ax: 0, ay: 0};
      populate();
      if (L.boss) bossInit();
      camSnap();
      if (li === 0) st.toast = null;
      try { if (G.audio && G.audio.setBoss) G.audio.setBoss(!!L.boss); } catch (e) {}
    },
    update() {
      if (!st || st.finished) return;
      try { step(); } catch (e) { if (!st.errLogged) { st.errLogged = true; console.log('MODE_ERROR sub ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } }
    },
    frame(ctx) { if (!st) return; render(ctx); },
    debugWin() { if (!st || st.finished) return; finish('clear'); },
  };
  G.modes.sub = mode;

  function finish(result) {
    if (!st || st.finished) return; st.finished = true;
    try { if (G.audio && G.audio.setBoss) G.audio.setBoss(false); } catch (e) {}
    const nStars = st.stars.filter(Boolean).length;
    const info = {score: st.pearls * 10 + st.kills * 50 + st.bonus + nStars * 1000 + (result === 'clear' ? s.hp * 300 + (L.boss ? 5000 : 0) : 0), money: st.pearls, stars: st.stars.slice()};
    if (st.opts.done) st.opts.done(result, result === 'clear' ? info : undefined);
  }
  const toast = (text, sec) => { st.toast = {text, t: sec || 2.2}; };
  function popText(x, y, text, col) { st.parts.push({k: 'txt', x, y, vx: 0, vy: -0.45, t: 0, life: 0.9, text, c: col || '#fff'}); }
  function bubbles(x, y, n, spread, big) { for (let i = 0; i < n; i++) st.parts.push({k: 'b', x: x + (Math.random() - 0.5) * spread, y: y + (Math.random() - 0.5) * spread, vx: (Math.random() - 0.5) * (big ? 1.6 : 0.6), vy: -0.3 - Math.random() * (big ? 1.4 : 0.6), t: 0, life: 0.8 + Math.random() * (big ? 1.4 : 0.8), r: 1 + Math.random() * (big ? 3.2 : 1.8), ph: Math.random() * 6}); }
  function burst(x, y, n, col, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = (0.5 + Math.random()) * (sp || 2); st.parts.push({k: 's', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 0.4 + Math.random() * 0.4, r: 1 + Math.random() * 2, c: col}); } }
  function ringFx(x, y, r, col) { st.parts.push({k: 'ring', x, y, t: 0, life: 0.45, r, c: col || '#fff'}); }

  function hurt(fx, fy) {
    if (st.phase !== 'play' || s.inv > 0) return;
    if (st.auto) { s.inv = 0.4; return; }
    s.hp--; s.inv = 1.5; st.shake = 6;
    const dx = s.x - fx, dy = s.y - fy, d = Math.hypot(dx, dy) || 1; s.vx = dx / d * 2.4; s.vy = dy / d * 2.4;
    say('hurt'); bubbles(s.x, s.y, 14, 14, true); burst(s.x, s.y, 8, '#ffd84a', 2);
    if (s.hp <= 0) { st.phase = 'dead'; st.deadT = 0; say('die'); try { st.opts.speak && st.opts.speak('Oh no... Mallo...'); } catch (e) {} }
  }

  function explode(x, y, r, src) {
    bubbles(x, y, 18, r * 0.6, true); burst(x, y, 14, '#ffb347', 2.4); burst(x, y, 6, '#fff3a0', 1.4); ringFx(x, y, r, '#fff');
    st.parts.push({k: 'flash', x, y, t: 0, life: 0.25, r: r * 1.2});
    if (Math.hypot(s.x - x, s.y - y) < r * 0.75 + 6 && src !== 'torp') hurt(x, y);
    for (const e of st.ents) {
      if (e.dead || e.k === 'urchin' || e.k === 'warn') continue; const d = Math.hypot(e.x - x, e.y - y);
      if (e.k === 'eel') { if (e.ext > 0.25 && segDist(x, y, e.hx, e.hy, e.x, e.y) < r * 0.6 + 6) damage(e, 2); continue; }
      if (e.k === 'mine') { if (d < r + 4 && !e.fuse) e.fuse = 0.12; continue; }
      if (d < r * 0.55 + e.r) damage(e, 1);
    }
  }
  function damage(e, n) {
    e.hp -= n; e.flash = 0.15;
    if (e.hp <= 0 && !e.dead) {
      e.dead = true; st.kills++; bubbles(e.x, e.y, 10, 10, true); burst(e.x, e.y, 8, e.k === 'jelly' ? '#ff9ed8' : '#fff', 1.6);
      const sc = e.k === 'angler' ? 3 : (e.k === 'eel' ? 2 : 1); popText(e.x, e.y - 8, '+' + sc * 50, '#ffd84a');
      say('stomp');
    } else say('pop');
  }
  function segDist(px, py, ax, ay, bx, by) { const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1; const k = clamp(((px - ax) * vx + (py - ay) * vy) / l2, 0, 1); return Math.hypot(px - (ax + vx * k), py - (ay + vy * k)); }
  const touchSub = (x, y, r) => { const dx = (s.x - x) / (HW + r), dy = (s.y - y) / (HH + r); return dx * dx + dy * dy < 1; };

  /* ============================== simulation ============================== */
  function step() {
    st.t += DT; st.fr++;
    const inp = st.auto ? botInput() : (G.input || input0);
    if (st.toast) { st.toast.t -= DT; if (st.toast.t <= 0) st.toast = null; }
    if (st.hintT > 0) st.hintT -= DT;
    if (st.shake > 0) st.shake = Math.max(0, st.shake - 0.35);
    if (st.deflT > 0) st.deflT -= DT; if (st.doorTipT > 0) st.doorTipT -= DT;
    for (const sp of st.splat) sp.t += DT; st.splat = st.splat.filter(sp => sp.t < 2.2);

    if (st.phase === 'dead') {
      st.deadT += DT; s.vy = Math.min(1.2, s.vy + 0.03); s.vx *= 0.95; s.y += s.vy; s.x += s.vx; s.tilt += 0.02;
      if (boxHit(s.x, s.y, HW, HH)) { s.y -= s.vy; s.vy = 0; }
      if (st.fr % 4 === 0) bubbles(s.x, s.y - 6, 2, 10, false);
      if (st.deadT > 1.8) finish('dead');
    } else if (st.phase === 'exit') {
      st.exitT += DT; const r = st.ring; s.x += (r.x - s.x) * 0.12; s.y += (r.y - s.y) * 0.12; s.vx *= 0.8; s.vy *= 0.8;
      if (st.fr % 3 === 0) burst(r.x, r.y, 3, '#ffd84a', 2);
      if (st.exitT > 1.2) finish('clear');
    } else if (st.phase === 'won') {
      st.exitT += DT; if (st.exitT > 3.2) finish('clear');
      subPhysics(input0);
    } else subPhysics(inp);

    /* torpedoes */
    if (st.phase === 'play') {
      if (s.cool > 0) s.cool -= DT;
      if (inp.runEdge && s.cool <= 0 && st.torps.length < 3) {
        st.torps.push({x: s.x + s.f * 15, y: s.y + 4, vx: s.f * 1.4 + s.vx * 0.5, f: s.f, t: 0}); s.cool = st.coolT;
        tone(420, 0.12, {type: 'triangle', gain: 0.08, slide: 200, slideDur: 0.12}); noise(0.18, {type: 'bandpass', freq: 900, freqTo: 300, gain: 0.08});
        bubbles(s.x + s.f * 14, s.y + 4, 4, 4, false);
      }
    }
    for (const tp of st.torps) {
      tp.t += DT; tp.vx = clamp(tp.vx + tp.f * 0.16, -4.6, 4.6); tp.x += tp.vx; tp.y += Math.sin(tp.t * 18) * 0.15;
      if (st.fr % 2 === 0) st.parts.push({k: 'b', x: tp.x - tp.f * 7, y: tp.y, vx: -tp.f * 0.3, vy: -0.2, t: 0, life: 0.6, r: 1 + Math.random(), ph: Math.random() * 6});
      const nx = tp.x + tp.f * 6;
      if (solidPx(nx, tp.y) || tp.t > 1.7) { tp.dead = true; explode(nx, tp.y, 22, 'torp'); say('smallBoom'); continue; }
      if (L.boss && bossTorp(tp)) continue;
      for (const e of st.ents) {
        if (e.dead || e.k === 'warn') continue;
        let hit = false;
        if (e.k === 'eel') hit = e.ext > 0.25 && segDist(nx, tp.y, e.hx, e.hy, e.x, e.y) < 8;
        else hit = Math.abs(e.x - nx) < e.r + 4 && Math.abs(e.y - tp.y) < e.r + 3;
        if (hit) { tp.dead = true; if (e.k === 'urchin') { burst(nx, tp.y, 6, '#fff', 1.5); say('bump'); } else if (e.k === 'mine') e.fuse = 0.01; explode(nx, tp.y, 22, 'torp'); if (e.k !== 'mine' && e.k !== 'urchin' && !e.dead && e.hp > 0) damage(e, 1); say('smallBoom'); break; }
      }
    }
    st.torps = st.torps.filter(tp => !tp.dead);

    for (const g of st.groups) { g.x += g.dir * g.sp; if (g.x > g.x1) g.dir = -1; if (g.x < g.x0) g.dir = 1; }
    for (const e of st.ents) if (!e.dead || e.k === 'eel') updEnt(e);
    st.ents = st.ents.filter(e => !e.dead || e.k === 'eel');
    if (L.rocks) updRocks();
    if (L.boss) bossUpdate();
    updItems();
    updGates(inp);
    if (st.ring && st.phase === 'play') { st.ring.t += DT; if (Math.hypot(s.x - st.ring.x, s.y - st.ring.y) < 20) { st.phase = 'exit'; st.exitT = 0; say('clear'); } }
    for (const p of st.parts) {
      p.t += DT;
      if (p.k === 'b') { p.x += p.vx + Math.sin(p.t * 6 + p.ph) * 0.25; p.y += p.vy; p.vx *= 0.96; p.vy = Math.max(-1.6, p.vy - 0.012); if (solidPx(p.x, p.y) || (L.surface && p.y < 9)) p.t = p.life; }
      else if (p.k === 's') { p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy *= 0.92; }
      else if (p.k === 'txt') { p.y += p.vy; }
      else if (p.k === 'ink') { p.x += p.vx; p.y += p.vy; p.vx *= 0.97; p.vy *= 0.97; p.r += p.gr; }
      else if (p.k === 'dust') { p.y += p.vy; p.vy += 0.05; }
    }
    st.parts = st.parts.filter(p => p.t < p.life);
    if (st.parts.length > 700) st.parts.splice(0, st.parts.length - 700);
    camUpdate();
  }

  function subPhysics(inp) {
    const up = inp.up || inp.jump, dn = inp.down;
    const ix = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), iy = (dn ? 1 : 0) - (up ? 1 : 0);
    if (st.phase === 'play' && ix) s.f = ix;
    const acc = 0.11;
    s.vx += ix * acc; s.vy += iy * acc;
    s.vx *= ix ? 0.985 : 0.955; s.vy *= iy ? 0.985 : 0.955;
    if (!iy) s.vy += Math.sin(st.t * 1.7) * 0.004 - 0.0025;
    const sp = Math.hypot(s.vx, s.vy); if (sp > st.maxV) { s.vx *= st.maxV / sp; s.vy *= st.maxV / sp; }
    s.vx += s.ax; s.vy += s.ay; s.ax = 0; s.ay = 0;
    s.x += s.vx;
    if (boxHit(s.x, s.y, HW, HH)) { s.x -= s.vx; bumpFx(Math.abs(s.vx), s.f, 0); s.vx *= -0.3; }
    s.y += s.vy;
    if ((L.surface || L.M.openTop) && s.y < 22) { s.y = 22; if (s.vy < 0) s.vy *= -0.2; }
    if (boxHit(s.x, s.y, HW, HH)) { s.y -= s.vy; bumpFx(Math.abs(s.vy), 0, Math.sign(s.vy)); s.vy *= -0.3; }
    if (boxHit(s.x, s.y, HW, HH)) unstick();
    s.prop += 0.2 + Math.abs(s.vx) * 0.25 + Math.abs(s.vy) * 0.1 + (ix || iy ? 0.15 : 0);
    s.tilt += (clamp(s.vy * 0.16, -0.32, 0.32) - s.tilt) * 0.12; s.look = (s.look || 0) + (clamp(s.vy * (L.vertical ? 0.8 : 0.5), -1.1, 1.1) - (s.look || 0)) * 0.06;
    if (s.bump > 0) s.bump -= DT * 4;
    if (s.inv > 0) s.inv -= DT;
    if ((ix || iy) && st.fr % 5 === 0) st.parts.push({k: 'b', x: s.x - s.f * 19, y: s.y + 2 + (Math.random() - 0.5) * 4, vx: -s.f * 0.6, vy: -0.15, t: 0, life: 0.9, r: 0.8 + Math.random() * 1.6, ph: Math.random() * 6});
    if (st.fr % 40 === 0) st.parts.push({k: 'b', x: s.x + s.f * 4, y: s.y - 12, vx: 0, vy: -0.3, t: 0, life: 1.4, r: 1, ph: 0});
  }
  function bumpFx(v, fx, fy) { if (v > 0.9) { s.bump = 1; bubbles(s.x + fx * 14, s.y + fy * 8, 4, 6, false); if (st.fr - (st.lastBump || 0) > 20) { st.lastBump = st.fr; say('bump'); } } }
  function unstick() { for (let r = 2; r < 64; r += 2) for (let a = 0; a < 8; a++) { const x = s.x + Math.cos(a * TAU / 8) * r, y = s.y + Math.sin(a * TAU / 8) * r; if (!boxHit(x, y, HW, HH)) { s.x = x; s.y = y; return; } } }

  function updEnt(e) {
    e.t += DT; if (e.flash > 0) e.flash -= DT;
    switch (e.k) {
      case 'fish': {
        const g = e.g, tx = g.x + e.ox * g.dir + Math.sin(e.t * 2.1) * 3, ty = g.y + e.oy + Math.sin(e.t * 1.6 + e.ox) * 4;
        e.x += (tx - e.x) * 0.08; e.y += (ty - e.y) * 0.08; e.f = g.dir;
        if (touchSub(e.x, e.y, 4)) hurt(e.x, e.y);
        break;
      }
      case 'jelly': case 'gjelly': {
        const sp = e.k === 'gjelly' ? 0.8 : 1.3; e.x = e.bx + Math.sin(e.t * 0.45) * 12; e.y = e.by + Math.sin(e.t * sp) * 16;
        if (touchSub(e.x, e.y + 2, 6)) hurt(e.x, e.y);
        break;
      }
      case 'urchin': if (touchSub(e.x, e.y, 6)) hurt(e.x, e.y); break;
      case 'mine': {
        e.y = e.by + Math.sin(e.t * 1.3) * 3; e.x += 0;
        if (e.fuse) { e.fuse -= DT; if (e.fuse <= 0) { e.dead = true; st.kills++; explode(e.x, e.y, 46, 'mine'); say('boom'); st.shake = Math.max(st.shake, 5); } }
        else if (touchSub(e.x, e.y, 6)) e.fuse = 0.01;
        break;
      }
      case 'eel': {
        if (e.dead) { e.ext = Math.max(0, e.ext - 0.04); e.x = e.hx + e.dx * e.len * e.ext; e.y = e.hy + e.dy * e.len * e.ext; break; }
        const d = Math.hypot(s.x - e.hx, s.y - e.hy);
        if (e.st === 'wait') { e.cd -= DT; e.ext = 0; if (e.cd <= 0 && d < 130) { e.st = 'warn'; e.st_t = 0; tone(180, 0.25, {type: 'sine', gain: 0.05, slide: 260}); } }
        else if (e.st === 'warn') { e.st_t += DT; if (st.fr % 6 === 0) bubbles(e.hx + e.dx * 4, e.hy + e.dy * 4, 1, 4, false); if (e.st_t > 0.95) { e.st = 'out'; e.st_t = 0; noise(0.15, {type: 'bandpass', freq: 1400, freqTo: 500, gain: 0.06}); } }
        else if (e.st === 'out') { e.st_t += DT; e.ext = ease(e.st_t / 0.2); if (e.st_t >= 0.2) { e.st = 'hold'; e.st_t = 0; } }
        else if (e.st === 'hold') { e.st_t += DT; e.ext = 1; if (e.st_t > 0.55) { e.st = 'in'; e.st_t = 0; } }
        else if (e.st === 'in') { e.st_t += DT; e.ext = 1 - ease(e.st_t / 0.6); if (e.st_t >= 0.6) { e.st = 'wait'; e.cd = 1.4 + Math.random() * 1.2; } }
        e.x = e.hx + e.dx * e.len * e.ext; e.y = e.hy + e.dy * e.len * e.ext;
        if (e.ext > 0.2 && segDist(s.x, s.y, e.hx, e.hy, e.x, e.y) < 12) hurt(e.x, e.y);
        break;
      }
      case 'angler': {
        const dx = s.x - e.x, dy = s.y - e.y, d = Math.hypot(dx, dy) || 1;
        if (e.cd > 0) e.cd -= DT;
        if (e.st === 'idle') { e.x += (e.hx + Math.sin(e.t * 0.7) * 4 - e.x) * 0.05; e.y += (e.hy + Math.sin(e.t * 1.1) * 3 - e.y) * 0.05; if (d < 140 && e.cd <= 0 && st.phase === 'play') { e.st = 'wind'; e.st_t = 0; e.f = dx > 0 ? 1 : -1; tone(110, 0.3, {type: 'sawtooth', gain: 0.04, slide: 60}); } }
        else if (e.st === 'wind') { e.st_t += DT; e.f = dx > 0 ? 1 : -1; if (e.st_t > 0.6) { e.st = 'lunge'; e.st_t = 0; e.vx = dx / d * 3.2; e.vy = dy / d * 3.2; } }
        else if (e.st === 'lunge') { e.st_t += DT; e.x += e.vx; e.y += e.vy; if (solidPx(e.x + e.vx * 4, e.y + e.vy * 4)) e.st_t = 1; if (e.st_t > 0.6) { e.st = 'back'; e.st_t = 0; } }
        else { e.x += (e.hx - e.x) * 0.04; e.y += (e.hy - e.y) * 0.04; e.f = e.hx > e.x ? 1 : -1; if (Math.hypot(e.hx - e.x, e.hy - e.y) < 4) { e.st = 'idle'; e.cd = 1.2; } }
        if (touchSub(e.x, e.y, 8)) hurt(e.x, e.y);
        break;
      }
      case 'rock': {
        e.vy = Math.min(2.5, e.vy + 0.05); e.y += e.vy; e.x += e.vx; e.rot += e.vr;
        if (e.y > e.y0 + 40 && solidPx(e.x, e.y + e.r)) { e.dead = true; burst(e.x, e.y, 8, '#8a90a8', 1.8); bubbles(e.x, e.y, 5, 8, false); say('thud'); }
        if (touchSub(e.x, e.y, e.r - 1)) { hurt(e.x, e.y - 10); }
        if (e.y > L.H) e.dead = true;
        break;
      }
    }
  }

  function updRocks() {
    const [y0, y1] = L.rocks, sy = s.y / T;
    if (sy < y0 - 2 || sy > y1 + 2 || st.phase !== 'play') return;
    st.rockT -= DT;
    if (st.rockT <= 0) {
      st.rockT = 1.15 + Math.random() * 0.6;
      const top = Math.max(y0 * T - 20, st.cam.y - 6);
      let x = s.x + (Math.random() - 0.5) * 70; for (let i = 0; i < 12 && solidPx(x, top + 24); i++) x = s.x + (Math.random() - 0.5) * 60;
      if (solidPx(x, top + 24)) return;
      st.ents.push({k: 'warn', x, y: top, t: 0, flash: 0, dead: false, r: 0, hp: 99});
    }
    for (const e of st.ents) if (e.k === 'warn' && !e.dead) {
      e.y = Math.max(e.y, st.cam.y - 6);   /* the warning stays at the top edge while the camera scrolls down */
      if (st.fr % 3 === 0) st.parts.push({k: 'dust', x: e.x + (Math.random() - 0.5) * 10, y: e.y + 40, vx: 0, vy: 0.6, t: 0, life: 0.6, r: 1 + Math.random()});
      if (e.t > 0.75) { e.dead = true; const r = 6 + Math.random() * 4; newEnt({k: 'rock', x: e.x, y: e.y, y0: e.y, vx: (Math.random() - 0.5) * 0.3, vy: 0.4, r, hp: 1, rot: 0, vr: (Math.random() - 0.5) * 0.08}); tone(90, 0.2, {type: 'triangle', gain: 0.07}); }
    }
  }

  function updItems() {
    for (const it of st.items) {
      if (it.got) continue; it.t += DT;
      const dx = s.x - it.x, dy = s.y - it.y, d = Math.hypot(dx, dy);
      if (st.magnet && it.k === 'pearl' && d < 56 && st.phase === 'play') { it.x += dx / d * 2.2; it.y += dy / d * 2.2; }
      if (it.vx !== undefined && it.k !== 'drift') { it.x += it.vx; it.y += it.vy; it.vx *= 0.96; it.vy *= 0.96; if (solidPx(it.x, it.y)) { it.vx = -it.vx; it.vy = -it.vy; } }
      if (it.k === 'drift') { it.x += it.vx; it.y += it.vy; it.vx *= 0.985; it.vy = it.vy * 0.985 + Math.sin(it.t * 2) * 0.01; if (solidPx(it.x, it.y)) { it.vx *= -1; it.vy *= -1; it.x += it.vx * 2; it.y += it.vy * 2; } }
      const rad = it.k === 'pearl' ? 12 : 16;
      if (d < rad && (st.phase === 'play' || st.phase === 'won')) {
        it.got = true;
        if (it.k === 'pearl') { st.pearls++; try { st.opts.money && st.opts.money(1); } catch (e) {} popText(it.x, it.y - 6, '+1', '#fff4e0'); say('coin'); burst(it.x, it.y, 4, '#fff', 1); }
        else if (it.k === 'star' || it.k === 'drift') { st.stars[it.i] = true; say('star'); burst(it.x, it.y, 14, '#ffd84a', 2.2); ringFx(it.x, it.y, 26, '#ffd84a'); popText(it.x, it.y - 12, tr('Sternmuschel!', 'Star shell!'), '#ffd84a'); }
        else if (it.k === 'air') { if (s.hp < s.maxHp) { s.hp++; popText(it.x, it.y - 10, '+♥', '#ff9eb0'); } else { st.bonus += 100; popText(it.x, it.y - 10, '+100', '#ffd84a'); } say('heart'); bubbles(it.x, it.y, 16, 12, true); }
      }
    }
    st.items = st.items.filter(it => !it.got);
  }

  function updGates(inp) {
    st.dockable = null;
    for (const g of st.gates) {
      if (g.opening) { g.anim += DT / 1.3; if (st.fr % 4 === 0) bubbles((g.x0 + g.x1 + 1) / 2 * T + (Math.random() - 0.5) * 30, (g.y0 + g.y1 + 1) / 2 * T, 2, 20, false); if (g.anim >= 1) { g.anim = 1; g.opening = false; g.open = true; rect(L.M, g.x0, g.y0, g.x1, g.y1, 0); } st.shake = Math.max(st.shake, 1.5); }
      if (g.open || g.opening) continue;
      if (g.req) { g.reqT += DT; if (g.reqT > 0.6) g.req = false; continue; }
      const d = Math.hypot(s.x - g.cx, s.y - (g.cy - 18)), sp = Math.hypot(s.vx, s.vy);
      if (d < 38 && st.phase === 'play') {
        if (sp < 0.8) st.dockable = g;
        if (sp < 0.8 && inp.downEdge) {
          g.req = true; g.reqT = 0; s.vx *= 0.3; s.vy *= 0.3; say('select');
          const gate = g;
          try { st.opts.openPuzzle ? st.opts.openPuzzle(g.id, () => { gate.req = false; if (!gate.open && !gate.opening) { gate.opening = true; say('gate'); say('puzzleSolved'); } }) : (gate.opening = true); } catch (e) { gate.opening = true; }
        }
      }
      /* bumping into the locked door: tell the player what to do */
      const gx = (g.x0 + g.x1 + 1) / 2 * T, gy = (g.y0 + g.y1 + 1) / 2 * T, hw = (g.x1 - g.x0 + 1) * T / 2 + HW + 6, hh = (g.y1 - g.y0 + 1) * T / 2 + HH + 6;
      if (Math.abs(s.x - gx) < hw && Math.abs(s.y - gy) < hh && st.doorTipT <= 0) { st.doorTipT = 4; toast(g.kind === 'bulk' ? tr('Verriegelt! Halte an der Messing-Pumpe und drücke ▼ zum Andocken.', 'Locked! Stop at the brass pump and press ▼ to dock.') : tr('Das Tempeltor ist versiegelt. Halte am Steinschrein und drücke ▼.', 'The temple gate is sealed. Stop at the stone shrine and press ▼.'), 3); }
    }
  }

  function camTarget() { const vw = VW(); return {x: s.x - vw * 0.45 + s.f * 26, y: s.y - VH * (L.vertical ? 0.38 : 0.5)}; }
  function camClamp() { const vw = VW(), c = st.cam; c.x = L.W <= vw ? (L.W - vw) / 2 : clamp(c.x, 0, L.W - vw); c.y = L.H <= VH ? (L.H - VH) / 2 : clamp(c.y, 0, L.H - VH); }
  function camSnap() { const t = camTarget(); st.cam.x = t.x; st.cam.y = t.y; camClamp(); }
  function camUpdate() {
    const t = camTarget(), c = st.cam, ex = t.x - c.x, ey = t.y - c.y;
    if (Math.abs(ex) > 28) c.x += (ex - Math.sign(ex) * 28) * 0.1; c.x += ex * 0.01;
    if (Math.abs(ey) > 18) c.y += (ey - Math.sign(ey) * 18) * 0.12; c.y += ey * 0.01;
    camClamp();
  }

  /* ============================== autoplay bot ============================== */
  function botInput() {
    const b = st.bot, o = {left: false, right: false, up: false, down: false, jump: false, run: false, jumpEdge: false, runEdge: false, downEdge: false};
    if (st.phase !== 'play') return o;
    if (L.boss) return bossBot(o);
    const P = L.path, i = Math.min(b.i, P.length - 1), wp = P[i];
    let tx = wp.x, ty = wp.y;
    const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy) || 1;
    let wantX, wantY;
    if (wp.dock) {
      const g = st.gates.find(q => !q.open);
      if (!g || g.open) { b.i++; b.best = 1e9; }
      else if (g.opening || g.req) { wantX = 0; wantY = 0; }
      else if (d < 8) { wantX = 0; wantY = 0; if (Math.hypot(s.vx, s.vy) < 0.5) { b.dockT += DT; if (b.dockT > 0.3) { o.downEdge = true; b.dockT = 0; } } }
    }
    if (wantX === undefined) { const sp = Math.min(st.maxV * 0.92, d * 0.05 + 0.35); wantX = dx / d * sp; wantY = dy / d * sp; }
    o.right = s.vx < wantX - 0.12; o.left = s.vx > wantX + 0.12; o.down = s.vy < wantY - 0.12; o.up = s.vy > wantY + 0.12;
    if (!wp.dock && (d < 14 || (i === P.length - 1 && d < 6))) { b.i++; b.best = 1e9; b.stuck = 0; }
    else if (d < b.best - 2) { b.best = d; b.stuck = 0; } else { b.stuck += DT; if (b.stuck > 4 && !wp.dock) { console.log('SUB_BOT_SKIP li=' + st.li + ' wp=' + i + ' at ' + Math.round(s.x / T * 10) / 10 + ',' + Math.round(s.y / T * 10) / 10 + ' fr=' + st.fr); s.x = wp.x; s.y = wp.y; s.vx = s.vy = 0; b.stuck = 0; } }
    /* shoot at things ahead */
    b.fireT -= DT;
    if (b.fireT <= 0) for (const e of st.ents) { if (e.dead || e.k === 'urchin' || e.k === 'warn') continue; const ex = (e.x - s.x) * s.f; if (ex > 10 && ex < 140 && Math.abs(e.y - s.y) < 14) { o.runEdge = true; if (s.f > 0) { o.right = true; o.left = false; } else { o.left = true; o.right = false; } b.fireT = 0.4; break; } }
    return o;
  }

  /* ============================== boss: Kraken Krawall ============================== */
  function bossInit() {
    st.boss = {x: 408, y: 360, by: 128, hp: 20, max: 20, ph: 1, st: 'intro', t: 0, seq: [], seqT: 0, seqEnd: 0, hitsWin: 0, flash: 0, mouth: 0, glow: 0, ink: 0, whirl: 0, tents: [], blobs: [], inhale: 0, rage: 0, look: 0, crown: null};
    s.x = 90; s.y = 130;
    for (const [cx, cy] of [[90, 60], [90, 210], [250, 200], [150, 40]]) for (let i = 0; i < 4; i++) st.items.push({k: 'pearl', x: cx + Math.cos(i * 1.6) * 16, y: cy + Math.sin(i * 1.6) * 10, t: i});
    try { st.opts.banner && st.opts.banner(KRAKEN, 2.6, tr('Triff ihn mit Torpedos, wenn seine Augen leuchten!', 'Hit him with torpedoes when his eyes glow!')); } catch (e) {}
    say('appear');
  }
  function bossSeq() {
    const B = st.boss, q = []; let end = 0;
    const slam = (at, warn) => q.push({at, k: 'slam', warn});
    if (B.ph === 1) { slam(0, 1.0); slam(1.15, 1.0); slam(2.3, 1.0); end = 4.6; }
    else if (B.ph === 2) { q.push({at: 0, k: 'inhale'}); q.push({at: 1.0, k: 'ink'}); for (let i = 0; i < 5; i++) q.push({at: 1.15 + i * 0.32, k: 'blob'}); slam(2.9, 0.9); slam(3.6, 0.9); end = 6.0; }
    else { q.push({at: 0, k: 'whirl'}); for (let i = 0; i < 4; i++) q.push({at: 0.6 + i * 0.42, k: 'blob'}); slam(2.3, 0.65); slam(2.9, 0.65); q.push({at: 3.5, k: 'inhale'}); q.push({at: 4.3, k: 'ink'}); for (let i = 0; i < 4; i++) q.push({at: 4.4 + i * 0.3, k: 'blob'}); end = 6.6; }
    B.seq = q; B.seqT = 0; B.seqEnd = end; B.st = 'atk'; B.t = 0;
  }
  function bossUpdate() {
    const B = st.boss; B.t += DT; if (B.flash > 0) B.flash -= DT;
    B.look = Math.atan2(s.y - B.y, s.x - B.x);
    if (B.st === 'intro') { B.y = lerp(360, B.by, ease(B.t / 2.2)); if (st.fr % 3 === 0) bubbles(B.x + (Math.random() - 0.5) * 80, B.y + 50, 2, 10, true); if (B.t > 2.6) bossSeq(); return; }
    if (B.st === 'dead') {
      B.y += 0.35 + B.t * 0.15; B.mouth = 1; if (st.fr % 2 === 0) bubbles(B.x + (Math.random() - 0.5) * 100, B.y + (Math.random() - 0.5) * 80, 3, 10, true);
      if (B.crown) { B.crown.vy += 0.04; B.crown.x += B.crown.vx; B.crown.y += B.crown.vy; B.crown.r += 0.06; }
      if (B.t > 3.0 && st.phase === 'play') { st.phase = 'won'; st.exitT = 2.2; }
      return;
    }
    const sp = B.ph === 3 ? 1.6 : 1;
    B.y = B.by + Math.sin(B.t * 0.9 * sp) * 26 + Math.sin(B.t * 2.1) * 4;
    B.rage = lerp(B.rage, B.ph === 3 ? 1 : 0, 0.02);
    if (B.st === 'atk') {
      B.seqT += DT; B.glow = Math.max(0, B.glow - DT * 3); B.mouth = Math.max(B.inhale > 0 ? 0.25 : 0, B.mouth - DT * 3);
      for (const ev of B.seq) if (!ev.done && B.seqT >= ev.at) { ev.done = true; bossEvent(ev); }
      if (B.seqT > B.seqEnd && !B.tents.length) { B.st = 'vuln'; B.t = 0; B.hitsWin = 0; tone(660, 0.18, {type: 'triangle', gain: 0.08}); tone(990, 0.22, {type: 'triangle', gain: 0.07, delay: 0.1}); }
    } else if (B.st === 'vuln') {
      B.glow = Math.min(1, B.glow + DT * 5); B.mouth = Math.min(1, B.mouth + DT * 4);
      if (B.t > (B.ph === 3 ? 2.3 : 2.8) || B.hitsWin >= 4) { B.glow = 0.6; if (B.hitsWin >= 4) toast(tr('Kraken Krawall kneift die Augen zu!', 'Kraken Kaboom squeezes his eyes shut!'), 1.6); bossSeq(); }
    }
    if (B.inhale > 0) { B.inhale -= DT; B.mouth = 0.3; if (st.fr % 3 === 0) { const a = Math.random() * TAU; st.parts.push({k: 'b', x: B.x - 30 + Math.cos(a) * 60, y: B.y + 20 + Math.sin(a) * 50, vx: -Math.cos(a) * 1.6, vy: -Math.sin(a) * 1.6, t: 0, life: 0.5, r: 1.5, ph: 0}); } }
    if (B.ink > 0) B.ink = Math.max(0, B.ink - DT * 0.13);
    if (B.whirl > 0) {
      B.whirl -= DT; const cx = B.x - 50, cy = B.y + 16, dx = cx - s.x, dy = cy - s.y, d = Math.hypot(dx, dy) || 1, f = 0.05 * Math.min(1, B.whirl);
      s.ax += dx / d * f + (-dy / d) * 0.025; s.ay += dy / d * f + (dx / d) * 0.025;
      if (st.fr % 2 === 0) { const a = st.t * 3 + Math.random() * TAU, r = 30 + Math.random() * 120; st.parts.push({k: 's', x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.7, vx: -Math.sin(a) * 2 + Math.cos(a) * -1.2, vy: Math.cos(a) * 1.4 - Math.sin(a) * 0.8, t: 0, life: 0.6, r: 1.2, c: 'rgba(200,240,255,.8)'}); }
    }
    /* tentacle slams */
    for (const tn of B.tents) {
      tn.t += DT; const a = tn.t - tn.warn;
      tn.ext = a < 0 ? 0 : (a < 0.3 ? ease(a / 0.3) : (a < 0.65 ? 1 : 1 - ease((a - 0.65) / 0.45)));
      if (a > 1.1) tn.dead = true;
      if (a >= 0 && !tn.hitSnd) { tn.hitSnd = true; say('pound'); st.shake = Math.max(st.shake, 4); bubbles(tn.tx, tn.ty, 10, 14, true); }
      if (tn.t < tn.warn && st.fr % 4 === 0) bubbles(tn.k === 'left' ? 30 : tn.pos + (Math.random() - 0.5) * 16, tn.k === 'left' ? tn.pos : (tn.k === 'top' ? 30 : 250), 1, 8, false);
      if (tn.ext > 0.45) { const hb = tentBox(tn); if (Math.abs(s.x - hb.x) < hb.w / 2 + HW - 2 && Math.abs(s.y - hb.y) < hb.h / 2 + HH - 2) hurt(hb.x, hb.y); }
    }
    B.tents = B.tents.filter(tn => !tn.dead);
    /* ink blobs */
    for (const bl of B.blobs) {
      bl.t += DT; bl.x += bl.vx; bl.y += bl.vy;
      if (solidPx(bl.x, bl.y)) { bl.dead = true; burst(bl.x, bl.y, 8, '#3a1a4a', 1.4); say('pop'); }
      else if (touchSub(bl.x, bl.y, 5)) { bl.dead = true; if (!st.auto && s.inv <= 0) st.splat.push({x: 60 + Math.random() * (VW() - 120), y: 60 + Math.random() * 150, r: 30 + Math.random() * 20, t: 0}); hurt(bl.x, bl.y); }
      if (bl.t > 4) bl.dead = true;
    }
    B.blobs = B.blobs.filter(bl => !bl.dead);
    /* the kraken itself: keep the sub out of its lair */
    if (s.x > 334) { s.x = 334; s.vx = -Math.abs(s.vx) * 0.5 - 0.6; }
    if (Math.hypot(s.x - (B.x - 20), s.y - B.y) < 56) hurt(B.x, B.y);
  }
  function tentBox(tn) { const L2 = 236 * tn.ext; if (tn.k === 'top') return {x: tn.pos, y: 8 + L2 / 2, w: 24, h: L2}; if (tn.k === 'bottom') return {x: tn.pos, y: 264 - L2 / 2, w: 24, h: L2}; const Lx = 330 * tn.ext; return {x: 8 + Lx / 2, y: tn.pos, w: Lx, h: 24}; }
  function bossEvent(ev) {
    const B = st.boss;
    if (ev.k === 'slam') {
      const r = Math.random(); let k = r < 0.36 ? 'top' : (r < 0.72 ? 'bottom' : 'left');
      const pos = k === 'left' ? clamp(s.y, 30, 240) : clamp(s.x, 30, 320);
      B.tents.push({k, pos, t: 0, warn: ev.warn, ext: 0, tx: k === 'left' ? 20 : pos, ty: k === 'left' ? pos : (k === 'top' ? 20 : 250)});
      tone(140, 0.4, {type: 'sine', gain: 0.07, slide: 80});
    } else if (ev.k === 'inhale') { B.inhale = 0.9; noise(0.8, {type: 'bandpass', freq: 400, freqTo: 1600, gain: 0.07}); }
    else if (ev.k === 'ink') {
      B.ink = 0.78; say('splash'); noise(0.5, {type: 'lowpass', freq: 600, freqTo: 120, gain: 0.12});
      for (let i = 0; i < 26; i++) { const a = Math.PI * (0.6 + Math.random() * 0.8); st.parts.push({k: 'ink', x: B.x - 30, y: B.y + 18, vx: Math.cos(a) * (1 + Math.random() * 3), vy: Math.sin(a) * (1 + Math.random() * 2) * 0.8, t: 0, life: 3.5 + Math.random() * 1.5, r: 6 + Math.random() * 8, gr: 0.25}); }
    } else if (ev.k === 'blob') {
      const ox = B.x - 34, oy = B.y + 18, dx = s.x - ox, dy = s.y - oy, d = Math.hypot(dx, dy) || 1, sp = B.ph === 3 ? 2.7 : 2.3, spr = (Math.random() - 0.5) * 0.25;
      const ca = Math.cos(spr), sa = Math.sin(spr), vx = dx / d * sp, vy = dy / d * sp;
      B.blobs.push({x: ox, y: oy, vx: vx * ca - vy * sa, vy: vx * sa + vy * ca, t: 0}); B.mouth = 0.6;
      tone(220, 0.12, {type: 'square', gain: 0.04, slide: 120});
    } else if (ev.k === 'whirl') { B.whirl = 3.4; toast(tr('Strudel! Halte dagegen!', 'Whirlpool! Push against it!'), 1.8); noise(1.6, {type: 'bandpass', freq: 300, freqTo: 900, gain: 0.07}); }
  }
  function bossTorp(tp) {
    const B = st.boss; if (B.st === 'intro' || B.st === 'dead') return false;
    if (tp.x > B.x - 46 && Math.abs(tp.y - B.y) < 56) {
      tp.dead = true;
      if (B.st === 'vuln') {
        B.hp--; B.hitsWin++; B.flash = 0.2; st.shake = 4; say('bossHit'); explode(tp.x, tp.y, 20, 'torp'); popText(tp.x - 8, tp.y - 12, tr('Treffer!', 'Hit!'), '#ffd84a');
        for (let i = 0; i < 2; i++) st.items.push({k: 'pearl', x: tp.x - 24, y: tp.y + (Math.random() - 0.5) * 30, vx: -1.6 - Math.random() * 1.4, vy: (Math.random() - 0.5) * 1.6, t: 0});
        if (B.hp === 14 || B.hp === 7) {
          B.ph = B.hp === 14 ? 2 : 3; B.st = 'roar'; say('bossDown'); st.shake = 8; bossSeq(); B.seqT = -1.2;
          toast(B.ph === 2 ? tr('Kraken Krawall wird sauer! Versteck dich vor der Tinte hinter den Felsen!', 'Kraken Kaboom is getting angry! Hide from the ink behind the rocks!') : tr('Kraken Krawall tobt! Pass auf den Strudel auf!', 'Kraken Kaboom is raging! Watch out for the whirlpool!'), 3);
          st.items.push({k: 'drift', i: B.ph - 2, x: B.x - 60, y: B.y, vx: -1.6, vy: (Math.random() - 0.5) * 1, t: 0}, {k: 'air', x: B.x - 60, y: B.y + 30, vx: -2.2, vy: 0.4, t: 0});
        }
        if (B.hp <= 0) {
          B.st = 'dead'; B.t = 0; B.tents = []; B.blobs = []; B.whirl = 0; B.ink = 0; say('bossDown'); st.shake = 10; st.stars[2] = true;
          bubbles(B.x, B.y, 80, 120, true); B.crown = {x: B.x, y: B.y - 64, vx: -0.6, vy: -1.6, r: 0};
          try { st.opts.speak && st.opts.speak("I'm coming, Mallo!"); } catch (e) {}
          toast(tr('Kraken Krawall ist besiegt!', 'Kraken Kaboom is defeated!'), 3);
        }
      } else {
        burst(tp.x, tp.y, 6, '#e8d8ff', 1.6); tone(1400, 0.06, {type: 'square', gain: 0.04}); tone(1900, 0.05, {type: 'square', gain: 0.03, delay: 0.04});
        if (st.deflT <= 0) { st.deflT = 3; toast(tr('Abgeprallt! Warte, bis seine Augen leuchten.', 'Bounced off! Wait until his eyes glow.'), 2); }
      }
      return true;
    }
    return false;
  }
  function bossBot(o) {
    const B = st.boss, b = st.bot;
    let tx = 140, ty = clamp(B.y - 6, 50, 220);
    for (const tn of B.tents) { if (tn.ext > 0.9 && tn.t > tn.warn + 0.6) continue; if (tn.k === 'left' && Math.abs(ty - tn.pos) < 40) ty = tn.pos > 135 ? tn.pos - 60 : tn.pos + 60; if (tn.k !== 'left' && Math.abs(tx - tn.pos) < 40) tx = tn.pos > 130 ? tn.pos - 60 : tn.pos + 60; }
    tx = clamp(tx, 40, 160); ty = clamp(ty, 40, 230);
    const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy) || 1, sp = Math.min(st.maxV * 0.95, d * 0.06 + 0.2);
    const wx = dx / d * sp, wy = dy / d * sp;
    o.right = s.vx < wx - 0.1; o.left = s.vx > wx + 0.1; o.down = s.vy < wy - 0.1; o.up = s.vy > wy + 0.1;
    if (B.st === 'vuln' && s.f < 0) { o.right = true; o.left = false; }
    b.fireT -= DT;
    if (B.st === 'vuln' && s.f > 0 && Math.abs(s.y - B.y) < 30 && b.fireT <= 0) { o.runEdge = true; o.right = true; o.left = false; b.fireT = 0.37; }
    return o;
  }

  /* ============================== rendering ============================== */
  function chunk(cx, cy, k) {
    const key = cx + ',' + cy; let c = chunkCache.get(key); if (c) return c;
    if (chunkCache.size > 90) chunkCache.clear();
    c = document.createElement('canvas'); const S = Math.max(8, Math.ceil((CP + 2) * k)); c.width = c.height = S;
    const g = c.getContext('2d'); g.scale(S / (CP + 2), S / (CP + 2)); g.translate(-cx * CP + 1, -cy * CP + 1);
    drawTiles(g, cx * CK - 1, cy * CK - 1, cx * CK + CK, cy * CK + CK);
    chunkCache.set(key, c); return c;
  }
  function tileShape(g, x, y, e, open) {
    const oL = open(x - 1, y), oR = open(x + 1, y), oU = open(x, y - 1), oD = open(x, y + 1);
    const tl = oU && oL, tr = oU && oR, bl = oD && oL, br = oD && oR;
    const X0 = x * T - (oL ? e : 0), X1 = (x + 1) * T + (oR ? e : 0), Y0 = y * T - (oU ? e : 0), Y1 = (y + 1) * T + (oD ? e : 0), R = Math.max(1, 7 + e);
    g.moveTo(X0 + (tl ? R : 0), Y0);
    if (tr) g.arcTo(X1, Y0, X1, Y0 + R, R); else g.lineTo(X1, Y0);
    if (br) g.arcTo(X1, Y1, X1 - R, Y1, R); else g.lineTo(X1, Y1);
    if (bl) g.arcTo(X0, Y1, X0, Y1 - R, R); else g.lineTo(X0, Y1);
    if (tl) g.arcTo(X0, Y0, X0 + R, Y0, R); else g.lineTo(X0, Y0);
    g.closePath();
  }
  function drawTiles(g, x0, y0, x1, y1) {
    const M = L.M, th = THEMES[L.theme], W = (x, y) => isWall(get(M, x, y));
    const open = (x, y) => !W(x, y);
    const deep1 = (x, y) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (!W(x + i, y + j)) return false; return true; };
    const deep2 = (x, y) => { for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (Math.abs(i) + Math.abs(j) < 4 && !W(x + i, y + j)) return false; return true; };
    const cells = []; for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) if (W(x, y)) cells.push([x, y, get(M, x, y)]);
    g.beginPath(); for (const [x, y] of cells) tileShape(g, x, y, 1.6, open); g.fillStyle = th.ol; g.fill();
    for (const mat of [1, 4, 2]) {
      const pal = mat === 2 ? th.wood : (mat === 4 ? th.sand : th.rock);
      g.beginPath(); let any = false; for (const [x, y, v] of cells) if (v === mat) { tileShape(g, x, y, 0, open); any = true; } if (!any) continue; g.fillStyle = pal[0]; g.fill();
    }
    /* layered interior shading */
    const in1 = (x, y) => !(W(x, y) && deep1(x, y)), in2 = (x, y) => !(W(x, y) && deep2(x, y));
    g.beginPath(); for (const [x, y, v] of cells) if (v !== 4 && deep1(x, y)) tileShape(g, x, y, -2, in1); g.fillStyle = 'rgba(40,10,40,.13)'; g.fill();
    g.beginPath(); for (const [x, y, v] of cells) if (deep2(x, y)) tileShape(g, x, y, -3, in2); g.fillStyle = 'rgba(30,5,35,.15)'; g.fill();
    /* texture + top highlight */
    for (const [x, y, v] of cells) {
      const X = x * T, Y = y * T, h = hash(x, y, 11), h2 = hash(x, y, 12);
      if (v === 2) {
        g.fillStyle = 'rgba(40,20,10,.35)'; g.fillRect(X, Y + 7.5, T, 1); g.fillRect(X, Y + 15.5, T, 0.8);
        if (h < 0.5) g.fillRect(X + Math.floor(h2 * 12) + 2, Y, 0.9, 7.5); else g.fillRect(X + Math.floor(h2 * 12) + 2, Y + 8, 0.9, 7.5);
        g.fillStyle = 'rgba(255,220,170,.25)'; g.fillRect(X, Y + 0.5, T, 0.8);
        if (h < 0.3) circ(g, X + 3 + h2 * 10, Y + 4, 0.8, 'rgba(30,20,10,.5)');
        if (h > 0.85 && !deep1(x, y)) { g.fillStyle = 'rgba(120,180,120,.35)'; g.fillRect(X + h2 * 8, Y + 9, 6, 2); }
      } else {
        if (h < 0.55) circ(g, X + 3 + h2 * 10, Y + 3 + h * 18 % 10, 1.1 + h * 1.4, 'rgba(0,0,0,.09)');
        if (h2 < 0.35) circ(g, X + 4 + h * 8, Y + 4 + h2 * 20 % 8, 0.9, 'rgba(255,255,255,.14)');
      }
      if (open(x, y - 1)) { const hl = v === 4 ? th.sandHl : (v === 2 ? th.woodHl : th.hl); rr(g, X + (open(x - 1, y) ? 3 : 0), Y + 1, T - (open(x - 1, y) ? 3 : 0) - (open(x + 1, y) ? 3 : 0), 3, 1.5); g.fillStyle = hl; g.globalAlpha = 0.85; g.fill(); g.globalAlpha = 1; }
    }
    /* static decoration on exposed edges */
    for (const [x, y, v] of cells) {
      const X = x * T, Y = y * T, h = hash(x, y, 21 + L.theme), h2 = hash(x, y, 22);
      if (open(x, y - 1) && open(x, y - 2)) {
        if (L.theme === 0) {
          const live = hash(x, y, L.theme * 7 + 3); if (live < 0.15) continue;
          if (h < 0.17) coral(g, X + 8, Y + 2, h2, ['#ff6f9c', '#ff9a4a', '#b87aff', '#ffd84a'][Math.floor(h2 * 4)]);
          else if (h < 0.27) { ell(g, X + 8, Y + 1, 6.5, 5, 0, '#ff9eb0', th.ol, 1.2); g.strokeStyle = 'rgba(160,60,90,.55)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(X + 3, Y - 1); g.quadraticCurveTo(X + 6, Y - 4, X + 8, Y - 1); g.quadraticCurveTo(X + 10, Y + 2, X + 13, Y - 1); g.stroke(); }
          else if (h < 0.35) fan(g, X + 8, Y + 2, h2);
          else if (h < 0.42) { for (let i = 0; i < 3; i++) { const hx = X + 4 + i * 4, hh = 6 + ((h2 * 10 + i * 3) % 6); rr(g, hx - 1.6, Y + 2 - hh, 3.2, hh, 1.5); g.fillStyle = ['#ffd84a', '#9be7a5', '#8fd3ff'][i]; g.fill(); g.strokeStyle = th.ol; g.lineWidth = 0.9; g.stroke(); circ(g, hx, Y + 2.6 - hh, 1, 'rgba(60,20,40,.6)'); } }
          else if (h < 0.47) { ell(g, X + 8, Y + 1, 5, 3, 0, '#fff4e0', th.ol, 1); g.strokeStyle = 'rgba(200,150,120,.8)'; g.lineWidth = 0.6; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(X + 8, Y + 3); g.lineTo(X + 8 + i * 2, Y - 1.5); g.stroke(); } }
        } else if (L.theme === 1 && v !== 2) {
          if (h < 0.18) { ell(g, X + 8, Y + 1, 4, 2.5, 0, '#e8e0c8', th.ol, 0.9); }
          else if (h < 0.3) { g.fillStyle = '#7fb070'; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(X + 4 + i * 4, Y - 2, 1.4, 4 + i, 0.2 * (i - 1), 0, TAU); g.fill(); } }
        } else if (L.theme === 1 && v === 2 && h < 0.12) { circ(g, X + 5 + h2 * 6, Y + 1, 1.6, '#d8d0c0', th.ol, 0.6); circ(g, X + 9 + h2 * 4, Y + 1.5, 1.2, '#d8d0c0', th.ol, 0.6); }
        else if (L.theme >= 2 && h < 0.2) { g.fillStyle = L.theme === 2 ? 'rgba(130,160,210,.5)' : 'rgba(190,140,220,.5)'; g.beginPath(); g.moveTo(X + 3, Y + 2); g.lineTo(X + 5 + h2 * 3, Y - 5 - h * 10); g.lineTo(X + 9, Y + 2); g.fill(); }
      }
      if (open(x, y + 1) && L.theme >= 2 && h2 < 0.3) { g.fillStyle = th.rock[1]; g.beginPath(); g.moveTo(X + 3, Y + 14); g.lineTo(X + 5 + h * 5, Y + 20 + h2 * 16); g.lineTo(X + 12, Y + 14); g.closePath(); g.fill(); g.strokeStyle = th.ol; g.lineWidth = 1; g.stroke(); }
      if (open(x, y + 1) && L.theme === 0 && h2 < 0.12) { ell(g, X + 8, Y + 16, 4, 2.5, 0, '#c98aff', th.ol, 0.9); }
      if (L.theme === 1 && v === 2 && h < 0.06 && !deep1(x, y) && open(x, y + 1) === false && (open(x - 1, y) || open(x + 1, y))) { circ(g, X + 8, Y + 8, 4, '#3a5a6a', '#c8902a', 1.6); circ(g, X + 7, Y + 7, 1.3, 'rgba(255,255,255,.4)'); }
    }
  }
  function coral(g, x, y, h, col) {
    g.lineCap = 'round'; const br = (x0, y0, a, len, w, d) => { const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len; g.strokeStyle = OL; g.lineWidth = w + 1.8; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); if (d > 0) { br(x1, y1, a - 0.5 - h * 0.2, len * 0.72, w * 0.75, d - 1); br(x1, y1, a + 0.45, len * 0.68, w * 0.75, d - 1); } else circ(g, x1, y1, w * 0.6, 'rgba(255,255,255,.55)'); };
    br(x, y + 1, -Math.PI / 2 + (h - 0.5) * 0.3, 6 + h * 3, 3.2, 2); g.lineCap = 'butt';
  }
  function fan(g, x, y, h) { const col = h < 0.5 ? '#ff7a9a' : '#a08aff'; g.beginPath(); g.moveTo(x, y + 1); g.arc(x, y + 1, 11, -Math.PI * 0.92, -Math.PI * 0.08); g.closePath(); g.fillStyle = col; g.globalAlpha = 0.85; g.fill(); g.globalAlpha = 1; g.strokeStyle = OL; g.lineWidth = 1; g.stroke(); g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 0.6; for (let i = 1; i < 6; i++) { const a = -Math.PI * (0.92 - i * 0.14); g.beginPath(); g.moveTo(x, y + 1); g.lineTo(x + Math.cos(a) * 10, y + 1 + Math.sin(a) * 10); g.stroke(); } }

  /* caustic pattern (seamless tile) */
  let causticPat = null;
  function caustics(ctx) {
    if (!causticPat) {
      const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const R = mkRng(77);
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1.1; g.lineJoin = 'round'; g.filter = 'blur(0.8px)';
      for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) {
        const cx = (i + 0.5 + (R() - 0.5) * 0.5) * 25.6, cy = (j + 0.5 + (R() - 0.5) * 0.5) * 25.6, r = 9 + R() * 4, ph = R() * TAU;
        for (const ox of [-128, 0, 128]) for (const oy of [-128, 0, 128]) { g.beginPath(); for (let a = 0; a <= TAU + 0.01; a += TAU / 7) { const rr2 = r * (1 + 0.22 * Math.sin(a * 3 + ph)); g.lineTo(cx + ox + Math.cos(a) * rr2, cy + oy + Math.sin(a) * rr2 * 0.85); } g.closePath(); g.stroke(); }
      }
      causticPat = ctx.createPattern(c, 'repeat');
    }
    return causticPat;
  }

  let darkCv = null;
  function render(ctx) {
    const vw = VW(), th = THEMES[L.theme], cam = st.cam, t = st.t, fr = st.fr;
    const k = (ctx.getTransform ? ctx.getTransform().a : 1) || 1;
    if (Math.abs(k - chunkK) > 0.01) { chunkK = k; chunkCache.clear(); }
    ctx.save();
    /* water: depth gradient */
    const depth = L.vertical ? clamp(cam.y / (L.H - VH), 0, 1) : clamp(cam.y / Math.max(1, L.H - VH), 0, 1) * 0.35;
    const bg = ctx.createLinearGradient(0, 0, 0, VH);
    const c0 = th.bg[0], c1 = th.bg[1], c2 = th.bg[2];
    if (L.vertical) { bg.addColorStop(0, depth < 0.3 ? c0 : (depth < 0.7 ? c1 : c2)); bg.addColorStop(1, depth < 0.3 ? c1 : '#02060f'); }
    else { bg.addColorStop(0, c0); bg.addColorStop(0.55 - depth * 0.4, c1); bg.addColorStop(1, c2); }
    ctx.fillStyle = bg; ctx.fillRect(0, 0, vw, VH);
    if (L.vertical) { ctx.fillStyle = 'rgba(2,6,16,' + (depth * 0.75) + ')'; ctx.fillRect(0, 0, vw, VH); }
    parallax(ctx, vw, th);
    godRays(ctx, vw, th, depth);
    /* marine snow */
    ctx.fillStyle = th.snow; for (let i = 0; i < 46; i++) { const h = hash(i, 3, 5), h2 = hash(i, 4, 5); const x = (((h * 900 - cam.x * 0.7 + t * 4 + Math.sin(t + i) * 4) % (vw + 20)) + vw + 20) % (vw + 20) - 10, y = (((h2 * 400 - cam.y * 0.7 - t * 5) % 290) + 290) % 290 - 10; ctx.globalAlpha = 0.35 + 0.4 * h; ctx.fillRect(x, y, 1 + h, 1 + h); } ctx.globalAlpha = 1;

    const sh = st.shake, ox = Math.round((-cam.x + (sh ? (Math.random() - 0.5) * sh : 0)) * k) / k, oy = Math.round((-cam.y + (sh ? (Math.random() - 0.5) * sh : 0)) * k) / k;
    ctx.translate(ox, oy);
    if (L.surface && cam.y < 30) surfaceBand(ctx, cam, vw, t);
    backdrop(ctx, cam, vw, t);
    /* tiles (cached chunks) */
    const cx0 = Math.floor(cam.x / CP), cx1 = Math.floor((cam.x + vw) / CP), cy0 = Math.floor(cam.y / CP), cy1 = Math.floor((cam.y + VH) / CP);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) ctx.drawImage(chunk(cx, cy, k), cx * CP - 1, cy * CP - 1, CP + 2, CP + 2);
    const vis = (x, y, m) => x > cam.x - m && x < cam.x + vw + m && y > cam.y - m && y < cam.y + VH + m;
    for (const d of st.deco) if (vis(d.x, d.y, 70)) drawDeco(ctx, d, t);
    for (const g of st.gates) drawGate(ctx, g, t);
    if (st.ring) drawRing(ctx, st.ring, t);
    for (const it of st.items) if (vis(it.x, it.y, 20)) drawItem(ctx, it, t);
    for (const e of st.ents) if (e.k !== 'warn' && (vis(e.x, e.y, 90) || e.k === 'eel' && vis(e.hx, e.hy, 90))) drawEnt(ctx, e, t);
    if (L.boss) drawBoss(ctx, t);
    for (const tp of st.torps) drawTorp(ctx, tp, t);
    drawSub(ctx, t);
    for (const p of st.parts) drawPart(ctx, p);
    for (const e of st.ents) if (e.k === 'warn' && !e.dead) drawEnt(ctx, e, t);
    if (st.dockable && !st.dockable.req && st.phase === 'play') prompt(ctx, clamp(s.x, cam.x + 34, cam.x + vw - 34), Math.max(cam.y + 52, s.y - 27), t);
    ctx.restore();
    /* light layer: darkness with headlight (trench) or ink (kraken) */
    if (L.dark) darkness(ctx, vw, k, 0.4 + depth * 0.42, 1);
    if (L.boss && st.boss && st.boss.ink > 0.01) darkness(ctx, vw, k, st.boss.ink, 2);
    if (L.theme <= 1) { const pat = caustics(ctx); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const m = new DOMMatrix([1, 0, 0, 1, -cam.x * 0.9 + t * 9, -cam.y * 0.9 + Math.sin(t * 0.7) * 10]); pat.setTransform && pat.setTransform(m); ctx.fillStyle = pat; const ca = (L.theme === 0 ? 0.06 : 0.035) * (1 - depth); ctx.globalAlpha = ca; ctx.fillRect(0, 0, vw, VH); pat.setTransform && pat.setTransform(new DOMMatrix([1.6, 0, 0, 1.6, -cam.x * 0.8 - t * 7, -cam.y * 0.8 + Math.cos(t * 0.5) * 12])); ctx.globalAlpha = ca * 0.8; ctx.fillRect(0, 0, vw, VH); ctx.restore(); }
    if (L.boss && st.boss && st.boss.rage > 0.05) { ctx.fillStyle = 'rgba(255,40,80,' + (st.boss.rage * 0.08 * (0.7 + 0.3 * Math.sin(t * 4))) + ')'; ctx.fillRect(0, 0, vw, VH); }
    for (const sp of st.splat) { const a = sp.t < 1.4 ? 0.8 : 0.8 * (1 - (sp.t - 1.4) / 0.8); ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = '#1e0c2a'; ctx.beginPath(); for (let i = 0; i < 14; i++) { const an = i / 14 * TAU, r = sp.r * (0.7 + 0.3 * hash(i, sp.r | 0, 3)) * (i % 2 ? 1 : 0.75); ctx.lineTo(sp.x + Math.cos(an) * r, sp.y + Math.sin(an) * r + sp.t * 6); } ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
    if (st.phase === 'dead') { ctx.fillStyle = 'rgba(10,0,20,' + ease((st.deadT - 0.8) / 1) * 0.85 + ')'; ctx.fillRect(0, 0, vw, VH); }
    if (st.phase === 'exit') { ctx.fillStyle = 'rgba(255,250,220,' + ease((st.exitT - 0.5) / 0.7) + ')'; ctx.fillRect(0, 0, vw, VH); }
    hud(ctx, vw, t);
  }

  function backdrop(ctx, cam, vw, t) {
    if (L.theme === 1) {
      const x0 = Math.max(30 * T, cam.x), x1 = Math.min(201 * T, cam.x + vw), y0 = Math.max(9 * T, cam.y), y1 = Math.min(35 * T, cam.y + VH);
      if (x1 <= x0 || y1 <= y0) return;
      ctx.save(); ctx.beginPath(); ctx.moveTo(30 * T, 9 * T); for (let x = 30; x <= 200; x++) { ctx.lineTo(x * T, (hullBot(x) + 1) * T); ctx.lineTo((x + 1) * T, (hullBot(x) + 1) * T); } ctx.lineTo(201 * T, 9 * T); ctx.closePath(); ctx.clip();
      ctx.fillStyle = '#6e4c30'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.fillStyle = 'rgba(40,20,10,.25)';
      for (let y = Math.floor(y0 / 10) * 10; y < y1; y += 10) { ctx.fillRect(x0, y, x1 - x0, 1); for (let x = Math.floor(x0 / 48) * 48 + ((y / 10) % 2) * 24; x < x1; x += 48) ctx.fillRect(x, y, 1, 10); }
      for (let x = Math.floor(x0 / 112) * 112; x < x1; x += 112) { ctx.fillStyle = '#4e3220'; ctx.fillRect(x, y0, 12, y1 - y0); ctx.fillStyle = 'rgba(255,210,150,.18)'; ctx.fillRect(x, y0, 2, y1 - y0); }
      const g = ctx.createLinearGradient(0, cam.y, 0, cam.y + VH); g.addColorStop(0, 'rgba(30,110,120,.2)'); g.addColorStop(1, 'rgba(10,40,60,.38)'); ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.restore();
    } else if (L.theme === 2) {
      const X0 = 14 * T, X1 = 31 * T, Y0 = 221 * T, Y1 = 236 * T; if (cam.y + VH < Y0 || cam.y > Y1) return;
      ctx.fillStyle = '#26304a'; ctx.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
      ctx.fillStyle = 'rgba(0,0,0,.3)'; for (let y = Y0; y < Y1; y += 12) { ctx.fillRect(X0, y, X1 - X0, 1); for (let x = X0 + ((y / 12) % 2) * 14; x < X1; x += 28) ctx.fillRect(x, y, 1, 12); }
      const a = 0.45 + 0.25 * Math.sin(t * 1.6);
      for (const [x, f] of [[X0 + 70, 1], [X1 - 70, -1]]) { fishGlyph(ctx, x, Y0 + 70, f, '#6ff0ff', a); fishGlyph(ctx, x + f * 26, Y0 + 92, -f, '#9bffb0', a * 0.8); fishGlyph(ctx, x, Y0 + 114, f, '#ff8af0', a * 0.7); }
    }
  }
  function surfaceBand(ctx, cam, vw, t) {
    const x0 = cam.x - 10, x1 = cam.x + vw + 10;
    const sky = ctx.createLinearGradient(0, -20, 0, 8); sky.addColorStop(0, '#fff6d8'); sky.addColorStop(1, '#c8f4ff');
    ctx.fillStyle = sky; ctx.beginPath(); ctx.moveTo(x0, -40); ctx.lineTo(x1, -40);
    for (let x = x1; x >= x0; x -= 8) ctx.lineTo(x, 7 + Math.sin(x * 0.05 + t * 2) * 1.6 + Math.sin(x * 0.13 - t * 3) * 0.8);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, 7 + Math.sin(x * 0.05 + t * 2) * 1.6 + Math.sin(x * 0.13 - t * 3) * 0.8); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, 12 + Math.sin(x * 0.07 - t * 1.5) * 1.5); ctx.stroke();
  }

  function parallax(ctx, vw, th) {
    const cam = st.cam, t = st.t;
    if (L.vertical) {
      for (const [f, col, w] of [[0.3, th.far, 60], [0.55, th.mid, 44]]) {
        ctx.fillStyle = col;
        for (const side of [0, 1]) { ctx.beginPath(); const xb = side ? vw : 0, dir = side ? -1 : 1; ctx.moveTo(xb, 0); for (let y = -20; y <= VH + 20; y += 10) { const wy = y + cam.y * f; const bump = w * (0.6 + 0.4 * Math.sin(wy * 0.02 + side * 3) + 0.25 * Math.sin(wy * 0.071)); ctx.lineTo(xb + dir * bump, y); } ctx.lineTo(xb, VH + 20); ctx.closePath(); ctx.fill(); }
      }
      return;
    }
    const baseFar = VH * 0.88 + (L.H - VH) * 0.25 - cam.y * 0.25, baseMid = VH * 0.95 + (L.H - VH) * 0.5 - cam.y * 0.5;
    ctx.fillStyle = th.far; ctx.beginPath(); ctx.moveTo(0, VH + 40);
    for (let x = 0; x <= vw + 10; x += 10) { const wx = x + cam.x * 0.25; ctx.lineTo(x, baseFar - 28 - 26 * Math.sin(wx * 0.011) - 14 * Math.sin(wx * 0.031 + 1) - (L.theme === 3 ? 0 : 6 * Math.sin(wx * 0.09))); }
    ctx.lineTo(vw + 10, VH + 40); ctx.closePath(); ctx.fill();
    if (L.theme === 3 || L.theme === 1) { ctx.beginPath(); ctx.moveTo(0, -40); for (let x = 0; x <= vw + 10; x += 10) { const wx = x + cam.x * 0.25; ctx.lineTo(x, -cam.y * 0.25 + 26 + 18 * Math.sin(wx * 0.017 + 2) + 10 * Math.abs(Math.sin(wx * 0.05))); } ctx.lineTo(vw + 10, -40); ctx.closePath(); ctx.fill(); }
    if (L.theme === 1) { /* distant ship ribs */ ctx.strokeStyle = th.far; ctx.lineWidth = 5; ctx.lineCap = 'round'; for (let i = 0; i < 6; i++) { const x = ((i * 70 - cam.x * 0.3) % (vw + 200) + vw + 200) % (vw + 200) - 100; ctx.beginPath(); ctx.arc(x, baseFar - 10, 40 + (i % 2) * 8, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); } ctx.lineCap = 'butt'; }
    ctx.fillStyle = th.mid;
    for (let i = 0; i < 14; i++) {
      const per = vw + 240, x = ((i * 97 + hash(i, 1, 9) * 60 - cam.x * 0.5) % per + per) % per - 120, hgt = 50 + hash(i, 2, 9) * 70, sw = Math.sin(t * 1.2 + i) * 6;
      if (L.theme === 3) { ctx.beginPath(); ctx.moveTo(x - 14, baseMid); ctx.lineTo(x, baseMid - hgt * 0.8); ctx.lineTo(x + 14, baseMid); ctx.fill(); continue; }
      ctx.beginPath(); ctx.moveTo(x - 3, baseMid); ctx.quadraticCurveTo(x - 6 + sw, baseMid - hgt * 0.5, x + sw * 1.5, baseMid - hgt); ctx.quadraticCurveTo(x + 6 + sw, baseMid - hgt * 0.5, x + 3, baseMid); ctx.fill();
      for (let j = 1; j < 4; j++) { const yy = baseMid - hgt * j / 4.2; ctx.beginPath(); ctx.ellipse(x + sw * j / 3 + (j % 2 ? 6 : -6), yy, 7, 2.6, j % 2 ? -0.5 : 0.5, 0, TAU); ctx.fill(); }
    }
  }
  function godRays(ctx, vw, th, depth) {
    let a = th.ray * (1 - depth * 0.9); if (L.vertical) a = th.ray * clamp(1 - st.cam.y / 900, 0, 1);
    if (a <= 0.01) return;
    const t = st.t, cam = st.cam; ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const topY = -cam.y * 0.4;
    for (let i = 0; i < 6; i++) {
      const per = vw + 300, x = ((i * 137 + hash(i, 7, 2) * 80 - cam.x * 0.6 + Math.sin(t * 0.3 + i) * 20) % per + per) % per - 150, w = 22 + hash(i, 8, 2) * 40, sk = 70 + hash(i, 9, 2) * 50, len = 300;
      const gr = ctx.createLinearGradient(0, topY, 0, topY + len); const al = a * (0.5 + 0.5 * Math.sin(t * 0.7 + i * 1.7));
      gr.addColorStop(0, 'rgba(255,255,230,' + al + ')'); gr.addColorStop(1, 'rgba(255,255,230,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x, topY); ctx.lineTo(x + w, topY); ctx.lineTo(x + w + sk + w, topY + len); ctx.lineTo(x + sk, topY + len); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function darkness(ctx, vw, k, alpha, mode2) {
    const W = Math.max(1, Math.round(vw * k)), H = Math.max(1, Math.round(VH * k));
    if (!darkCv) darkCv = document.createElement('canvas');
    if (darkCv.width !== W || darkCv.height !== H) { darkCv.width = W; darkCv.height = H; }
    const d = darkCv.getContext('2d'); d.setTransform(1, 0, 0, 1, 0, 0); d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, W, H);
    d.setTransform(k, 0, 0, k, 0, 0);
    d.fillStyle = mode2 === 2 ? 'rgba(24,8,36,' + alpha + ')' : 'rgba(1,3,10,' + alpha + ')'; d.fillRect(0, 0, vw, VH);
    d.globalCompositeOperation = 'destination-out';
    const cam = st.cam, sx = s.x - cam.x, sy = s.y - cam.y, lights = [];
    const hole = (x, y, r, a) => { const g = d.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.beginPath(); d.arc(x, y, r, 0, TAU); d.fill(); };
    hole(sx, sy, mode2 === 2 ? 50 : 58, 0.85);
    if (mode2 !== 2 && st.phase !== 'dead') {
      /* headlight cone */
      const lx = sx + s.f * 15, ly = sy + 2, ang = (s.f > 0 ? 0 : Math.PI) + (s.look || 0) * s.f, len = 190, spread = 0.45;
      const g = d.createRadialGradient(lx, ly, 4, lx, ly, len); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g; d.beginPath(); d.moveTo(lx, ly - 3); d.arc(lx, ly, len, ang - spread, ang + spread); d.closePath(); d.fill();
      lights.push([lx + Math.cos(ang) * 50, ly + Math.sin(ang) * 50, 60, 'rgba(255,240,180,.10)']);
    }
    const vis = (x, y) => x > -40 && x < vw + 40 && y > -40 && y < VH + 40;
    if (mode2 !== 2) {
      for (const p of st.plank) { const x = p.x - cam.x, y = p.y - cam.y + Math.sin(st.t + p.t) * 3; if (!vis(x, y)) continue; const a = 0.5 + 0.5 * Math.sin(st.t * 2 + p.t * 3); hole(x, y, 6 + p.r * 2, 0.6 * a); lights.push([x, y, 2 + p.r, p.c ? 'rgba(120,255,200,' + (0.5 * a) + ')' : 'rgba(90,200,255,' + (0.6 * a) + ')']); }
      for (const e of st.ents) { const x = e.x - cam.x, y = e.y - cam.y; if (!vis(x, y)) continue; if (e.k === 'gjelly') { hole(x, y, 40, 0.8); lights.push([x, y, 26, e.hue ? 'rgba(255,120,220,.30)' : 'rgba(120,220,255,.30)']); } else if (e.k === 'angler') { const lp = lurePos(e); hole(lp.x - cam.x, lp.y - cam.y, 36, 0.9); if (e.st !== 'idle') hole(x, y - 8, 30, 0.8); lights.push([lp.x - cam.x, lp.y - cam.y, 16, 'rgba(220,255,140,.5)']); } else if (e.k === 'rock') hole(x, y, 22, 0.75); else if (e.k === 'warn') { hole(x, y + 36, 28, 0.9); lights.push([x, y + 36, 12, 'rgba(255,180,80,.2)']); } }
      for (const dc of st.deco) if (dc.k === 'moss') { const x = dc.x - cam.x, y = dc.y - cam.y; if (!vis(x, y)) continue; hole(x, y, 18, 0.4); lights.push([x, y, 9, 'rgba(120,255,210,.22)']); }
      for (const dc of st.deco) if (dc.k === 'crys') { const x = dc.x - cam.x, y = dc.y - cam.y; if (!vis(x, y)) continue; hole(x, y - dc.up * 4, 22, 0.55); lights.push([x, y - dc.up * 4, 12, dc.c === '#6ff0ff' ? 'rgba(110,240,255,.22)' : 'rgba(150,255,150,.22)']); }
      for (const it of st.items) { const x = it.x - cam.x, y = it.y - cam.y; if (!vis(x, y)) continue; hole(x, y, it.k === 'pearl' ? 12 : 26, 0.6); }
      for (const g of st.gates) { const x = g.cx - cam.x, y = g.cy - cam.y - 20; if (vis(x, y)) { hole(x, y, 60, 0.75); lights.push([x, y, 30, g.open ? 'rgba(120,255,160,.2)' : 'rgba(110,230,255,.22)']); } const dx = (g.x0 + g.x1 + 1) / 2 * T - cam.x, dy = g.y0 * T - cam.y; if (vis(dx, dy)) hole(dx, dy, 70, 0.6); }
      if (st.ring) { const x = st.ring.x - cam.x, y = st.ring.y - cam.y; if (vis(x, y)) { hole(x, y, 70, 0.95); if (L.theme === 2) hole(x, y, 150, 0.55); lights.push([x, y, 40, 'rgba(255,220,100,.3)']); } }
    }
    if (mode2 === 2 && st.boss) {
      /* the kraken's threats stay readable inside the ink: blobs, slam warnings, glowing eyes */
      const B = st.boss;
      for (const bl of B.blobs) hole(bl.x - cam.x, bl.y - cam.y, 18, 0.85);
      for (const tn of B.tents) if (tn.t < tn.warn || tn.ext > 0.05) {
        const a = tn.t < tn.warn ? 0.5 : 0.5 * tn.ext, wx = tn.k === 'left' ? 30 : tn.pos, wy = tn.k === 'left' ? tn.pos : (tn.k === 'top' ? 50 : 196);
        if (tn.t < tn.warn) hole(wx - cam.x, wy - cam.y, 26, 0.9);
        for (let i = 0; i < 9; i++) { const px = tn.k === 'left' ? 16 + i * 40 : tn.pos, py = tn.k === 'left' ? tn.pos : 12 + i * 31; hole(px - cam.x, py - cam.y, 18, a); }
      }
      if (B.glow > 0.05) for (const [ex, ey] of [[-20, -18], [16, -20]]) { hole(B.x + ex - cam.x, B.y + ey - cam.y, 32, 0.9 * B.glow); lights.push([B.x + ex - cam.x, B.y + ey - cam.y, 20, 'rgba(255,230,120,' + (0.35 * B.glow) + ')']); }
    }
    for (const p of st.parts) if (p.k === 'flash') { const x = p.x - cam.x, y = p.y - cam.y; hole(x, y, p.r * 2.5, 0.9 * (1 - p.t / p.life)); }
    for (const tp of st.torps) { hole(tp.x - cam.x, tp.y - cam.y, 26, 0.6); }
    ctx.drawImage(darkCv, 0, 0, vw, VH);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, r, c] of lights) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
    ctx.restore();
  }

  function drawDeco(ctx, d, t) {
    if (d.k === 'kelp') {
      const n = 6, seg = d.h / n; let x = d.x, y = d.y, a = -Math.PI / 2; const pts = [[x, y]];
      for (let i = 1; i <= n; i++) { a = -Math.PI / 2 + Math.sin(t * 1.3 + d.ph + i * 0.5) * 0.22 * (i / n + 0.3); x += Math.cos(a) * seg; y += Math.sin(a) * seg; pts.push([x, y]); }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const [w, c] of [[5.2, OL], [3.2, d.dark ? '#4a8a5a' : '#5ec46a']]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); }
      for (let i = 1; i < pts.length; i++) { const s2 = i % 2 ? 1 : -1; ell(ctx, pts[i][0] + s2 * 4, pts[i][1] + 1, 4.2, 1.8, s2 * 0.6, d.dark ? '#5a9a64' : '#7ee08a', OL, 0.9); }
      ctx.lineCap = 'butt';
    } else if (d.k === 'anem') {
      for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.32 + Math.sin(t * 2 + d.ph + i) * 0.12, l = 8 + (i % 2) * 2; ctx.strokeStyle = OL; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + Math.cos(a) * l, d.y + Math.sin(a) * l); ctx.stroke(); ctx.strokeStyle = d.c; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + Math.cos(a) * l, d.y + Math.sin(a) * l); ctx.stroke(); circ(ctx, d.x + Math.cos(a) * l, d.y + Math.sin(a) * l, 1.3, '#fff'); }
      ctx.lineCap = 'butt'; ell(ctx, d.x, d.y + 1, 4, 2.4, 0, d.c, OL, 1);
    } else if (d.k === 'crys') {
      const u = d.up, gl = 0.6 + 0.4 * Math.sin(t * 2 + d.ph);
      for (const [dx, h, w] of [[-3, 7, 2.4], [1, 10, 3], [4, 6, 2.2]]) { ctx.beginPath(); ctx.moveTo(d.x + dx - w, d.y); ctx.lineTo(d.x + dx, d.y - u * h); ctx.lineTo(d.x + dx + w, d.y); ctx.closePath(); ctx.fillStyle = d.c; ctx.globalAlpha = 0.55 + 0.45 * gl; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(10,20,40,.8)'; ctx.lineWidth = 0.8; ctx.stroke(); }
    } else if (d.k === 'moss') {
      const gl = 0.55 + 0.45 * Math.sin(t * 1.7 + d.ph);
      for (let i = 0; i < 4; i++) circ(ctx, d.x - d.side * (1 + (i % 2) * 2), d.y - 6 + i * 4, 1 + (i % 2) * 0.4, i % 2 ? 'rgba(160,255,220,' + gl + ')' : 'rgba(110,240,200,' + (gl * 0.8) + ')');
    } else if (d.k === 'worm') {
      for (let i = 0; i < 3; i++) { const x = d.x - 4 + i * 4, h = 5 + i % 2 * 3; ctx.fillStyle = '#d8d0e0'; ctx.fillRect(x - 1, d.y - h, 2, h); const open = 0.5 + 0.5 * Math.sin(t * 1.5 + d.ph + i); ell(ctx, x, d.y - h, 2.4 * open + 0.5, 1.4, 0, '#ff5a6a'); }
    } else if (d.k === 'statue') {
      rr(ctx, d.x - 9, d.y - 10, 18, 10, 2); ctx.fillStyle = '#5a6888'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.save(); ctx.translate(d.x, d.y - 26); ctx.scale(d.f, 1); ctx.rotate(-0.5);
      ell(ctx, 0, 0, 13, 7.5, 0, '#7a8aa8', OL, 1.3); ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(-19, -7); ctx.lineTo(-19, 7); ctx.closePath(); ctx.fillStyle = '#7a8aa8'; ctx.fill(); ctx.stroke();
      circ(ctx, 6, -2, 2.2, '#6ff0ff', OL, 0.8); ctx.strokeStyle = 'rgba(20,30,50,.5)'; ctx.lineWidth = 0.8; for (let i = -1; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * 4 - 2, 0, 4, -0.9, 0.9); ctx.stroke(); }
      ctx.restore();
    } else if (d.k === 'gold') {
      for (let i = 0; i < 9; i++) { const gx = d.x + ((i * 37) % 17) - 8, gy = d.y - 2 - Math.floor(i / 3) * 3 - (i % 3 === 1 ? 1 : 0); ell(ctx, gx, gy, 3, 1.6, 0, '#ffd84a', '#8a5a10', 0.7); }
      rr(ctx, d.x - 2, d.y - 15, 6, 5, 1); ctx.fillStyle = '#ff6f9c'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 0.8; ctx.stroke();
      if ((t * 1.7 + d.x) % 2 < 0.25) { ctx.fillStyle = '#fff'; starPath(ctx, d.x + 4, d.y - 9, 3, 0.7, 4, 0); ctx.fill(); }
    } else if (d.k === 'lamp') {
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 0.8; const sw = Math.sin(t * 1.4 + d.ph) * 3; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + sw, d.y + 8); ctx.stroke();
      rr(ctx, d.x + sw - 3, d.y + 8, 6, 7, 1.5); ctx.fillStyle = '#ffd884'; ctx.fill(); ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1; ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(d.x + sw, d.y + 11, 0, d.x + sw, d.y + 11, 22); g.addColorStop(0, 'rgba(255,210,120,.35)'); g.addColorStop(1, 'rgba(255,210,120,0)'); ctx.fillStyle = g; ctx.fillRect(d.x + sw - 22, d.y - 11, 44, 44); ctx.restore();
    }
  }

  function drawItem(ctx, it, t) {
    const bob = Math.sin(it.t * 2.4) * 1.6;
    if (it.k === 'pearl') {
      const x = it.x, y = it.y + bob; const g = ctx.createRadialGradient(x - 1, y - 1, 0.3, x, y, 4); g.addColorStop(0, '#fff'); g.addColorStop(0.6, '#fbe8f4'); g.addColorStop(1, '#d8b8e8');
      ctx.beginPath(); ctx.arc(x, y, 3.6, 0, TAU); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(90,40,90,.65)'; ctx.lineWidth = 0.8; ctx.stroke();
      if ((it.t * 1.3) % 3 < 0.25) { ctx.fillStyle = '#fff'; starPath(ctx, x + 2, y - 2, 3, 0.8, 4, 0); ctx.fill(); }
    } else if (it.k === 'star' || it.k === 'drift') {
      const x = it.x, y = it.y + bob * 1.5, rot = Math.sin(it.t * 1.5) * 0.15;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 22); g.addColorStop(0, 'rgba(255,230,120,.45)'); g.addColorStop(1, 'rgba(255,230,120,0)'); ctx.fillStyle = g; ctx.fillRect(-22, -22, 44, 44); ctx.restore();
      ctx.beginPath(); ctx.moveTo(0, 8); for (let i = 0; i <= 6; i++) { const a = Math.PI * (1.08 + i * 0.84 / 6); ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10 - 1); } ctx.closePath();
      ctx.fillStyle = '#ffd84a'; ctx.fill(); ctx.strokeStyle = '#8a5a10'; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.strokeStyle = 'rgba(160,100,20,.6)'; ctx.lineWidth = 0.8; for (let i = 1; i < 6; i++) { const a = Math.PI * (1.08 + i * 0.84 / 6); ctx.beginPath(); ctx.moveTo(0, 7); ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9 - 1); ctx.stroke(); }
      rr(ctx, -3.5, 6, 7, 3.5, 1.5); ctx.fillStyle = '#f0b830'; ctx.fill(); ctx.strokeStyle = '#8a5a10'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#fff'; starPath(ctx, 0, -2, 3.6, 1.6, 5); ctx.fill();
      ctx.restore();
      if ((it.t * 2) % 2 < 0.2) { ctx.fillStyle = '#fff'; starPath(ctx, x + 8, y - 8, 3, 0.7, 4, 0); ctx.fill(); }
    } else if (it.k === 'air') {
      const x = it.x, y = it.y + bob, w = 1 + Math.sin(it.t * 4) * 0.06;
      ctx.save(); ctx.translate(x, y); ctx.scale(w, 2 - w);
      const g = ctx.createRadialGradient(-3, -3, 1, 0, 0, 9); g.addColorStop(0, 'rgba(255,255,255,.75)'); g.addColorStop(0.7, 'rgba(180,240,255,.25)'); g.addColorStop(1, 'rgba(200,250,255,.6)');
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.2; ctx.stroke();
      heartPath(ctx, 0, 0.5, 0.62); ctx.fillStyle = '#ff6f9c'; ctx.fill(); ctx.strokeStyle = '#a03060'; ctx.lineWidth = 0.7; ctx.stroke();
      ctx.restore(); circ(ctx, x - 3.5, y - 4, 1.6, 'rgba(255,255,255,.9)');
    }
  }

  function drawRing(ctx, r, t) {
    const x = r.x, y = r.y + Math.sin(t * 1.6) * 2, sq = 0.45 + 0.55 * Math.abs(Math.cos(t * 1.2));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, 4, x, y, 44); g.addColorStop(0, 'rgba(255,240,160,.55)'); g.addColorStop(1, 'rgba(255,200,80,0)'); ctx.fillStyle = g; ctx.fillRect(x - 44, y - 44, 88, 88); ctx.restore();
    for (let i = 0; i < 6; i++) { const a = t * 1.5 + i * TAU / 6; ctx.fillStyle = i % 2 ? '#fff' : '#ffd84a'; starPath(ctx, x + Math.cos(a) * 24 * sq, y + Math.sin(a) * 26, 2.6, 0.8, 4, t); ctx.fill(); }
    ell(ctx, x, y, 15 * sq + 2, 22, 0, null, OL, 7); ell(ctx, x, y, 15 * sq + 2, 22, 0, null, '#ffd84a', 4.5); ell(ctx, x - 0.8, y - 1, 15 * sq + 2, 21, 0, null, 'rgba(255,255,255,.6)', 1.3);
    outlined(ctx, tr('Ziel', 'Goal'), x, y - 32, 8, '#fff4e0');
  }

  function drawGate(ctx, g, t) {
    const X0 = g.x0 * T, Y0 = g.y0 * T, W = (g.x1 - g.x0 + 1) * T, H = (g.y1 - g.y0 + 1) * T, k = ease(g.anim);
    if (g.kind === 'bulk') {
      /* door frame + sliding bulkhead */
      rr(ctx, X0 - 3, Y0 - 3, W + 6, H + 6, 3); ctx.fillStyle = '#4a5a52'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.fillStyle = '#18242a'; ctx.fillRect(X0, Y0, W, H);
      ctx.save(); ctx.beginPath(); ctx.rect(X0, Y0, W, H); ctx.clip(); ctx.translate(0, -k * H);
      rr(ctx, X0 + 1, Y0, W - 2, H, 3); const gr = ctx.createLinearGradient(X0, 0, X0 + W, 0); gr.addColorStop(0, '#7a9a8a'); gr.addColorStop(0.5, '#a8c4b2'); gr.addColorStop(1, '#6a887a'); ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.2; ctx.stroke();
      for (let i = 0; i < 4; i++) for (const sx of [X0 + 4, X0 + W - 4]) circ(ctx, sx, Y0 + 6 + i * (H - 12) / 3, 1.2, '#4a5a52');
      ctx.fillStyle = '#ffd84a'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(X0 + 2 + i * 8, Y0 + H - 2); ctx.lineTo(X0 + 6 + i * 8, Y0 + H - 8); ctx.lineTo(X0 + 9 + i * 8, Y0 + H - 8); ctx.lineTo(X0 + 5 + i * 8, Y0 + H - 2); ctx.fill(); }
      const wx = X0 + W / 2, wy = Y0 + H / 2 - 4; ctx.save(); ctx.translate(wx, wy); ctx.rotate(g.opening ? g.anim * 8 : 0); circ(ctx, 0, 0, 8, null, '#c8902a', 2.4); for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 4 * 2); ctx.fillStyle = '#c8902a'; ctx.fillRect(-1, -9, 2, 18); } circ(ctx, 0, 0, 2.5, '#ffd84a', OL, 0.8); ctx.restore();
      ctx.restore();
      drawConsole(ctx, g, t);
    } else {
      /* temple facade around the floor door */
      const cx = X0 + W / 2;
      ctx.fillStyle = '#5a6a8a'; for (const sx of [X0 - 26, X0 + W + 14]) { rr(ctx, sx, Y0 - 58, 12, 58, 2); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.2; ctx.stroke(); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(sx + 3, Y0 - 56, 1.5, 54); ctx.fillRect(sx + 7, Y0 - 56, 1.5, 54); ctx.fillStyle = '#5a6a8a'; }
      ctx.beginPath(); ctx.moveTo(X0 - 34, Y0 - 58); ctx.lineTo(cx, Y0 - 84); ctx.lineTo(X0 + W + 34, Y0 - 58); ctx.closePath(); ctx.fillStyle = '#6a7a9a'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.4; ctx.stroke();
      fishGlyph(ctx, cx, Y0 - 68, 1, g.open ? '#9bffb0' : '#6ff0ff', 0.6 + 0.4 * Math.sin(t * 2));
      ctx.fillStyle = '#0a1020'; ctx.fillRect(X0, Y0, W, H);
      ctx.save(); ctx.beginPath(); ctx.rect(X0, Y0, W, H); ctx.clip();
      for (const side of [-1, 1]) {
        const hx = side < 0 ? X0 - k * W / 2 : X0 + W / 2 + k * W / 2;
        rr(ctx, hx, Y0, W / 2, H, 2); ctx.fillStyle = '#7a88a8'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.strokeStyle = 'rgba(20,30,50,.4)'; ctx.lineWidth = 0.8; ctx.strokeRect(hx + 3, Y0 + 3, W / 2 - 6, H - 6);
        fishGlyph(ctx, hx + W / 4, Y0 + H / 2, side, g.open ? '#9bffb0' : '#6ff0ff', 0.5 + 0.5 * Math.sin(t * 2 + side));
      }
      ctx.restore();
      drawShrine(ctx, g, t);
    }
  }
  function fishGlyph(ctx, x, y, f, col, a) { ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(x, y, 6, 3.2, 0, 0, TAU); ctx.moveTo(x - f * 6, y); ctx.lineTo(x - f * 10, y - 3); ctx.lineTo(x - f * 10, y + 3); ctx.closePath(); ctx.stroke(); circ(ctx, x + f * 3, y - 0.8, 0.9, col); ctx.restore(); }
  function drawConsole(ctx, g, t) {
    const x = g.cx, y = g.cy, done = g.open || g.opening;
    ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(x + 6, y - 22); ctx.lineTo(x + 18, y - 22); ctx.lineTo(x + 18, y - 40); ctx.lineTo((g.x0) * T, y - 40); ctx.stroke();
    ctx.strokeStyle = '#d8a84a'; ctx.lineWidth = 1.6; ctx.stroke();
    rr(ctx, x - 13, y - 6, 26, 6, 2); ctx.fillStyle = '#6a4a2a'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.2; ctx.stroke();
    rr(ctx, x - 9, y - 32, 18, 27, 5); const gr = ctx.createLinearGradient(x - 9, 0, x + 9, 0); gr.addColorStop(0, '#b07a2a'); gr.addColorStop(0.45, '#ffd27a'); gr.addColorStop(1, '#a06a20'); ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.3; ctx.stroke();
    circ(ctx, x, y - 22, 5.5, '#fff4e0', OL, 1.2); const nd = done ? -0.6 : Math.sin(t * 7) * 0.5 + 0.9; ctx.strokeStyle = '#c0303a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - 22); ctx.lineTo(x + Math.cos(nd - Math.PI / 2) * 4.5, y - 22 + Math.sin(nd - Math.PI / 2) * 4.5); ctx.stroke();
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x - 1.2, y - 40, 2.4, 8); rr(ctx, x - 7, y - 42, 14, 3, 1.5); ctx.fillStyle = '#c8902a'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 0.9; ctx.stroke();
    const lamp = done ? '#7dff9a' : ((t * 2) % 1 < 0.5 ? '#ff4a5a' : '#a02030'); circ(ctx, x, y - 12, 2.6, lamp, OL, 0.9);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createRadialGradient(x, y - 12, 0, x, y - 12, 12); lg.addColorStop(0, done ? 'rgba(120,255,150,.5)' : 'rgba(255,80,90,.45)'); lg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = lg; ctx.fillRect(x - 12, y - 24, 24, 24); ctx.restore();
  }
  function drawShrine(ctx, g, t) {
    const x = g.cx, y = g.cy, done = g.open || g.opening;
    rr(ctx, x - 14, y - 7, 28, 7, 2); ctx.fillStyle = '#4a5878'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.2; ctx.stroke();
    rr(ctx, x - 10, y - 30, 20, 24, 3); ctx.fillStyle = '#6a7898'; ctx.fill(); ctx.stroke();
    rr(ctx, x - 13, y - 35, 26, 6, 2); ctx.fillStyle = '#7a88a8'; ctx.fill(); ctx.stroke();
    const a = 0.6 + 0.4 * Math.sin(t * 2.4); fishGlyph(ctx, x, y - 19, 1, done ? '#9bffb0' : '#6ff0ff', a);
    for (let i = 0; i < 3; i++) circ(ctx, x - 6 + i * 6, y - 10, 1.2, done ? '#9bffb0' : '#6ff0ff');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createRadialGradient(x, y - 20, 0, x, y - 20, 26); lg.addColorStop(0, done ? 'rgba(120,255,160,.35)' : 'rgba(100,230,255,.35)'); lg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = lg; ctx.fillRect(x - 26, y - 46, 52, 52); ctx.restore();
  }
  function prompt(ctx, x, y, t) { const b = Math.sin(t * 5) * 1.5; rr(ctx, x - 26, y - 8 + b, 52, 15, 7); ctx.fillStyle = 'rgba(74,34,58,.92)'; ctx.fill(); ctx.strokeStyle = '#ff9eb0'; ctx.lineWidth = 1.2; ctx.stroke(); outlined(ctx, tr('▼ andocken', '▼ dock'), x, y + b, 8, '#fff4e0'); }

  function drawEnt(ctx, e, t) {
    const fl = e.flash > 0;
    switch (e.k) {
      case 'fish': {
        const g = e.g; ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.f, 1); const w = Math.sin(t * 12 + e.ox) * 0.25;
        ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-10, -4 + w * 4); ctx.lineTo(-10, 4 + w * 4); ctx.closePath(); ctx.fillStyle = g.c1; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1; ctx.stroke();
        ell(ctx, 0, 0, 6.5, 4.4, 0, fl ? '#fff' : g.c1, OL, 1.1);
        ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 6.5, 4.4, 0, 0, TAU); ctx.clip(); ctx.fillStyle = g.c2; ctx.fillRect(-1.5, -5, 2.2, 10); ctx.restore();
        circ(ctx, 3, -1, 1.6, '#fff'); circ(ctx, 3.4, -1, 0.85, OL); ctx.strokeStyle = OL; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(1.6, -3.4); ctx.lineTo(4.6, -2.4); ctx.stroke();
        ctx.restore(); break;
      }
      case 'jelly': case 'gjelly': {
        const gl = e.k === 'gjelly', pulse = Math.sin(e.t * (gl ? 2 : 3)) * 0.12, x = e.x, y = e.y;
        const body = gl ? (e.hue ? 'rgba(255,140,230,.85)' : 'rgba(120,230,255,.85)') : 'rgba(255,158,200,.88)';
        ctx.strokeStyle = gl ? (e.hue ? 'rgba(255,160,240,.8)' : 'rgba(140,240,255,.8)') : 'rgba(230,120,170,.85)'; ctx.lineWidth = 1.2;
        for (let i = 0; i < 4; i++) { ctx.beginPath(); const bx = x - 5 + i * 3.3; ctx.moveTo(bx, y + 2); for (let j = 1; j <= 5; j++) ctx.lineTo(bx + Math.sin(e.t * 3 + j + i) * 1.6, y + 2 + j * 2.6); ctx.stroke(); }
        ctx.beginPath(); ctx.ellipse(x, y + 2, 8.5 * (1 - pulse), 8 * (1 + pulse), 0, Math.PI, TAU); for (let i = 0; i <= 6; i++) ctx.lineTo(x + 8.5 * (1 - pulse) - i * 17 * (1 - pulse) / 6, y + 2 + (i % 2) * 1.6); ctx.closePath();
        ctx.fillStyle = fl ? '#fff' : body; ctx.fill(); ctx.strokeStyle = gl ? 'rgba(20,40,80,.8)' : '#8a3a6a'; ctx.lineWidth = 1.1; ctx.stroke();
        ell(ctx, x - 3, y - 3, 2.4, 1.4, -0.4, 'rgba(255,255,255,.6)');
        circ(ctx, x - 2.5, y - 0.5, 1, OL); circ(ctx, x + 2.5, y - 0.5, 1, OL); ctx.strokeStyle = OL; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(x, y + 0.5, 1.3, 0.2, Math.PI - 0.2); ctx.stroke();
        circ(ctx, x - 4.5, y + 0.8, 1, 'rgba(255,100,150,.6)'); circ(ctx, x + 4.5, y + 0.8, 1, 'rgba(255,100,150,.6)');
        break;
      }
      case 'urchin': {
        const x = e.x, y = e.y, wig = Math.sin(t * 3 + e.x) * 0.06;
        ctx.strokeStyle = OL; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
        for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + wig, l = 9 + (i % 2) * 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke(); }
        ctx.strokeStyle = '#8a5ad0'; ctx.lineWidth = 1.2; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + wig, l = 9 + (i % 2) * 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke(); }
        ctx.lineCap = 'butt'; circ(ctx, x, y, 5.6, '#5a2a8a', OL, 1.2); circ(ctx, x - 1.5, y - 1.5, 1.6, 'rgba(255,255,255,.35)');
        circ(ctx, x - 2, y + 0.5, 1.1, '#fff'); circ(ctx, x + 2, y + 0.5, 1.1, '#fff'); circ(ctx, x - 1.8, y + 0.8, 0.5, OL); circ(ctx, x + 2.2, y + 0.8, 0.5, OL);
        break;
      }
      case 'mine': {
        const x = e.x, y = e.y; ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(x, y + 7); ctx.lineTo(x + Math.sin(t) * 1.5, e.ay); ctx.stroke(); ctx.setLineDash([]);
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3; ctx.save(); ctx.translate(x + Math.cos(a) * 7, y + Math.sin(a) * 7); ctx.rotate(a); rr(ctx, -1, -2, 4.5, 4, 1); ctx.fillStyle = '#6a6a7a'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 0.9; ctx.stroke(); ctx.restore(); }
        const g = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 8); g.addColorStop(0, fl || e.fuse ? '#fff' : '#8a8a9a'); g.addColorStop(1, '#3a3a48'); circ(ctx, x, y, 7, null); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.2; ctx.stroke();
        const bl = (t * 2 + e.x) % 1 < 0.5 || e.fuse; circ(ctx, x, y - 1, 1.8, bl ? '#ff3a4a' : '#7a1a24');
        if (bl) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createRadialGradient(x, y - 1, 0, x, y - 1, 9); lg.addColorStop(0, 'rgba(255,60,80,.6)'); lg.addColorStop(1, 'rgba(255,60,80,0)'); ctx.fillStyle = lg; ctx.fillRect(x - 9, y - 10, 18, 18); ctx.restore(); }
        break;
      }
      case 'eel': {
        const hx = e.hx, hy = e.hy;
        ell(ctx, hx, hy, e.dy ? 7 : 4, e.dy ? 4 : 7, 0, '#120a14', OL, 1);
        if (e.st === 'warn' && !e.dead) { const a = 0.5 + 0.5 * Math.sin(e.st_t * 20); for (const s2 of [-1, 1]) circ(ctx, hx + (e.dy ? s2 * 2.5 : 0), hy + (e.dx ? s2 * 2.5 : 0), 1.3, 'rgba(255,230,80,' + a + ')'); outlined(ctx, '!', hx - e.dx * 12, hy - e.dy * 12, 9, '#ffd84a'); }
        if (e.ext > 0.02) {
          const n = 10, pts = []; const px = -e.dy, py = e.dx;
          for (let i = 0; i <= n; i++) { const k = i / n, w = Math.sin(k * 7 - t * 14) * 3 * k * (1 - k * 0.3); pts.push([hx + (e.x - hx) * k + px * w, hy + (e.y - hy) * k + py * w]); }
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          for (const [w, c] of [[10, OL], [7.6, e.flash > 0 ? '#fff' : '#7ab83a'], [3, '#c8e070']]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.stroke(); }
          ctx.lineCap = 'butt';
          const hd = pts[n], ang = Math.atan2(e.dy, e.dx); ctx.save(); ctx.translate(hd[0], hd[1]); ctx.rotate(ang);
          ell(ctx, 2, 0, 7, 5, 0, '#7ab83a', OL, 1.1); ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(10, -3.5); ctx.lineTo(10, 3.5); ctx.closePath(); ctx.fillStyle = '#5a1020'; ctx.fill();
          ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(5 + i * 1.8, -1.8 - i * 0.6); ctx.lineTo(6 + i * 1.8, 0); ctx.lineTo(7 + i * 1.8, -2 - i * 0.6); ctx.fill(); }
          circ(ctx, 1, -2.8, 1.8, '#ffe14a', OL, 0.7); circ(ctx, 1.5, -2.8, 0.8, OL); ctx.restore();
        }
        break;
      }
      case 'angler': {
        const x = e.x, y = e.y, f = e.f, op = e.st === 'wind' ? 0.6 + Math.sin(e.st_t * 30) * 0.2 : (e.st === 'lunge' ? 1 : 0.25);
        ctx.save(); ctx.translate(x, y); ctx.scale(f, 1); if (e.st === 'wind') ctx.translate(Math.sin(e.t * 50) * 0.8, 0);
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-17, -6); ctx.lineTo(-16, 6); ctx.closePath(); ctx.fillStyle = '#3a3050'; ctx.fill(); ctx.strokeStyle = '#120a1a'; ctx.lineWidth = 1; ctx.stroke();
        circ(ctx, 0, 0, 11, fl ? '#fff' : '#4a3a60', '#120a1a', 1.4);
        ctx.beginPath(); ctx.moveTo(1, -4 * op); ctx.quadraticCurveTo(10, -6 * op, 11, 0); ctx.quadraticCurveTo(10, 6 * op + 3, 1, 3 + 4 * op); ctx.closePath(); ctx.fillStyle = '#1a0a1a'; ctx.fill();
        ctx.fillStyle = '#f4f0e0'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(3 + i * 2, -4 * op + 0.5); ctx.lineTo(4 + i * 2, -4 * op + 3.5); ctx.lineTo(5 + i * 2, -4 * op + 0.5); ctx.fill(); ctx.beginPath(); ctx.moveTo(3 + i * 2, 3 + 4 * op - 0.5); ctx.lineTo(4 + i * 2, 3 + 4 * op - 3.5); ctx.lineTo(5 + i * 2, 3 + 4 * op - 0.5); ctx.fill(); }
        circ(ctx, 1, -6, 2.6, '#f4f0e0', '#120a1a', 0.8); circ(ctx, 1.8, -6, 1.3, '#120a1a'); ctx.strokeStyle = '#120a1a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-2, -9.5); ctx.lineTo(4, -8); ctx.stroke();
        const lw = Math.sin(e.t * 2) * 2; ctx.strokeStyle = '#2a2040'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-2, -10); ctx.quadraticCurveTo(4, -22, 12 + lw, -16); ctx.stroke();
        circ(ctx, 12 + lw, -15, 2.8, '#eaffa0', '#6a8a2a', 0.8);
        ctx.restore();
        if (e.st === 'wind') outlined(ctx, '!', x - f * 4, y - 22, 11, '#ffd84a');
        break;
      }
      case 'rock': { ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rot); ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, r = e.r * (0.8 + hash(i, e.r * 10 | 0, 2) * 0.35); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fillStyle = e.flash > 0 ? '#fff' : '#6a7090'; ctx.fill(); ctx.strokeStyle = '#141828'; ctx.lineWidth = 1.3; ctx.stroke(); circ(ctx, -e.r * 0.3, -e.r * 0.3, e.r * 0.25, 'rgba(255,255,255,.18)'); ctx.restore(); break; }
      case 'warn': { ctx.save(); ctx.globalAlpha = 0.72 + 0.28 * Math.sin(e.t * 24); outlined(ctx, '!', e.x, e.y + 34, 12, '#ffb347'); ctx.restore(); break; }
    }
  }
  function lurePos(e) { return {x: e.x + e.f * (12 + Math.sin(e.t * 2) * 2), y: e.y - 15}; }

  function drawTorp(ctx, tp) {
    ctx.save(); ctx.translate(tp.x, tp.y); ctx.scale(tp.f, 1);
    rr(ctx, -8, -2.6, 14, 5.2, 2.6); ctx.fillStyle = '#c8d0dc'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, -2.6); ctx.quadraticCurveTo(9, 0, 4, 2.6); ctx.closePath(); ctx.fillStyle = '#ff6f9c'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff6f9c'; ctx.beginPath(); ctx.moveTo(-6, -2.4); ctx.lineTo(-10, -5); ctx.lineTo(-8, -2); ctx.fill(); ctx.beginPath(); ctx.moveTo(-6, 2.4); ctx.lineTo(-10, 5); ctx.lineTo(-8, 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(-6, -1.8, 8, 0.9);
    ctx.restore();
  }

  function drawSub(ctx, t) {
    if (st.phase === 'exit' && st.exitT > 0.9) return;
    const blink = s.inv > 0 && st.phase === 'play' && (st.fr >> 2) % 2 === 0 && !st.auto;
    const bob = st.phase === 'play' ? Math.sin(t * 2.2) * 0.8 : 0, sq = s.bump > 0 ? Math.sin(s.bump * Math.PI) * 0.12 : 0;
    ctx.save(); ctx.translate(s.x, s.y + bob); ctx.rotate(s.tilt * s.f); ctx.scale(s.f * (1 + sq), 1 - sq);
    if (st.phase === 'exit') { const k = 1 - ease(st.exitT / 0.9) * 0.7; ctx.scale(k, k); }
    if (blink) ctx.globalAlpha = 0.45;
    if (st.phase === 'dead') ctx.rotate(Math.min(0.6, st.deadT * 0.5));
    /* shadow-ish underside glow */
    /* propeller */
    const pa = s.prop; ctx.fillStyle = '#5a4a3a'; ctx.fillRect(-21, -1, 4, 2);
    for (let i = 0; i < 2; i++) { const h = 6.5 * Math.abs(Math.sin(pa + i * Math.PI / 2)); ell(ctx, -22, (i ? 1 : -1) * h / 2, 1.6, Math.max(0.6, h / 2), 0, '#c8c8d8', OL, 0.9); }
    circ(ctx, -21.5, 0, 1.8, '#ff6f9c', OL, 0.8);
    /* tail fins */
    for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-12, sgn * 4); ctx.lineTo(-19, sgn * 10); ctx.lineTo(-16, sgn * 2); ctx.closePath(); ctx.fillStyle = '#ff9a4a'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.2; ctx.stroke(); }
    /* conning tower + periscope */
    ctx.strokeStyle = OL; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(-1, -12); ctx.lineTo(-1, -19); ctx.lineTo(4, -19); ctx.stroke(); ctx.strokeStyle = '#9aa0b0'; ctx.lineWidth = 1.6; ctx.stroke();
    rr(ctx, -6, -14, 11, 7, 3); ctx.fillStyle = '#ffcf3a'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.3; ctx.stroke();
    /* body */
    const g = ctx.createLinearGradient(0, -10, 0, 10); g.addColorStop(0, '#fff07a'); g.addColorStop(0.45, '#ffd84a'); g.addColorStop(1, '#e8a520');
    ell(ctx, 0, 0, 16, 9.6, 0, null); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(160,90,20,.45)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-14, 4); ctx.quadraticCurveTo(0, 7.5, 14, 4); ctx.stroke();
    for (let i = 0; i < 5; i++) circ(ctx, -10 + i * 5, 5.6 - Math.abs(i - 2) * 0.4, 0.7, 'rgba(140,80,20,.7)');
    ell(ctx, -5, -5.5, 6, 1.6, -0.1, 'rgba(255,255,255,.55)');
    /* nose lamp */
    rr(ctx, 13.5, -0.5, 4.5, 5, 2); ctx.fillStyle = '#9aa0b0'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1; ctx.stroke(); circ(ctx, 17.2, 2, 1.8, '#fffbe0');
    /* porthole with Toffo */
    const px = 3, py = -1.5;
    circ(ctx, px, py, 7.4, '#c8902a', OL, 1.3);
    ctx.save(); ctx.beginPath(); ctx.arc(px, py, 5.8, 0, TAU); ctx.clip();
    const gg = ctx.createRadialGradient(px - 2, py - 2, 1, px, py, 6); gg.addColorStop(0, '#d8f4ff'); gg.addColorStop(1, '#6ac4f0'); ctx.fillStyle = gg; ctx.fillRect(px - 7, py - 7, 14, 14);
    try { const pose = st.phase === 'dead' ? 'sad' : (st.phase === 'exit' || st.phase === 'won' ? 'victory' : 'idle'); (st.opts.drawBear || (G.draw && G.draw.drawBearAt))(ctx, px + 0.5, py + 11.5, {scale: 0.62, facing: 1, frame: t * 8, t, pose, outfit: 'unterwasser'}); } catch (e) {}
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(px - 2.4, py - 2.6, 2.6, 1.4, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
    circ(ctx, px, py, 5.8, null, 'rgba(90,50,10,.8)', 0.8);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; circ(ctx, px + Math.cos(a) * 6.6, py + Math.sin(a) * 6.6, 0.55, '#7a5010'); }
    ctx.restore(); ctx.globalAlpha = 1;
    /* headlight beam (soft, in bright levels) */
    if (!L.dark && st.phase === 'play') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lx = s.x + s.f * 17, ly = s.y + 2 + bob; const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 46); lg.addColorStop(0, 'rgba(255,250,200,.22)'); lg.addColorStop(1, 'rgba(255,250,200,0)'); ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.arc(lx, ly, 46, (s.f > 0 ? 0 : Math.PI) - 0.35, (s.f > 0 ? 0 : Math.PI) + 0.35); ctx.closePath(); ctx.fill(); ctx.restore(); }
  }

  function drawPart(ctx, p) {
    const k = p.t / p.life;
    if (p.k === 'b') { ctx.globalAlpha = Math.min(1, (1 - k) * 1.5) * 0.85; circ(ctx, p.x, p.y, p.r, 'rgba(220,250,255,.25)', 'rgba(255,255,255,.85)', 0.6); if (p.r > 1.6) circ(ctx, p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.3, '#fff'); ctx.globalAlpha = 1; }
    else if (p.k === 's') { ctx.globalAlpha = 1 - k; circ(ctx, p.x, p.y, p.r * (1 - k * 0.5), p.c); ctx.globalAlpha = 1; }
    else if (p.k === 'ring') { ctx.globalAlpha = 1 - k; circ(ctx, p.x, p.y, 4 + p.r * ease(k), null, p.c, 2); ctx.globalAlpha = 1; }
    else if (p.k === 'flash') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, 'rgba(255,240,180,' + (0.8 * (1 - k)) + ')'); g.addColorStop(1, 'rgba(255,160,60,0)'); ctx.fillStyle = g; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); ctx.restore(); }
    else if (p.k === 'txt') { ctx.globalAlpha = 1 - k * k; outlined(ctx, p.text, p.x, p.y, 8, p.c); ctx.globalAlpha = 1; }
    else if (p.k === 'ink') { ctx.globalAlpha = 0.75 * (1 - k); circ(ctx, p.x, p.y, p.r, '#241030'); ctx.globalAlpha = 1; }
    else if (p.k === 'dust') { ctx.globalAlpha = 1 - k; circ(ctx, p.x, p.y, p.r, '#a8a090'); ctx.globalAlpha = 1; }
  }

  /* ---------- the kraken ---------- */
  function tentacle(ctx, x0, y0, x1, y1, w0, t, col, phase) {
    const n = 16, dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, L1 = [], L2 = [], mid = [];
    for (let i = 0; i <= n; i++) { const k = i / n, w = Math.sin(k * 5 - t * 7 + phase) * 4 * k, x = x0 + dx * k + nx * w, y = y0 + dy * k + ny * w, hw = lerp(w0, 2.5, k); mid.push([x, y, hw]); L1.push([x + nx * hw, y + ny * hw]); L2.push([x - nx * hw, y - ny * hw]); }
    ctx.beginPath(); ctx.moveTo(L1[0][0], L1[0][1]); for (const p of L1) ctx.lineTo(p[0], p[1]); for (let i = L2.length - 1; i >= 0; i--) ctx.lineTo(L2[i][0], L2[i][1]); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#2a1040'; ctx.lineWidth = 1.8; ctx.stroke();
    for (let i = 1; i < n; i += 2) { const [x, y, hw] = mid[i]; circ(ctx, x - nx * hw * 0.45, y - ny * hw * 0.45, Math.max(1, hw * 0.32), '#f4b8e8', '#8a3a8a', 0.6); }
  }
  function drawBoss(ctx, t) {
    const B = st.boss; if (!B) return;
    /* telegraphs */
    for (const tn of B.tents) {
      if (tn.t < tn.warn) {
        const a = 0.32 + 0.2 * Math.sin(tn.t * 18);
        ctx.fillStyle = 'rgba(30,0,40,' + a + ')';
        if (tn.k === 'left') ctx.fillRect(0, tn.pos - 12, 340, 24); else ctx.fillRect(tn.pos - 12, 0, 24, 272);
        ctx.strokeStyle = 'rgba(255,110,140,' + (a + 0.35) + ')'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.6;
        if (tn.k === 'left') ctx.strokeRect(0, tn.pos - 12, 340, 24); else ctx.strokeRect(tn.pos - 12, 0, 24, 272); ctx.setLineDash([]);
        const wx = tn.k === 'left' ? 30 : tn.pos, wy = tn.k === 'left' ? tn.pos : (tn.k === 'top' ? 50 : 196);
        outlined(ctx, '!', wx, wy, 13, '#ff6f9c');
      }
    }
    for (const tn of B.tents) if (tn.ext > 0.01) {
      const col = B.ph === 3 ? '#b04aa0' : '#8a4ac8', L2 = 240 * tn.ext;
      if (tn.k === 'top') tentacle(ctx, tn.pos, -10, tn.pos + Math.sin(t * 3) * 3, -10 + L2, 13, t, col, tn.pos);
      else if (tn.k === 'bottom') tentacle(ctx, tn.pos, 282, tn.pos + Math.sin(t * 3) * 3, 282 - L2, 13, t, col, tn.pos);
      else tentacle(ctx, -10, tn.pos, -10 + 345 * tn.ext, tn.pos, 13, t, col, tn.pos);
    }
    for (const bl of B.blobs) { circ(ctx, bl.x, bl.y, 5.5, '#2a1238', '#120818', 1.2); circ(ctx, bl.x - 1.6, bl.y - 1.8, 1.6, 'rgba(255,255,255,.35)'); for (let i = 1; i < 4; i++) { ctx.globalAlpha = 0.5 - i * 0.12; circ(ctx, bl.x - bl.vx * i * 2.5, bl.y - bl.vy * i * 2.5, 4 - i, '#2a1238'); } ctx.globalAlpha = 1; }
    if (B.whirl > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, B.whirl) * 0.55; ctx.strokeStyle = 'rgba(200,240,255,.8)'; ctx.lineWidth = 1.4; const cx = B.x - 50, cy = B.y + 16; for (let i = 0; i < 4; i++) { ctx.beginPath(); for (let a = 0; a < 9; a += 0.2) { const r = 10 + a * 13, an = -a - st.t * 4 + i * Math.PI / 2; ctx.lineTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r * 0.7); } ctx.stroke(); } ctx.restore(); }
    /* body */
    const x = B.x, y = B.y, rage = B.rage, dead = B.st === 'dead', inh = B.inhale > 0 ? 1 : 0;
    ctx.save(); ctx.translate(x, y);
    if (dead) { ctx.rotate(Math.min(0.5, B.t * 0.2)); ctx.globalAlpha = clamp(1.5 - B.t * 0.4, 0, 1); }
    const body = B.flash > 0 ? '#ffffff' : (rage > 0.5 ? '#b04a9a' : '#8a4ac8'), dark = rage > 0.5 ? '#7a2a6a' : '#5a2a8a';
    for (let i = 0; i < 6; i++) { const a0 = Math.PI * (0.25 + i * 0.12), bx = Math.cos(a0) * 28, by = 34; const ex = bx - 30 - i * 6 + Math.sin(t * 2 + i) * 10, ey = by + 40 + Math.sin(t * 1.6 + i * 1.3) * 12; tentacle(ctx, bx, by, ex, ey, 9, t, i % 2 ? dark : body, i); }
    const sw = 1 + inh * 0.08 + Math.sin(t * 2) * 0.02;
    ctx.save(); ctx.scale(sw, 1 / sw);
    ctx.beginPath(); ctx.moveTo(-44, 26); ctx.bezierCurveTo(-56, -30, -30, -70, 4, -70); ctx.bezierCurveTo(40, -70, 60, -30, 48, 26); ctx.quadraticCurveTo(2, 44, -44, 26); ctx.closePath();
    const bg = ctx.createRadialGradient(-12, -40, 6, 0, -10, 70); bg.addColorStop(0, B.flash > 0 ? '#fff' : (rage > 0.5 ? '#e07ac8' : '#b88af0')); bg.addColorStop(1, body); ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = '#2a1040'; ctx.lineWidth = 2.6; ctx.stroke();
    for (const [sx, sy, sr] of [[-20, -48, 5], [18, -52, 4], [30, -30, 6], [-32, -18, 4], [6, -60, 3]]) circ(ctx, sx, sy, sr, 'rgba(255,255,255,.18)');
    ctx.restore();
    /* crown */
    if (!B.crown) drawCrown(ctx, 4, -70, 0.1 + Math.sin(t * 1.3) * 0.05);
    /* eyes */
    const glow = B.glow, lk = B.look;
    for (const [ex, ey, sd] of [[-20, -18, -1], [16, -20, 1]]) {
      if (glow > 0.05) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gg = ctx.createRadialGradient(ex, ey, 2, ex, ey, 26); gg.addColorStop(0, 'rgba(255,240,120,' + (0.7 * glow) + ')'); gg.addColorStop(1, 'rgba(255,200,60,0)'); ctx.fillStyle = gg; ctx.fillRect(ex - 26, ey - 26, 52, 52); ctx.restore(); }
      ell(ctx, ex, ey, 11, 12, 0, glow > 0.3 ? '#fff6b0' : '#fff', '#2a1040', 1.8);
      if (dead) { ctx.strokeStyle = '#2a1040'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex - 5, ey - 5); ctx.lineTo(ex + 5, ey + 5); ctx.moveTo(ex + 5, ey - 5); ctx.lineTo(ex - 5, ey + 5); ctx.stroke(); }
      else { const px = ex + Math.cos(lk) * 4, py = ey + Math.sin(lk) * 4 + 1; circ(ctx, px, py, glow > 0.3 ? 5.5 : 4.6, glow > 0.3 ? '#ff9a2a' : '#2a1040'); circ(ctx, px, py, glow > 0.3 ? 2.6 : 0, '#2a1040'); circ(ctx, px - 1.5, py - 2, 1.4, '#fff'); }
      if (!dead && B.st !== 'vuln') { ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(ex - 13, ey - 13 + (sd < 0 ? -2 : 6)); ctx.lineTo(ex + 13, ey - 13 + (sd < 0 ? 6 : -2)); ctx.lineTo(ex + 13, ey - 16); ctx.lineTo(ex - 13, ey - 16); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = '#2a1040'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); const tilt = B.st === 'vuln' ? -3 : 5; ctx.moveTo(ex - 11, ey - 14 + (sd < 0 ? -tilt * 0.3 : tilt)); ctx.lineTo(ex + 11, ey - 14 + (sd < 0 ? tilt : -tilt * 0.3)); ctx.stroke(); ctx.lineCap = 'butt';
    }
    /* mouth */
    const mo = B.mouth;
    if (mo > 0.15) {
      ctx.beginPath(); ctx.ellipse(-4, 12, 14, 4 + mo * 9, 0, 0, TAU); ctx.fillStyle = '#3a0a2a'; ctx.fill(); ctx.strokeStyle = '#2a1040'; ctx.lineWidth = 1.8; ctx.stroke();
      ell(ctx, -4, 14 + mo * 4, 7, 3 * mo, 0, '#ff6f9c');
      ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-14 + i * 5, 12 - 4 - mo * 8); ctx.lineTo(-12 + i * 5, 12 - mo * 4); ctx.lineTo(-10 + i * 5, 12 - 4 - mo * 8); ctx.fill(); }
    } else { ctx.strokeStyle = '#2a1040'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-16, 15); ctx.quadraticCurveTo(-4, 6, 8, 15); ctx.stroke(); ctx.lineCap = 'butt'; }
    if (inh) { ell(ctx, -36, 0, 7, 6, 0, 'rgba(255,150,200,.5)'); ell(ctx, 30, -2, 7, 6, 0, 'rgba(255,150,200,.5)'); }
    for (let i = 0; i < 2; i++) { const a = rage > 0.5 ? 1 : 0; if (a) { const yy = -64 - ((t * 30 + i * 12) % 24); ctx.globalAlpha = 0.6; circ(ctx, -30 + i * 60, yy, 4, '#fff'); ctx.globalAlpha = 1; } }
    ctx.restore(); ctx.globalAlpha = 1;
    if (B.crown) { ctx.save(); ctx.translate(B.crown.x, B.crown.y); ctx.rotate(B.crown.r); drawCrown(ctx, 0, 0, 0); ctx.restore(); }
  }
  function drawCrown(ctx, x, y, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath(); ctx.moveTo(-14, 4); ctx.lineTo(-16, -10); ctx.lineTo(-8, -3); ctx.lineTo(0, -14); ctx.lineTo(8, -3); ctx.lineTo(16, -10); ctx.lineTo(14, 4); ctx.closePath();
    ctx.fillStyle = '#ffd84a'; ctx.fill(); ctx.strokeStyle = '#8a5a10'; ctx.lineWidth = 1.5; ctx.stroke();
    circ(ctx, 0, -2, 2.4, '#ff6f9c', '#8a2a4a', 0.8); circ(ctx, -9, 0, 1.6, '#8fd3ff', '#2a5a8a', 0.6); circ(ctx, 9, 0, 1.6, '#9be7a5', '#2a6a3a', 0.6);
    circ(ctx, -16, -10, 1.5, '#fff'); circ(ctx, 0, -14, 1.5, '#fff'); circ(ctx, 16, -10, 1.5, '#fff');
    ctx.restore();
  }

  /* ---------- HUD ---------- */
  function hud(ctx, vw, t) {
    /* top-left panel: hearts, pearls, star shells */
    rr(ctx, 6, 5, 104, 33, 9); ctx.fillStyle = 'rgba(74,34,58,.78)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,158,176,.55)'; ctx.lineWidth = 1; ctx.stroke();
    for (let i = 0; i < s.maxHp; i++) { const on = i < s.hp, pul = on && s.hp === 1 ? 1 + Math.sin(t * 8) * 0.1 : 1; ctx.save(); ctx.translate(17 + i * 14, 15); ctx.scale(pul, pul); heartPath(ctx, 0, 0, 0.82); ctx.fillStyle = on ? '#ff6f9c' : 'rgba(255,255,255,.18)'; ctx.fill(); ctx.strokeStyle = on ? '#7a2048' : 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.stroke(); if (on) circ(ctx, -2.2, -2.2, 1, 'rgba(255,255,255,.7)'); ctx.restore(); }
    circ(ctx, 16, 29, 3.6, '#fbe8f4', 'rgba(90,40,90,.8)', 0.8); circ(ctx, 15, 28, 1, '#fff');
    outlined(ctx, String(st.pearls), 23, 29.5, 9, '#fff4e0', 'left');
    for (let i = 0; i < 3; i++) { const x = 66 + i * 14, y = 29, on = st.stars[i]; ctx.beginPath(); ctx.moveTo(x, y + 4); for (let j = 0; j <= 6; j++) { const a = Math.PI * (1.08 + j * 0.84 / 6); ctx.lineTo(x + Math.cos(a) * 5.5, y + Math.sin(a) * 5.5); } ctx.closePath(); ctx.fillStyle = on ? '#ffd84a' : 'rgba(255,255,255,.16)'; ctx.fill(); ctx.strokeStyle = on ? '#8a5a10' : 'rgba(255,255,255,.35)'; ctx.lineWidth = 0.9; ctx.stroke(); if (on) { ctx.fillStyle = '#fff'; starPath(ctx, x, y - 1, 2, 0.9, 5); ctx.fill(); } }
    /* top-right: world + level name (+ depth in the trench) */
    const Wd = (G.WORLDS || []).find(w => w.key === 'unterwasser'), nm = (Wd && Wd.levels && Wd.levels[st.li]) || NAMES[st.li]; font(ctx, 9); const w = Math.max(ctx.measureText(nm).width, 50) + 18;
    rr(ctx, vw - 6 - w, 5, w, L.vertical ? 33 : 22, 9); ctx.fillStyle = 'rgba(74,34,58,.78)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,158,176,.55)'; ctx.stroke();
    outlined(ctx, (Wd && Wd.name) || tr('Korallenmeer', 'Coral Sea'), vw - 6 - w / 2, 11.5, 6, '#ffb8c8'); outlined(ctx, nm, vw - 6 - w / 2, 20.5, 9, '#fff4e0');
    if (L.vertical) { const m = Math.max(0, Math.round((s.y / T) * 4.5)); outlined(ctx, tr(`Tiefe ${m} m`, `Depth ${m} m`), vw - 6 - w / 2, 31, 7, '#8fd3ff'); }
    /* boss bar below the top-centre safe zone */
    if (L.boss && st.boss && st.boss.st !== 'intro') {
      const B = st.boss, bw = 150, bx = vw / 2 - bw / 2, by = 38;
      outlined(ctx, KRAKEN, vw / 2, 32, 8, '#ffd84a');
      rr(ctx, bx - 2, by - 2, bw + 4, 10, 5); ctx.fillStyle = 'rgba(42,16,48,.85)'; ctx.fill(); ctx.strokeStyle = '#ff9eb0'; ctx.lineWidth = 1; ctx.stroke();
      const k = Math.max(0, B.hp / B.max); if (k > 0) { rr(ctx, bx, by, bw * k, 6, 3); const gg = ctx.createLinearGradient(bx, 0, bx + bw, 0); gg.addColorStop(0, '#c98aff'); gg.addColorStop(1, '#ff6f9c'); ctx.fillStyle = gg; ctx.fill(); }
      for (const m of [7, 14]) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(bx + bw * m / B.max - 0.5, by - 1, 1, 8); }
      if (B.st === 'vuln') outlined(ctx, tr('Jetzt! Die Augen leuchten!', 'Now! His eyes are glowing!'), vw / 2, by + 15, 8, '#fff6b0');
    }
    /* messages */
    if (st.toast) { const a = Math.min(1, st.toast.t * 3); ctx.globalAlpha = a; msgBox(ctx, vw, st.toast.text, L.boss ? 72 : 52); ctx.globalAlpha = 1; }
    else if (st.hintT > 0) { const a = Math.min(1, st.hintT); ctx.globalAlpha = a; msgBox(ctx, vw, st.opts.isTouch ? tr('◀ ▶ fahren · A steigen · ▼ tauchen · B Torpedo', '◀ ▶ move · A rise · ▼ dive · B torpedo') : tr('← → fahren · ↑ steigen · ↓ tauchen · X Torpedo', '← → move · ↑ rise · ↓ dive · X torpedo'), 52); ctx.globalAlpha = 1; }
  }
  function msgBox(ctx, vw, text, y) {
    font(ctx, 8.5, 600); const maxW = Math.min(vw - 60, 330), words = text.split(' '), lines = []; let line = '';
    for (const wd of words) { const tt = line ? line + ' ' + wd : wd; if (ctx.measureText(tt).width > maxW - 16 && line) { lines.push(line); line = wd; } else line = tt; } if (line) lines.push(line);
    const w = Math.min(maxW, Math.max(...lines.map(l => ctx.measureText(l).width)) + 20), h = lines.length * 11 + 8;
    rr(ctx, vw / 2 - w / 2, y - h / 2, w, h, 7); ctx.fillStyle = 'rgba(74,34,58,.9)'; ctx.fill(); ctx.strokeStyle = '#ff9eb0'; ctx.lineWidth = 1; ctx.stroke();
    lines.forEach((l, i) => { font(ctx, 8.5, 600); ctx.textAlign = 'center'; ctx.fillStyle = '#fff4e0'; ctx.fillText(l, vw / 2, y - h / 2 + 9.5 + i * 11); });
  }
})();
