/* Pookiewookie: HD rendering. Parallax worlds, shaded tiles, chibi bears, every creature, weather, particles, HUD.
   Everything is drawn in logical 480x270 units; the backing store follows devicePixelRatio via G.draw.resize(). */
(function () {
  const G = window.PW = window.PW || {}, T = 16, VW = 480, VH = 270, MH = 15, OFFY = VH - MH * T, TAU = Math.PI * 2;
  let ctx = null, canvas = null, k = 1, sk = 1;
  const S = () => G.S, P = () => G.P, L = () => G.L, E = () => G.eng;
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v), mod = (a, n) => ((a % n) + n) % n, lerp = (a, b, t) => a + (b - a) * t;
  const snap = v => Math.round(v * k) / k;

  /* ---------- colours ---------- */
  const colCache = new Map();
  function rgb(h) { let c = colCache.get(h); if (c) return c; if (h[0] === '#') { const n = parseInt(h.length === 4 ? h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h.slice(1, 7), 16); c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; } else { const m = /(\d+)[, ]+(\d+)[, ]+(\d+)/.exec(h); c = m ? [+m[1], +m[2], +m[3]] : [128, 128, 128]; } colCache.set(h, c); return c; }
  function rgba(h, a) { const key = h + '@' + a; let c = colCache.get(key); if (c) return c; const q = rgb(h); c = 'rgba(' + q[0] + ',' + q[1] + ',' + q[2] + ',' + a + ')'; colCache.set(key, c); return c; }
  function shade(h, f) { const key = h + '~' + f; let c = colCache.get(key); if (c) return c; const q = rgb(h), t = f > 0 ? 255 : 0, a = Math.abs(f); c = 'rgb(' + Math.round(lerp(q[0], t, a)) + ',' + Math.round(lerp(q[1], t, a)) + ',' + Math.round(lerp(q[2], t, a)) + ')'; colCache.set(key, c); return c; }
  function mix(h1, h2, t) { const key = h1 + '+' + h2 + '+' + t; let c = colCache.get(key); if (c) return c; const a = rgb(h1), b = rgb(h2); c = 'rgb(' + Math.round(lerp(a[0], b[0], t)) + ',' + Math.round(lerp(a[1], b[1], t)) + ',' + Math.round(lerp(a[2], b[2], t)) + ')'; colCache.set(key, c); return c; }

  /* ---------- sprite cache (offscreen canvases rendered at the backing-store scale) ---------- */
  const sprites = new Map(), grads = new Map();
  function spr(key, w, h, fn) {
    let s = sprites.get(key); if (s) return s;
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w * sk)); c.height = Math.max(1, Math.ceil(h * sk));
    const g = c.getContext('2d'); g.setTransform(sk, 0, 0, sk, 0, 0); g.lineJoin = 'round'; g.lineCap = 'round'; g.imageSmoothingEnabled = true;
    fn(g, w, h); s = {c, w, h}; sprites.set(key, s); return s;
  }
  function blit(s, x, y, w, h, g) { (g || ctx).drawImage(s.c, x, y, w === undefined ? s.w : w, h === undefined ? s.h : h); }
  /* a seamless horizontal strip: fn draws its content three times (shifted by -w, 0, +w) so wrapping is invisible */
  function strip(key, w, h, fn) { return spr(key, w, h, (g) => { for (let o = -w; o <= w; o += w) { g.save(); g.translate(o, 0); fn(g, w, h); g.restore(); } }); }
  function drawStrip(s, y, scroll, alpha) { const w = s.w; let x = -mod(scroll, w); if (alpha !== undefined) ctx.globalAlpha = alpha; for (; x < VW; x += w) ctx.drawImage(s.c, x, y, w, s.h); if (alpha !== undefined) ctx.globalAlpha = 1; }
  function lin(g, key, x0, y0, x1, y1, stops) { let gr = g === ctx ? grads.get(key) : null; if (gr) return gr; gr = g.createLinearGradient(x0, y0, x1, y1); for (let i = 0; i < stops.length; i += 2) gr.addColorStop(stops[i], stops[i + 1]); if (g === ctx) grads.set(key, gr); return gr; }
  function rad(g, key, x, y, r0, r1, stops) { let gr = g === ctx ? grads.get(key) : null; if (gr) return gr; gr = g.createRadialGradient(x, y, r0, x, y, r1); for (let i = 0; i < stops.length; i += 2) gr.addColorStop(stops[i], stops[i + 1]); if (g === ctx) grads.set(key, gr); return gr; }
  /* soft glow disc, additive friendly */
  function glow(col, r) { return spr('glow' + col + r, r * 2, r * 2, (g) => { g.fillStyle = rad(g, '', r, r, 0, r, [0, rgba(col, 0.9), 0.35, rgba(col, 0.35), 1, rgba(col, 0)]); g.fillRect(0, 0, r * 2, r * 2); }); }

  /* ---------- shapes ---------- */
  function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); }
  function rrc(g, x, y, w, h, tl, tr, br, bl) { g.beginPath(); g.moveTo(x + tl, y); g.lineTo(x + w - tr, y); g.quadraticCurveTo(x + w, y, x + w, y + tr); g.lineTo(x + w, y + h - br); g.quadraticCurveTo(x + w, y + h, x + w - br, y + h); g.lineTo(x + bl, y + h); g.quadraticCurveTo(x, y + h, x, y + h - bl); g.lineTo(x, y + tl); g.quadraticCurveTo(x, y, x + tl, y); g.closePath(); }
  function ell(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); }
  function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); }
  function fs(g, fill, stroke, lw) { if (fill !== null) { if (fill) g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 1; g.stroke(); } }
  function fcirc(g, x, y, r, fill, stroke, lw) { circ(g, x, y, r); fs(g, fill, stroke, lw); }
  function fell(g, x, y, rx, ry, fill, stroke, lw) { ell(g, x, y, rx, ry); fs(g, fill, stroke, lw); }
  function frr(g, x, y, w, h, r, fill, stroke, lw) { rr(g, x, y, w, h, r); fs(g, fill, stroke, lw); }
  function heartPath(g, x, y, s) { g.beginPath(); g.moveTo(x, y + s * 0.95); g.bezierCurveTo(x - s * 1.35, y, x - s * 0.9, y - s * 1.1, x, y - s * 0.4); g.bezierCurveTo(x + s * 0.9, y - s * 1.1, x + s * 1.35, y, x, y + s * 0.95); g.closePath(); }
  function starPath(g, x, y, r1, r2, n) { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, r = i % 2 ? r2 : r1; if (i) g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); }
  function cloudPath(g, x, y, w, h) { const r = h / 2; g.beginPath(); g.moveTo(x + r, y + h); g.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI * 1.5); g.arc(x + w * 0.38, y + h - r - h * 0.35, h * 0.62, Math.PI, Math.PI * 1.9); g.arc(x + w * 0.68, y + h - r - h * 0.18, h * 0.5, Math.PI * 1.1, Math.PI * 1.95); g.arc(x + w - r, y + h - r, r, Math.PI * 1.5, Math.PI / 2); g.closePath(); }
  function blobPath(g, x, y, w, h, seed) { /* a soft organic blob (rounded body with a slight random outline) */ g.beginPath(); const cx = x + w / 2, cy = y + h / 2, n = 10; for (let i = 0; i <= n; i++) { const a = i / n * TAU, j = Math.sin(seed * 7 + i * 2.3) * 0.06; const px = cx + Math.cos(a) * (w / 2) * (1 + j), py = cy + Math.sin(a) * (h / 2) * (1 + j); if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath(); }
  function txt(g, t, x, y, size, col, align, stroke, lw, weight) { g.font = (weight || '700') + ' ' + size + 'px "Fredoka", "Nunito", system-ui, sans-serif'; g.textAlign = align || 'left'; g.textBaseline = 'middle'; if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 3; g.lineJoin = 'round'; g.strokeText(t, x, y); } g.fillStyle = col; g.fillText(t, x, y); }

  function limb(cx, cy, rx, ry, rot, col, outline) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot || 0); ell(ctx, 0, 0, rx, ry); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = outline; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }
  /* eyes with highlights, optional blink and brows */
  function eye(g, x, y, r, blink, col, look) { if (blink) { g.strokeStyle = col || '#2a1b12'; g.lineWidth = Math.max(0.8, r * 0.9); g.beginPath(); g.moveTo(x - r, y); g.lineTo(x + r, y); g.stroke(); return; } fcirc(g, x, y, r, col || '#2a1b12'); fcirc(g, x + r * 0.3 + (look || 0), y - r * 0.32, r * (r < 1 ? 0.3 : 0.36), '#fff'); }
  function brows(g, x, y, w, col, up) { g.strokeStyle = col || '#2a1b12'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - w, y - (up ? 1.5 : 0)); g.lineTo(x - w * 0.25, y + (up ? 0 : 1.2)); g.moveTo(x + w, y - (up ? 1.5 : 0)); g.lineTo(x + w * 0.25, y + (up ? 0 : 1.2)); g.stroke(); }
  function smile(g, x, y, w, col, sad) { g.strokeStyle = col || '#2a1b12'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x, y + (sad ? -w : w * 1.1), x + w, y); g.stroke(); }
  function blinkAt(fr, seed) { return (fr + Math.floor(seed * 61)) % 170 < 7; }
  /* soft elliptical drop shadow projected onto the nearest floor below a box */
  function shadow(x, w, yTop, h, tileAt, maxRows) {
    const cx = Math.floor((x + w / 2) / T); let cy = Math.floor((yTop + h) / T); const start = cy;
    for (let i = 0; i < (maxRows || 7); i++, cy++) { const ch = tileAt(cx, cy); if (SOLID.has(ch) || ch === '~' || ch === 's') { const d = cy * T - (yTop + h), f = clamp(1 - d / 110, 0.25, 1); ctx.globalAlpha = 0.28 * f; fell(ctx, x + w / 2, cy * T + 1, w * 0.55 * f + 1, 2.2 * f + 0.6, '#2a1b2a'); ctx.globalAlpha = 1; return; } if (cy >= MH) return; }
  }
  const SOLID = new Set(['#', '=', '?', '!', 'X', 'n', '|', 's', 'i', 'b', 'c', 'Z', 'P']);

  /* ================= small decorations shared by backgrounds and tiles ================= */
  function puffs(g, x, y, w, h) { ell(g, x + w / 2, y + h * 0.72, w / 2, h * 0.28); g.fill(); fcirc(g, x + w * 0.28, y + h * 0.52, h * 0.42); fcirc(g, x + w * 0.52, y + h * 0.42, h * 0.5); fcirc(g, x + w * 0.76, y + h * 0.55, h * 0.38); }
  function cloudSpr(w, h, col, shadeCol) { return spr('cl' + w + h + col, w + 2, h + 2, (g) => { g.fillStyle = col; puffs(g, 1, 1, w, h); g.save(); g.beginPath(); g.rect(0, h * 0.62, w + 2, h); g.clip(); g.fillStyle = shadeCol; puffs(g, 1, 1, w, h); g.restore(); }); }
  function lollipop(g, x, y, r, col, stick) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + stick); g.stroke(); fcirc(g, x, y, r, col, shade(col, -0.25), 1); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = r * 0.28; g.beginPath(); g.arc(x, y, r * 0.55, 0.3, 2.4); g.stroke(); g.beginPath(); g.arc(x, y, r * 0.2, 2.5, 5.5); g.stroke(); }
  function cupcake(g, x, y, s, cup, cream, cherry) { /* x,y = bottom centre, s = width */ const h = s * 0.55; g.fillStyle = cup; g.beginPath(); g.moveTo(x - s * 0.45, y - h); g.lineTo(x + s * 0.45, y - h); g.lineTo(x + s * 0.34, y); g.lineTo(x - s * 0.34, y); g.closePath(); g.fill(); g.strokeStyle = shade(cup, -0.2); g.lineWidth = 1; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(x + i * s * 0.18, y - h + 1); g.lineTo(x + i * s * 0.14, y - 1); g.stroke(); } g.fillStyle = cream; fcirc(g, x - s * 0.22, y - h - s * 0.1, s * 0.22); fcirc(g, x + s * 0.22, y - h - s * 0.1, s * 0.22); fcirc(g, x, y - h - s * 0.25, s * 0.28); fcirc(g, x, y - h - s * 0.45, s * 0.18); fcirc(g, x, y - h - s * 0.62, s * 0.11, cherry); }
  function palm(g, x, y, h, lean, trunk, leaf) { g.strokeStyle = trunk; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * 0.3, y - h * 0.6, x + lean, y - h); g.stroke(); const tx = x + lean, ty = y - h; for (let i = 0; i < 6; i++) { const a = -Math.PI * 0.95 + i * Math.PI * 0.38, lw = h * 0.5; g.fillStyle = i % 2 ? leaf : shade(leaf, -0.15); g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + Math.cos(a) * lw * 0.6, ty + Math.sin(a) * lw * 0.6 - 6, tx + Math.cos(a) * lw, ty + Math.sin(a) * lw + 6); g.quadraticCurveTo(tx + Math.cos(a) * lw * 0.5, ty + Math.sin(a) * lw * 0.5 + 3, tx, ty + 2); g.fill(); } fcirc(g, tx - 2, ty + 3, 2, '#6b4a2a'); fcirc(g, tx + 2, ty + 4, 2, '#6b4a2a'); }
  function pine(g, x, y, h, col, snow) { const w = h * 0.55; g.fillStyle = '#5a3a1a'; g.fillRect(x - 1.5, y - h * 0.2, 3, h * 0.2); for (let i = 0; i < 3; i++) { const ty = y - h * (0.2 + i * 0.27), bw = w * (1 - i * 0.22), th = h * 0.36; g.fillStyle = i % 2 ? shade(col, 0.08) : col; g.beginPath(); g.moveTo(x - bw, ty); g.quadraticCurveTo(x, ty + 2, x + bw, ty); g.lineTo(x, ty - th); g.closePath(); g.fill(); if (snow) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x - bw * 0.7, ty - th * 0.28); g.quadraticCurveTo(x, ty - th * 0.1, x + bw * 0.7, ty - th * 0.28); g.lineTo(x, ty - th); g.closePath(); g.fill(); } } }
  function roundTree(g, x, y, h, trunk, c1, c2) { g.fillStyle = trunk; g.fillRect(x - 2, y - h * 0.45, 4, h * 0.45); g.fillStyle = c1; fcirc(g, x, y - h * 0.62, h * 0.36); fcirc(g, x - h * 0.22, y - h * 0.5, h * 0.26); fcirc(g, x + h * 0.22, y - h * 0.5, h * 0.26); g.fillStyle = c2; fcirc(g, x - h * 0.08, y - h * 0.72, h * 0.2); fcirc(g, x + h * 0.14, y - h * 0.6, h * 0.14); }
  function hillLine(g, w, h, baseY, n, amp, seed, col) { g.fillStyle = col; for (let i = 0; i < n; i++) { const cx = (i + 0.5) * w / n + Math.sin(seed + i * 3.1) * w / n * 0.3, r = amp * (0.7 + 0.3 * Math.abs(Math.sin(seed * 2 + i * 1.7))); fcirc(g, cx, baseY + r * 0.35, r); } g.fillRect(0, baseY, w, h - baseY); }

  /* ================= backgrounds ================= */
  const BY = OFFY + 13 * T;   /* 238: the usual ground line in screen space */
  function pitFill(c1, c2) { ctx.fillStyle = lin(ctx, 'pit' + c1 + c2, 0, BY - 4, 0, VH, [0, c1, 1, c2]); ctx.fillRect(0, BY - 4, VW, VH - BY + 4); }
  function drawSky(W) { ctx.fillStyle = lin(ctx, 'sky' + W.key, 0, 0, 0, VH, [0, W.sky[0], 0.55, W.sky[1], 1, W.sky[2]]); ctx.fillRect(0, 0, VW, VH); }
  function drawSun(x, y, r, col, haloCol) { blit(glow(haloCol || col, r * 3), x - r * 3, y - r * 3); fcirc(ctx, x, y, r, col); }
  function drawMoon(x, y, r) { blit(glow('#d8ccf5', r * 3.2), x - r * 3.2, y - r * 3.2); fcirc(ctx, x, y, r, '#fff8f0'); fcirc(ctx, x - r * 0.3, y - r * 0.2, r * 0.22, '#e8e0f5'); fcirc(ctx, x + r * 0.35, y + r * 0.3, r * 0.16, '#e8e0f5'); fcirc(ctx, x + r * 0.1, y - r * 0.55, r * 0.12, '#e8e0f5'); }
  function drawClouds(cam, fr, col, shadeCol, aFar, aNear) {
    const c1 = cloudSpr(56, 22, col, shadeCol), c2 = cloudSpr(80, 30, col, shadeCol), c3 = cloudSpr(40, 16, col, shadeCol);
    ctx.globalAlpha = aFar; for (let i = 0; i < 7; i++) { const s = i % 2 ? c1 : c3, x = mod(i * 171 + fr * 0.06 - cam * 0.05, VW + 100) - 90, y = 26 + (i * 37) % 58; blit(s, x, y); }
    ctx.globalAlpha = aNear; for (let i = 0; i < 5; i++) { const s = i % 2 ? c2 : c1, x = mod(i * 223 + 60 + fr * 0.12 - cam * 0.11, VW + 160) - 120, y = 44 + (i * 53) % 70; blit(s, x, y); }
    ctx.globalAlpha = 1;
  }
  const BG = {
    wiese(cam, fr, W) {
      drawSun(392 - cam * 0.02, 52, 17, W.sun, '#ffe9a8'); drawClouds(cam, fr, '#fff', '#f1dcea', 0.75, 0.95);
      const far = strip('wiese-far', 480, 90, (g, w, h) => { hillLine(g, w, h, 46, 5, 42, 1, W.hills[0]); for (let i = 0; i < 4; i++) lollipop(g, 60 + i * 120, 30 + (i % 2) * 8, 9, ['#ff9eb0', '#8fd3ff', '#ffd84a', '#b9a3ec'][i], 22); });
      const mid = strip('wiese-mid', 480, 80, (g, w, h) => { hillLine(g, w, h, 40, 7, 36, 5, W.hills[1]); for (let i = 0; i < 3; i++) cupcake(g, 40 + i * 160, 44 + (i % 2) * 4, 22, ['#ff9eb0', '#8fd3ff', '#ffd1dc'][i], '#fff', '#e0457b'); for (let i = 0; i < 3; i++) lollipop(g, 110 + i * 160, 26, 7, ['#9be7a5', '#ff6f9c', '#8fd3ff'][i], 18); });
      const near = strip('wiese-near', 480, 40, (g, w, h) => { g.fillStyle = '#a8ecb4'; for (let i = 0; i < 9; i++) fcirc(g, i * 56 + (i % 3) * 7, 36, 12 + (i % 3) * 3); g.fillRect(0, 36, w, h - 36); for (let i = 0; i < 12; i++) { const x = i * 41 + 9, c = ['#ff9eb0', '#fff', '#ffd84a', '#8fd3ff'][i % 4]; fcirc(g, x, 30 - (i % 3), 2.2, c); fcirc(g, x, 30 - (i % 3), 0.9, '#fff7ef'); } });
      drawStrip(far, BY - 86, cam * 0.12); drawStrip(mid, BY - 76, cam * 0.24); pitFill('#a8ecb4', '#5aa878'); drawStrip(near, BY - 36, cam * 0.5);
    },
    insel(cam, fr, W) {
      drawSun(380 - cam * 0.02, 46, 19, W.sun, '#fff6c8'); drawClouds(cam, fr, '#fff', '#dcefff', 0.7, 0.95);
      const sea = BY - 66;
      ctx.fillStyle = lin(ctx, 'sea', 0, sea, 0, VH, [0, '#8fe0ec', 0.3, W.hills[0], 1, W.hills[1]]); ctx.fillRect(0, sea, VW, VH - sea);
      const isl = strip('insel-far', 480, 40, (g, w, h) => { for (let i = 0; i < 3; i++) { const x = 70 + i * 160; g.fillStyle = '#4fb3c3'; ell(g, x, 40, 42 + i * 6, 12); g.fill(); palm(g, x - 8, 31, 18, -4, '#3a8a98', '#3a8a98'); palm(g, x + 10, 32, 14, 5, '#3a8a98', '#3a8a98'); } });
      drawStrip(isl, sea - 38, cam * 0.08);
      /* animated waves and sailboats */
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.2;
      for (let r = 0; r < 5; r++) { const y = sea + 10 + r * 11, sp = 0.12 + r * 0.05, ph = fr * (0.02 + r * 0.006); ctx.beginPath(); for (let x = -10; x <= VW + 10; x += 10) { const wx = x + cam * sp; const yy = y + Math.sin(wx * 0.06 + ph + r) * 1.6 + Math.sin(wx * 0.17 - ph * 1.7) * 0.7; if (x === -10) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); } ctx.stroke(); }
      for (let i = 0; i < 3; i++) { const x = mod(i * 300 + 120 - cam * 0.16 + fr * 0.08, VW + 80) - 40, y = sea + 22 + i * 7 + Math.sin(fr * 0.05 + i) * 1.2, s = 0.8 + i * 0.15; ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(Math.sin(fr * 0.04 + i) * 0.05); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.lineTo(8, 5); ctx.lineTo(-8, 5); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#8a5a2b'; ctx.fillRect(-0.7, -18, 1.4, 18); ctx.fillStyle = i % 2 ? '#ff9eb0' : '#ffd84a'; ctx.beginPath(); ctx.moveTo(1, -17); ctx.lineTo(11, -3); ctx.lineTo(1, -3); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-1, -15); ctx.lineTo(-9, -3); ctx.lineTo(-1, -3); ctx.closePath(); ctx.fill(); ctx.restore(); }
      const beach = strip('insel-near', 480, 44, (g, w, h) => { g.fillStyle = '#ffe9a8'; for (let i = 0; i < 8; i++) fcirc(g, i * 64 + 20, 44, 16 + (i % 2) * 4); g.fillRect(0, 42, w, h - 42); for (let i = 0; i < 4; i++) palm(g, 50 + i * 120, 38, 34 + (i % 2) * 8, i % 2 ? 9 : -8, '#b9793f', '#3fbf6b'); g.fillStyle = '#fff'; for (let i = 0; i < 6; i++) ell(g, 30 + i * 80, 41, 3, 1.6), g.fill(); });
      pitFill('#ffe9a8', '#c9a860'); drawStrip(beach, BY - 40, cam * 0.45);
    },
    dschungel(cam, fr, W) {
      drawSun(120 - cam * 0.02, 44, 16, '#fff9d8', '#fff2a0'); drawClouds(cam, fr, '#f3fbe8', '#cfe9c4', 0.5, 0.7);
      const far = strip('dsch-far', 480, 120, (g, w, h) => { g.fillStyle = '#4e9a64'; for (let i = 0; i < 9; i++) fcirc(g, i * 54 + 20, 70 + (i % 3) * 10, 30 + (i % 2) * 8); g.fillRect(0, 70, w, h - 70); g.fillStyle = W.hills[0]; for (let i = 0; i < 10; i++) { const x = i * 48 + 10; g.fillRect(x - 2, 60, 4, 60); fcirc(g, x, 56 + (i % 2) * 8, 22); fcirc(g, x - 14, 68 + (i % 2) * 6, 16); fcirc(g, x + 14, 70, 15); } g.fillRect(0, 86, w, h - 86); });
      const mid = strip('dsch-mid', 480, 110, (g, w, h) => { g.fillStyle = W.hills[1]; for (let i = 0; i < 7; i++) { const x = i * 70 + 30; g.fillRect(x - 3, 40, 6, 70); fcirc(g, x, 36, 26); fcirc(g, x - 18, 50, 18); fcirc(g, x + 20, 48, 19); } g.fillRect(0, 66, w, h - 66); g.strokeStyle = '#1a4a30'; g.lineWidth = 1.6; for (let i = 0; i < 12; i++) { const x = i * 40 + 15; g.beginPath(); g.moveTo(x, 40); g.quadraticCurveTo(x + 6, 60 + (i % 3) * 8, x - 2, 80 + (i % 4) * 8); g.stroke(); g.fillStyle = '#2a6a40'; for (let j = 0; j < 3; j++) fell(g, x + 3 - j, 50 + j * 12 + (i % 3) * 4, 3.2, 1.6, '#2a6a40'); } });
      const near = strip('dsch-near', 480, 50, (g, w, h) => { g.fillStyle = '#2f8a46'; for (let i = 0; i < 8; i++) { const x = i * 60 + 20; for (let j = -2; j <= 2; j++) { g.beginPath(); g.moveTo(x, 50); g.quadraticCurveTo(x + j * 8, 34, x + j * 14, 22 + Math.abs(j) * 6); g.quadraticCurveTo(x + j * 6, 38, x + 3, 50); g.fill(); } } g.fillRect(0, 44, w, h - 44); for (let i = 0; i < 5; i++) { fcirc(g, 50 + i * 96, 38, 3.2, '#e04a7a'); fcirc(g, 50 + i * 96, 38, 1.2, '#ffd84a'); } });
      drawStrip(far, BY - 116, cam * 0.1); drawStrip(mid, BY - 106, cam * 0.22);
      /* light shafts */
      const shaft = spr('shaft', 160, 200, (g) => { g.fillStyle = lin(g, '', 0, 0, 0, 200, [0, 'rgba(255,250,200,.35)', 1, 'rgba(255,250,200,0)']); for (let i = 0; i < 3; i++) { const x = 20 + i * 50; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 18, 0); g.lineTo(x + 70, 200); g.lineTo(x + 30, 200); g.closePath(); g.fill(); } });
      ctx.globalAlpha = 0.55 + Math.sin(fr * 0.02) * 0.2; for (let i = 0; i < 3; i++) blit(shaft, mod(i * 230 - cam * 0.3, VW + 200) - 160, 0); ctx.globalAlpha = 1;
      pitFill('#2f8a46', '#143a22'); drawStrip(near, BY - 46, cam * 0.5);
    },
    schnee(cam, fr, W) {
      drawSun(400 - cam * 0.02, 44, 14, '#fff', '#e8f2ff');
      /* aurora */
      ctx.globalCompositeOperation = 'lighter'; for (let b = 0; b < 2; b++) { ctx.fillStyle = b ? 'rgba(120,255,190,.10)' : 'rgba(200,140,255,.10)'; ctx.beginPath(); for (let x = 0; x <= VW; x += 24) { const y = 40 + b * 18 + Math.sin(x * 0.012 + fr * 0.012 + b) * 14 + Math.sin(x * 0.03 - fr * 0.02) * 5; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } for (let x = VW; x >= 0; x -= 24) { const y = 70 + b * 16 + Math.sin(x * 0.012 + fr * 0.012 + b) * 14 + Math.sin(x * 0.02 + fr * 0.015) * 6; ctx.lineTo(x, y); } ctx.closePath(); ctx.fill(); } ctx.globalCompositeOperation = 'source-over';
      drawClouds(cam, fr, '#fff', '#dbe6f5', 0.6, 0.85);
      const far = strip('schnee-far', 480, 130, (g, w, h) => { for (let i = 0; i < 4; i++) { const x = 60 + i * 120, ht = 90 + (i % 2) * 30; g.fillStyle = W.hills[1]; g.beginPath(); g.moveTo(x - 80, 130); g.lineTo(x, 130 - ht); g.lineTo(x + 80, 130); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x - 24, 130 - ht + 30); g.lineTo(x, 130 - ht); g.lineTo(x + 24, 130 - ht + 30); g.lineTo(x + 12, 130 - ht + 26); g.lineTo(x + 4, 130 - ht + 34); g.lineTo(x - 6, 130 - ht + 27); g.lineTo(x - 14, 130 - ht + 33); g.closePath(); g.fill(); } g.fillStyle = W.hills[1]; g.fillRect(0, 128, w, 2); });
      const mid = strip('schnee-mid', 480, 70, (g, w, h) => { hillLine(g, w, h, 34, 6, 40, 3, W.hills[0]); for (let i = 0; i < 7; i++) pine(g, 30 + i * 68, 44 + (i % 2) * 6, 34 + (i % 3) * 6, '#3a7a5a', true); });
      const near = strip('schnee-near', 480, 40, (g, w, h) => { g.fillStyle = '#f4f8ff'; for (let i = 0; i < 8; i++) fcirc(g, i * 62 + 20, 40, 18 + (i % 2) * 6); g.fillRect(0, 36, w, h - 36); for (let i = 0; i < 4; i++) pine(g, 60 + i * 120, 36, 40, '#2f6a4e', true); });
      drawStrip(far, BY - 128, cam * 0.08); drawStrip(mid, BY - 66, cam * 0.22); pitFill('#f4f8ff', '#a9c4e6'); drawStrip(near, BY - 36, cam * 0.48);
    },
    lava(cam, fr, W) {
      drawSun(380 - cam * 0.02, 56, 20, '#ff6a2a', '#ff8a3a');
      const far = strip('lava-far', 480, 140, (g, w, h) => { for (let i = 0; i < 3; i++) { const x = 80 + i * 160, ht = 100 + (i % 2) * 25; g.fillStyle = W.hills[0]; g.beginPath(); g.moveTo(x - 100, 140); g.lineTo(x - 14, 140 - ht); g.lineTo(x + 14, 140 - ht); g.lineTo(x + 100, 140); g.closePath(); g.fill(); g.fillStyle = '#ff7a2a'; g.beginPath(); g.moveTo(x - 14, 140 - ht); g.lineTo(x + 14, 140 - ht); g.lineTo(x + 24, 140 - ht + 24); g.lineTo(x - 2, 140 - ht + 10); g.lineTo(x - 20, 140 - ht + 30); g.closePath(); g.fill(); g.fillStyle = '#ffd24a'; g.beginPath(); g.moveTo(x - 8, 140 - ht); g.lineTo(x + 8, 140 - ht); g.lineTo(x + 2, 140 - ht + 8); g.closePath(); g.fill(); } g.fillStyle = W.hills[0]; g.fillRect(0, 138, w, 2); });
      drawStrip(far, BY - 136, cam * 0.08);
      /* smoke */
      for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) { const t = (fr * 0.5 + j * 25 + i * 11) % 100, x = mod(80 + i * 160 - cam * 0.08, 480) + Math.sin(t * 0.08 + i) * 4 + t * 0.12, y = BY - 136 + (40 - (i % 2) * 25) - 4 - t * 0.45; ctx.globalAlpha = 0.5 * (1 - t / 100); fcirc(ctx, x, y, 2.5 + t * 0.07, '#6a4a55'); } ctx.globalAlpha = 1;
      const mid = strip('lava-mid', 480, 60, (g, w, h) => { g.fillStyle = W.hills[1]; for (let i = 0; i < 10; i++) { const x = i * 50 + 10; g.beginPath(); g.moveTo(x - 30, 60); g.lineTo(x - 10, 24 + (i % 3) * 8); g.lineTo(x + 4, 30 + (i % 2) * 6); g.lineTo(x + 18, 18 + (i % 3) * 10); g.lineTo(x + 36, 60); g.closePath(); g.fill(); } g.fillRect(0, 56, w, h - 56); });
      drawStrip(mid, BY - 58, cam * 0.24);
      /* ember haze over the horizon */
      ctx.fillStyle = lin(ctx, 'lavahaze', 0, BY - 70, 0, VH, [0, 'rgba(255,100,30,0)', 1, 'rgba(255,120,40,.5)']); ctx.fillRect(0, BY - 70, VW, VH - BY + 70);
      const near = strip('lava-near', 480, 34, (g, w, h) => { g.fillStyle = '#2a1418'; for (let i = 0; i < 9; i++) { const x = i * 56 + 20; g.beginPath(); g.moveTo(x - 26, 34); g.lineTo(x - 8, 12 + (i % 3) * 5); g.lineTo(x + 6, 16); g.lineTo(x + 26, 34); g.closePath(); g.fill(); } g.fillRect(0, 30, w, h - 30); });
      pitFill('#2a1418', '#0a0406'); drawStrip(near, BY - 32, cam * 0.5);
    },
    himmel(cam, fr, W) {
      const stars = strip('stars', 480, 180, (g, w) => { for (let i = 0; i < 70; i++) { const x = (i * 97.3) % w, y = (i * 53.7) % 170, r = 0.5 + (i % 3) * 0.4; fcirc(g, x, y, r, i % 5 ? '#fff' : '#ffe9a8'); } });
      const stars2 = strip('stars2', 480, 180, (g, w) => { for (let i = 0; i < 40; i++) { const x = (i * 71.1 + 30) % w, y = (i * 37.3 + 10) % 170; starPath(g, x, y, 1.8, 0.7, 4); g.fillStyle = '#fff'; g.fill(); } });
      drawStrip(stars, 0, cam * 0.02, 0.9); drawStrip(stars2, 0, cam * 0.03, 0.4 + Math.sin(fr * 0.08) * 0.35);
      drawMoon(400 - cam * 0.02, 46, 16);
      const castle = strip('castle', 480, 120, (g, w, h) => { g.fillStyle = '#6a52b0'; for (let i = 0; i < 2; i++) { const x = 120 + i * 240; g.fillRect(x - 40, 60, 80, 60); g.fillRect(x - 54, 40, 18, 80); g.fillRect(x + 36, 40, 18, 80); g.fillRect(x - 8, 20, 16, 100); for (let j = 0; j < 4; j++) g.fillRect(x - 40 + j * 22, 52, 10, 10); g.beginPath(); g.moveTo(x - 56, 42); g.lineTo(x - 45, 22); g.lineTo(x - 34, 42); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x + 34, 42); g.lineTo(x + 45, 22); g.lineTo(x + 56, 42); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x - 10, 22); g.lineTo(x, 2); g.lineTo(x + 10, 22); g.closePath(); g.fill(); g.fillStyle = '#ffe9a8'; for (let j = 0; j < 3; j++) g.fillRect(x - 24 + j * 20, 76, 5, 8); g.fillStyle = '#6a52b0'; } g.fillStyle = '#8a74cc'; for (let i = 0; i < 4; i++) { const x = 60 + i * 120; puffs(g, x - 50, 96, 100, 26); } });
      drawStrip(castle, BY - 150, cam * 0.07, 0.8);
      drawClouds(cam, fr, '#d8ccf5', '#b9a3ec', 0.75, 0.9);
      const isles = strip('isles', 480, 90, (g, w, h) => { for (let i = 0; i < 3; i++) { const x = 70 + i * 160, y = 30 + (i % 2) * 20, iw = 70 + (i % 2) * 20; g.fillStyle = '#7a5aa8'; g.beginPath(); g.moveTo(x - iw / 2, y + 4); g.lineTo(x + iw / 2, y + 4); g.lineTo(x + iw * 0.2, y + 34); g.lineTo(x - iw * 0.1, y + 40); g.lineTo(x - iw * 0.3, y + 26); g.closePath(); g.fill(); g.fillStyle = '#b6f0bd'; ell(g, x, y + 3, iw / 2, 6); g.fill(); g.fillStyle = '#9be7a5'; ell(g, x, y + 1, iw / 2 - 4, 3.5); g.fill(); roundTree(g, x - 12, y + 3, 22, '#8a5a2b', '#5fcf6a', '#9be7a5'); roundTree(g, x + 16, y + 4, 16, '#8a5a2b', '#5fcf6a', '#9be7a5'); g.fillStyle = 'rgba(190,230,255,.7)'; g.fillRect(x + 8, y + 6, 3, 30); } });
      drawStrip(isles, BY - 120 + Math.sin(fr * 0.02) * 3, cam * 0.2);
      const near = strip('himmel-near', 480, 40, (g, w, h) => { g.fillStyle = '#efe8fb'; for (let i = 0; i < 6; i++) puffs(g, i * 84 - 10, 10 + (i % 2) * 6, 100, 30); g.fillRect(0, 34, w, h - 34); });
      pitFill('#efe8fb', '#9f88d8'); drawStrip(near, BY - 36, cam * 0.5);
    },
  };
  function drawCave(cam, fr) {
    ctx.fillStyle = lin(ctx, 'cave', 0, 0, 0, VH, [0, '#2a1608', 0.5, '#5a3410', 1, '#8a5218']); ctx.fillRect(0, 0, VW, VH);
    const comb = strip('comb', 480, 270, (g, w, h) => { g.strokeStyle = 'rgba(255,200,90,.16)'; g.lineWidth = 1.5; const r = 14, dx = r * 1.732, dy = r * 1.5; for (let row = -1; row < 14; row++) for (let col = -1; col < 22; col++) { const x = col * dx + (row % 2 ? dx / 2 : 0), y = row * dy; g.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; const px = x + Math.cos(a) * (r - 2), py = y + Math.sin(a) * (r - 2); if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath(); g.stroke(); if ((row * 7 + col * 3) % 11 === 0) { g.fillStyle = 'rgba(255,190,60,.12)'; g.fill(); } } });
    drawStrip(comb, 0, cam * 0.15);
    const stal = strip('stal', 480, 60, (g, w) => { g.fillStyle = '#3a2008'; for (let i = 0; i < 12; i++) { const x = i * 40 + 10, len = 20 + (i % 3) * 14; g.beginPath(); g.moveTo(x - 10, 0); g.lineTo(x + 10, 0); g.lineTo(x + 1, len); g.closePath(); g.fill(); } g.fillStyle = '#ffb347'; for (let i = 0; i < 6; i++) { const x = i * 80 + 30; ell(g, x, 24 + (i % 2) * 10, 2.5, 4); g.fill(); } });
    drawStrip(stal, 0, cam * 0.3);
    const cry = spr('crystal', 40, 40, (g) => { for (let i = 0; i < 3; i++) { const x = 8 + i * 12, h = 26 - i * 5; g.fillStyle = i % 2 ? '#ffd84a' : '#ffb347'; g.beginPath(); g.moveTo(x - 5, 40); g.lineTo(x - 3, 40 - h); g.lineTo(x, 40 - h - 6); g.lineTo(x + 3, 40 - h); g.lineTo(x + 5, 40); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.moveTo(x - 3, 40 - h); g.lineTo(x, 40 - h - 6); g.lineTo(x, 40); g.lineTo(x - 4, 40); g.closePath(); g.fill(); } });
    for (let i = 0; i < 5; i++) { const x = mod(i * 190 + 40 - cam * 0.45, VW + 60) - 30, y = BY - 40; ctx.globalAlpha = 0.5 + Math.sin(fr * 0.05 + i) * 0.25; blit(glow('#ffc24a', 34), x - 14, y - 14); ctx.globalAlpha = 1; blit(cry, x, y); }
    ctx.fillStyle = 'rgba(255,170,50,.12)'; ctx.fillRect(0, BY - 30, VW, VH - BY + 30);
  }
  function drawBackground(W, cam, fr) { drawSky(W); (BG[W.key] || BG.wiese)(cam, fr, W); }

  /* ================= tiles ================= */
  const conn = ch => ch === '#' || ch === 'i' || ch === 's';
  function maskAt(cx, cy, tileAt) { return (conn(tileAt(cx, cy - 1)) ? 1 : 0) | (conn(tileAt(cx + 1, cy)) ? 2 : 0) | (conn(tileAt(cx, cy + 1)) ? 4 : 0) | (conn(tileAt(cx - 1, cy)) ? 8 : 0); }
  function cornerPath(g, m, oy, r) { const up = m & 1, rt = m & 2, dn = m & 4, lf = m & 8; rrc(g, 0, oy, 16, 16, (!up && !lf) ? r : 0, (!up && !rt) ? r : 0, (!dn && !rt) ? r : 0, (!dn && !lf) ? r : 0); }
  function groundSpr(W, m, v) {
    return spr('g' + skinOf(W) + m + v, 16, 22, (g) => {
      const up = m & 1, rt = m & 2, dn = m & 4, lf = m & 8, gr = W.ground, oy = 6, key = skinOf(W);
      cornerPath(g, m, oy, 4); g.fillStyle = up ? shade(gr.dirt, -0.03) : lin(g, '', 0, oy, 0, oy + 16, [0, shade(gr.dirt, 0.1), 1, shade(gr.dirt, -0.06)]); g.fill();
      g.save(); g.clip();
      g.fillStyle = shade(gr.dirt, -0.1); for (let i = 0; i < 3; i++) fcirc(g, (v * 5 + i * 6 + 3) % 15 + 0.5, oy + 8 + ((i * 4 + v * 3) % 7), 1.1);
      g.fillStyle = shade(gr.dirt, 0.14); fcirc(g, (v * 7 + 11) % 15, oy + 11 + (v % 3), 0.9);
      if (key === 'lava' && v === 0) { g.strokeStyle = rgba(gr.dot, 0.35); g.lineWidth = 0.7; g.beginPath(); g.moveTo(3, oy + 9); g.lineTo(6, oy + 11.5); g.lineTo(5, oy + 14); g.stroke(); }
      if (key === 'station') { g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, oy + 8.5); g.lineTo(16, oy + 8.5); g.moveTo(8 + (v - 1) * 4, oy + 8.5); g.lineTo(8 + (v - 1) * 4, oy + 16); g.stroke(); g.fillStyle = 'rgba(255,255,255,.15)'; fcirc(g, 3, oy + 12, 0.7); fcirc(g, 13, oy + 12, 0.7); }
      if (!dn) { g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(0, oy + 13, 16, 3); }
      if (!lf) { g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(0, oy, 1.2, 16); }
      if (!rt) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(14.8, oy, 1.2, 16); }
      if (!up) {
        const th = key === 'schnee' ? 6 : 5;
        g.fillStyle = gr.top; g.fillRect(0, oy, 16, th); g.fillStyle = gr.edge; g.fillRect(0, oy + th - 1, 16, 1.2);
        g.fillStyle = gr.top; for (let i = 0; i < 4; i++) fcirc(g, 2 + i * 4 + (v % 2) * 2, oy + th - 0.5, 2.2);
        g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(0, oy, 16, 1.2);
        if (key === 'insel') { g.fillStyle = '#fff'; fcirc(g, 4 + v * 3, oy + 2.5, 0.9); fcirc(g, 12 - v, oy + 3.2, 0.7); }
        if (key === 'lava') { g.fillStyle = gr.dot; fcirc(g, 5 + v * 2, oy + 3, 0.8); g.fillStyle = rgba(gr.dot2, 0.7); fcirc(g, 12 - v * 2, oy + 2, 0.6); }
        if (key === 'dschungel') { g.fillStyle = gr.dot2; fcirc(g, 3 + v * 4, oy + 2.5, 1); fcirc(g, 11 + v, oy + 3, 0.8); }
        if (key === 'station') { g.fillStyle = shade(gr.top, -0.35); fcirc(g, 2.5, oy + 2.5, 0.8); fcirc(g, 13.5, oy + 2.5, 0.8); g.fillRect(0, oy + th - 1.8, 16, 0.8); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, oy + 1.4, 16, 0.6); }
        if (key === 'mond') { fell(g, 5 + v * 3, oy + 2.8, 2.2, 1.1, shade(gr.top, -0.2)); g.strokeStyle = shade(gr.top, 0.18); g.lineWidth = 0.7; g.beginPath(); g.ellipse(5 + v * 3, oy + 2.4, 2.2, 1.1, 0, Math.PI, TAU); g.stroke(); fcirc(g, 12 - v, oy + 2, 0.6, shade(gr.top, -0.25)); }
        if (key === 'mars') { g.strokeStyle = rgba(gr.dot, 0.7); g.lineWidth = 0.7; g.beginPath(); g.moveTo(2 + v * 3, oy + 1); g.lineTo(5 + v * 2, oy + 3); g.lineTo(9 + v, oy + 2); g.stroke(); fcirc(g, 12 - v, oy + 2.6, 0.7, gr.dot); }
        if (key === 'saturn') { g.fillStyle = gr.dot2; fcirc(g, 4 + v * 4, oy + 2.5, 0.9); g.fillStyle = 'rgba(255,255,255,.35)'; fcirc(g, 11 - v, oy + 2, 0.7); }
      }
      g.restore();
      if (!up) {   /* tufts, flowers, sparkles above the tile */
        const bl = gr.top, bd = gr.edge;
        if (key === 'wiese' || key === 'dschungel') { g.fillStyle = bd; for (let i = 0; i < 3; i++) { const x = 2 + i * 5 + (v * 2) % 3, h = 3 + ((i + v) % 2) * 2; g.beginPath(); g.moveTo(x - 1.4, oy + 0.6); g.quadraticCurveTo(x - 0.3, oy - h * 0.6, x + 0.3 + (i % 2 ? 1 : -1), oy - h); g.quadraticCurveTo(x + 0.8, oy - h * 0.4, x + 1.6, oy + 0.6); g.closePath(); g.fill(); } g.fillStyle = bl; g.beginPath(); g.moveTo(6 + v, oy + 0.6); g.quadraticCurveTo(7 + v, oy - 2, 8.5 + v, oy - 3.5); g.quadraticCurveTo(8 + v, oy - 1.5, 8.6 + v, oy + 0.6); g.fill(); if (key === 'wiese' && v !== 1) { const fx = v ? 12 : 4, fc = v ? gr.dot2 : gr.dot; g.strokeStyle = bd; g.lineWidth = 0.8; g.beginPath(); g.moveTo(fx, oy + 0.5); g.lineTo(fx, oy - 3); g.stroke(); for (let i = 0; i < 5; i++) fcirc(g, fx + Math.cos(i * 1.257) * 1.6, oy - 4 + Math.sin(i * 1.257) * 1.6, 1, fc); fcirc(g, fx, oy - 4, 0.8, '#fff7ef'); } }
        else if (key === 'schnee') { g.fillStyle = '#fff'; fcirc(g, 4 + v * 3, oy + 0.4, 1.6); fcirc(g, 11 - v, oy + 0.6, 1.2); if (v === 0) { g.fillStyle = '#dff4ff'; starPath(g, 13, oy - 2.5, 1.6, 0.6, 4); g.fill(); } }
        else if (key === 'insel') { g.fillStyle = '#ffd1b0'; if (v === 1) { fell(g, 5, oy - 0.2, 2.4, 1.3, '#ffb37a'); fcirc(g, 5, oy - 0.3, 1.2, '#fff'); } }
        else if (key === 'himmel') { g.fillStyle = '#fff'; fcirc(g, 3 + v * 2, oy + 0.4, 2); fcirc(g, 9 + v, oy + 0.2, 2.4); fcirc(g, 14, oy + 0.6, 1.6); }
        else if (key === 'lava') { g.fillStyle = shade(gr.top, -0.2); for (let i = 0; i < 2; i++) { const x = 4 + i * 8 + v; g.beginPath(); g.moveTo(x - 2, oy + 0.6); g.lineTo(x, oy - 2 - (i % 2)); g.lineTo(x + 2, oy + 0.6); g.closePath(); g.fill(); } }
        else if (key === 'saturn') { for (let i = 0; i < 2; i++) { const x = 4 + i * 7 + v; g.fillStyle = gr.dot; g.beginPath(); g.moveTo(x - 2, oy + 0.6); g.lineTo(x - 0.5, oy - 4 - (i % 2) * 2); g.lineTo(x + 1, oy - 5 - (i % 2)); g.lineTo(x + 2.5, oy + 0.6); g.closePath(); g.fill(); g.strokeStyle = shade(gr.dot, -0.3); g.lineWidth = 0.6; g.stroke(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(x - 1, oy + 0.6); g.lineTo(x - 0.3, oy - 3.5); g.lineTo(x + 0.4, oy + 0.6); g.closePath(); g.fill(); } }
        else if (key === 'mond' || key === 'mars') { fcirc(g, 4 + v * 3, oy + 0.2, 1.4, shade(gr.top, -0.15)); fcirc(g, 12 - v, oy + 0.4, 1, shade(gr.top, 0.1)); }
      }
    });
  }
  function iceSpr(m, v) { return spr('ice' + m + v, 16, 16, (g) => { cornerPath(g, m, 0, 3.5); g.fillStyle = lin(g, '', 0, 0, 0, 16, [0, '#eaf7ff', 0.5, '#bfe2ff', 1, '#9fcff2']); g.fill(); g.save(); g.clip(); g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.moveTo(2 + v * 2, 2); g.lineTo(9 + v * 2, 2); g.lineTo(5 + v * 2, 6); g.lineTo(0 + v * 2, 6); g.closePath(); g.fill(); g.fillRect(11, 8 + v, 3, 1.2); g.strokeStyle = 'rgba(90,160,210,.5)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(3, 13); g.lineTo(7, 9); g.lineTo(9, 11); g.stroke(); if (!(m & 4)) { g.fillStyle = 'rgba(60,110,170,.25)'; g.fillRect(0, 14, 16, 2); } g.restore(); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1; cornerPath(g, m, 0, 3.5); g.stroke(); }); }
  function honeySpr(W, m, v) { return spr('hon' + skinOf(W) + m + v, 16, 20, (g) => { const sl = W.slow, oy = 4; if (W.key === 'weltraum') { cornerPath(g, m, oy, 3); g.fillStyle = lin(g, '', 0, oy, 0, oy + 16, [0, sl.b, 1, sl.a]); g.fill(); g.save(); g.clip(); g.fillStyle = sl.c; for (let i = 0; i < 4; i++) fcirc(g, (v * 5 + i * 4 + 2) % 15 + 0.5, oy + 5 + ((i * 5 + v * 3) % 9), 0.7); g.restore(); if (!(m & 1)) { g.fillStyle = sl.b; for (let i = 0; i < 4; i++) fcirc(g, 2 + i * 4 + (v % 2), oy + 0.3, 2); g.fillStyle = 'rgba(255,255,255,.35)'; fcirc(g, 5 + v, oy - 0.4, 1); } return; } cornerPath(g, m, oy, 3); g.fillStyle = lin(g, '', 0, oy, 0, oy + 16, [0, sl.b, 0.35, sl.a, 1, sl.c]); g.fill(); g.save(); g.clip(); g.fillStyle = rgba(sl.c, 0.5); fcirc(g, 4 + v * 3, oy + 9, 1.4); fcirc(g, 11 - v, oy + 12, 1); g.fillStyle = 'rgba(255,255,255,.3)'; fcirc(g, 5 + v * 3, oy + 8, 0.6); g.restore(); if (!(m & 1)) { g.fillStyle = sl.b; for (let i = 0; i < 3; i++) fell(g, 3 + i * 5 + v, oy + 0.4, 3, 1.8 + (i % 2) * 0.8, sl.b); g.fillStyle = 'rgba(255,255,255,.55)'; fell(g, 4 + v, oy + 0.4, 1.6, 0.6, 'rgba(255,255,255,.6)'); g.fillStyle = sl.a; fell(g, 8 + v * 2, oy - 1.5, 1.6, 2.2, sl.a); } }); }
  function blockSpr(W, crumble) { return spr('blk' + skinOf(W) + (crumble ? 'c' : ''), 16, 16, (g) => { const b = W.block; rr(g, 0.5, 0.5, 15, 15, 2.5); g.fillStyle = lin(g, '', 0, 0, 0, 16, [0, shade(b.b, 0.08), 1, shade(b.a, -0.05)]); g.fill(); g.strokeStyle = b.c; g.lineWidth = 1; g.stroke(); g.fillStyle = 'rgba(255,255,255,.35)'; rr(g, 2, 2, 12, 3, 1.5); g.fill(); g.fillStyle = 'rgba(0,0,0,.16)'; rr(g, 2, 11.5, 12, 2.5, 1.2); g.fill(); g.fillStyle = b.c; fcirc(g, 4.5, 6.5, 1.3); fcirc(g, 11, 5.5, 1.1); fcirc(g, 8, 10.5, 1.4); fcirc(g, 12.5, 11, 0.9); fcirc(g, 3.5, 11.5, 0.8); if (crumble) { g.strokeStyle = rgba(b.c, 0.9); g.lineWidth = 1; g.beginPath(); g.moveTo(1, 8); g.lineTo(5, 7); g.lineTo(7, 10); g.lineTo(10, 8); g.lineTo(15, 9); g.moveTo(7, 1); g.lineTo(8, 5); g.lineTo(6, 7); g.moveTo(9, 15); g.lineTo(10, 11); g.stroke(); } }); }
  function boxSpr(ch) { return spr('box' + ch, 16, 16, (g) => { const c = ch === '?' ? '#ff9eb0' : '#8fd3ff', d = ch === '?' ? '#e8738f' : '#5aa9e6', l = ch === '?' ? '#ffd1dc' : '#dcefff'; rr(g, 0.5, 0.5, 15, 15, 3); g.fillStyle = lin(g, '', 0, 0, 0, 16, [0, l, 0.45, c, 1, d]); g.fill(); g.strokeStyle = shade(d, -0.3); g.lineWidth = 1; g.stroke(); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1; rr(g, 2.5, 2.5, 11, 11, 2); g.stroke(); g.fillStyle = '#fff'; for (const [x, y] of [[3.2, 3.2], [12.8, 3.2], [3.2, 12.8], [12.8, 12.8]]) fcirc(g, x, y, 1); }); }
  function symSpr(ch) { return spr('sym' + ch, 16, 16, (g) => { txt(g, ch, 8, 8.5, 13, '#fff', 'center', ch === '?' ? '#c9456e' : '#2f7fb5', 2.5, '700'); }); }
  function usedSpr() { return spr('used', 16, 16, (g) => { rr(g, 0.5, 0.5, 15, 15, 3); g.fillStyle = lin(g, '', 0, 0, 0, 16, [0, '#f4e8d4', 1, '#d9c6a8']); g.fill(); g.strokeStyle = '#b89c78'; g.lineWidth = 1; g.stroke(); rr(g, 4, 4, 8, 8, 2); g.fillStyle = '#cdb896'; g.fill(); g.fillStyle = 'rgba(255,255,255,.4)'; rr(g, 2, 2, 12, 2, 1); g.fill(); }); }
  function gateSpr(top) { return spr('gate' + top, 16, 20, (g) => { const oy = 4; g.fillStyle = '#2d2238'; g.fillRect(0, oy, 16, 16); g.fillStyle = lin(g, '', 0, 0, 16, 0, [0, '#5a4a6e', 0.5, '#8a7a9e', 1, '#4a3a5e']); for (let i = 0; i < 3; i++) rr(g, 2 + i * 5, oy - (top ? 4 : 0), 3, 16 + (top ? 4 : 0), 1.5), g.fill(); if (top) { g.fillStyle = '#ffd84a'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(2 + i * 5, oy - 2); g.lineTo(3.5 + i * 5, oy - 6); g.lineTo(5 + i * 5, oy - 2); g.closePath(); g.fill(); } } g.fillStyle = '#9a8ab0'; rr(g, 0, oy + 6, 16, 2.4, 1); g.fill(); g.fillStyle = '#c0b0d8'; fcirc(g, 3.5, oy + 7.2, 0.8); fcirc(g, 8.5, oy + 7.2, 0.8); fcirc(g, 13.5, oy + 7.2, 0.8); }); }
  function cyl(g, x0, x1, pp) { const hi = pp.b === '#fff' || pp.b === '#ffffff' ? mix(pp.a, '#ffffff', 0.55) : pp.b; return lin(g, '', x0, 0, x1, 0, [0, shade(pp.c, -0.1), 0.12, pp.a, 0.32, hi, 0.6, pp.a, 1, shade(pp.c, -0.15)]); }
  function pipeRimSpr(W, w) {
    const pp = W.pipe, st = pp.style;
    return spr('rim' + skinOf(W) + w, w + 18, 18, (g) => {
      const ox = 2, oy = 2, rw = w + 4;
      if (st === 'cloud') { g.fillStyle = '#fff'; for (let i = 0; i <= rw; i += 8) { fcirc(g, i, oy + 1, 3.6); fcirc(g, i, oy + 13, 3.2); } }
      rr(g, 0, oy, rw, 14, st === 'cloud' ? 7 : 3.5); g.fillStyle = cyl(g, 0, rw, pp); g.fill(); g.strokeStyle = shade(pp.c, -0.35); g.lineWidth = 1; g.stroke();
      g.save(); rr(g, 0, oy, rw, 14, st === 'cloud' ? 7 : 3.5); g.clip();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, oy, rw, 3);
      if (st === 'barrel') { g.fillStyle = '#5a3a1a'; g.fillRect(0, oy + 9, rw, 2.6); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 0.8; for (let i = 6; i < rw; i += 7) { g.beginPath(); g.moveTo(i, oy); g.lineTo(i, oy + 14); g.stroke(); } g.fillStyle = '#c9c9d0'; fcirc(g, 4, oy + 10.3, 0.7); fcirc(g, rw - 4, oy + 10.3, 0.7); }
      else if (st === 'bamboo') { g.fillStyle = rgba(pp.c, 0.8); g.fillRect(0, oy + 11, rw, 1.6); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, oy + 9.5, rw, 1.2); }
      else if (st === 'ice') { g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(4, oy + 3); g.lineTo(12, oy + 3); g.lineTo(8, oy + 11); g.lineTo(2, oy + 11); g.closePath(); g.fill(); }
      else if (st === 'stone') { g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(6, oy + 2); g.lineTo(9, oy + 7); g.lineTo(7, oy + 12); g.moveTo(rw - 8, oy + 4); g.lineTo(rw - 11, oy + 9); g.stroke(); g.fillStyle = 'rgba(255,255,255,.12)'; fcirc(g, rw * 0.6, oy + 6, 2); }
      else if (st === 'metal') { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, oy + 7, rw, 1); for (let i = 4; i < rw; i += 6) { fcirc(g, i, oy + 3.2, 0.9, '#dfe6f0', 'rgba(0,0,0,.4)', 0.5); fcirc(g, i, oy + 11, 0.9, '#dfe6f0', 'rgba(0,0,0,.4)', 0.5); } }
      g.restore();
      if (st === 'mug') { g.strokeStyle = shade(pp.c, -0.35); g.lineWidth = 5; g.beginPath(); g.arc(rw - 1, oy + 7.5, 5.5, -Math.PI / 2, Math.PI / 2); g.stroke(); g.strokeStyle = pp.a; g.lineWidth = 3.2; g.stroke(); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; g.beginPath(); g.arc(rw - 1, oy + 7.5, 6.2, -Math.PI / 2.2, 0); g.stroke(); }
    });
  }
  function pipeBodySpr(W, w, first) {
    const pp = W.pipe, st = pp.style;
    return spr('pb' + skinOf(W) + w + first, w, 16, (g) => {
      if (st === 'cloud') { g.fillStyle = '#fff'; fcirc(g, 1, 8, 3.5); fcirc(g, w - 1, 8, 3.5); }
      g.fillStyle = cyl(g, 1, w - 1, pp); g.fillRect(1, 0, w - 2, 16); g.fillStyle = shade(pp.c, -0.35); g.fillRect(1, 0, 1, 16); g.fillRect(w - 2, 0, 1, 16);
      if (st === 'mug' && first) { heartPath(g, w / 2, 7.5, 4); g.fillStyle = '#ff6f9c'; g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; fcirc(g, w / 2 - 1.6, 5.4, 1); }
      else if (st === 'barrel') { g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 0.8; for (let i = 7; i < w - 2; i += 7) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 16); g.stroke(); } if (!first) { g.fillStyle = '#5a3a1a'; g.fillRect(1, 6, w - 2, 2.6); } }
      else if (st === 'bamboo') { g.fillStyle = rgba(pp.c, 0.8); g.fillRect(1, 12, w - 2, 1.6); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(1, 10.5, w - 2, 1.2); }
      else if (st === 'ice') { g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(6, 0, 3, 16); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(11, 0, 1.2, 16); }
      else if (st === 'stone') { g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(5, first ? 2 : 9); g.lineTo(8, first ? 7 : 12); g.lineTo(6, 16); g.moveTo(w - 7, 3); g.lineTo(w - 9, 8); g.stroke(); g.fillStyle = 'rgba(0,0,0,.18)'; fcirc(g, w * 0.3, first ? 12 : 4, 1.4); }
      else if (st === 'metal') { g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(7, 0, 2.5, 16); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(1, 7.5, w - 2, 1); fcirc(g, 4, 3.5, 0.9, '#dfe6f0', 'rgba(0,0,0,.4)', 0.5); fcirc(g, w - 4, 3.5, 0.9, '#dfe6f0', 'rgba(0,0,0,.4)', 0.5); fcirc(g, 4, 12.5, 0.9, '#dfe6f0', 'rgba(0,0,0,.4)', 0.5); fcirc(g, w - 4, 12.5, 0.9, '#dfe6f0', 'rgba(0,0,0,.4)', 0.5); }
    });
  }
  const wave = (xw, fr) => Math.sin(xw * 0.11 + fr * 0.06) * 1.4 + Math.sin(xw * 0.05 - fr * 0.035) * 1.1;
  function drawLiquid(W, cx, cy, x, y, fr, tileAt) {
    const lq = W.liquid, plasma = lq.name === 'Plasma', lava = W.key === 'lava' || plasma, top = tileAt(cx, cy - 1) !== '~';
    if (!top) { ctx.fillStyle = mix(lq.a, '#000000', 0.18); ctx.fillRect(x, y, 16, 16); if (!lava && ((cx * 7 + cy * 3) % 4) === 0) { const t = (fr * 0.6 + cx * 13) % 40; ctx.globalAlpha = 0.35; fcirc(ctx, x + 4 + (cx % 3) * 4, y + 16 - t * 0.4, 1 + (t % 3) * 0.2, '#fff'); ctx.globalAlpha = 1; } return; }
    const wx = cx * T, y0 = y + 4;
    ctx.fillStyle = lq.a; ctx.beginPath(); ctx.moveTo(x, y + 16); ctx.lineTo(x, y0 + wave(wx, fr)); ctx.lineTo(x + 4, y0 + wave(wx + 4, fr)); ctx.lineTo(x + 8, y0 + wave(wx + 8, fr)); ctx.lineTo(x + 12, y0 + wave(wx + 12, fr)); ctx.lineTo(x + 16, y0 + wave(wx + 16, fr)); ctx.lineTo(x + 16, y + 16); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = lq.b; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y0 + wave(wx, fr) + 0.9); ctx.lineTo(x + 4, y0 + wave(wx + 4, fr) + 0.9); ctx.lineTo(x + 8, y0 + wave(wx + 8, fr) + 0.9); ctx.lineTo(x + 12, y0 + wave(wx + 12, fr) + 0.9); ctx.lineTo(x + 16, y0 + wave(wx + 16, fr) + 0.9); ctx.stroke();
    ctx.fillStyle = rgba(lq.c, 0.8); ctx.fillRect(x, y + 12, 16, 4);
    if (lava) { const gl = spr('lqglow' + lq.b, 16, 26, (g) => { g.fillStyle = lin(g, '', 0, 0, 0, 26, [0, rgba(lq.c, 0), 0.7, rgba(lq.c, 0.55), 1, rgba(lq.b, 0.7)]); g.fillRect(0, 0, 16, 26); }); if (plasma && ((fr + cx * 11) % 23) < 4) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 3 + (cx % 5) * 2, y0 - 2); ctx.lineTo(x + 5 + (cx % 5) * 2, y0 - 7 - (cx % 3)); ctx.lineTo(x + 4 + (cx % 5) * 2, y0 - 9); ctx.stroke(); } ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + Math.sin(fr * 0.07 + cx * 0.8) * 0.2; blit(gl, x, y - 18); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; const t = (fr + cx * 23) % 90; if (t < 30 && (cx % 3) === 1) { const r = 1 + t * 0.08; fcirc(ctx, x + 8, y0 + wave(wx + 8, fr) - r * 0.4, r, lq.b); if (t > 24) fcirc(ctx, x + 8, y0 + wave(wx + 8, fr) - r, r * 0.4, '#fff2a0'); } }
    else { const t = (fr * 0.5 + cx * 17) % 50; if ((cx % 2) === 0) { ctx.globalAlpha = 0.7; fcirc(ctx, x + 3 + (cx % 5) * 2, y0 + wave(wx + 4, fr) - 0.5, 1.1, '#fff'); fcirc(ctx, x + 10 + (cx % 3), y0 + wave(wx + 11, fr) - 0.3, 0.8, '#fff'); ctx.globalAlpha = 1; } if (t < 20 && (cx * 5) % 4 === 0) { ctx.globalAlpha = 0.5; fcirc(ctx, x + 6 + (cx % 4) * 2, y + 14 - t * 0.5, 1.2, '#fff'); ctx.globalAlpha = 1; } }
  }
  function vineSpr(v) { return spr('vine' + v, 16, 16, (g) => { g.strokeStyle = '#2f7a3a'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(8, 0); g.quadraticCurveTo(8 + (v ? 2 : -2), 8, 8, 16); g.stroke(); g.strokeStyle = '#5fcf6a'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(7.4, 0); g.quadraticCurveTo(7.4 + (v ? 2 : -2), 8, 7.4, 16); g.stroke(); for (const [lx, ly, d] of v ? [[3.5, 4, -1], [12.5, 11, 1]] : [[12.5, 3, 1], [3.5, 10, -1]]) { g.fillStyle = '#4fbf5f'; ell(g, lx, ly, 3.4, 2); g.fill(); g.strokeStyle = '#2f7a3a'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(lx - d * 3, ly); g.lineTo(lx + d * 2.5, ly); g.stroke(); fcirc(g, lx - d, ly - 0.6, 0.7, 'rgba(255,255,255,.5)'); } }); }
  function shroomSpr() { return spr('shroom', 18, 18, (g) => { rr(g, 6, 9, 6, 8, 2); g.fillStyle = lin(g, '', 6, 0, 12, 0, [0, '#fff4e0', 1, '#e6cfa0']); g.fill(); g.strokeStyle = '#b89c78'; g.lineWidth = 0.8; g.stroke(); g.beginPath(); g.moveTo(1, 10); g.quadraticCurveTo(1, 1, 9, 1); g.quadraticCurveTo(17, 1, 17, 10); g.quadraticCurveTo(13, 12, 9, 11.5); g.quadraticCurveTo(5, 12, 1, 10); g.closePath(); g.fillStyle = lin(g, '', 0, 0, 0, 12, [0, '#ff8fb0', 1, '#d9346e']); g.fill(); g.strokeStyle = '#a0244e'; g.lineWidth = 1; g.stroke(); g.fillStyle = '#fff'; fcirc(g, 5, 5.5, 1.6); fcirc(g, 12, 4.5, 1.9); fcirc(g, 9, 9, 1.1); fcirc(g, 15, 8.5, 0.9); g.fillStyle = 'rgba(255,255,255,.35)'; ell(g, 6, 3.5, 3, 1.2); g.fill(); }); }
  function heartSpr() { return spr('heart', 14, 14, (g) => { heartPath(g, 7, 6.5, 5.2); g.fillStyle = lin(g, '', 0, 0, 0, 14, [0, '#ff8fb0', 1, '#ff4f85']); g.fill(); g.strokeStyle = '#c9305f'; g.lineWidth = 1; g.stroke(); g.fillStyle = 'rgba(255,255,255,.75)'; ell(g, 4.6, 4.4, 1.5, 1); g.fill(); }); }
  function starSpr() { return spr('starck', 18, 18, (g) => { starPath(g, 9, 9.3, 8.2, 4.4, 5); g.fillStyle = lin(g, '', 0, 0, 0, 18, [0, '#ffe08a', 1, '#f0b43a']); g.fill(); g.strokeStyle = '#b8781a'; g.lineWidth = 1; g.stroke(); g.fillStyle = '#5a3a1a'; fcirc(g, 7, 7.5, 1.1); fcirc(g, 11.5, 10.5, 1); fcirc(g, 8.5, 12, 0.8); fcirc(g, 12, 6.5, 0.7); g.fillStyle = 'rgba(255,255,255,.6)'; fcirc(g, 6, 4.5, 1.1); }); }
  function signSpr() { return spr('sign', 28, 24, (g) => { g.fillStyle = '#b8895a'; rr(g, 12.5, 10, 3, 14, 1); g.fill(); rr(g, 1, 1, 26, 11, 3); g.fillStyle = '#fff7ef'; g.fill(); g.strokeStyle = '#ff9eb0'; g.lineWidth = 1.2; g.stroke(); txt(g, 'Pookie →', 14, 6.8, 7, '#e8738f', 'center', null, 0, '700'); heartPath(g, 4.5, 4, 1.4); g.fillStyle = '#ff6f9c'; g.fill(); }); }
  function treeSpr(W) {
    return spr('tree' + W.key, 64, 72, (g) => {
      const x = 32, y = 72, key = W.key;
      if (key === 'insel') palm(g, x - 4, y, 48, 10, '#b9793f', '#3fbf6b');
      else if (key === 'dschungel') { g.fillStyle = '#5a3a1a'; g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x - 3, y - 36); g.lineTo(x + 3, y - 36); g.lineTo(x + 6, y); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x - 10, y); g.quadraticCurveTo(x - 4, y - 6, x - 3, y - 14); g.lineTo(x + 3, y - 14); g.quadraticCurveTo(x + 4, y - 6, x + 10, y); g.fill(); g.fillStyle = '#2f7a4e'; fcirc(g, x, y - 48, 20); fcirc(g, x - 20, y - 40, 14); fcirc(g, x + 20, y - 40, 14); g.fillStyle = '#3fa15e'; fcirc(g, x - 6, y - 54, 14); fcirc(g, x + 12, y - 50, 11); g.fillStyle = '#5fcf6a'; fcirc(g, x - 2, y - 60, 8); fcirc(g, x + 14, y - 56, 5); fcirc(g, x + 10, y - 40, 3, '#e04a7a'); fcirc(g, x - 18, y - 36, 2.5, '#ffd84a'); }
      else if (key === 'schnee') pine(g, x, y, 64, '#3a7a5a', true);
      else if (key === 'lava') { g.fillStyle = '#3a2a2a'; rr(g, x - 2, y - 44, 4, 44, 1.5); g.fill(); rr(g, x - 8, y - 3, 16, 3, 1.5); g.fill(); rr(g, x - 8, y - 56, 16, 14, 3); g.fillStyle = 'rgba(255,220,150,.3)'; g.fill(); g.strokeStyle = '#3a2a2a'; g.lineWidth = 1.5; g.stroke(); rr(g, x - 4, y - 59, 8, 3, 1); g.fillStyle = '#3a2a2a'; g.fill(); }
      else if (key === 'himmel') { g.fillStyle = '#fff'; rr(g, x - 1.5, y - 50, 3, 50, 1.5); g.fill(); starPath(g, x, y - 56, 10, 4.6, 5); g.fillStyle = '#ffd84a'; g.fill(); g.strokeStyle = '#e3a92a'; g.lineWidth = 1; g.stroke(); g.fillStyle = 'rgba(255,255,255,.5)'; fcirc(g, x - 3, y - 59, 1.5); }
      else { g.fillStyle = '#fff'; rr(g, x - 2, y - 40, 4, 40, 2); g.fill(); g.save(); rr(g, x - 2, y - 40, 4, 40, 2); g.clip(); g.strokeStyle = '#ff9eb0'; g.lineWidth = 2; for (let i = -40; i < 8; i += 6) { g.beginPath(); g.moveTo(x - 4, y + i); g.lineTo(x + 4, y + i - 6); g.stroke(); } g.restore(); g.fillStyle = '#ffb3c6'; fcirc(g, x, y - 52, 17); g.fillStyle = '#ffc9dc'; fcirc(g, x - 7, y - 58, 9); fcirc(g, x + 8, y - 46, 8); fcirc(g, x + 6, y - 60, 6); g.fillStyle = '#fff'; fcirc(g, x - 6, y - 60, 3); }
    });
  }
  function bushSpr(W) {
    return spr('bush' + W.key, 28, 18, (g) => {
      const key = W.key, y = 18;
      if (key === 'insel') { g.fillStyle = '#ffb37a'; g.beginPath(); g.moveTo(14, y - 2); g.lineTo(5, y - 2); g.quadraticCurveTo(4, y - 12, 14, y - 11); g.quadraticCurveTo(24, y - 12, 23, y - 2); g.closePath(); g.fill(); g.strokeStyle = '#e08a4a'; g.lineWidth = 0.8; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(14, y - 2); g.lineTo(14 + i * 4, y - 10.5); g.stroke(); } g.fillStyle = '#fff'; fcirc(g, 11, y - 7, 1); }
      else if (key === 'lava') { g.fillStyle = '#4a3a3a'; fcirc(g, 8, y - 5, 5.5); fcirc(g, 18, y - 6, 7); fcirc(g, 13, y - 3, 4); g.fillStyle = 'rgba(255,255,255,.12)'; fcirc(g, 16, y - 9, 2.5); g.fillStyle = '#ff7a2a'; fcirc(g, 23, y - 3, 1); }
      else if (key === 'dschungel') { for (let i = -2; i <= 2; i++) { g.fillStyle = i % 2 ? '#3fa15e' : '#2f8a46'; g.beginPath(); g.moveTo(14, y); g.quadraticCurveTo(14 + i * 6, y - 8, 14 + i * 11, y - 10 + Math.abs(i) * 2); g.quadraticCurveTo(14 + i * 5, y - 5, 15, y); g.fill(); } }
      else if (key === 'himmel') { g.fillStyle = '#fff'; puffs(g, 2, 4, 24, 13); g.fillStyle = '#ffd6e8'; fcirc(g, 8, y - 4, 1.2); fcirc(g, 19, y - 5, 1); }
      else { const c1 = key === 'schnee' ? '#fff' : '#6fcf7a', c2 = key === 'schnee' ? '#dfe9f7' : '#4fb35c'; g.fillStyle = c2; fcirc(g, 8, y - 5, 6); fcirc(g, 20, y - 5, 6); fcirc(g, 14, y - 7, 7.5); g.fillRect(2, y - 5, 24, 5); g.fillStyle = c1; fcirc(g, 12, y - 9, 4.5); fcirc(g, 19, y - 7, 3); fcirc(g, 7, y - 7, 2.8); if (key === 'wiese') { fcirc(g, 6, y - 6, 1.5, '#ff6f9c'); fcirc(g, 16, y - 4, 1.4, '#ffd84a'); fcirc(g, 22, y - 7, 1.4, '#ff6f9c'); } }
    });
  }
  function decoSpr(W) {
    return spr('deco' + W.key, 28, 36, (g) => {
      const key = W.key, x = 14, y = 36;
      if (key === 'insel') { g.save(); g.translate(x, y); g.rotate(-0.15); rr(g, -5, -30, 10, 32, 5); g.fillStyle = '#ff6f9c'; g.fill(); g.strokeStyle = '#c9305f'; g.lineWidth = 1; g.stroke(); g.fillStyle = '#fff'; rr(g, -1.2, -27, 2.4, 26, 1.2); g.fill(); g.restore(); }
      else if (key === 'dschungel') { g.strokeStyle = '#3a9a46'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 3, y - 10, x, y - 18); g.stroke(); g.fillStyle = '#4fbf5f'; ell(g, x + 5, y - 8, 4, 2); g.fill(); for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#e04a7a' : '#ff6f9c'; ell(g, x + Math.cos(i * 1.047) * 5, y - 20 + Math.sin(i * 1.047) * 5, 3.2, 2.2); g.fill(); } fcirc(g, x, y - 20, 2.6, '#ffd84a'); }
      else if (key === 'schnee') { fcirc(g, x, y - 7, 7.5, '#fff', '#c9d6e8', 1); fcirc(g, x, y - 19, 5.5, '#fff', '#c9d6e8', 1); g.fillStyle = '#2a2a3a'; rr(g, x - 6, y - 24.5, 12, 1.8, 0.8); g.fill(); rr(g, x - 3.6, y - 31, 7.2, 7, 1); g.fill(); eye(g, x - 2, y - 20.5, 0.8); eye(g, x + 2, y - 20.5, 0.8); g.fillStyle = '#ffb347'; g.beginPath(); g.moveTo(x - 0.5, y - 19); g.lineTo(x + 4.5, y - 18.2); g.lineTo(x - 0.5, y - 17.5); g.fill(); g.strokeStyle = '#ff6f9c'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 5, y - 14.5); g.quadraticCurveTo(x, y - 12, x + 5, y - 14); g.stroke(); g.fillStyle = '#2a2a3a'; fcirc(g, x, y - 8, 0.8); fcirc(g, x, y - 4.5, 0.8); }
      else if (key === 'lava') { g.fillStyle = '#eee2c8'; rr(g, x - 7, y - 16, 14, 12, 5); g.fill(); rr(g, x - 4.5, y - 6, 9, 5, 1.5); g.fill(); g.fillStyle = '#2a1a1a'; ell(g, x - 3, y - 10.5, 2, 2.4); g.fill(); ell(g, x + 3, y - 10.5, 2, 2.4); g.fill(); g.fillRect(x - 2.5, y - 5, 1, 3); g.fillRect(x + 1.5, y - 5, 1, 3); g.fillStyle = '#ffd84a'; fcirc(g, x - 3, y - 11, 0.7); fcirc(g, x + 3, y - 11, 0.7); g.fillStyle = '#eee2c8'; rr(g, x - 12, y - 3, 10, 2.4, 1.2); g.fill(); }
      else if (key === 'himmel') { g.strokeStyle = '#fff'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 3, y - 8, x, y - 14); g.stroke(); ell(g, x, y - 24, 8, 10); g.fillStyle = lin(g, '', x - 8, 0, x + 8, 0, [0, '#ffb3c6', 0.5, '#ff8fb0', 1, '#e04a7a']); g.fill(); g.strokeStyle = '#c9305f'; g.lineWidth = 1; g.stroke(); g.fillStyle = 'rgba(255,255,255,.6)'; ell(g, x - 3, y - 28, 2, 3); g.fill(); g.fillStyle = '#e04a7a'; g.beginPath(); g.moveTo(x - 2, y - 14); g.lineTo(x + 2, y - 14); g.lineTo(x, y - 12); g.fill(); }
      else cupcake(g, x, y, 22, '#ff9eb0', '#fff7ef', '#e0457b');
    });
  }
  function cottageSpr() {
    return spr('cottage', 64, 58, (g) => {
      const x0 = 8, y0 = 22, w = 48, h = 36;
      g.fillStyle = '#c69c6d'; rr(g, 46, 2, 7, 22, 1.5); g.fill();
      rr(g, x0, y0, w, h, 3); g.fillStyle = lin(g, '', 0, y0, 0, y0 + h, [0, '#fff8ee', 1, '#f3dfc8']); g.fill(); g.strokeStyle = '#c9a98a'; g.lineWidth = 1; g.stroke();
      g.fillStyle = '#ff9eb0'; g.beginPath(); g.moveTo(x0 - 6, y0 + 2); g.lineTo(x0 + w / 2, y0 - 20); g.lineTo(x0 + w + 6, y0 + 2); g.closePath(); g.fill(); g.strokeStyle = '#e8738f'; g.lineWidth = 1; g.stroke();
      g.fillStyle = '#ffb3c6'; for (let r = 0; r < 3; r++) for (let i = 0; i < 8 - r * 2; i++) fcirc(g, x0 + w / 2 - (7 - r * 2) * 3 + i * 6, y0 - 1 - r * 6, 3.2);
      rr(g, x0 + w / 2 - 6, y0 + h - 18, 12, 18, 5); g.fillStyle = '#c69c6d'; g.fill(); g.strokeStyle = '#8a5a2b'; g.lineWidth = 1; g.stroke(); fcirc(g, x0 + w / 2 + 3, y0 + h - 9, 1, '#ffd84a'); heartPath(g, x0 + w / 2, y0 + h - 14, 2); g.fillStyle = '#ff6f9c'; g.fill();
      for (const wx of [x0 + 7, x0 + w - 17]) { rr(g, wx, y0 + 8, 10, 10, 2); g.fillStyle = '#ffe9a8'; g.fill(); g.strokeStyle = '#8a5a2b'; g.lineWidth = 1.2; g.stroke(); g.beginPath(); g.moveTo(wx + 5, y0 + 8); g.lineTo(wx + 5, y0 + 18); g.moveTo(wx, y0 + 13); g.lineTo(wx + 10, y0 + 13); g.stroke(); rr(g, wx - 1, y0 + 18, 12, 3, 1); g.fillStyle = '#9be7a5'; g.fill(); fcirc(g, wx + 2, y0 + 18, 1.3, '#ff6f9c'); fcirc(g, wx + 8, y0 + 18, 1.3, '#ffd84a'); fcirc(g, wx + 5, y0 + 17.5, 1.3, '#ff9eb0'); }
    });
  }
  function towerSpr(W) {
    return spr('tower' + W.key, 64, 140, (g) => {
      const b = W.block, x0 = 4, w = 56, top = 24, y1 = 140;
      rr(g, x0, top, w, y1 - top + 4, 4); g.fillStyle = lin(g, '', x0, 0, x0 + w, 0, [0, shade(b.a, -0.1), 0.35, b.b, 1, shade(b.a, -0.25)]); g.fill(); g.strokeStyle = b.c; g.lineWidth = 1.2; g.stroke();
      g.save(); rr(g, x0, top, w, y1 - top + 4, 4); g.clip(); g.strokeStyle = rgba(b.c, 0.35); g.lineWidth = 0.8; for (let r = 0; r < 15; r++) { const y = top + 6 + r * 8; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + w, y); g.stroke(); for (let i = 0; i < 5; i++) { const x = x0 + (r % 2) * 6 + i * 12; g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x, y); g.stroke(); } } g.restore();
      g.fillStyle = b.b; for (let i = 0; i < 5; i++) { rr(g, x0 - 2 + i * 12, top - 8, 8, 10, 1.5); g.fill(); g.strokeStyle = b.c; g.lineWidth = 1; g.stroke(); }
      rr(g, x0 - 4, top - 1, w + 8, 5, 2); g.fillStyle = shade(b.a, -0.15); g.fill();
      g.fillStyle = '#ff6f9c'; g.beginPath(); g.moveTo(x0 + 8, top - 8); g.lineTo(x0 + w / 2, top - 34); g.lineTo(x0 + w - 8, top - 8); g.closePath(); g.fill(); g.strokeStyle = '#c9305f'; g.lineWidth = 1; g.stroke();
      g.fillStyle = '#fff'; rr(g, x0 + w / 2 - 1, top - 46, 2, 14, 1); g.fill(); g.fillStyle = '#ffd84a'; g.beginPath(); g.moveTo(x0 + w / 2 + 1, top - 46); g.lineTo(x0 + w / 2 + 15, top - 41); g.lineTo(x0 + w / 2 + 1, top - 36); g.closePath(); g.fill();
      rr(g, x0 + 18, top + 32, 20, 26, 10); g.fillStyle = '#8fd3ff'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#fff'; rr(g, x0 + 15, top + 56, 26, 3, 1.5); g.fill();
      rr(g, x0 + 21, y1 - 26, 14, 30, 7); g.fillStyle = '#c69c6d'; g.fill(); g.strokeStyle = '#8a5a2b'; g.lineWidth = 1.2; g.stroke(); fcirc(g, x0 + 32, y1 - 12, 1.2, '#ffd84a');
      for (const wx of [x0 + 6, x0 + w - 12]) { rr(g, wx, top + 70, 6, 10, 3); g.fillStyle = '#8fd3ff'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.2; g.stroke(); }
      g.fillStyle = '#9be7a5'; fcirc(g, x0 + 4, y1 + 2, 6); fcirc(g, x0 + w - 4, y1 + 2, 6);
    });
  }
  function drawFlag(x, y, fr, reached) {
    ctx.fillStyle = '#c69c6d'; rr(ctx, x + 6.8, y - 7, 2.4, 23, 1.2); ctx.fill(); fcirc(ctx, x + 8, y - 7.5, 1.8, '#ffd84a');
    ctx.fillStyle = reached ? '#ff6f9c' : '#dfe6f0'; ctx.beginPath(); ctx.moveTo(x + 9, y - 6); for (let i = 1; i <= 4; i++) ctx.lineTo(x + 9 + i * 2.4, y - 6 + Math.sin(fr * 0.15 + i * 0.7) * 1.2); for (let i = 4; i >= 0; i--) ctx.lineTo(x + 9 + i * 2.4, y + 1 + Math.sin(fr * 0.15 + i * 0.7 + 0.5) * 1.2); ctx.closePath(); ctx.fill();
    if (reached) { heartPath(ctx, x + 14, y - 2.6, 1.6); ctx.fillStyle = '#fff'; ctx.fill(); }
  }
  function drawGoal(x, y, fr, top) {
    ctx.fillStyle = '#fff'; rr(ctx, x + 6.5, y, 3, 16.5, 1.5); ctx.fill(); ctx.save(); rr(ctx, x + 6.5, y, 3, 16.5, 1.5); ctx.clip(); ctx.strokeStyle = '#ff9eb0'; ctx.lineWidth = 1.6; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + 5, y + i * 5 + 2); ctx.lineTo(x + 11, y + i * 5 - 3); ctx.stroke(); } ctx.restore();
    if (top) { fcirc(ctx, x + 8, y - 1.5, 2.8, '#ffd84a', '#e3a92a', 1); ctx.fillStyle = '#ff6f9c'; ctx.beginPath(); ctx.moveTo(x + 9.5, y - 12); for (let i = 1; i <= 5; i++) ctx.lineTo(x + 9.5 + i * 3, y - 12 + Math.sin(fr * 0.14 + i * 0.6) * 1.6 + i * 0.4); ctx.lineTo(x + 9.5 + 15, y - 4 + Math.sin(fr * 0.14 + 3.5) * 1.6); for (let i = 4; i >= 0; i--) ctx.lineTo(x + 9.5 + i * 3, y - 1 + Math.sin(fr * 0.14 + i * 0.6 + 0.6) * 1.6 - i * 0.3); ctx.closePath(); ctx.fill(); heartPath(ctx, x + 16, y - 6.5, 2.2); ctx.fillStyle = '#fff'; ctx.fill(); }
  }
  function drawTile(ch, cx, cy, x, y, fr) {
    const W = L().world, tileAt = E().tileAt;
    if (W.key === 'weltraum' && (ch === 'p' || ch === 'h' || ch === 'd' || ch === 'Q' || ch === 'U')) { spaceTile(ch, cx, cy, x, y, fr, W); return; }
    switch (ch) {
      case '#': blit(groundSpr(W, maskAt(cx, cy, tileAt), (cx * 7 + cy * 3) % 3), x, y - 6); return;
      case 'i': blit(iceSpr(maskAt(cx, cy, tileAt), (cx * 5) % 3), x, y); return;
      case 's': blit(honeySpr(W, maskAt(cx, cy, tileAt), (cx * 3) % 3), x, y - 4); return;
      case '=': blit(blockSpr(W, false), x, y); return;
      case 'c': blit(blockSpr(W, true), x, y); return;
      case '?': case '!': blit(boxSpr(ch), x, y); blit(symSpr(ch), x, y - 1 + Math.sin(fr * 0.12 + cx) * 1.2); return;
      case 'X': blit(usedSpr(), x, y); return;
      case 'Z': blit(gateSpr(tileAt(cx, cy - 1) !== 'Z'), x, y - 4); return;
      case 'n': case 'P': { if (tileAt(cx - 1, cy) === ch) return; const dbl = tileAt(cx + 1, cy) === ch; blit(pipeRimSpr(W, dbl ? 32 : 16), x - 2, y - 2); if (ch === 'P') { const mx = x + (dbl ? 16 : 8); ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 2; circ(ctx, mx, y + 6, 6); ctx.stroke(); ctx.fillStyle = '#ffd84a'; const bob = Math.sin(fr * 0.15) * 1.5; ctx.beginPath(); ctx.moveTo(mx - 4, y - 8 + bob); ctx.lineTo(mx + 4, y - 8 + bob); ctx.lineTo(mx, y - 3 + bob); ctx.closePath(); ctx.fill(); } return; }
      case '|': { if (tileAt(cx - 1, cy) === '|') return; const dbl = tileAt(cx + 1, cy) === '|', up = tileAt(cx, cy - 1); blit(pipeBodySpr(W, dbl ? 32 : 16, up === 'n' || up === 'P'), x, y); return; }
      case '~': drawLiquid(W, cx, cy, x, y, fr, tileAt); return;
      case 'v': blit(vineSpr(cy % 2), x, y); return;
      case 'b': { const s = shroomSpr(), sq = 1 + Math.sin(fr * 0.1 + cx) * 0.03; blit(s, x - 1, y - 2 + (1 - sq) * 18, 18, 18 * sq); return; }
      case 'o': { const bb = Math.sin(fr * 0.1 + cx * 0.7) * 1.5; ctx.globalAlpha = 0.35; blit(glow('#ff9eb0', 12), x - 4, y - 4 + bb); ctx.globalAlpha = 1; blit(heartSpr(), x + 1, y + 1 + bb); return; }
      case '*': { const bb = Math.sin(fr * 0.09 + cx) * 1.6; ctx.globalAlpha = 0.45; blit(glow('#ffe08a', 14), x - 6, y - 6 + bb); ctx.globalAlpha = 1; ctx.save(); ctx.translate(x + 8, y + 8 + bb); ctx.rotate(Math.sin(fr * 0.05 + cx) * 0.15); blit(starSpr(), -9, -9); ctx.restore(); if ((fr + cx * 7) % 40 < 8) { starPath(ctx, x + 13.5, y + 2 + bb, 2.4, 0.8, 4); ctx.fillStyle = '#fff'; ctx.fill(); } return; }
      case 'K': case 'k': drawFlag(x, y, fr, ch === 'k'); return;
      case 'F': drawGoal(x, y, fr, tileAt(cx, cy - 1) !== 'F'); return;
      case 'p': { blit(treeSpr(W), x - 24, y - 56); if (W.key === 'lava') { const fl = 1 + Math.sin(fr * 0.3 + cx) * 0.15; ctx.globalAlpha = 0.6; blit(glow('#ffb347', 16), x - 8, y - 49 - 16 + 8); ctx.globalAlpha = 1; fell(ctx, x + 8, y - 49, 2.4 * fl, 4 * fl, '#ffb347'); fell(ctx, x + 8, y - 48, 1.2 * fl, 2.2 * fl, '#fff2a0'); } return; }
      case 'h': blit(bushSpr(W), x - 6, y - 2); return;
      case 'd': { const bob = W.key === 'himmel' ? Math.sin(fr * 0.06 + cx) * 2 : 0; blit(decoSpr(W), x - 6, y - 20 + bob); return; }
      case 'f': blit(signSpr(), x - 6, y - 8); return;
      case 'Q': { blit(cottageSpr(), x - 16, y - 42); ctx.globalAlpha = 0.35 + Math.sin(fr * 0.06) * 0.15; blit(glow('#ffd84a', 14), x - 15 + 7 - 14 + 5, y - 42 + 22 + 13 - 14); blit(glow('#ffd84a', 14), x - 15 + 39 - 14 + 5, y - 42 + 22 + 13 - 14); ctx.globalAlpha = 1; for (let i = 0; i < 3; i++) { const t = (fr * 0.5 + i * 30) % 90; ctx.globalAlpha = 0.5 * (1 - t / 90); fcirc(ctx, x + 33 + Math.sin(t * 0.1 + i) * 3 + t * 0.1, y - 42 - t * 0.35, 3 + t * 0.05, '#fff'); } ctx.globalAlpha = 1; return; }
      case 'U': { blit(towerSpr(W), x - 20, y - 124); if (W.boss.final && !L().rescued) drawBear(x + 6, y - 72, false, fr * 0.05, -1, false, true, true, 1, 1, false); return; }
      default: if (G.fx && G.fx.tile && G.fx.tile(ctx, ch, cx, cy, x, y, fr)) return;
    }
  }

  /* ================= Wookie: cute-cool action bear, stateless renderer ================= */
  const OUTFITS = ['wiese', 'insel', 'dschungel', 'schnee', 'lava', 'himmel'];
  function gradG(g, key, mk) { if (g === ctx) { let gr = grads.get(key); if (!gr) { gr = mk(); grads.set(key, gr); } return gr; } return mk(); }
  function furGrad(g, col, r) { return gradG(g, 'fur' + col + r, () => { const gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.15); gr.addColorStop(0, shade(col, 0.2)); gr.addColorStop(0.6, col); gr.addColorStop(1, shade(col, -0.1)); return gr; }); }
  function ball(g, cx, cy, rx, ry, col, ol, lw) { g.save(); g.translate(cx, cy); ell(g, 0, 0, rx, ry); g.fillStyle = furGrad(g, col, Math.max(rx, ry)); g.fill(); g.strokeStyle = ol; g.lineWidth = lw || 1; g.stroke(); g.restore(); }
  function capsule(g, x, y, len, w, rot, col, paw, ol) { /* limb hanging from (x,y), rotated by rot (0 = down, + = forward) */ g.save(); g.translate(x, y); g.rotate(-rot); rr(g, -w / 2, -w * 0.3, w, len + w * 0.3, w / 2); fs(g, col, ol, 1); fcirc(g, 0, len - w * 0.05, w * 0.56, paw, ol, 0.9); g.restore(); }
  function wingG(g, x, y, s, rot, a) { g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = a; for (let i = 0; i < 3; i++) { ell(g, -s * (0.5 + i * 0.42), -s * 0.1 - i * s * 0.12, s * 0.62, s * 0.26 - i * 0.02 * s); g.fillStyle = i % 2 ? '#ffd84a' : '#ffe9a8'; g.fill(); g.strokeStyle = '#e3a92a'; g.lineWidth = 0.8; g.stroke(); } g.restore(); g.globalAlpha = 1; }
  function ribbon(g, pts, w0, w1, col, ol, dash) { if (ol) { g.strokeStyle = ol; g.lineWidth = w0 + 1.4; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); } g.strokeStyle = col; for (let i = 0; i < pts.length - 1; i++) { g.lineWidth = lerp(w0, w1, i / (pts.length - 2)); g.beginPath(); g.moveTo(pts[i][0], pts[i][1]); g.lineTo(pts[i + 1][0], pts[i + 1][1]); g.stroke(); } if (dash) { g.save(); g.setLineDash([1.6, 1.8]); g.strokeStyle = dash; g.lineWidth = w0 * 0.7; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); g.restore(); } }
  function trailPts(nx, ny, speed, up, len, phase, amp, n) { /* points of a trailing cloth: hangs down at rest, streams back with speed, up when falling fast */ let dx = -(0.35 + 0.65 * speed), dy = 0.95 - 0.9 * speed - up * 1.3; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; const px = -dy, py = dx, pts = []; for (let i = 0; i <= n; i++) { const d = len * i / n, wv = Math.sin(phase - i * 1.15) * amp * (i / n); pts.push([nx + dx * d + px * wv, ny + dy * d + py * wv]); } return pts; }
  function renderBear(g, x, y, o) {
    const sc = o.scale || 1, f = o.facing || 1, pose = o.pose || 'idle', t = o.t || 0, fr = o.frame || 0, sp = clamp(o.speed || 0, 0, 1), white = !!o.white, pal = o.pal, outfit = white ? null : (o.outfit || 'wiese');
    const fur = (pal && pal.fur) || (white ? '#fff8f0' : '#b4824a'), belly = (pal && pal.belly) || (white ? '#fffdf8' : '#ecd2a0'), earC = (pal && pal.ear) || (white ? '#ffc5d3' : '#f2b4a0'), ol = (pal && pal.outline) || (white ? '#b89a8a' : '#4a2c14'), paw = (pal && pal.dark) || (white ? '#efe0d0' : '#7a4f28'), dk = white ? '#4a3a3a' : '#2a1b12';
    const upF = clamp((o.vy || 0) / 6, 0, 1), vyN = clamp(-(o.vy || 0) / 6, 0, 1);
    g.save(); g.translate(x, y); g.scale(f * sc * (o.sx || 1), sc * (o.sy || 1)); g.lineJoin = 'round'; g.lineCap = 'round';
    /* whole-body transform per pose */
    let rot = 0, dy = 0, pivot = 0;
    if (pose === 'run') rot = 0.32 * sp; else if (pose === 'jet') rot = 0.45; else if (pose === 'wall') rot = -0.12; else if (pose === 'launch') { rot = 1.1; pivot = -10; } else if (pose === 'skydive') { rot = Math.PI / 2 - 0.15; pivot = -10; } else if (pose === 'pound') { rot = fr * 0.55; pivot = -9; } else if (pose === 'dead') rot = Math.min(0.55, (o.deadT || 0.4) * 1.3); else if (pose === 'sad') dy = 0.6;
    if (pose === 'victory') dy = -Math.abs(Math.sin(t * 7)) * 2.2;
    if (pose === 'run') dy = -Math.abs(Math.cos(fr)) * 0.6 * sp;
    g.translate(0, dy + pivot); g.rotate(rot); g.translate(0, -pivot);
    const breath = pose === 'idle' ? Math.sin(t * 2.4) * 0.03 : 0;
    /* limb angles (0 = hanging, + = forward) */
    let aF = -0.12, aB = 0.12, lF = 0, lB = 0, legLen = 4.2;
    const swing = Math.sin(fr), lift = Math.abs(Math.cos(fr));
    if (pose === 'run') { lF = swing * 0.95; lB = -swing * 0.95; aF = -swing * 1.1 - 0.2; aB = swing * 1.1 - 0.2; }
    else if (pose === 'jump') { aF = 2.5; aB = -2.5; lF = 0.9; lB = 0.9; legLen = 3.4; }
    else if (pose === 'fall') { aF = 1.5; aB = -1.5; lF = 0.35; lB = -0.35; }
    else if (pose === 'glide') { aF = 1.3; aB = -1.3; lF = 0.2; lB = -0.2; }
    else if (pose === 'skydive') { aF = 1.9; aB = -1.9; lF = 0.55; lB = -0.55; }
    else if (pose === 'victory') { aF = 2.4 + Math.sin(t * 10) * 0.2; aB = -2.4 - Math.sin(t * 10 + 1) * 0.2; }
    else if (pose === 'wall') { aF = 2.4; aB = 1.3; lF = 0.6; lB = 0.3; legLen = 3.6; }
    else if (pose === 'pound') { aF = 2.0; aB = -2.0; lF = 1.1; lB = 1.1; legLen = 3.2; }
    else if (pose === 'jet') { aF = -1.3; aB = -1.5; lF = -0.6; lB = -0.75; }
    else if (pose === 'launch') { aF = 2.8; aB = -2.8; lF = -0.1; lB = 0.1; }
    else if (pose === 'climb') { const c = Math.sin(fr * 1.5); aF = 2.5 + c * 0.5; aB = -2.5 + c * 0.5; lF = 0.4 + c * 0.4; lB = 0.4 - c * 0.4; }
    else if (pose === 'dead') { aF = 0.35; aB = -0.35; lF = 0.15; lB = -0.15; }
    else if (pose === 'sad') { aF = 0.05; aB = -0.05; }
    /* mood */
    let mood = o.mood || 'normal';
    if (!o.mood) { if (pose === 'run' && sp > 0.62) mood = 'determined'; else if (pose === 'fall' || pose === 'skydive' || pose === 'launch') mood = 'surprised'; else if (pose === 'victory' || pose === 'jump' || pose === 'glide') mood = 'happy'; else if (pose === 'dead') mood = 'dead'; else if (pose === 'sad') mood = 'sad'; else if (pose === 'jet' || pose === 'pound' || pose === 'wall') mood = 'determined'; }
    const goggDown = pose === 'jet' || pose === 'skydive' || pose === 'launch';
    const blink = mood !== 'dead' && ((t % 3.7) < 0.12 || (mood === 'happy' && pose === 'victory'));
    const lookT = t % 7.5, look = pose === 'idle' ? (lookT > 5.2 && lookT < 6.4 ? -0.7 : 0) : (pose === 'run' ? 0.4 : 0);
    const twitchT = t % 4.3, twitch = pose === 'idle' && twitchT < 0.3 ? Math.sin(twitchT / 0.3 * Math.PI * 3) * 0.25 : 0;
    const earFlap = pose === 'run' ? Math.sin(fr + 1) * 0.28 * sp : (pose === 'fall' || pose === 'skydive' ? -0.35 : 0);
    /* ---- back layer: cape / scarf tail, backpack, wings ---- */
    const phase = fr * 1.6 + t * 9;
    if (outfit === 'himmel') { const pts = trailPts(-2.6, -10.6, sp * 0.8 + (pose === 'jump' || pose === 'fall' || pose === 'skydive' ? 0.5 : 0), upF, 9 + sp * 3, phase, 1.4, 4); g.beginPath(); g.moveTo(-1.5, -11.5); for (let i = 1; i < pts.length; i++) { const w = 1 + i * 1.3; g.lineTo(pts[i][0] - pts[i][1] * 0 + 0, pts[i][1] + w * 0.15); } for (let i = pts.length - 1; i >= 1; i--) { const w = 1 + i * 1.3; g.lineTo(pts[i][0] + (pts[i][1] - pts[0][1]) * 0.25 - w * 0.5, pts[i][1] - w * 0.35); } g.lineTo(-3.6, -11.2); g.closePath(); fs(g, '#4a66d8', '#2a3a8a', 1); g.fillStyle = '#ffe94a'; for (let i = 1; i < pts.length - 1; i++) { starPath(g, pts[i][0] - 0.6, pts[i][1] + 0.2, 1.1, 0.45, 5); g.fill(); } }
    if (outfit === 'wiese' || outfit === 'schnee') { const pts = trailPts(-3.4, -9.8, sp * 0.85 + (pose === 'jump' || pose === 'fall' || pose === 'skydive' || pose === 'launch' ? 0.55 : 0), upF + (pose === 'jump' ? vyN * 0.6 : 0), 8 + sp * 4, phase, 1 + sp * 0.9, 4); ribbon(g, pts, 2.7, 1.3, outfit === 'schnee' ? '#e8443a' : '#e23a3a', '#7a1a14', outfit === 'schnee' ? '#fff' : null); }
    if (outfit === 'dschungel') { rr(g, -7.2, -12.6, 4.6, 7.2, 1.6); fs(g, '#8a5a2b', '#4a2a0f', 1); rr(g, -6.4, -13.6, 3, 1.8, 0.8); fs(g, '#a06a35', '#4a2a0f', 0.8); }
    if (o.gliding) { const fl = Math.sin(fr * 2 + t * 12) * 0.35; wingG(g, -3, -9, 11, -0.4 + fl, 0.95); g.save(); g.scale(-1, 1); wingG(g, -3, -9, 11, -0.4 + fl, 0.95); g.restore(); }
    else if (o.wings) wingG(g, -3.5, -10.5, 5.5, -1.1, 0.9);
    /* ---- back arm and back leg ---- */
    const raisedB = Math.abs(aB) > 1.45, raisedF = Math.abs(aF) > 1.45;
    if (!raisedB) capsule(g, -4.3, -8.8, 4.8, 2.7, aB, shade(fur, -0.08), paw, ol);
    capsule(g, -2.6, -4.6, legLen, 3.3, lB, shade(fur, -0.06), paw, ol);
    /* ---- body ---- */
    ball(g, 0, -7.6, 5.1, 4.9 * (1 + breath), fur, ol);
    if (outfit === 'dschungel' || outfit === 'lava') { const vc = outfit === 'lava' ? '#c9ccd6' : '#c8b46a', ve = outfit === 'lava' ? '#5a5e6a' : '#6a5a2a'; for (const d of [-1, 1]) { g.beginPath(); g.moveTo(d * 1.6, -12); g.quadraticCurveTo(d * 5.4, -11.5, d * 4.6, -5.5); g.quadraticCurveTo(d * 3.2, -3.4, d * 1.4, -3.6); g.quadraticCurveTo(d * 0.9, -7, d * 1.6, -12); g.closePath(); fs(g, vc, ve, 0.9); if (outfit === 'lava') { g.strokeStyle = '#ff9a2a'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(d * 1.8, -7.8); g.lineTo(d * 4.6, -8.2); g.stroke(); } else { rr(g, d * 2 - 0.8, -6.6, 1.8, 1.6, 0.4); fs(g, shade(vc, -0.15), ve, 0.6); } } }
    heartPath(g, 0.7, -8.3 - breath * 4, 2.5); g.fillStyle = belly; g.fill();
    if (outfit === 'insel') { const cols = ['#ff6f9c', '#ffd84a', '#fff', '#ff9eb0', '#9be7a5']; for (let i = 0; i < 7; i++) { const a = Math.PI * (0.15 + i * 0.7 / 6); fcirc(g, Math.cos(a) * 4.6 * (i < 3.5 ? 1 : 1) - 0 + (3 - i) * 0 + Math.cos(a) * 0, -9.2 + Math.sin(a) * 3.2, 1, cols[i % 5], '#a05a6a', 0.5); } }
    /* ---- front leg ---- */
    capsule(g, 2.6, -4.6, legLen, 3.3, lF, fur, paw, ol);
    /* ---- scarf band ---- */
    if (outfit === 'wiese' || outfit === 'schnee') { ell(g, 0.3, -9.7, 4.9, 1.6); fs(g, outfit === 'schnee' ? '#e8443a' : '#e23a3a', '#7a1a14', 0.9); if (outfit === 'schnee') { g.fillStyle = '#fff'; g.fillRect(-2.2, -10.5, 1.2, 1.8); g.fillRect(1.2, -10.6, 1.2, 1.8); } fcirc(g, -3.3, -9.1, 1.35, '#e23a3a', '#7a1a14', 0.8); }
    if (!raisedF) capsule(g, 4.3, -8.8, 4.8, 2.7, aF, fur, paw, ol);
    /* ---- ears (behind head) ---- */
    for (const d of [-1, 1]) { g.save(); g.translate(d * 5.1, -18.2); g.rotate(d * (earFlap + (d < 0 ? twitch : 0)) + (pose === 'sad' ? d * 0.5 : 0)); if (d < 0 && !white) { g.beginPath(); g.arc(0, 0, 2.5, -2.2 + 0.75, -2.2 + TAU - 0.75); g.lineTo(-0.3, -0.5); g.closePath(); g.fillStyle = furGrad(g, fur, 2.5); g.fill(); g.strokeStyle = ol; g.lineWidth = 1; g.stroke(); } else ball(g, 0, 0, 2.5, 2.5, fur, ol); fcirc(g, d * 0.2, 0.2, 1.25, earC); if (outfit === 'schnee') fcirc(g, 0, 0.3, 2.1, '#ff9eb0', '#c25a7a', 0.8); g.restore(); }
    /* ---- head ---- */
    const hy = -14 + (pose === 'sad' ? 0.6 : 0);
    ball(g, 0, hy, 6.4, 6.2, fur, ol);
    if (!white) { g.fillStyle = fur; g.strokeStyle = ol; g.lineWidth = 0.9; for (let i = 0; i < 3; i++) { const bx = -1.6 + i * 1.3; g.beginPath(); g.moveTo(bx - 0.9, hy - 5.6); g.quadraticCurveTo(bx - 0.9 + (i - 1) * 0.6, hy - 8.4, bx + 0.6 - i * 0.4, hy - 8.9 + i * 0.4); g.quadraticCurveTo(bx + 1, hy - 7, bx + 1.1, hy - 5.6); g.closePath(); g.fill(); g.stroke(); } }
    /* muzzle, nose, mouth */
    ell(g, 1, hy + 2, 2.8, 2.05); g.fillStyle = white ? '#fffdf8' : belly; g.fill();
    g.beginPath(); g.moveTo(0.5, hy + 0.7); g.lineTo(2.4, hy + 0.7); g.quadraticCurveTo(1.5, hy + 2.3, 1.45, hy + 2.3); g.closePath(); g.fillStyle = dk; g.fill(); fcirc(g, 1.1, hy + 0.95, 0.35, 'rgba(255,255,255,.8)');
    g.strokeStyle = dk; g.lineWidth = 0.9; g.beginPath();
    if (mood === 'happy') { g.moveTo(-0.6, hy + 2.6); g.quadraticCurveTo(1.4, hy + 4.6, 3.2, hy + 2.4); g.stroke(); g.fillStyle = '#5a2a2a'; g.beginPath(); g.moveTo(-0.2, hy + 2.9); g.quadraticCurveTo(1.4, hy + 4.2, 3, hy + 2.7); g.closePath(); g.fill(); }
    else if (mood === 'surprised') { g.stroke(); ell(g, 1.6, hy + 3.1, 0.9, 1.1); g.fillStyle = '#5a2a2a'; g.fill(); }
    else if (mood === 'sad' || mood === 'dead') { g.moveTo(0, hy + 3.5); g.quadraticCurveTo(1.6, hy + 2.3, 3.2, hy + 3.4); g.stroke(); if (mood === 'dead') { ell(g, 2.6, hy + 3.8, 0.7, 1.1); g.fillStyle = '#ff8fa8'; g.fill(); } }
    else { g.moveTo(0.1, hy + 2.9); g.quadraticCurveTo(1.7, hy + 3.9, 3.3, hy + 2.5); g.stroke(); }
    /* eyes */
    const ex = 2.5, ey = hy - 0.4, wide = mood === 'surprised';
    for (const d of [-1, 1]) {
      const cx = d * ex + (d > 0 ? 0.2 : 0), lk = look + (d > 0 ? 0.15 : 0);
      if (mood === 'dead') { g.strokeStyle = dk; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - 1.3, ey - 1.3); g.lineTo(cx + 1.3, ey + 1.3); g.moveTo(cx + 1.3, ey - 1.3); g.lineTo(cx - 1.3, ey + 1.3); g.stroke(); continue; }
      if (blink) { g.strokeStyle = dk; g.lineWidth = 1.1; g.beginPath(); if (mood === 'happy') { g.moveTo(cx - 1.6, ey + 0.5); g.quadraticCurveTo(cx, ey - 1.6, cx + 1.6, ey + 0.5); } else { g.moveTo(cx - 1.6, ey); g.lineTo(cx + 1.6, ey); } g.stroke(); continue; }
      fell(g, cx, ey, 2.05, wide ? 2.6 : 2.3, '#fff', ol, 0.7);
      fcirc(g, cx + lk * 0.6, ey + 0.15 + (wide ? -0.2 : 0), wide ? 1.25 : 1.5, dk);
      fcirc(g, cx + lk * 0.6 - 0.5, ey - 0.6, 0.6, '#fff'); fcirc(g, cx + lk * 0.6 + 0.5, ey + 0.65, 0.3, '#fff');
      if (white) { g.strokeStyle = dk; g.lineWidth = 0.6; for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(cx + d * (1.3 + i * 0.5), ey - 1.8 + i * 0.7); g.lineTo(cx + d * (2.2 + i * 0.5), ey - 2.5 + i * 0.5); g.stroke(); } }
    }
    /* eyebrows */
    if (mood !== 'dead' && !white) { g.strokeStyle = dk; g.lineWidth = 1.25; for (const d of [-1, 1]) { const bx = d * ex, by = ey - 2.9; g.beginPath(); if (mood === 'determined') { g.moveTo(bx - d * 1.5, by - 0.3); g.lineTo(bx + d * 1.2, by + 0.9); } else if (mood === 'surprised') { g.moveTo(bx - 1.5, by - 0.9); g.quadraticCurveTo(bx, by - 2.2, bx + 1.5, by - 0.9); } else if (mood === 'happy') { g.moveTo(bx - 1.5, by - 0.4); g.quadraticCurveTo(bx, by - 1.4, bx + 1.5, by - 0.4); } else if (mood === 'sad') { g.moveTo(bx - d * 1.4, by + 0.6); g.lineTo(bx + d * 1.2, by - 0.6); } else { g.moveTo(bx - d * 1.5, by + 0.2); g.lineTo(bx + d * 1.3, by - 0.4 - (d > 0 ? 0.4 : 0)); } g.stroke(); } }
    else if (white && mood !== 'dead') { g.strokeStyle = dk; g.lineWidth = 0.7; for (const d of [-1, 1]) { g.beginPath(); g.moveTo(d * ex - 1.2, ey - 3.1); g.quadraticCurveTo(d * ex, ey - 3.7, d * ex + 1.2, ey - 3.1); g.stroke(); } }
    /* ---- headgear and face gear ---- */
    const hatTilt = pose === 'jump' ? -0.18 : (pose === 'fall' ? 0.14 : (pose === 'run' ? -0.08 * sp : 0));
    g.save(); g.translate(0, hy); g.rotate(hatTilt); g.translate(0, -hy);
    const goggles = (col, rim) => { if (goggDown) { for (const d of [-1, 1]) { fcirc(g, d * ex + (d > 0 ? 0.2 : 0), ey, 2.6, rgba(col, 0.35), rim, 1.1); fcirc(g, d * ex - 0.8, ey - 0.9, 0.7, 'rgba(255,255,255,.75)'); } g.strokeStyle = rim; g.lineWidth = 1.1; g.beginPath(); g.moveTo(-0.1, ey - 0.3); g.lineTo(0.5, ey - 0.3); g.stroke(); } else { g.strokeStyle = rim; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-5.6, hy - 3.2); g.quadraticCurveTo(0, hy - 5.2, 5.6, hy - 3.2); g.stroke(); for (const d of [-1, 1]) { fcirc(g, d * 2.1, hy - 4.3, 1.75, col, rim, 1); fcirc(g, d * 2.1 - 0.6, hy - 4.9, 0.6, 'rgba(255,255,255,.85)'); } } };
    if (outfit === 'wiese') goggles('#8fd3ff', '#3a2a1a');
    else if (outfit === 'insel') { ell(g, 0, hy - 5.2, 9.2, 2.2); fs(g, '#f2d26a', '#a0782a', 1); g.beginPath(); g.moveTo(-5, hy - 5.4); g.quadraticCurveTo(-5.2, hy - 11.5, 0, hy - 11.4); g.quadraticCurveTo(5.2, hy - 11.5, 5, hy - 5.4); g.closePath(); fs(g, '#f6dc7a', '#a0782a', 1); g.fillStyle = '#e23a3a'; g.fillRect(-4.9, hy - 7.6, 9.8, 1.5); g.strokeStyle = 'rgba(160,120,40,.5)'; g.lineWidth = 0.5; for (let i = -4; i <= 4; i += 2) { g.beginPath(); g.moveTo(i, hy - 7.6); g.lineTo(i * 0.7, hy - 11); g.stroke(); } for (const d of [-1, 1]) { rr(g, d * ex - 2.1 + (d > 0 ? 0.2 : 0), ey - 1.6, 4.2, 3.2, 1.3); fs(g, 'rgba(30,20,40,.88)', '#1a1020', 0.9); fcirc(g, d * ex - 0.9, ey - 0.8, 0.5, 'rgba(255,255,255,.5)'); } g.strokeStyle = '#1a1020'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-0.4, ey - 0.6); g.lineTo(0.6, ey - 0.6); g.stroke(); }
    else if (outfit === 'dschungel') { ell(g, 0, hy - 4.6, 8.4, 2); fs(g, '#e2cf9a', '#7a6a3a', 1); g.beginPath(); g.moveTo(-5.6, hy - 4.8); g.quadraticCurveTo(-5.8, hy - 11.6, 0, hy - 11.6); g.quadraticCurveTo(5.8, hy - 11.6, 5.6, hy - 4.8); g.closePath(); fs(g, '#eadbb0', '#7a6a3a', 1); g.fillStyle = '#6a5a2a'; g.fillRect(-5.5, hy - 7.2, 11, 1.3); fcirc(g, 0, hy - 11.4, 0.9, '#eadbb0', '#7a6a3a', 0.8); }
    else if (outfit === 'schnee') { const bc = ['#e8443a', '#fff', '#4a66d8']; g.beginPath(); g.moveTo(-6.4, hy - 3.4); g.quadraticCurveTo(-6.6, hy - 12.2, 0, hy - 12.4); g.quadraticCurveTo(6.6, hy - 12.2, 6.4, hy - 3.4); g.closePath(); fs(g, bc[0], '#7a1a14', 1); g.save(); g.clip(); g.fillStyle = bc[1]; g.fillRect(-7, hy - 8.6, 14, 1.6); g.fillStyle = bc[2]; g.fillRect(-7, hy - 10.6, 14, 1.6); g.restore(); rr(g, -6.7, hy - 5.4, 13.4, 2.6, 1.2); fs(g, '#fff', '#8a8a9a', 0.9); fcirc(g, 0, hy - 12.8, 1.9, '#fff', '#8a8a9a', 0.8); }
    else if (outfit === 'lava') { g.beginPath(); g.moveTo(-6.6, hy - 4.2); g.quadraticCurveTo(-6.8, hy - 11.8, 0, hy - 11.8); g.quadraticCurveTo(6.8, hy - 11.8, 6.6, hy - 4.2); g.closePath(); fs(g, '#ffd23a', '#9a6a10', 1); ell(g, 0, hy - 4.3, 8, 1.7); fs(g, '#f0b82a', '#9a6a10', 0.9); fcirc(g, 0, hy - 8.4, 1.9, '#fff', '#5a4a2a', 0.9); fcirc(g, 0, hy - 8.4, 1.1, '#fff2a0'); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.45; g.beginPath(); g.moveTo(1.2, hy - 9.6); g.lineTo(15, hy - 14.5); g.lineTo(15, hy - 1.5); g.lineTo(1.2, hy - 7.2); g.closePath(); g.fillStyle = '#c8a040'; g.fill(); g.restore(); goggles('#ffb347', '#5a3a1a'); }
    else if (outfit === 'himmel') { g.beginPath(); g.moveTo(-6.6, hy - 2.4); g.quadraticCurveTo(-6.8, hy - 12, 0, hy - 12); g.quadraticCurveTo(6.8, hy - 12, 6.6, hy - 2.4); g.lineTo(6.2, hy + 1.6); g.quadraticCurveTo(5.5, hy + 3.2, 4.4, hy + 1.4); g.lineTo(4.2, hy - 3.4); g.quadraticCurveTo(0, hy - 6, -4.2, hy - 3.4); g.lineTo(-4.4, hy + 1.4); g.quadraticCurveTo(-5.5, hy + 3.2, -6.2, hy + 1.6); g.closePath(); fs(g, '#8a5a2b', '#4a2a0f', 1); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(-5.5, hy - 8); g.quadraticCurveTo(0, hy - 10.5, 5.5, hy - 8); g.stroke(); goggles('#bfe2ff', '#3a2a1a'); }
    g.restore();
    /* ---- raised arms in front of the head, coffee ---- */
    if (raisedB) capsule(g, -4.3, -8.8, 4.8, 2.7, aB, shade(fur, -0.08), paw, ol);
    if (raisedF) capsule(g, 4.3, -8.8, 4.8, 2.7, aF, fur, paw, ol);
    if (o.coffee) { g.save(); g.translate(4.3 + Math.sin(aF) * 4.8, -8.8 + Math.cos(aF) * 4.8); rr(g, -2, -2, 4, 4, 1); fs(g, '#fff', '#8a6a4a', 0.8); g.fillStyle = '#6b3f1d'; rr(g, -1.4, -1.4, 2.8, 1.3, 0.4); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 0.9; g.beginPath(); g.arc(2.4, 0, 1.2, -1.3, 1.3); g.stroke(); g.restore(); }
    /* ---- Pookie's bow ---- */
    if (o.bow) { g.save(); g.translate(4.6, hy - 5.6); g.rotate(-0.35); for (const d of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(d * 2.6, -3.6, d * 4.6, -1.2); g.quadraticCurveTo(d * 3.8, 1.6, 0, 0); g.closePath(); fs(g, '#ff6f9c', '#c9305f', 0.7); } fcirc(g, 0, 0, 1.25, '#ffb3c6', '#c9305f', 0.6); g.restore(); if (white) { fcirc(g, -4.9, hy - 5.2, 0.9, '#ffd84a'); for (let i = 0; i < 5; i++) fcirc(g, -4.9 + Math.cos(i * 1.257) * 1.5, hy - 5.2 + Math.sin(i * 1.257) * 1.5, 0.75, '#fff'); fcirc(g, -4.9, hy - 5.2, 0.6, '#ffd84a'); } }
    g.restore();
  }
  function drawBearAt(g, x, y, o) { bearRenderer(o)(g, x, y, o || {}); }
  /* legacy signature used by the game, the tower window and the pookie entity */
  function drawBear(x, y, big, frame, facing, jumping, white, bow, sx, sy, gliding, poseOverride) {
    const p = P(), s = S(), fr = s.frames, t = fr / 60, isP = !white;
    let pose = 'idle', speed = 0;
    if (isP) {
      if (p.dead) pose = 'dead'; else if (p.victory) pose = 'victory'; else if (p.skydive) pose = 'skydive'; else if (p.launch > 0) pose = 'launch'; else if (p.pound) pose = 'pound'; else if (p.jetting) pose = 'jet'; else if (p.wallSlide) pose = 'wall'; else if (p.climbing) pose = 'climb'; else if (gliding) pose = 'glide'; else if (!p.onGround && !G.goalSeq) pose = p.vy < 0 ? 'jump' : 'fall'; else if (Math.abs(p.vx) > 0.1 || (G.goalSeq && Math.abs(frame) > 0.01)) pose = 'run';
      speed = G.goalSeq ? 0.45 : clamp(Math.abs(p.vx) / 2.6, 0, 1);
    } else { pose = poseOverride || (Math.abs(frame) > 0.01 ? 'run' : 'idle'); speed = pose === 'run' ? 0.35 : 0; }
    if (poseOverride) pose = poseOverride;
    const outfit = isP ? (s.outfit || (L() && L().world && L().world.key) || 'wiese') : null;
    bearRenderer(null)(ctx, x + 6, y + (big ? 24 : 14), {scale: big ? 1.4 : 1, facing, frame, pose, speed, vx: isP ? p.vx : 0, vy: isP ? (p.vy || 0) : 0, outfit, white, bow, t, sx, sy, coffee: isP && p.coffee, wings: isP && p.wings, gliding, deadT: isP ? p.deathT : 0, pal: (isP && G.fx && G.fx.palette) ? G.fx.palette(G.P, fr) : null});
  }

  /* ================= "cool" style: minimal and bold (default) ================= */
  function capPath(g, x, y, len, w, rot) { g.save(); g.translate(x, y); g.rotate(-rot); rr(g, -w / 2, -w * 0.25, w, len + w * 0.25, w / 2); g.restore(); }
  function pawCap(g, x, y, len, w, rot, col) { g.save(); g.translate(x, y); g.rotate(-rot); ell(g, 0, len - w * 0.12, w * 0.42, w * 0.3); g.fillStyle = col; g.fill(); g.restore(); }
  function clothPoly(g, pts, w0, w1, col, ol, lw) { const n = pts.length; g.beginPath(); for (let i = 0; i < n; i++) { const [px, py] = pts[i], [qx, qy] = pts[Math.min(n - 1, i + 1)], [rx2, ry2] = pts[Math.max(0, i - 1)]; let dx = qx - rx2, dy = qy - ry2; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; const w = lerp(w0, w1, i / (n - 1)) / 2; const ax = px - dy * w, ay = py + dx * w; if (i === 0) g.moveTo(ax, ay); else g.lineTo(ax, ay); } for (let i = n - 1; i >= 0; i--) { const [px, py] = pts[i], [qx, qy] = pts[Math.min(n - 1, i + 1)], [rx2, ry2] = pts[Math.max(0, i - 1)]; let dx = qx - rx2, dy = qy - ry2; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; const w = lerp(w0, w1, i / (n - 1)) / 2; g.lineTo(px + dy * w, py - dx * w); } g.closePath(); g.fillStyle = col; g.fill(); g.strokeStyle = ol; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke(); }
  function renderBearCool(g, x, y, o) {
    const sc = o.scale || 1, f = o.facing || 1, pose = o.pose || 'idle', t = o.t || 0, fr = o.frame || 0, sp = clamp(o.speed || 0, 0, 1), white = !!o.white, pal = o.pal, outfit = white ? null : (o.outfit || 'wiese');
    const fur = (pal && pal.fur) || (white ? '#fff8f0' : '#b9834a'), dark = (pal && pal.dark) || (white ? '#efdcd0' : '#9a6838'), muz = (pal && pal.belly) || (white ? '#fffdf8' : '#edd2a2'), ol = (pal && pal.outline) || (white ? '#8a6a5a' : '#3a2414'), earIn = (pal && pal.ear) || (white ? '#ffb8c8' : '#9a6838');
    const lw = 1.3 / Math.sqrt(sc), upF = clamp((o.vy || 0) / 6, 0, 1), vyN = clamp(-(o.vy || 0) / 6, 0, 1);
    let ssx = o.sx || 1, ssy = o.sy || 1; ssx = 1 + (ssx - 1) * 1.3; ssy = 1 + (ssy - 1) * 1.3;
    g.save(); g.translate(x, y); g.scale(f * sc * ssx, sc * ssy); g.lineJoin = 'round'; g.lineCap = 'round';
    let rot = 0, dy = 0, pivot = 0;
    if (pose === 'run') rot = 0.38 * sp; else if (pose === 'jet') rot = 0.5; else if (pose === 'wall') rot = -0.1; else if (pose === 'launch') { rot = 1.15; pivot = -9; } else if (pose === 'skydive') { rot = Math.PI / 2 - 0.12; pivot = -9; } else if (pose === 'pound') { rot = fr * 0.55; pivot = -8; } else if (pose === 'dead') rot = Math.min(0.5, (o.deadT || 0.4) * 1.2); else if (pose === 'sad') dy = 0.5;
    if (pose === 'victory') dy = -Math.abs(Math.sin(t * 7)) * 2; if (pose === 'run') dy = -Math.abs(Math.cos(fr)) * 0.7 * sp;
    g.translate(0, dy + pivot); g.rotate(rot); g.translate(0, -pivot);
    const breath = pose === 'idle' ? Math.sin(t * 2.2) * 0.025 : 0, tuck = pose === 'pound';
    /* limb angles */
    let aF = -0.1, aB = 0.1, lF = 0, lB = 0, legLen = 3.3, armLen = 3.9;
    const sw = Math.sin(fr);
    if (pose === 'run') { lF = sw * 1.25; lB = -sw * 1.25; aF = -sw * 1.35 - 0.15; aB = sw * 1.35 - 0.15; }
    else if (pose === 'jump') { aF = 2.45; aB = -2.45; lF = 0.8; lB = 0.8; legLen = 2.6; }
    else if (pose === 'fall') { aF = 1.45; aB = -1.45; lF = 0.3; lB = -0.3; }
    else if (pose === 'glide') { aF = 1.3; aB = -1.3; lF = 0.15; lB = -0.15; }
    else if (pose === 'skydive') { aF = 1.9; aB = -1.9; lF = 0.6; lB = -0.6; }
    else if (pose === 'victory') { aF = 2.4 + Math.sin(t * 10) * 0.2; aB = -2.4 - Math.sin(t * 10 + 1) * 0.2; }
    else if (pose === 'wall') { aF = 2.3; aB = 1.2; lF = 0.5; lB = 0.2; legLen = 2.8; }
    else if (tuck) { aF = 1.6; aB = -1.6; lF = 1.3; lB = 1.3; legLen = 2.2; armLen = 2.6; }
    else if (pose === 'jet') { aF = -1.3; aB = -1.5; lF = -0.6; lB = -0.75; }
    else if (pose === 'launch') { aF = 2.75; aB = -2.75; lF = -0.1; lB = 0.1; }
    else if (pose === 'climb') { const c = Math.sin(fr * 1.5); aF = 2.4 + c * 0.5; aB = -2.4 + c * 0.5; lF = 0.4 + c * 0.4; lB = 0.4 - c * 0.4; }
    else if (pose === 'dead') { aF = 0.35; aB = -0.35; }
    const raisedF = Math.abs(aF) > 1.45, raisedB = Math.abs(aB) > 1.45;
    let eyes = o.mood || 'cool';
    if (!o.mood) { if (pose === 'fall' || pose === 'launch') eyes = 'wide'; else if (pose === 'jump' || pose === 'victory' || pose === 'glide') eyes = 'happy'; else if (pose === 'dead') eyes = 'dead'; else if (pose === 'sad') eyes = 'sad'; else if (pose === 'skydive') eyes = 'squint'; }
    if ((t % 3.9) < 0.1 && (eyes === 'cool' || eyes === 'wide')) eyes = 'blink';
    const flap = pose === 'run' ? Math.sin(fr + 1) * 0.9 * sp : (pose === 'fall' || pose === 'skydive' ? 0.8 : (pose === 'jump' ? -0.6 : 0)), earDrop = pose === 'sad' ? 0.8 : 0;
    const hx = 0.3, hy = -16.9 + (pose === 'sad' ? 0.6 : 0), hr = 6.6, bx = 0, by = -8.0, brx = 6.2, bry = 6.2 * (1 + breath);
    const phase = fr * 1.6 + t * 9, airy = pose === 'jump' || pose === 'fall' || pose === 'skydive' || pose === 'launch' || pose === 'glide';
    /* ---- cloth behind ---- */
    if (outfit === 'himmel') { const pts = trailPts(-2.5, -11.5, sp * 0.8 + (airy ? 0.5 : 0), upF, 9 + sp * 3, phase, 1.6, 4); clothPoly(g, pts, 5.5, 9, '#4a66d8', ol, lw); g.fillStyle = '#ffe94a'; starPath(g, pts[2][0], pts[2][1], 1.7, 0.7, 5); g.fill(); starPath(g, pts[3][0] - 1.5, pts[3][1] + 1.2, 1.2, 0.5, 5); g.fill(); }
    if (outfit === 'wiese' || outfit === 'schnee') { const pts = trailPts(-4.2, -11, sp * 0.85 + (airy ? 0.55 : 0), upF + (pose === 'jump' ? vyN * 0.6 : 0), 8.5 + sp * 4.5, phase, 1.2 + sp, 4); clothPoly(g, pts, 3.6, 1.8, outfit === 'schnee' ? '#4a7ad8' : '#e23a3a', ol, lw); if (outfit === 'schnee') { g.fillStyle = '#fff'; fcirc(g, pts[3][0], pts[3][1], 0.9); fcirc(g, pts[2][0], pts[2][1], 0.9); } }
    if (o.gliding) { const fl = Math.sin(fr * 2 + t * 12) * 0.35; wingG(g, -3, -10, 12, -0.4 + fl, 0.95); g.save(); g.scale(-1, 1); wingG(g, -3, -10, 12, -0.4 + fl, 0.95); g.restore(); } else if (o.wings) wingG(g, -3.5, -11.5, 6, -1.1, 0.9);
    /* ---- silhouette: outline pass then fill pass ---- */
    const shapes = [];
    if (!raisedB) shapes.push(() => capPath(g, -5.3, -10.4, armLen, 3.4, aB));
    shapes.push(() => capPath(g, -3.2, -4.4, legLen, 4, lB));
    shapes.push(() => capPath(g, 3.2, -4.4, legLen, 4, lF));
    shapes.push(() => ell(g, bx, by, brx, bry));
    shapes.push(() => circ(g, hx, hy, hr));
    shapes.push(() => circ(g, hx - 5.2, hy - 5 + flap + earDrop, 2.4)); shapes.push(() => circ(g, hx + 5.2, hy - 5 - flap * 0.6 + earDrop, 2.4));
    g.lineWidth = lw * 2; g.strokeStyle = ol; g.fillStyle = ol; for (const s of shapes) { s(); g.fill(); g.stroke(); }
    g.fillStyle = fur; for (const s of shapes) { s(); g.fill(); }
    /* paws, belly, inner ears */
    if (!raisedB) pawCap(g, -5.3, -10.4, armLen, 3.4, aB, dark);
    pawCap(g, -3.2, -4.4, legLen, 4, lB, dark); pawCap(g, 3.2, -4.4, legLen, 4, lF, dark);
    g.strokeStyle = ol; g.lineWidth = lw * 0.8; capPath(g, 3.2, -4.4, legLen, 4, lF); g.stroke();
    ell(g, bx + 0.4, by + 1.6, 3.9, 3.4 * (1 + breath)); g.fillStyle = dark; g.fill();
    fcirc(g, hx - 5.2, hy - 5 + flap + earDrop, 1.2, earIn); fcirc(g, hx + 5.2, hy - 5 - flap * 0.6 + earDrop, 1.2, earIn);
    /* ---- scarf collar ---- */
    if (outfit === 'wiese' || outfit === 'schnee') { ell(g, hx, hy + 5.6, 6.6, 2.1); fs(g, outfit === 'schnee' ? '#4a7ad8' : '#e23a3a', ol, lw * 0.85); if (outfit === 'schnee') { g.fillStyle = '#fff'; g.fillRect(hx - 2.6, hy + 4.1, 1.5, 3); g.fillRect(hx + 1.2, hy + 4, 1.5, 3); } }
    /* ---- face ---- */
    const puff = pose === 'skydive';
    if (puff) { fcirc(g, hx - 4.4, hy + 2.2, 2.4, fur, ol, lw * 0.8); fcirc(g, hx + 5.6, hy + 2.4, 2.4, fur, ol, lw * 0.8); }
    ell(g, hx + 1.4, hy + 2.3, puff ? 3.9 : 3.4, 2.4); g.fillStyle = muz; g.fill();
    ell(g, hx + 1.9, hy + 1.3, 1.2, 0.85); g.fillStyle = ol; g.fill();
    g.strokeStyle = ol; g.lineWidth = lw * 0.75; g.beginPath();
    if (eyes === 'happy') { g.moveTo(hx + 0.2, hy + 3.2); g.quadraticCurveTo(hx + 2.4, hy + 4.9, hx + 4.3, hy + 2.9); g.stroke(); g.beginPath(); g.moveTo(hx + 0.6, hy + 3.4); g.quadraticCurveTo(hx + 2.4, hy + 4.6, hx + 4, hy + 3.1); g.closePath(); g.fillStyle = '#4a2020'; g.fill(); }
    else if (eyes === 'wide') { g.stroke(); ell(g, hx + 2.4, hy + 3.6, 0.9, 1.1); g.fillStyle = '#4a2020'; g.fill(); }
    else if (eyes === 'sad' || eyes === 'dead') { g.moveTo(hx + 0.5, hy + 3.9); g.quadraticCurveTo(hx + 2.3, hy + 2.6, hx + 4, hy + 3.7); g.stroke(); }
    else if (puff) { g.moveTo(hx + 1, hy + 3.5); g.lineTo(hx + 3.4, hy + 3.5); g.stroke(); }
    else { g.moveTo(hx + 0.6, hy + 3.3); g.quadraticCurveTo(hx + 2.4, hy + 4.2, hx + 4.2, hy + 3); g.stroke(); }
    const ex = 2.6, ey = hy - 1.3;
    for (const d of [-1, 1]) {
      const cx = hx + d * ex + 0.3;
      if (eyes === 'dead') { g.strokeStyle = ol; g.lineWidth = lw; g.beginPath(); g.moveTo(cx - 1.2, ey - 1.2); g.lineTo(cx + 1.2, ey + 1.2); g.moveTo(cx + 1.2, ey - 1.2); g.lineTo(cx - 1.2, ey + 1.2); g.stroke(); continue; }
      if (eyes === 'happy') { g.strokeStyle = ol; g.lineWidth = lw; g.beginPath(); g.moveTo(cx - 1.5, ey + 0.6); g.quadraticCurveTo(cx, ey - 1.7, cx + 1.5, ey + 0.6); g.stroke(); continue; }
      if (eyes === 'blink') { g.strokeStyle = ol; g.lineWidth = lw; g.beginPath(); g.moveTo(cx - 1.4, ey + 0.2); g.lineTo(cx + 1.4, ey + 0.2); g.stroke(); continue; }
      const wide = eyes === 'wide', rx = wide ? 1.45 : 1.1, ry = wide ? 1.9 : 1.45;
      ell(g, cx, ey, rx, ry); g.fillStyle = ol; g.fill();
      fcirc(g, cx + 0.4 * (f > 0 ? 1 : 1) - 0.1, ey - ry * 0.4, wide ? 0.55 : 0.42, '#fff');
      if (eyes === 'cool' || eyes === 'squint' || eyes === 'sad') { const lid = eyes === 'squint' ? 0.55 : (eyes === 'sad' ? 0.4 : 0.42); g.save(); ell(g, cx, ey, rx + 0.3, ry + 0.3); g.clip(); g.fillStyle = fur; g.fillRect(cx - 3, ey - 3, 6, 3 - ry + ry * 2 * lid); g.restore(); g.strokeStyle = ol; g.lineWidth = lw * 0.7; g.beginPath(); const ly = ey - ry + ry * 2 * lid; if (eyes === 'sad') { g.moveTo(cx - d * 1.4, ly - 0.5); g.lineTo(cx + d * 1.4, ly + 0.4); } else { g.moveTo(cx - 1.4, ly); g.lineTo(cx + 1.4, ly); } g.stroke(); }
    }
    if (white && eyes !== 'dead' && eyes !== 'blink') { g.strokeStyle = ol; g.lineWidth = lw * 0.6; for (const d of [-1, 1]) { const cx = hx + d * ex + 0.3; g.beginPath(); g.moveTo(cx + d * 1.2, ey - 1.5); g.lineTo(cx + d * 2, ey - 2.3); g.stroke(); } }
    /* ---- headgear ---- */
    const tilt = pose === 'jump' ? -0.18 : (pose === 'fall' ? 0.14 : (pose === 'run' ? -0.08 * sp : 0)), goggDown = pose === 'jet' || pose === 'skydive' || pose === 'launch';
    g.save(); g.translate(hx, hy); g.rotate(tilt); g.translate(-hx, -hy);
    if (outfit === 'insel') { ell(g, hx, hy - 4.8, 10.5, 2.5); fs(g, '#f2d26a', ol, lw * 0.85); g.beginPath(); g.moveTo(hx - 5.6, hy - 5); g.quadraticCurveTo(hx - 5.8, hy - 12.4, hx, hy - 12.4); g.quadraticCurveTo(hx + 5.8, hy - 12.4, hx + 5.6, hy - 5); g.closePath(); fs(g, '#f6dc7a', ol, lw * 0.85); g.fillStyle = '#e23a3a'; g.fillRect(hx - 5.5, hy - 8, 11, 1.8); for (const d of [-1, 1]) { rr(g, hx + d * ex + 0.3 - 2.2, ey - 1.5, 4.4, 3.2, 1.4); fs(g, '#1e1626', ol, lw * 0.7); fcirc(g, hx + d * ex - 0.5, ey - 0.7, 0.55, 'rgba(255,255,255,.6)'); } g.strokeStyle = ol; g.lineWidth = lw * 0.8; g.beginPath(); g.moveTo(hx - 0.3, ey - 0.5); g.lineTo(hx + 0.9, ey - 0.5); g.stroke(); }
    else if (outfit === 'dschungel') { ell(g, hx, hy - 4.4, 9.6, 2.3); fs(g, '#dfcc92', ol, lw * 0.85); g.beginPath(); g.moveTo(hx - 6, hy - 4.6); g.quadraticCurveTo(hx - 6.2, hy - 12.8, hx, hy - 12.8); g.quadraticCurveTo(hx + 6.2, hy - 12.8, hx + 6, hy - 4.6); g.closePath(); fs(g, '#eadbb0', ol, lw * 0.85); g.fillStyle = '#6a5a2a'; g.fillRect(hx - 5.9, hy - 7.6, 11.8, 1.6); }
    else if (outfit === 'schnee') { g.beginPath(); g.moveTo(hx - 6.8, hy - 2.6); g.quadraticCurveTo(hx - 7, hy - 13.2, hx, hy - 13.4); g.quadraticCurveTo(hx + 7, hy - 13.2, hx + 6.8, hy - 2.6); g.closePath(); fs(g, '#e8443a', ol, lw * 0.85); g.save(); g.clip(); g.fillStyle = '#fff'; g.fillRect(hx - 8, hy - 9.6, 16, 2); g.restore(); rr(g, hx - 7.1, hy - 5, 14.2, 3, 1.4); fs(g, '#fff', ol, lw * 0.85); fcirc(g, hx, hy - 13.6, 2.3, '#fff', ol, lw * 0.85); }
    else if (outfit === 'lava') { g.beginPath(); g.moveTo(hx - 6.6, hy - 4.4); g.quadraticCurveTo(hx - 6.8, hy - 12.6, hx, hy - 12.6); g.quadraticCurveTo(hx + 6.8, hy - 12.6, hx + 6.6, hy - 4.4); g.closePath(); fs(g, '#ffd23a', ol, lw * 0.85); ell(g, hx, hy - 4.4, 8.8, 2); fs(g, '#f0b82a', ol, lw * 0.85); fcirc(g, hx + 0.8, hy - 9, 2.1, '#fff', ol, lw * 0.8); fcirc(g, hx + 0.8, hy - 9, 1.1, '#fff2a0'); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.45; g.beginPath(); g.moveTo(hx + 2.4, hy - 10.4); g.lineTo(hx + 17, hy - 15.5); g.lineTo(hx + 17, hy - 2.5); g.lineTo(hx + 2.4, hy - 7.6); g.closePath(); g.fillStyle = '#c8a040'; g.fill(); g.restore(); if (goggDown) { for (const d of [-1, 1]) { fcirc(g, hx + d * ex + 0.3, ey, 2.6, 'rgba(255,170,60,.4)', ol, lw * 0.8); } g.strokeStyle = ol; g.lineWidth = lw * 0.8; g.beginPath(); g.moveTo(hx - 0.2, ey - 0.4); g.lineTo(hx + 0.8, ey - 0.4); g.stroke(); } else { g.strokeStyle = ol; g.lineWidth = lw * 0.9; g.beginPath(); g.moveTo(hx - 6.2, hy - 5.4); g.quadraticCurveTo(hx, hy - 7.2, hx + 6.2, hy - 5.4); g.stroke(); for (const d of [-1, 1]) fcirc(g, hx + d * 2.3, hy - 6.4, 1.8, '#ffb347', ol, lw * 0.8); } }
    else if (outfit === 'himmel') { g.beginPath(); g.moveTo(hx - 6.9, hy - 2); g.quadraticCurveTo(hx - 7.1, hy - 12.6, hx, hy - 12.6); g.quadraticCurveTo(hx + 7.1, hy - 12.6, hx + 6.9, hy - 2); g.lineTo(hx + 6.4, hy + 2.6); g.quadraticCurveTo(hx + 5.4, hy + 4.4, hx + 4.4, hy + 2.2); g.lineTo(hx + 4.4, hy - 2.4); g.quadraticCurveTo(hx, hy - 5.4, hx - 4.4, hy - 2.4); g.lineTo(hx - 4.4, hy + 2.2); g.quadraticCurveTo(hx - 5.4, hy + 4.4, hx - 6.4, hy + 2.6); g.closePath(); fs(g, '#8a5a2b', ol, lw * 0.85); g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = lw * 0.6; g.beginPath(); g.moveTo(hx - 5.5, hy - 8.4); g.quadraticCurveTo(hx, hy - 11, hx + 5.5, hy - 8.4); g.stroke(); }
    g.restore();
    /* ---- front arm (and raised back arm) ---- */
    const arm = (sx, a, col) => { g.strokeStyle = ol; g.lineWidth = lw * 2; g.fillStyle = ol; capPath(g, sx, -10.4, armLen, 3.4, a); g.fill(); g.stroke(); g.fillStyle = col; capPath(g, sx, -10.4, armLen, 3.4, a); g.fill(); pawCap(g, sx, -10.4, armLen, 3.4, a, dark); };
    if (raisedB) arm(-5.3, aB, fur);
    arm(5.3, aF, fur);
    if (o.coffee) { g.save(); g.translate(5.3 + Math.sin(aF) * armLen, -10.4 + Math.cos(aF) * armLen); rr(g, -2.2, -2.2, 4.4, 4.4, 1.1); fs(g, '#fff', ol, lw * 0.7); g.fillStyle = '#6b3f1d'; rr(g, -1.5, -1.5, 3, 1.4, 0.4); g.fill(); g.strokeStyle = ol; g.lineWidth = lw * 0.7; g.beginPath(); g.arc(2.7, 0, 1.3, -1.3, 1.3); g.stroke(); g.restore(); }
    /* ---- Pookie's bow ---- */
    if (o.bow) { g.save(); g.translate(hx + 4.8, hy - 6); g.rotate(-0.35); for (const d of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(d * 2.8, -4, d * 5, -1.3); g.quadraticCurveTo(d * 4.2, 1.8, 0, 0); g.closePath(); fs(g, '#ff6f9c', ol, lw * 0.7); } fcirc(g, 0, 0, 1.4, '#ffb3c6', ol, lw * 0.6); g.restore(); }
    g.restore();
  }
  function bearRenderer(o) { const st = (o && o.style) || (G.S && G.S.bearStyle) || 'cool'; return st === 'abenteurer' ? renderBear : renderBearCool; }

  /* ================= creatures, hazards, platforms, items ================= */
  const DK = '#2a1b12';
  function spikes(x, y, r, n, len, col, outline, rot) { for (let i = 0; i < n; i++) { const a = (rot || 0) + i * TAU / n, a0 = a - 0.22, a1 = a + 0.22; ctx.beginPath(); ctx.moveTo(x + Math.cos(a0) * r, y + Math.sin(a0) * r); ctx.lineTo(x + Math.cos(a) * (r + len), y + Math.sin(a) * (r + len)); ctx.lineTo(x + Math.cos(a1) * r, y + Math.sin(a1) * r); ctx.closePath(); fs(ctx, col, outline, 0.9); } }
  function feet(x, y, an, col, outline, spread) { const s = spread || 3.5, st = Math.sin(an * 6) * 1.2; limb(x - s, y + 0.5, 2.4, 1.3, st * 0.1, col, outline); limb(x + s, y + 0.5, 2.4, 1.3, -st * 0.1, col, outline); }
  function angryFace(x, y, w, blink, col, mouthW) { eye(ctx, x - w, y, 1.1, blink, col); eye(ctx, x + w, y, 1.1, blink, col); brows(ctx, x, y - 1.6, w + 1.2, col, false); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - (mouthW || 1.6), y + 3.4); ctx.quadraticCurveTo(x, y + 2.4, x + (mouthW || 1.6), y + 3.4); ctx.stroke(); }
  function happyFace(x, y, w, blink, col) { eye(ctx, x - w, y, 1.1, blink, col); eye(ctx, x + w, y, 1.1, blink, col); smile(ctx, x, y + 2.4, 1.6, col, false); ctx.globalAlpha = 0.5; fcirc(ctx, x - w - 1.6, y + 1.6, 1, '#ff8fa8'); fcirc(ctx, x + w + 1.6, y + 1.6, 1, '#ff8fa8'); ctx.globalAlpha = 1; }
  function batWing(x, y, s, flap, col, outline, fire) { ctx.save(); ctx.translate(x, y); ctx.rotate(flap); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-s * 0.5, -s * 0.9, -s, -s * 0.5); ctx.quadraticCurveTo(-s * 0.8, -s * 0.1, -s * 0.72, s * 0.1); ctx.quadraticCurveTo(-s * 0.55, -s * 0.1, -s * 0.4, s * 0.25); ctx.quadraticCurveTo(-s * 0.25, 0.05 * s, 0, s * 0.3); ctx.closePath(); fs(ctx, col, outline, 0.9); if (fire) { ctx.globalAlpha = 0.8; fcirc(ctx, -s * 0.95, -s * 0.5, 1.6, '#ffd24a'); ctx.globalAlpha = 1; } ctx.restore(); }
  const LOOK = {
    drop(e, x, y, an, fr, dir, sd) { const sq = 1 + Math.sin(an * 6) * 0.05; ctx.save(); ctx.translate(x + 7, y + 14); ctx.scale(1 / sq, sq); ctx.translate(-(x + 7), -(y + 14)); feet(x + 7, y + 13, an, '#7a9a3a', '#4a6a1a'); ctx.beginPath(); ctx.moveTo(x + 7, y - 1); ctx.quadraticCurveTo(x + 14, y + 6, x + 13, y + 9); ctx.arc(x + 7, y + 8.5, 6, 0.1, Math.PI - 0.1); ctx.quadraticCurveTo(x, y + 6, x + 7, y - 1); ctx.closePath(); ctx.fillStyle = lin(ctx, 'dropg', 0, -1, 0, 14, [0, '#e2f9a0', 1, '#a8d848']); ctx.save(); ctx.translate(x, y); ctx.fill(); ctx.restore(); ctx.strokeStyle = '#5a7a1a'; ctx.lineWidth = 1; ctx.stroke(); fell(ctx, x + 4.5, y + 5.5, 1.4, 2.2, 'rgba(255,255,255,.6)'); angryFace(x + 7, y + 8, 2.3, blinkAt(fr, sd), DK); ctx.restore(); },
    crab(e, x, y, an, fr, dir, sd) { const st = Math.sin(an * 7); ctx.strokeStyle = '#c43a1f'; ctx.lineWidth = 1.6; for (let i = 0; i < 3; i++) for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + 7 + d * 3, y + 10); ctx.lineTo(x + 7 + d * (7 + i * 1.5), y + 12 + (i % 2 ? st : -st) * 1.2 + i); ctx.stroke(); } fell(ctx, x + 7, y + 9.5, 6.4, 4.2, lin(ctx, 'crabg', 0, 5, 0, 14, [0, '#ff8a6a', 1, '#e04a2a']), '#8a2a10', 1); for (const d of [-1, 1]) { const cy2 = y + 6 + (d > 0 ? st : -st) * 1; fcirc(ctx, x + 7 + d * 8, cy2, 3, '#ff6a4a', '#8a2a10', 1); ctx.fillStyle = '#ffd7c8'; ctx.beginPath(); ctx.moveTo(x + 7 + d * 8, cy2 - 0.5); ctx.lineTo(x + 7 + d * 10.5, cy2 - 2.5); ctx.lineTo(x + 7 + d * 10.5, cy2 + 1); ctx.closePath(); ctx.fill(); } for (const d of [-1, 1]) { ctx.strokeStyle = '#8a2a10'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 7 + d * 2.5, y + 6); ctx.lineTo(x + 7 + d * 3, y + 2.5); ctx.stroke(); eye(ctx, x + 7 + d * 3, y + 2, 1.3, blinkAt(fr, sd), DK); } ctx.strokeStyle = DK; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x + 5.5, y + 10.5); ctx.lineTo(x + 8.5, y + 10.5); ctx.stroke(); },
    beetle(e, x, y, an, fr, dir, sd) { ctx.strokeStyle = '#1a2a5a'; ctx.lineWidth = 1.2; const st = Math.sin(an * 8); for (let i = 0; i < 3; i++) for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + 7 + d * 3, y + 10); ctx.lineTo(x + 7 + d * (6 + i * 1.2), y + 13.5 + (i % 2 ? st : -st) * 0.8); ctx.stroke(); } fell(ctx, x + 7, y + 8.5, 6.2, 5, lin(ctx, 'beetleg', 0, 3, 0, 14, [0, '#7aa8ff', 1, '#3a5ac8']), '#1a2a5a', 1); ctx.strokeStyle = '#1a2a5a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x + 7, y + 4); ctx.lineTo(x + 7, y + 13.3); ctx.stroke(); fell(ctx, x + 4.5, y + 6, 1.6, 1, 'rgba(255,255,255,.55)'); fcirc(ctx, x + 7 + dir * 5.5, y + 6.5, 3, '#2a3a7a', '#1a2a5a', 1); eye(ctx, x + 7 + dir * 6.5, y + 6, 1, blinkAt(fr, sd), '#fff'); fcirc(ctx, x + 7 + dir * 6.5 + 0.2, y + 6.1, 0.5, DK); ctx.strokeStyle = '#1a2a5a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x + 7 + dir * 6, y + 4); ctx.quadraticCurveTo(x + 7 + dir * 8, y + 1, x + 7 + dir * 10, y + 1.5); ctx.moveTo(x + 7 + dir * 5, y + 3.8); ctx.quadraticCurveTo(x + 7 + dir * 6, y, x + 7 + dir * 8, y - 0.5); ctx.stroke(); },
    penguin(e, x, y, an, fr, dir, sd) { ctx.save(); ctx.translate(x + 7, y + 14); ctx.rotate(Math.sin(an * 6) * 0.08); ctx.translate(-(x + 7), -(y + 14)); limb(x + 4.5, y + 13.5, 2.6, 1.2, 0, '#ffb347', '#b8762a'); limb(x + 9.5, y + 13.5, 2.6, 1.2, 0, '#ffb347', '#b8762a'); fell(ctx, x + 7, y + 8, 5.4, 6.4, lin(ctx, 'peng', 0, 1, 0, 14, [0, '#3a3a5a', 1, '#1e1e30']), '#10101e', 1); fell(ctx, x + 7, y + 9, 3.4, 4.4, '#fff'); for (const d of [-1, 1]) limb(x + 7 + d * 5.5, y + 8, 1.4, 3.2, d * (0.3 + Math.sin(an * 6) * 0.25), '#2a2a44', '#10101e'); fell(ctx, x + 7, y + 4.6, 3.6, 2.4, '#fff'); eye(ctx, x + 5.5, y + 4.4, 0.95, blinkAt(fr, sd), DK); eye(ctx, x + 8.5, y + 4.4, 0.95, blinkAt(fr, sd), DK); ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(x + 5.6, y + 5.8); ctx.lineTo(x + 8.4, y + 5.8); ctx.lineTo(x + 7, y + 7.4); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 0.5; fcirc(ctx, x + 3.6, y + 6, 0.9, '#ff8fa8'); fcirc(ctx, x + 10.4, y + 6, 0.9, '#ff8fa8'); ctx.globalAlpha = 1; ctx.restore(); },
    lavablob(e, x, y, an, fr, dir, sd) { ctx.globalAlpha = 0.6; blit(glow('#ff7a2a', 14), x - 7, y - 6); ctx.globalAlpha = 1; const wob = Math.sin(an * 5); blobPath(ctx, x + 0.5, y + 2 + wob * 0.4, 13, 12 - wob * 0.4, sd); fs(ctx, lin(ctx, 'lavab', 0, 2, 0, 14, [0, '#ffd24a', 0.4, '#ff8a2a', 1, '#d04a10']), '#7a1a00', 1); for (let i = 0; i < 3; i++) { const fl = 1 + Math.sin(an * 9 + i * 2) * 0.4; fell(ctx, x + 4 + i * 3, y + 1.5 - fl * 1.6, 1.3, 2.2 * fl, '#ffd24a'); } angryFace(x + 7, y + 8, 2.2, false, '#3a0a00', 1.4); },
    cloudling(e, x, y, an, fr, dir, sd) { feet(x + 7, y + 13, an, '#b8b8d0', '#7a7a9a'); ctx.fillStyle = '#f4f4fb'; puffs(ctx, x, y + 1, 14, 11.5); ctx.strokeStyle = '#8a8ab0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + 4, y + 7.5, 3.8, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(x + 7.3, y + 5.2, 4.3, Math.PI * 1.05, Math.PI * 1.95); ctx.arc(x + 10.6, y + 7.4, 3.4, Math.PI * 1.5, Math.PI * 0.5); ctx.closePath(); ctx.stroke(); ctx.fillStyle = 'rgba(160,160,200,.35)'; ell(ctx, x + 7, y + 11.5, 6, 1.6); ctx.fill(); angryFace(x + 7, y + 7.5, 2.1, blinkAt(fr, sd), '#4a4a6a', 1.3); },
    bee(e, x, y, an, fr, dir, sd) { const fl = Math.sin(an * 14) * 0.6; for (const d of [-1, 1]) { ctx.save(); ctx.translate(x + 7 + d * 1.5, y + 3.5); ctx.rotate(d * (0.5 + fl)); ctx.globalAlpha = 0.75; fell(ctx, d * 3, -1.5, 4, 2, '#ffffff', '#b0c4de', 0.7); ctx.restore(); ctx.globalAlpha = 1; } fell(ctx, x + 7, y + 7.5, 5.8, 4.4, '#ffd23a', '#5a4a10', 1); ctx.save(); ell(ctx, x + 7, y + 7.5, 5.8, 4.4); ctx.clip(); ctx.fillStyle = '#2a2a2a'; ctx.fillRect(x + 4.5, y + 2, 2, 11); ctx.fillRect(x + 8.5, y + 2, 2, 11); ctx.restore(); ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.moveTo(x + 7 - dir * 5.5, y + 6.5); ctx.lineTo(x + 7 - dir * 8.5, y + 7.5); ctx.lineTo(x + 7 - dir * 5.5, y + 8.5); ctx.closePath(); ctx.fill(); eye(ctx, x + 7 + dir * 3.6, y + 6.5, 1, blinkAt(fr, sd), DK); ctx.strokeStyle = DK; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x + 7 + dir * 3, y + 3.5); ctx.quadraticCurveTo(x + 7 + dir * 4, y + 1, x + 7 + dir * 6, y + 0.5); ctx.stroke(); smile(ctx, x + 7 + dir * 3.5, y + 9, 1, DK, false); },
    gull(e, x, y, an, fr, dir, sd) { const fl = Math.sin(an * 9); for (const d of [-1, 1]) { ctx.save(); ctx.translate(x + 7 + d * 2, y + 6); ctx.rotate(d * fl * 0.6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(d * 4, -4, d * 9, -2 + fl); ctx.quadraticCurveTo(d * 5, 0.5, 0, 2); ctx.closePath(); fs(ctx, '#fff', '#9aa8b8', 0.9); ctx.restore(); } fell(ctx, x + 7, y + 7, 5, 3.8, lin(ctx, 'gullg', 0, 3, 0, 11, [0, '#ffffff', 1, '#e4ebf2']), '#9aa8b8', 1); fcirc(ctx, x + 7 + dir * 4.2, y + 5.2, 2.6, '#fff', '#9aa8b8', 1); ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(x + 7 + dir * 6.4, y + 4.8); ctx.lineTo(x + 7 + dir * 9.2, y + 5.8); ctx.lineTo(x + 7 + dir * 6.4, y + 6.6); ctx.closePath(); ctx.fill(); eye(ctx, x + 7 + dir * 4.6, y + 4.6, 0.8, blinkAt(fr, sd), DK); },
    parrot(e, x, y, an, fr, dir, sd) { const fl = Math.sin(an * 9); ctx.fillStyle = '#4a8ad8'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + 7 - dir * 3, y + 8); ctx.lineTo(x + 7 - dir * (8 + i), y + 9 + i * 2); ctx.lineTo(x + 7 - dir * 3, y + 10); ctx.closePath(); ctx.fill(); } for (const d of [-1, 1]) { ctx.save(); ctx.translate(x + 7 + d * 2, y + 6); ctx.rotate(d * fl * 0.6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(d * 4, -4, d * 8.5, -2 + fl); ctx.quadraticCurveTo(d * 5, 0.5, 0, 2); ctx.closePath(); fs(ctx, '#2f9e5b', '#1a5a30', 0.9); ctx.restore(); } fell(ctx, x + 7, y + 7, 5, 4.2, lin(ctx, 'parg', 0, 3, 0, 11, [0, '#ff6a5a', 1, '#d82a2a']), '#7a1a1a', 1); fell(ctx, x + 7, y + 8.5, 2.8, 2, '#ffd23a'); fcirc(ctx, x + 7 + dir * 4, y + 4.6, 2.8, '#e8403a', '#7a1a1a', 1); ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.moveTo(x + 7 + dir * 6.2, y + 3.8); ctx.quadraticCurveTo(x + 7 + dir * 9.5, y + 4.5, x + 7 + dir * 7.5, y + 7); ctx.lineTo(x + 7 + dir * 6, y + 6); ctx.closePath(); fs(ctx, '#ffd23a', '#9a7a10', 0.8); eye(ctx, x + 7 + dir * 4.6, y + 4, 0.9, blinkAt(fr, sd), DK); fcirc(ctx, x + 7 + dir * 4.6, y + 4, 1.5, null, '#fff', 0.6); },
    owl(e, x, y, an, fr, dir, sd) { const fl = Math.sin(an * 7); for (const d of [-1, 1]) { ctx.save(); ctx.translate(x + 7 + d * 3, y + 6); ctx.rotate(d * fl * 0.5); fell(ctx, d * 3.5, 0.5, 4, 2.2, '#c9bfe8', '#6a5a9a', 0.9); ctx.restore(); } fell(ctx, x + 7, y + 7, 5.4, 5.2, lin(ctx, 'owlg', 0, 2, 0, 12, [0, '#f4f0ff', 1, '#c9bfe8']), '#6a5a9a', 1); ctx.fillStyle = '#6a5a9a'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + 7 + d * 2.5, y + 3); ctx.lineTo(x + 7 + d * 5, y - 0.5); ctx.lineTo(x + 7 + d * 5, y + 4); ctx.closePath(); ctx.fill(); } fell(ctx, x + 7, y + 9.5, 2.8, 2.2, '#e9e0ff'); for (const d of [-1, 1]) { fcirc(ctx, x + 7 + d * 2.4, y + 5.5, 2.2, '#fff', '#6a5a9a', 0.8); eye(ctx, x + 7 + d * 2.4, y + 5.6, 1.3, blinkAt(fr, sd), '#2a1b4a'); } ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(x + 6, y + 7.4); ctx.lineTo(x + 8, y + 7.4); ctx.lineTo(x + 7, y + 9.2); ctx.closePath(); ctx.fill(); },
    bat(e, x, y, an, fr, dir, sd, fire) { const col = fire ? '#e0452a' : '#6a4ab0', ol = fire ? '#7a1a0a' : '#2a1a5a', fl = Math.sin(an * 11) * 0.7; batWing(x + 7 - 2, y + 7, 7.5, fl, col, ol, fire); ctx.save(); ctx.translate(x + 14, 0); ctx.scale(-1, 1); batWing(5, y + 7, 7.5, fl, col, ol, fire); ctx.restore(); fcirc(ctx, x + 7, y + 7, 3.8, col, ol, 1); ctx.fillStyle = col; for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + 7 + d * 1.5, y + 4); ctx.lineTo(x + 7 + d * 3.5, y + 1); ctx.lineTo(x + 7 + d * 3.8, y + 5); ctx.closePath(); fs(ctx, col, ol, 0.8); } eye(ctx, x + 5.5, y + 6.5, 0.9, blinkAt(fr, sd), fire ? '#ffd84a' : '#fff'); eye(ctx, x + 8.5, y + 6.5, 0.9, blinkAt(fr, sd), fire ? '#ffd84a' : '#fff'); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + 5.8, y + 8.6); ctx.lineTo(x + 6.6, y + 10.2); ctx.lineTo(x + 7.2, y + 8.6); ctx.moveTo(x + 7.6, y + 8.6); ctx.lineTo(x + 8.2, y + 10.2); ctx.lineTo(x + 8.8, y + 8.6); ctx.fill(); if (fire) { ctx.globalAlpha = 0.5; blit(glow('#ff7a2a', 12), x - 5, y - 5); ctx.globalAlpha = 1; } },
    firebat(e, x, y, an, fr, dir, sd) { LOOK.bat(e, x, y, an, fr, dir, sd, true); },
    spikyBall(e, x, y, an, fr, dir, sd, c1, c2, n, len, extra) { const rot = an * 0.5 * -dir; feet(x + 7, y + 13, an, c2, shade(c2, -0.4)); spikes(x + 7, y + 7.5, 4.6, n || 9, len || 3, c2, shade(c2, -0.45), rot); fcirc(ctx, x + 7, y + 7.5, 5.2, lin(ctx, 'spk' + c1, 0, 2, 0, 13, [0, shade(c1, 0.25), 1, shade(c1, -0.15)]), shade(c2, -0.45), 1); if (extra) extra(); angryFace(x + 7, y + 7, 2, blinkAt(fr, sd), shade(c2, -0.6), 1.3); },
    spiky(e, x, y, an, fr, dir, sd) { LOOK.spikyBall(e, x, y, an, fr, dir, sd, '#8fd36a', '#3f7a2a', 9, 3); },
    urchin(e, x, y, an, fr, dir, sd) { LOOK.spikyBall(e, x, y, an, fr, dir, sd, '#3a3a5a', '#1a1a2e', 12, 4.2); },
    thornball(e, x, y, an, fr, dir, sd) { LOOK.spikyBall(e, x, y, an, fr, dir, sd, '#8a5a2b', '#4a2a0f', 8, 3.5); },
    iceball(e, x, y, an, fr, dir, sd) { LOOK.spikyBall(e, x, y, an, fr, dir, sd, '#bfe2ff', '#5aa0d0', 8, 3.5, () => { fell(ctx, x + 5, y + 5.5, 1.6, 0.9, 'rgba(255,255,255,.8)'); }); },
    magmarock(e, x, y, an, fr, dir, sd) { ctx.globalAlpha = 0.45 + Math.sin(an * 4) * 0.15; blit(glow('#ff7a2a', 14), x - 7, y - 6); ctx.globalAlpha = 1; LOOK.spikyBall(e, x, y, an, fr, dir, sd, '#5a2a1a', '#8a2a0a', 8, 3.5, () => { ctx.strokeStyle = '#ff9a2a'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x + 3, y + 8); ctx.lineTo(x + 5.5, y + 10); ctx.lineTo(x + 8, y + 9); ctx.moveTo(x + 9, y + 4); ctx.lineTo(x + 10.5, y + 6.5); ctx.stroke(); }); },
    thunderball(e, x, y, an, fr, dir, sd) { if ((fr + Math.floor(sd * 10)) % 6 < 3) { ctx.globalAlpha = 0.5; blit(glow('#ffe94a', 14), x - 7, y - 6); ctx.globalAlpha = 1; } LOOK.spikyBall(e, x, y, an, fr, dir, sd, '#f6cc3a', '#6a4ab0', 8, 3.5, () => { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 4.5, y + 4); ctx.lineTo(x + 6, y + 6.5); ctx.lineTo(x + 4.8, y + 7); ctx.lineTo(x + 6.2, y + 9.5); ctx.stroke(); }); },
    snapper(e, x, y, an, fr, dir, sd) { const open = (Math.sin(an * 4) + 1) * 0.5 * 4; ctx.strokeStyle = '#3f9a4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 14, y + 16); ctx.quadraticCurveTo(x + 15, y + 10, x + 14, y + 5); ctx.stroke(); for (const d of [-1, 1]) { ctx.save(); ctx.translate(x + 14, y + 10); ctx.rotate(d * 0.4); fell(ctx, d * 4, 0, 4.5, 2, '#5fcf6a', '#2f7a3a', 0.9); ctx.restore(); } ctx.save(); ctx.translate(x + 14, y + 3); rr(ctx, -8, -4, 16, 5 + open * 0.3, 4); fs(ctx, '#e04a7a', '#8a1a3a', 1); rr(ctx, -8, 1 + open * 0.3, 16, 4, 3); fs(ctx, '#e04a7a', '#8a1a3a', 1); ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-6 + i * 4, 0.8 + open * 0.3); ctx.lineTo(-4 + i * 4, 2.6 + open * 0.3); ctx.lineTo(-2 + i * 4, 0.8 + open * 0.3); ctx.closePath(); ctx.fill(); } fcirc(ctx, -4, -2, 1.5, '#fff'); fcirc(ctx, 4, -2.5, 1.2, '#fff'); fcirc(ctx, 1, 0.5, 0.9, '#fff'); eye(ctx, -2.5, -1.5, 1, blinkAt(fr, sd), DK); eye(ctx, 2.5, -1.5, 1, blinkAt(fr, sd), DK); ctx.restore(); },
    cloudHazard(e, x, y, an, fr, dir, sd, col, ol, kind) { ctx.fillStyle = col; puffs(ctx, x + 2, y - 3, 24, 13); ctx.fillStyle = shade(col, -0.12); ell(ctx, x + 14, y + 9, 10, 2); ctx.fill(); if (kind === 'frost') { ctx.fillStyle = '#bfe2ff'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + 5 + i * 6, y + 9); ctx.lineTo(x + 6.5 + i * 6, y + 14 + (i % 2) * 2); ctx.lineTo(x + 8 + i * 6, y + 9); ctx.closePath(); ctx.fill(); } } if (kind === 'storm') { if (Math.sin(an * 7) > 0.6) { ctx.fillStyle = '#ffe94a'; ctx.beginPath(); ctx.moveTo(x + 13, y + 8); ctx.lineTo(x + 17, y + 8); ctx.lineTo(x + 14.5, y + 12); ctx.lineTo(x + 17.5, y + 12); ctx.lineTo(x + 12.5, y + 19); ctx.lineTo(x + 14, y + 13.5); ctx.lineTo(x + 11.5, y + 13.5); ctx.closePath(); ctx.fill(); } angryFace(x + 14, y + 3.5, 2.6, blinkAt(fr, sd), '#fff', 1.6); } else { eye(ctx, x + 11.4, y + 3.5, 1.1, blinkAt(fr, sd), ol); eye(ctx, x + 16.6, y + 3.5, 1.1, blinkAt(fr, sd), ol); smile(ctx, x + 14, y + 6, 1.6, ol, kind === 'frost'); ctx.globalAlpha = 0.5; fcirc(ctx, x + 9, y + 5.5, 1.1, '#ff8fa8'); fcirc(ctx, x + 19, y + 5.5, 1.1, '#ff8fa8'); ctx.globalAlpha = 1; } },
    cloud(e, x, y, an, fr, dir, sd) { if (e.kind === 'pipeHazard') LOOK.cloudHazard(e, x, y, an, fr, dir, sd, '#f4f4fb', '#6a6a8a', 'cloud'); else LOOK.cloudPlatform(e, x, y, an, fr); },
    frost(e, x, y, an, fr, dir, sd) { LOOK.cloudHazard(e, x, y, an, fr, dir, sd, '#e4f6ff', '#4a7aa0', 'frost'); },
    storm(e, x, y, an, fr, dir, sd) { LOOK.cloudHazard(e, x, y, an, fr, dir, sd, '#5a5a7a', '#fff', 'storm'); },
    geyser(e, x, y, an, fr, dir, sd) { ctx.globalAlpha = 0.6; blit(glow('#ff9a2a', 20), x - 6, y - 10); ctx.globalAlpha = 1; for (let i = 0; i < 3; i++) { const fl = 1 + Math.sin(an * 10 + i * 2.1) * 0.25, w = [6, 4, 3][i], hgt = [20, 15, 10][i] * fl; ctx.beginPath(); ctx.moveTo(x + 14 - w, y + 14); ctx.quadraticCurveTo(x + 14 - w * 0.6, y + 14 - hgt * 0.6, x + 14, y + 14 - hgt); ctx.quadraticCurveTo(x + 14 + w * 0.6, y + 14 - hgt * 0.6, x + 14 + w, y + 14); ctx.closePath(); ctx.fillStyle = ['#ff6a1a', '#ffb03a', '#fff2a0'][i]; ctx.fill(); } for (let i = 0; i < 4; i++) { const t = (an * 3 + i * 1.6) % 1; fcirc(ctx, x + 6 + i * 6 + Math.sin(an * 5 + i) * 2, y + 10 - t * 14, 1.2 + (1 - t), '#ffd24a'); } },
    cookie(e, x, y, an, fr) { rr(ctx, x, y - 2, 40, 12, 5); fs(ctx, lin(ctx, 'cookieg', 0, -2, 0, 10, [0, '#f0c088', 1, '#c98a4a']), '#7a4a1a', 1); ctx.fillStyle = 'rgba(255,255,255,.3)'; rr(ctx, x + 3, y - 0.5, 34, 2.6, 1.3); ctx.fill(); ctx.fillStyle = '#5a3a1a'; fcirc(ctx, x + 7, y + 2, 1.5); fcirc(ctx, x + 18, y + 5, 1.6); fcirc(ctx, x + 29, y + 1.5, 1.4); fcirc(ctx, x + 35, y + 6, 1.1); fcirc(ctx, x + 12, y + 7, 1.1); },
    raft(e, x, y, an, fr) { for (let i = 0; i < 4; i++) { rr(ctx, x + i * 10 + 0.5, y, 9.5, 9, 2.5); fs(ctx, lin(ctx, 'raftg', 0, 0, 0, 9, [0, '#e0a868', 1, '#a86a30']), '#6a4a1a', 1); ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(x + i * 10 + 3, y + 2, 1, 5); } ctx.strokeStyle = '#f2d9a6'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x, y + 4.5); ctx.lineTo(x + 40, y + 4.5); ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 0.6; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x + 3 + i * 7, y + 3); ctx.lineTo(x + 5 + i * 7, y + 6); ctx.stroke(); } },
    log(e, x, y, an, fr) { rr(ctx, x, y, 40, 10, 5); fs(ctx, lin(ctx, 'logg', 0, 0, 0, 10, [0, '#c9915a', 0.5, '#9a6a3a', 1, '#6a4a2a']), '#4a2a0f', 1); ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 0.8; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + 6 + i * 9, y + 2); ctx.quadraticCurveTo(x + 9 + i * 9, y + 5, x + 7 + i * 9, y + 8); ctx.stroke(); } fell(ctx, x + 4, y + 5, 2.8, 4, '#e6c38e', '#6a4a2a', 0.8); fcirc(ctx, x + 4, y + 5, 1.2, null, '#b89060', 0.7); fell(ctx, x + 36, y + 5, 2.8, 4, '#e6c38e', '#6a4a2a', 0.8); fcirc(ctx, x + 36, y + 5, 1.2, null, '#b89060', 0.7); },
    floe(e, x, y, an, fr) { ctx.beginPath(); ctx.moveTo(x + 2, y); ctx.lineTo(x + 38, y + 0.5); ctx.lineTo(x + 40, y + 4); ctx.lineTo(x + 36, y + 10); ctx.lineTo(x + 5, y + 10); ctx.lineTo(x, y + 5); ctx.closePath(); fs(ctx, lin(ctx, 'floeg', 0, 0, 0, 10, [0, '#ffffff', 0.5, '#dff3ff', 1, '#9fd0f0']), '#7fb8e6', 1); ctx.strokeStyle = 'rgba(90,160,210,.4)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x + 12, y + 1); ctx.lineTo(x + 15, y + 5); ctx.lineTo(x + 13, y + 9); ctx.moveTo(x + 27, y + 2); ctx.lineTo(x + 25, y + 6); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.8)'; rr(ctx, x + 4, y + 1.5, 10, 1.5, 0.7); ctx.fill(); },
    lavarock(e, x, y, an, fr) { const pulse = 0.5 + Math.sin(an * 3) * 0.3; ctx.globalAlpha = pulse; ctx.fillStyle = '#ff7a2a'; rr(ctx, x + 2, y + 6, 36, 6, 3); ctx.fill(); ctx.globalAlpha = 1; ctx.beginPath(); ctx.moveTo(x + 1, y + 2); ctx.lineTo(x + 8, y); ctx.lineTo(x + 20, y + 1); ctx.lineTo(x + 33, y); ctx.lineTo(x + 39, y + 3); ctx.lineTo(x + 37, y + 9); ctx.lineTo(x + 3, y + 9); ctx.closePath(); fs(ctx, lin(ctx, 'lrg', 0, 0, 0, 10, [0, '#6a5a5a', 1, '#3a2a2e']), '#1a0a0a', 1); ctx.strokeStyle = rgba('#ff9a2a', pulse); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 10, y + 3); ctx.lineTo(x + 14, y + 6); ctx.lineTo(x + 19, y + 4); ctx.moveTo(x + 26, y + 2); ctx.lineTo(x + 29, y + 6); ctx.stroke(); },
    cloudPlatform(e, x, y, an, fr) { ctx.fillStyle = '#fff'; puffs(ctx, x, y - 4, 40, 14); ctx.fillStyle = '#e6ddfb'; ell(ctx, x + 20, y + 8, 18, 2.4); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.9)'; ell(ctx, x + 12, y - 1, 5, 2); ctx.fill(); },
    monkey(e, x, y, an, fr, dir, sd) { const up = e.t < 0.35; ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + 7 - dir * 4, y + 12); ctx.quadraticCurveTo(x + 7 - dir * 10, y + 12, x + 7 - dir * 9, y + 5 + Math.sin(an * 3)); ctx.stroke(); feet(x + 7, y + 13, 0, '#5a3a1a', '#3a2a0f'); fell(ctx, x + 7, y + 9.5, 5, 4.5, '#8a5a2b', '#4a2a0f', 1); fell(ctx, x + 7, y + 10, 3, 2.6, '#e4c38e'); for (const d of [-1, 1]) fcirc(ctx, x + 7 + d * 5.5, y + 4.5, 2, '#8a5a2b', '#4a2a0f', 1); fcirc(ctx, x + 7, y + 5, 5, '#8a5a2b', '#4a2a0f', 1); ctx.fillStyle = '#e4c38e'; ctx.beginPath(); ctx.arc(x + 5.2, y + 5.4, 2.3, 0, TAU); ctx.arc(x + 8.8, y + 5.4, 2.3, 0, TAU); ctx.fill(); fell(ctx, x + 7, y + 7.2, 2.8, 1.8, '#e4c38e'); eye(ctx, x + 5.2, y + 5, 0.8, blinkAt(fr, sd), DK); eye(ctx, x + 8.8, y + 5, 0.8, blinkAt(fr, sd), DK); smile(ctx, x + 7, y + 7.4, 1.2, DK, false); limb(x + 7 + dir * 5.5, y + 8 - (up ? 4 : 0), 1.3, 2.6, dir * (up ? 2.6 : 0.6), '#8a5a2b', '#4a2a0f'); if (up) fcirc(ctx, x + 7 + dir * 6.5, y + 2.5, 2.6, '#6b4a2a', '#3a2a0f', 0.8); },
    snowman(e, x, y, an, fr, dir, sd) { const up = e.t < 0.35; fcirc(ctx, x + 7, y + 9.5, 5, '#fff', '#b8c8da', 1); fcirc(ctx, x + 7, y + 3.5, 3.8, '#fff', '#b8c8da', 1); ctx.fillStyle = '#2a2a3a'; rr(ctx, x + 2.5, y - 1, 9, 1.6, 0.8); ctx.fill(); rr(ctx, x + 4.5, y - 6, 5, 5.5, 1); ctx.fill(); ctx.fillStyle = '#ff6f9c'; rr(ctx, x + 3.5, y - 2.4, 7, 1.2, 0.6); ctx.fill(); eye(ctx, x + 5.6, y + 3, 0.8, blinkAt(fr, sd), DK); eye(ctx, x + 8.4, y + 3, 0.8, blinkAt(fr, sd), DK); ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(x + 7, y + 4); ctx.lineTo(x + 7 + dir * 4, y + 4.8); ctx.lineTo(x + 7, y + 5.4); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#ff6f9c'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x + 3.5, y + 6.5); ctx.quadraticCurveTo(x + 7, y + 8.5, x + 10.5, y + 6.5); ctx.stroke(); ctx.fillStyle = DK; fcirc(ctx, x + 7, y + 9, 0.7); fcirc(ctx, x + 7, y + 11.5, 0.7); ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x + 7 - dir * 4, y + 9); ctx.lineTo(x + 7 - dir * 9, y + 10); ctx.moveTo(x + 7 + dir * 4, y + 9); ctx.lineTo(x + 7 + dir * 8, y + (up ? 2 : 10)); ctx.stroke(); if (up) fcirc(ctx, x + 7 + dir * 8.5, y + 0.5, 2.6, '#fff', '#b8c8da', 0.8); },
    cannon(e, x, y, an, fr, dir, sd) { const p = P(), aim = p.x + 6 < x + 7 ? -1 : 1, fuse = e.t < 0.3; fcirc(ctx, x + 3.5, y + 11.5, 2.6, '#4a3a3a', '#1a0a0a', 1); fcirc(ctx, x + 10.5, y + 11.5, 2.6, '#4a3a3a', '#1a0a0a', 1); ctx.save(); ctx.translate(x + 7, y + 8); ctx.rotate(aim * -0.5); rr(ctx, -5, -4, 14, 8, 3.5); fs(ctx, lin(ctx, 'cang', 0, -4, 0, 4, [0, '#8a8a9a', 1, '#3a3a4a']), '#1a1a2a', 1); fell(ctx, 9, 0, 1.6, 3.2, '#1a1a2a'); ctx.restore(); fcirc(ctx, x + 7, y + 8, 3.6, '#5a5a6a', '#1a1a2a', 1); ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 7 - aim * 3, y + 5); ctx.quadraticCurveTo(x + 7 - aim * 5, y + 2, x + 7 - aim * 4, y); ctx.stroke(); if (fuse && (fr % 4) < 2) { starPath(ctx, x + 7 - aim * 4, y - 0.5, 2.4, 1, 4); ctx.fillStyle = '#ffd84a'; ctx.fill(); } },
    fish(e, x, y, an, fr, dir, sd) { const up = e.vy < 0, rot = e.state === 'air' ? (up ? -1.2 : 1.2) : 0; ctx.save(); ctx.translate(x + 7, y + 7); ctx.rotate(rot); ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-5, -2.6); ctx.lineTo(-5, 2.6); ctx.closePath(); fs(ctx, '#3a8ae0', '#1a4a8a', 0.9); fell(ctx, 0, 0, 5.8, 3.8, lin(ctx, 'fishg', 0, -4, 0, 4, [0, '#6ab8ff', 1, '#2a6ac8']), '#1a4a8a', 1); fell(ctx, 0.5, 1.2, 3.6, 1.8, '#bfe6ff'); ctx.beginPath(); ctx.moveTo(-1, -3); ctx.lineTo(1.5, -6); ctx.lineTo(3, -3.2); ctx.closePath(); fs(ctx, '#3a8ae0', '#1a4a8a', 0.8); eye(ctx, 3, -1, 0.9, false, DK); ctx.restore(); },
    fireball(e, x, y, an, fr, dir, sd) { ctx.globalAlpha = 0.6; blit(glow('#ff9a2a', 16), x - 9, y - 9); ctx.globalAlpha = 1; const up = e.vy < 0; ctx.save(); ctx.translate(x + 7, y + 7); if (!up) ctx.scale(1, -1); for (let i = 0; i < 3; i++) { const fl = 1 + Math.sin(an * 12 + i * 2) * 0.2; ctx.beginPath(); ctx.moveTo(-5 + i * 1.6, 2); ctx.quadraticCurveTo(-4 + i * 1.3, 8 * fl, 0, 12 * fl - i * 3); ctx.quadraticCurveTo(4 - i * 1.3, 8 * fl, 5 - i * 1.6, 2); ctx.closePath(); ctx.fillStyle = ['#ff6a1a', '#ffb03a', '#fff2a0'][i]; ctx.fill(); } fcirc(ctx, 0, 0, 5.5, lin(ctx, 'fbg', 0, -5, 0, 5, [0, '#fff2a0', 0.5, '#ffb03a', 1, '#ff6a1a']), '#c43a0a', 1); ctx.restore(); angryFace(x + 7, y + 6.5, 1.8, false, '#7a1a00', 1.2); },
    icicle(e, x, y, an, fr, dir, sd) { ctx.beginPath(); ctx.moveTo(x + 1, y); ctx.lineTo(x + 13, y); ctx.lineTo(x + 11, y + 6); ctx.lineTo(x + 8, y + 18); ctx.lineTo(x + 6, y + 9); ctx.lineTo(x + 4, y + 7); ctx.closePath(); fs(ctx, lin(ctx, 'icig', 0, 0, 0, 18, [0, '#ffffff', 0.4, '#dff3ff', 1, '#8fc8f0']), '#6aa8d8', 1); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.moveTo(x + 3, y + 1); ctx.lineTo(x + 5, y + 1); ctx.lineTo(x + 7, y + 10); ctx.closePath(); ctx.fill(); if (e.state === 'warn') { ctx.globalAlpha = 0.6 + Math.sin(fr) * 0.3; starPath(ctx, x + 11, y + 3, 2.4, 0.9, 4); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1; } },
    thwomp(e, x, y, an, fr, dir, sd) { const warn = e.state === 'warn' || e.state === 'fall'; rr(ctx, x - 2, y, 18, 20, 3); fs(ctx, lin(ctx, 'thwg', 0, 0, 0, 20, [0, '#8a8aa8', 1, '#4a4a6a']), '#2a2a3a', 1.2); ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - 1 + i * 4, y + 20); ctx.lineTo(x + 1 + i * 4, y + 17); ctx.lineTo(x + 3 + i * 4, y + 20); ctx.stroke(); } ctx.fillStyle = 'rgba(255,255,255,.25)'; rr(ctx, x, y + 2, 14, 2, 1); ctx.fill(); const ec = warn ? '#ff4a4a' : '#ffe94a'; eye(ctx, x + 3.5, y + 8, 1.5, false, ec); eye(ctx, x + 10.5, y + 8, 1.5, false, ec); brows(ctx, x + 7, y + 5.5, 4.5, '#1a1a2a', false); ctx.strokeStyle = '#1a1a2a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 3.5, y + 14); ctx.lineTo(x + 10.5, y + 14); ctx.stroke(); if (warn) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + 4.5, y + 14); ctx.lineTo(x + 5.5, y + 16); ctx.lineTo(x + 6.5, y + 14); ctx.moveTo(x + 7.5, y + 14); ctx.lineTo(x + 8.5, y + 16); ctx.lineTo(x + 9.5, y + 14); ctx.fill(); } },
    coconut(e, x, y, an, fr) { ctx.save(); ctx.translate(x + 4, y + 4); ctx.rotate(an * 2); fcirc(ctx, 0, 0, 3.8, lin(ctx, 'cocg', -4, -4, 4, 4, [0, '#8a6a4a', 1, '#4a2a10']), '#2a1a08', 1); fcirc(ctx, -1.2, -1, 0.7, '#2a1a08'); fcirc(ctx, 1.2, -1, 0.7, '#2a1a08'); fcirc(ctx, 0, 1, 0.7, '#2a1a08'); ctx.restore(); },
    snowball(e, x, y, an, fr) { fcirc(ctx, x + 4, y + 4, 3.8, lin(ctx, 'snbg', -2, -2, 6, 6, [0, '#ffffff', 1, '#c8dcf0']), '#9ab8d8', 1); fcirc(ctx, x + 2.8, y + 2.8, 1, 'rgba(255,255,255,.9)'); },
    cookieshot(e, x, y, an, fr) { ctx.save(); ctx.translate(x + 4, y + 4); ctx.rotate(an * 2); fcirc(ctx, 0, 0, 4, lin(ctx, 'cksg', -4, -4, 4, 4, [0, '#f0c088', 1, '#c98a4a']), '#7a4a1a', 1); fcirc(ctx, -1.5, -1, 0.8, '#5a3a1a'); fcirc(ctx, 1.5, 0.5, 0.8, '#5a3a1a'); fcirc(ctx, -0.5, 2, 0.6, '#5a3a1a'); ctx.restore(); },
  };
  function drawItem(e, x, y, fr) {
    const bob = Math.sin(fr * 0.1 + x * 0.1) * 1;
    if (e.kind === 'bean') { ctx.save(); ctx.translate(x + 3, y + 3); ctx.rotate(fr * 0.3); fell(ctx, 0, 0, 3.4, 2.4, '#6b3f1d', '#3a2010', 0.8); ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-2, -0.4); ctx.quadraticCurveTo(0, 1.2, 2, -0.4); ctx.stroke(); ctx.restore(); return; }
    ctx.globalAlpha = 0.5; blit(glow(e.kind === 'milk' ? '#8fd3ff' : (e.kind === 'coffee' ? '#ffb3c6' : '#ffe08a'), 16), x - 9, y - 9 + bob); ctx.globalAlpha = 1;
    if (e.kind === 'milk') { rr(ctx, x + 3, y + 4 + bob, 8, 10, 2.5); fs(ctx, lin(ctx, 'milkg', 3, 0, 11, 0, [0, '#ffffff', 1, '#e4eef8']), '#7fb8e6', 1); rr(ctx, x + 4.5, y + 1 + bob, 5, 3.5, 1.2); fs(ctx, '#8fd3ff', '#4a90c0', 0.9); rr(ctx, x + 4, y + 7 + bob, 6, 4, 1.2); ctx.fillStyle = '#8fd3ff'; ctx.fill(); heartPath(ctx, x + 7, y + 9.2 + bob, 1.3); ctx.fillStyle = '#fff'; ctx.fill(); }
    else if (e.kind === 'coffee') { rr(ctx, x + 1.5, y + 5 + bob, 9.5, 8, 2.5); fs(ctx, lin(ctx, 'cupg', 1, 0, 11, 0, [0, '#ffffff', 1, '#eaeaf2']), '#9a8a8a', 1); ctx.strokeStyle = '#9a8a8a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x + 11.5, y + 9 + bob, 2.2, -1.3, 1.3); ctx.stroke(); ctx.fillStyle = '#6b3f1d'; rr(ctx, x + 2.5, y + 5.5 + bob, 7.5, 2.2, 1); ctx.fill(); heartPath(ctx, x + 6.3, y + 10.2 + bob, 1.6); ctx.fillStyle = '#ff6f9c'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(x + 4.5 + i * 3.5, y + 3.5 + bob); ctx.quadraticCurveTo(x + 6 + i * 3.5 + Math.sin(fr * 0.1 + i) * 1, y + 1 + bob, x + 4.5 + i * 3.5, y - 1.5 + bob); ctx.stroke(); } }
    else if (e.kind === 'feather') { ctx.save(); ctx.translate(x + 7, y + 7 + bob); ctx.rotate(-0.5 + Math.sin(fr * 0.08) * 0.15); ctx.beginPath(); ctx.moveTo(0, -7); ctx.quadraticCurveTo(5, -3, 2, 6); ctx.quadraticCurveTo(0, 7, -2, 6); ctx.quadraticCurveTo(-5, -3, 0, -7); ctx.closePath(); fs(ctx, lin(ctx, 'feag', -4, 0, 4, 0, [0, '#ffe9a8', 0.5, '#ffd84a', 1, '#f0b43a']), '#c98a1a', 0.9); ctx.strokeStyle = '#c98a1a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 7); ctx.stroke(); ctx.restore(); }
  }
  function drawBoss(e, x, y, an, fr) {
    const b = L().world.boss, key = L().world.key, fl = e.flash > 0 && Math.floor(e.flash * 20) % 2 === 0, c1 = fl ? '#fff' : b.a, c2 = fl ? '#fff' : b.b, ol = fl ? '#fff' : shade(b.b, -0.4), rage = e.hp < e.maxHp;
    if (!e.alive) { const t = Math.max(0, e.dieT), s = Math.max(0.05, 1 - t * 0.8); ctx.save(); ctx.translate(x + 15, y + 30); ctx.rotate(t * 3); ctx.scale(s, s); ctx.translate(-15, -30); fell(ctx, 15, 15, 14, 14, c1, ol, 1); ctx.restore(); return; }
    const blink = blinkAt(fr, 0.3), dir = e.dir || -1;
    ctx.save();
    if (e.look === 'hopper') {
      const sq = e.onGround && e.landed ? 0.86 : (e.vy < -1 ? 1.08 : 1); ctx.translate(x + 15, y + 30); ctx.scale(2 - sq, sq); ctx.translate(-15, -30);
      limb(8, 28.5, 4, 2.2, 0, c2, ol); limb(22, 28.5, 4, 2.2, 0, c2, ol);
      if (key === 'wiese') { ctx.beginPath(); ctx.moveTo(15, -4); ctx.quadraticCurveTo(29, 10, 28, 17); ctx.arc(15, 16, 13, 0.05, Math.PI - 0.05); ctx.quadraticCurveTo(1, 10, 15, -4); ctx.closePath(); fs(ctx, lin(ctx, 'bossg' + c1, 0, -4, 0, 30, [0, shade(c1, 0.25), 1, shade(c1, -0.15)]), ol, 1.3); fell(ctx, 9, 10, 2.6, 4, 'rgba(255,255,255,.55)'); }
      else { fell(ctx, 15, 15, 14.5, 14.5, lin(ctx, 'bossg' + c1, 0, 0, 0, 30, [0, shade(c1, 0.25), 1, shade(c1, -0.15)]), ol, 1.3); }
      if (key === 'dschungel') { for (const d of [-1, 1]) fcirc(ctx, 15 + d * 14, 8, 4, c1, ol, 1); ctx.fillStyle = '#e4c38e'; ctx.beginPath(); ctx.arc(10, 14, 5, 0, TAU); ctx.arc(20, 14, 5, 0, TAU); ctx.fill(); fell(ctx, 15, 19, 6, 4, '#e4c38e'); ctx.strokeStyle = ol; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(26, 24); ctx.quadraticCurveTo(36, 22, 34, 12 + Math.sin(an * 2) * 3); ctx.stroke(); }
      if (key === 'schnee') { fell(ctx, 15, 16, 9, 8, '#9fb8d8'); ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(4 + i * 5.5, 2); ctx.lineTo(6.5 + i * 5.5, -3 - (i % 2) * 2); ctx.lineTo(9 + i * 5.5, 2); ctx.closePath(); ctx.fill(); } ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(10, 21); ctx.lineTo(11.5, 24.5); ctx.lineTo(13, 21); ctx.moveTo(17, 21); ctx.lineTo(18.5, 24.5); ctx.lineTo(20, 21); ctx.fill(); }
      eye(ctx, 9.5, 12, 2.1, blink, DK); eye(ctx, 20.5, 12, 2.1, blink, DK); brows(ctx, 15, 8.5, 7.5, DK, false);
      ctx.strokeStyle = DK; ctx.lineWidth = 1.4; ctx.beginPath(); if (rage) { ctx.moveTo(10, 22); ctx.quadraticCurveTo(15, 18, 20, 22); ctx.moveTo(12, 20.2); ctx.lineTo(13, 22.4); ctx.moveTo(18, 20.2); ctx.lineTo(17, 22.4); } else { ctx.moveTo(11, 21); ctx.quadraticCurveTo(15, 23, 19, 21); } ctx.stroke();
      ctx.globalAlpha = 0.5; fcirc(ctx, 5, 16, 2, '#ff8fa8'); fcirc(ctx, 25, 16, 2, '#ff8fa8'); ctx.globalAlpha = 1;
      crown(15, -1, 7);
    } else if (e.look === 'charger') {
      const st = Math.sin(an * 10), charging = e.phase === 'charge';
      ctx.translate(x + 15, y + 30); if (charging) ctx.rotate(-dir * 0.08); ctx.translate(-15, -30);
      for (let i = 0; i < 3; i++) for (const d of [-1, 1]) { ctx.strokeStyle = ol; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(15 + d * 6, 24); ctx.lineTo(15 + d * (12 + i * 3), 29 + ((i % 2) ? st : -st) * 1.5); ctx.stroke(); }
      if (key === 'insel') {
        fell(ctx, 15, 19, 14.5, 9.5, lin(ctx, 'bossg' + c1, 0, 8, 0, 30, [0, shade(c1, 0.25), 1, shade(c1, -0.2)]), ol, 1.3);
        for (const d of [-1, 1]) { const cy2 = 13 + (d > 0 ? st : -st) * 1.5 + (charging ? -3 : 0); fcirc(ctx, 15 + d * 17, cy2, 6, c1, ol, 1.2); ctx.fillStyle = '#ffd7c8'; ctx.beginPath(); ctx.moveTo(15 + d * 17, cy2 - 1); ctx.lineTo(15 + d * 22, cy2 - 5 - (charging ? 2 : 0)); ctx.lineTo(15 + d * 22, cy2 + 1.5); ctx.closePath(); fs(ctx, '#ffd7c8', ol, 0.8); }
        for (const d of [-1, 1]) { ctx.strokeStyle = ol; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(15 + d * 5, 11); ctx.lineTo(15 + d * 6, 5); ctx.stroke(); eye(ctx, 15 + d * 6, 4, 2.2, blink, DK); }
        brows(ctx, 15, 2.5, 8, DK, false);
        ctx.strokeStyle = DK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(10, 20); ctx.lineTo(20, 20); ctx.stroke(); ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(11 + i * 3, 20); ctx.lineTo(12.5 + i * 3, 22.5); ctx.lineTo(14 + i * 3, 20); ctx.closePath(); ctx.fill(); }
        crown(15, -3, 8);
      } else {
        ctx.globalAlpha = 0.5; blit(glow('#ff7a2a', 26), 15 - 26, 16 - 26); ctx.globalAlpha = 1;
        blobPath(ctx, 0, 6, 30, 24, 2); fs(ctx, lin(ctx, 'bossg' + c1, 0, 4, 0, 30, [0, '#ffd24a', 0.4, c1, 1, c2]), ol, 1.3);
        ctx.fillStyle = '#4a3a3a'; for (const [px, py, pw] of [[3, 9, 8], [13, 4, 9], [23, 10, 7]]) { rr(ctx, px, py, pw, 6, 2); fs(ctx, '#4a3a3a', '#1a0a0a', 0.9); }
        for (let i = 0; i < 3; i++) { const f = 1 + Math.sin(an * 8 + i * 2) * 0.4; fell(ctx, 9 + i * 6, 6 - f * 2.5, 1.6, 3 * f, '#ffd24a'); }
        eye(ctx, 9.5, 14, 2.1, blink, '#3a0a00'); eye(ctx, 20.5, 14, 2.1, blink, '#3a0a00'); brows(ctx, 15, 10.5, 7.5, '#3a0a00', false);
        ctx.strokeStyle = '#3a0a00'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(10, 22); ctx.quadraticCurveTo(15, charging ? 18 : 25, 20, 22); ctx.stroke();
        crown(15, 0, 7);
      }
      if (e.phase === 'tell') { ctx.globalAlpha = 0.6 + Math.sin(fr * 0.5) * 0.4; txt(ctx, '!', 15, -8, 12, '#fff', 'center', '#c9305f', 2.5); ctx.globalAlpha = 1; }
      if (charging) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(15 - dir * 18, 10 + i * 6); ctx.lineTo(15 - dir * (26 + (fr % 3) * 2), 10 + i * 6); ctx.stroke(); } }
    } else {
      if (key === 'weltraum') { drawPirate(e, x, y, an, fr, c1, c2, ol, rage); ctx.restore(); return; }
      const sw = e.phase === 'swoop', fl2 = Math.sin(an * 3);
      ctx.translate(x + 15, y + 15); ctx.rotate(sw ? 0.1 * dir : 0); ctx.translate(-15, -15);
      ctx.fillStyle = c1; puffs(ctx, 0, 6 + fl2, 30, 22); ctx.fillStyle = shade(c1, -0.15); ell(ctx, 15, 26 + fl2, 13, 3); ctx.fill();
      ctx.strokeStyle = ol; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(7, 20 + fl2, 7, Math.PI * 0.55, Math.PI * 1.45); ctx.arc(15, 14 + fl2, 9, Math.PI * 1.1, Math.PI * 1.9); ctx.arc(23, 20 + fl2, 7, Math.PI * 1.55, Math.PI * 0.45); ctx.closePath(); ctx.stroke();
      eye(ctx, 10, 15 + fl2, 2, blink, '#2a2a4a'); eye(ctx, 20, 15 + fl2, 2, blink, '#2a2a4a'); brows(ctx, 15, 11.5 + fl2, 7, '#2a2a4a', false);
      ctx.strokeStyle = '#2a2a4a'; ctx.lineWidth = 1.4; ctx.beginPath(); if (sw || rage) { ctx.moveTo(11, 23 + fl2); ctx.quadraticCurveTo(15, 19 + fl2, 19, 23 + fl2); } else { ctx.moveTo(11, 22 + fl2); ctx.quadraticCurveTo(15, 24 + fl2, 19, 22 + fl2); } ctx.stroke();
      if (sw) { ctx.fillStyle = '#ffe94a'; for (const bx of [9, 20]) { ctx.beginPath(); ctx.moveTo(bx, 28); ctx.lineTo(bx + 3, 28); ctx.lineTo(bx + 1.5, 32); ctx.lineTo(bx + 4, 32); ctx.lineTo(bx - 1, 38); ctx.lineTo(bx + 0.5, 33.5); ctx.lineTo(bx - 2, 33.5); ctx.closePath(); ctx.fill(); } }
      crown(15, 2 + fl2, 8);
    }
    ctx.restore();
    function crown(cx, cy, w) { ctx.beginPath(); ctx.moveTo(cx - w, cy); ctx.lineTo(cx - w, cy - 6); ctx.lineTo(cx - w * 0.5, cy - 2.5); ctx.lineTo(cx, cy - 8); ctx.lineTo(cx + w * 0.5, cy - 2.5); ctx.lineTo(cx + w, cy - 6); ctx.lineTo(cx + w, cy); ctx.closePath(); fs(ctx, '#ffd84a', '#c98a1a', 1); fcirc(ctx, cx - w, cy - 6, 1.2, '#ff6f9c'); fcirc(ctx, cx, cy - 8, 1.3, '#8fd3ff'); fcirc(ctx, cx + w, cy - 6, 1.2, '#ff6f9c'); }
  }
  function drawEnt(e, fr) {
    const an = e.anim || 0, sd = e.seed === undefined ? (e.seed = ((e.x * 0.37 + (e.baseY || e.y) * 0.11) % 1 + 1) % 1) : e.seed;
    if (e.kind === 'boss') { drawBoss(e, e.x, e.y, an, fr); return; }
    if (e.kind === 'pookie') { const near = e.x <= P().x + P().w + 3; drawBear(e.x, e.y, false, an, -1, false, true, true, 1, 1, false, near ? 'victory' : 'run'); return; }
    if (e.kind === 'bean' || e.kind === 'milk' || e.kind === 'coffee' || e.kind === 'feather') { drawItem(e, e.x, e.y, fr); return; }
    if (e.kind === 'dropper' && e.state === 'respawn') return;
    const fn = LOOK[e.look] || (e.kind === 'walker' ? LOOK.drop : e.kind === 'flyer' ? LOOK.bat : e.kind === 'spiky' ? LOOK.spiky : e.kind === 'pipeHazard' ? LOOK.snapper : (e.kind === 'platformH' || e.kind === 'platformV') ? LOOK.cookie : e.kind === 'thrower' ? LOOK.monkey : e.kind === 'jumper' ? LOOK.fish : e.kind === 'dropper' ? LOOK.icicle : e.kind === 'shot' ? LOOK.coconut : null);
    if (!fn) return;
    const dir = e.kind === 'thrower' ? (P().x + 6 < e.x + 7 ? -1 : 1) : ((e.vx || e.lastVx || -1) < 0 ? -1 : 1), mover = e.kind === 'walker' || e.kind === 'flyer' || e.kind === 'spiky';
    ctx.save();
    if (!e.alive) { const t = Math.max(0, e.dieT); ctx.globalAlpha = Math.max(0, 1 - t / 0.8); ctx.translate(e.x + e.w / 2, e.y + e.h); if (e.flip) { ctx.scale(1, -1); ctx.translate(0, e.h); } else ctx.scale(1.35, 0.4); ctx.translate(-(e.x + e.w / 2), -(e.y + e.h)); }
    if (mover && dir > 0) { ctx.translate(e.x + e.w, 0); ctx.scale(-1, 1); fn(e, 0, e.y, an, fr, -1, sd); }
    else fn(e, e.x, e.y, an, fr, dir, sd);
    ctx.restore();
  }

  /* ================= Weltraum: station / mond / mars / saturn ================= */
  const skinOf = W => W.key === 'weltraum' ? (W.skin || 'station') : W.key;
  function starStrips() { const s1 = strip('stars', 480, 180, (g, w) => { for (let i = 0; i < 70; i++) { const x = (i * 97.3) % w, y = (i * 53.7) % 170, r = 0.5 + (i % 3) * 0.4; fcirc(g, x, y, r, i % 5 ? '#fff' : '#ffe9a8'); } }); const s2 = strip('stars2', 480, 180, (g, w) => { for (let i = 0; i < 40; i++) { const x = (i * 71.1 + 30) % w, y = (i * 37.3 + 10) % 170; starPath(g, x, y, 1.8, 0.7, 4); g.fillStyle = '#fff'; g.fill(); } }); return [s1, s2]; }
  function drawStarsBg(cam, fr, a, h) { const [s1, s2] = starStrips(); const sy = h ? (h - 180) : 0; ctx.save(); ctx.translate(0, sy); drawStrip(s1, 0, cam * 0.02, a); drawStrip(s2, 0, cam * 0.03, a * (0.45 + Math.sin(fr * 0.08) * 0.35)); ctx.restore(); }
  function earthSpr(r) { return spr('earth' + r, r * 2 + 4, r * 2 + 4, (g) => { const c = r + 2; fcirc(g, c, c, r, lin(g, '', 0, 0, r * 2, r * 2, [0, '#6fc0ff', 1, '#1a4ab0'])); g.save(); circ(g, c, c, r); g.clip(); g.fillStyle = '#5fbf6a'; for (let i = 0; i < 6; i++) { const a = i * 1.1 + 0.4, d = r * (0.3 + (i % 3) * 0.2); blobPath(g, c + Math.cos(a) * d - r * 0.22, c + Math.sin(a) * d - r * 0.16, r * 0.44, r * 0.32, i); g.fill(); } g.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 7; i++) { const a = i * 0.9 + 2, d = r * (0.2 + (i % 4) * 0.2); ell(g, c + Math.cos(a) * d, c + Math.sin(a) * d, r * 0.26, r * 0.07); g.fill(); } g.fillStyle = lin(g, '', c - r, 0, c + r, 0, [0, 'rgba(0,0,30,0)', 0.6, 'rgba(0,0,30,0)', 1, 'rgba(0,0,30,.6)']); g.fillRect(0, 0, r * 2 + 4, r * 2 + 4); g.restore(); }); }
  function drawEarth(x, y, r, fr) { blit(glow('#8fd3ff', r * 1.5), x - r * 1.5, y - r * 1.5); ctx.save(); ctx.translate(x, y); ctx.rotate(fr * 0.0006); blit(earthSpr(r), -r - 2, -r - 2); ctx.restore(); ctx.strokeStyle = 'rgba(160,220,255,.5)'; ctx.lineWidth = 1.5; circ(ctx, x, y, r + 0.5); ctx.stroke(); }
  function saturnSpr() { return spr('saturn', 360, 200, (g) => { const cx = 180, cy = 100, r = 62; g.save(); g.translate(cx, cy); g.rotate(-0.25); g.strokeStyle = 'rgba(230,200,255,.55)'; g.lineWidth = 9; ell(g, 0, 0, 150, 26); g.stroke(); g.strokeStyle = 'rgba(200,150,255,.35)'; g.lineWidth = 5; ell(g, 0, 0, 168, 30); g.stroke(); g.restore(); fcirc(g, cx, cy, r, lin(g, '', 0, cy - r, 0, cy + r, [0, '#f6e2b8', 0.3, '#e0b48a', 0.55, '#c9905e', 0.8, '#b8805a', 1, '#8a5a40'])); g.save(); circ(g, cx, cy, r); g.clip(); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(cx - r, cy - 22, r * 2, 6); g.fillRect(cx - r, cy + 8, r * 2, 4); g.fillStyle = 'rgba(80,40,30,.18)'; g.fillRect(cx - r, cy - 8, r * 2, 5); g.fillRect(cx - r, cy + 24, r * 2, 7); g.fillStyle = lin(g, '', cx - r, 0, cx + r, 0, [0, 'rgba(20,0,40,0)', 0.55, 'rgba(20,0,40,0)', 1, 'rgba(20,0,40,.65)']); g.fillRect(0, 0, 360, 200); g.restore(); g.save(); g.translate(cx, cy); g.rotate(-0.25); g.beginPath(); g.rect(-180, 0, 360, 60); g.clip(); g.strokeStyle = 'rgba(240,215,255,.85)'; g.lineWidth = 9; ell(g, 0, 0, 150, 26); g.stroke(); g.strokeStyle = 'rgba(210,160,255,.55)'; g.lineWidth = 5; ell(g, 0, 0, 168, 30); g.stroke(); g.strokeStyle = 'rgba(120,60,160,.5)'; g.lineWidth = 1.2; ell(g, 0, 0, 158, 27.5); g.stroke(); g.restore(); }); }
  BG.weltraum = function (cam, fr, W) {
    const skin = skinOf(W);
    if (skin === 'station') {
      drawStarsBg(cam, fr, 0.9, 0);
      drawEarth(250 - cam * 0.01, BY + 36, 168, fr);
      const hull = strip('st-hull', 480, 70, (g, w, h) => { g.fillStyle = '#2a3144'; g.fillRect(0, 10, w, 60); g.fillStyle = '#3a4258'; for (let i = 0; i < 6; i++) g.fillRect(i * 80, 10, 76, 60); g.strokeStyle = '#1a2030'; g.lineWidth = 1; for (let i = 0; i < 6; i++) { g.strokeRect(i * 80 + 0.5, 10.5, 75, 59); } for (let i = 0; i < 6; i++) { fcirc(g, i * 80 + 38, 38, 12, '#0a1030', '#8a94a8', 2); fcirc(g, i * 80 + 38, 38, 9, 'rgba(120,180,255,.25)'); fcirc(g, i * 80 + 33, 33, 2, 'rgba(255,255,255,.5)'); } g.fillStyle = '#ffd84a'; for (let i = 0; i < 12; i++) g.fillRect(i * 40 + 5, 4, 20, 4); g.fillStyle = '#1a1e28'; for (let i = 0; i < 12; i++) g.fillRect(i * 40 + 15, 4, 10, 4); });
      const panels = strip('st-panels', 480, 90, (g, w) => { for (let i = 0; i < 3; i++) { const x = 40 + i * 160; g.fillStyle = '#8a94a8'; g.fillRect(x + 38, 20, 4, 70); g.fillRect(x - 10, 46, 100, 3); for (const px of [x - 10, x + 48]) { g.fillStyle = '#1a2a6a'; g.fillRect(px, 24, 42, 44); g.strokeStyle = '#4a6ad0'; g.lineWidth = 0.8; for (let j = 0; j <= 42; j += 7) { g.beginPath(); g.moveTo(px + j, 24); g.lineTo(px + j, 68); g.stroke(); } for (let j = 0; j <= 44; j += 11) { g.beginPath(); g.moveTo(px, 24 + j); g.lineTo(px + 42, 24 + j); g.stroke(); } g.fillStyle = 'rgba(160,200,255,.25)'; g.fillRect(px, 24, 42, 10); } } });
      const rocket = spr('rocket', 60, 120, (g) => { rr(g, 22, 20, 16, 80, 8); fs(g, lin(g, '', 22, 0, 38, 0, [0, '#ffffff', 0.5, '#e8ecf4', 1, '#9aa4b8']), '#3a4258', 1); g.beginPath(); g.moveTo(22, 24); g.quadraticCurveTo(30, -4, 38, 24); g.closePath(); fs(g, '#e23a3a', '#7a1a14', 1); for (const d of [-1, 1]) { g.beginPath(); g.moveTo(30 + d * 8, 70); g.lineTo(30 + d * 18, 100); g.lineTo(30 + d * 8, 100); g.closePath(); fs(g, '#e23a3a', '#7a1a14', 1); } fcirc(g, 30, 44, 4, '#8fd3ff', '#3a4258', 1); g.fillStyle = '#e23a3a'; g.fillRect(22, 56, 16, 4); g.fillStyle = '#5a6274'; g.fillRect(8, 100, 44, 6); g.fillRect(12, 106, 36, 14); g.fillStyle = '#3a4258'; for (let i = 0; i < 3; i++) g.fillRect(16 + i * 10, 108, 4, 12); });
      drawStrip(hull, BY - 110, cam * 0.1, 0.9); drawStrip(panels, BY - 100, cam * 0.18);
      pitFill('#3a4258', '#141820');
      for (let i = 0; i < 2; i++) { const x = mod(i * 300 + 120 - cam * 0.38, VW + 240) - 120; blit(rocket, x, BY - 118); ctx.globalAlpha = 0.4 + Math.sin(fr * 0.2 + i) * 0.3; fcirc(ctx, x + 30, BY - 96, 1.5, '#ff4a4a'); ctx.globalAlpha = 1; }
      const near = strip('st-near', 480, 30, (g, w, h) => { g.fillStyle = '#4a5264'; g.fillRect(0, 10, w, 20); g.fillStyle = '#5a6274'; for (let i = 0; i < 12; i++) g.fillRect(i * 40 + 2, 12, 36, 16); g.fillStyle = '#8a94a8'; for (let i = 0; i < 12; i++) { fcirc(g, i * 40 + 6, 16, 1.2); fcirc(g, i * 40 + 34, 16, 1.2); } });
      drawStrip(near, BY - 26, cam * 0.5);
    } else if (skin === 'mond') {
      drawStarsBg(cam, fr, 1, 0);
      drawEarth(392 - cam * 0.02, 50, 19, fr);
      const far = strip('mo-far', 480, 90, (g, w, h) => { g.fillStyle = '#3a3a48'; for (let i = 0; i < 7; i++) { const x = i * 70 + 20; g.beginPath(); g.moveTo(x - 50, 90); g.lineTo(x - 10, 34 + (i % 3) * 10); g.lineTo(x + 14, 44); g.lineTo(x + 40, 26 + (i % 2) * 12); g.lineTo(x + 70, 90); g.closePath(); g.fill(); } g.fillRect(0, 86, w, 4); });
      const mid = strip('mo-mid', 480, 70, (g, w, h) => { hillLine(g, w, h, 34, 6, 38, 7, '#6a6a7a'); g.fillStyle = '#5a5a6a'; for (let i = 0; i < 7; i++) { const x = 30 + i * 68, y = 46 + (i % 2) * 8; ell(g, x, y, 11, 4); g.fill(); g.strokeStyle = '#8a8a9a'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y - 1, 11, 4, 0, Math.PI, TAU); g.stroke(); } });
      const near = strip('mo-near', 480, 40, (g, w, h) => { g.fillStyle = '#9a9aa8'; for (let i = 0; i < 8; i++) fcirc(g, i * 62 + 20, 42, 18 + (i % 2) * 6); g.fillRect(0, 36, w, h - 36); g.fillStyle = '#7a7a88'; for (let i = 0; i < 6; i++) { fcirc(g, 40 + i * 80, 34, 3 + (i % 2)); } g.fillStyle = '#b0b0bc'; for (let i = 0; i < 6; i++) fcirc(g, 39 + i * 80, 33, 1.2); });
      drawStrip(far, BY - 86, cam * 0.1); drawStrip(mid, BY - 66, cam * 0.24); pitFill('#9a9aa8', '#3a3a48'); drawStrip(near, BY - 36, cam * 0.5);
      ctx.fillStyle = 'rgba(200,200,215,.35)'; for (let i = 0; i < 26; i++) { const x = mod(i * 61 + fr * (0.25 + (i % 3) * 0.12) - cam * 0.35, VW + 20) - 10, y = BY - 14 - (i * 37) % 70 + Math.sin(fr * 0.03 + i) * 3; fcirc(ctx, x, y, 0.8 + (i % 3) * 0.4); }
    } else if (skin === 'mars') {
      drawStarsBg(cam, fr, 0.35, 0);
      fcirc(ctx, 120 - cam * 0.02, 40, 4.5, '#d8c8b8', '#8a7a6a', 0.8); fcirc(ctx, 300 - cam * 0.025, 62, 3, '#c8b8a8', '#8a7a6a', 0.8);
      const far = strip('ma-far', 480, 100, (g, w, h) => { g.fillStyle = '#6a2416'; for (let i = 0; i < 5; i++) { const x = i * 100 + 20; g.beginPath(); g.moveTo(x - 60, 100); g.lineTo(x - 30, 50 + (i % 2) * 10); g.lineTo(x + 20, 46 + (i % 3) * 6); g.lineTo(x + 40, 60); g.lineTo(x + 70, 100); g.closePath(); g.fill(); } g.fillRect(0, 96, w, 4); g.fillStyle = '#3a1208'; g.fillRect(150, 70, 3, 26); g.fillRect(140, 70, 23, 2); g.beginPath(); g.moveTo(151, 72); g.lineTo(143, 60); g.lineTo(159, 60); g.closePath(); g.fill(); g.fillRect(360, 86, 22, 8); fcirc(g, 364, 95, 2.5); fcirc(g, 371, 95, 2.5); fcirc(g, 378, 95, 2.5); g.fillRect(369, 80, 2, 7); g.fillRect(365, 79, 10, 2); });
      const mid = strip('ma-mid', 480, 70, (g, w, h) => { hillLine(g, w, h, 34, 6, 40, 11, '#b8502a'); g.fillStyle = 'rgba(255,200,150,.18)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(i * 80, 46); g.quadraticCurveTo(i * 80 + 30, 36, i * 80 + 60, 46); g.lineTo(i * 80 + 60, 50); g.quadraticCurveTo(i * 80 + 30, 42, i * 80, 50); g.fill(); } });
      const near = strip('ma-near', 480, 40, (g, w, h) => { g.fillStyle = '#d8703a'; for (let i = 0; i < 8; i++) fcirc(g, i * 62 + 20, 44, 20 + (i % 2) * 6); g.fillRect(0, 36, w, h - 36); g.fillStyle = '#a8441c'; for (let i = 0; i < 5; i++) { fcirc(g, 50 + i * 96, 36, 3.5); fcirc(g, 56 + i * 96, 37, 2.2); } });
      drawStrip(far, BY - 96, cam * 0.1); drawStrip(mid, BY - 66, cam * 0.24); pitFill('#d8703a', '#5a2010'); drawStrip(near, BY - 36, cam * 0.5);
      ctx.globalAlpha = 0.18 + Math.sin(fr * 0.01) * 0.08; ctx.fillStyle = lin(ctx, 'marshaze', 0, BY - 90, 0, BY + 10, [0, 'rgba(255,170,110,0)', 0.5, 'rgba(255,170,110,1)', 1, 'rgba(255,170,110,0)']); ctx.fillRect(0, BY - 90, VW, 100); ctx.globalAlpha = 0.25; ctx.strokeStyle = '#ffd0a8'; ctx.lineWidth = 1; for (let i = 0; i < 8; i++) { const x = mod(i * 97 + fr * 1.8 - cam * 0.3, VW + 80) - 40, y = BY - 60 + (i * 23) % 50; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 26 + (i % 3) * 10, y - 1); ctx.stroke(); } ctx.globalAlpha = 1;
    } else {
      drawStarsBg(cam, fr, 0.8, 0);
      for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.5; blit(glow(i % 2 ? '#c060ff' : '#ff6fb0', 90), mod(i * 190 + 40 - cam * 0.03, VW + 180) - 180, 20 + (i * 47) % 60 - 90); } ctx.globalAlpha = 1;
      blit(saturnSpr(), 150 - cam * 0.03, -20);
      const far = strip('sa-far', 480, 120, (g, w, h) => { g.fillStyle = '#2a1646'; for (let i = 0; i < 2; i++) { const x = 110 + i * 240; g.fillRect(x - 50, 60, 100, 60); g.fillRect(x - 66, 36, 22, 84); g.fillRect(x + 44, 36, 22, 84); g.fillRect(x - 12, 14, 24, 106); g.beginPath(); g.moveTo(x - 70, 38); g.lineTo(x - 55, 18); g.lineTo(x - 40, 38); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x + 40, 38); g.lineTo(x + 55, 18); g.lineTo(x + 70, 38); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x - 14, 16); g.lineTo(x, -4); g.lineTo(x + 14, 16); g.closePath(); g.fill(); g.fillStyle = '#7fff8a'; for (let j = 0; j < 4; j++) g.fillRect(x - 40 + j * 22, 74, 6, 8); g.fillRect(x - 4, 40, 8, 10); g.fillStyle = '#2a1646'; } g.fillRect(0, 116, w, 4); });
      const isles = strip('sa-isles', 480, 90, (g, w, h) => { for (let i = 0; i < 3; i++) { const x = 70 + i * 160, y = 28 + (i % 2) * 22, iw = 64 + (i % 2) * 18; g.fillStyle = '#4a2a7a'; g.beginPath(); g.moveTo(x - iw / 2, y + 4); g.lineTo(x + iw / 2, y + 4); g.lineTo(x + iw * 0.2, y + 34); g.lineTo(x - iw * 0.1, y + 40); g.lineTo(x - iw * 0.3, y + 26); g.closePath(); g.fill(); g.fillStyle = '#7a4ab8'; ell(g, x, y + 3, iw / 2, 6); g.fill(); g.fillStyle = '#d8b0ff'; for (let j = 0; j < 3; j++) { const cx = x - 18 + j * 16; g.beginPath(); g.moveTo(cx - 4, y + 4); g.lineTo(cx - 2, y - 10 - (j % 2) * 6); g.lineTo(cx + 1, y - 14 - (j % 2) * 4); g.lineTo(cx + 4, y + 4); g.closePath(); g.fill(); } } });
      const near = strip('sa-near', 480, 40, (g, w, h) => { g.fillStyle = '#5a3a8a'; for (let i = 0; i < 9; i++) { const x = i * 56 + 20; g.beginPath(); g.moveTo(x - 26, 40); g.lineTo(x - 10, 16 + (i % 3) * 5); g.lineTo(x + 6, 22); g.lineTo(x + 26, 40); g.closePath(); g.fill(); } g.fillRect(0, 36, w, h - 36); g.fillStyle = '#c090ff'; for (let i = 0; i < 5; i++) { const x = 40 + i * 96; g.beginPath(); g.moveTo(x - 3, 36); g.lineTo(x, 24); g.lineTo(x + 3, 36); g.closePath(); g.fill(); } });
      drawStrip(far, BY - 136, cam * 0.08, 0.9); drawStrip(isles, BY - 120 + Math.sin(fr * 0.02) * 3, cam * 0.2); pitFill('#5a3a8a', '#1a0a30'); drawStrip(near, BY - 36, cam * 0.5);
    }
  };
  /* ---- space tiles: decor, module, prison ---- */
  function spaceTile(ch, cx, cy, x, y, fr, W) {
    const skin = skinOf(W), g = W.ground;
    if (ch === 'p') {
      if (skin === 'station') { blit(spr('antenna', 24, 44, (g2) => { g2.fillStyle = '#8a94a8'; g2.fillRect(11, 8, 2, 36); g2.fillRect(4, 40, 16, 4); for (let i = 0; i < 3; i++) { g2.fillRect(6 + i * 2, 12 + i * 9, 12 - i * 4, 1.5); } fcirc(g2, 12, 6, 3, '#c8d0e0', '#4a5264', 1); }), x - 4, y - 28); ctx.globalAlpha = 0.5 + Math.sin(fr * 0.25) * 0.5; fcirc(ctx, x + 8, y - 24, 1.6, '#ff4a4a'); ctx.globalAlpha = 1; return; }
      const col = skin === 'mond' ? '#e8e8f0' : (skin === 'mars' ? '#ff7a3a' : '#c060ff');
      ctx.fillStyle = '#c8d0e0'; rr(ctx, x + 6.8, y - 22, 2.4, 38, 1.2); ctx.fill(); fcirc(ctx, x + 8, y - 22.5, 1.8, '#ffd84a');
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x + 9, y - 21); for (let i = 1; i <= 5; i++) ctx.lineTo(x + 9 + i * 3, y - 21 + Math.sin(fr * 0.12 + i * 0.7) * 1.3); for (let i = 5; i >= 0; i--) ctx.lineTo(x + 9 + i * 3, y - 11 + Math.sin(fr * 0.12 + i * 0.7 + 0.5) * 1.3); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 0.8; ctx.stroke();
      starPath(ctx, x + 16, y - 16, 2.6, 1.1, 5); ctx.fillStyle = skin === 'mond' ? '#4a4a6a' : '#fff'; ctx.fill(); return;
    }
    if (ch === 'h') { blit(spr('rocks' + skin, 28, 16, (g2) => { const c1 = shade(g.dirt, 0.15), c2 = shade(g.dirt, -0.2); fcirc(g2, 9, 11, 5, c1, c2, 1); fcirc(g2, 19, 10.5, 6, c1, c2, 1); fcirc(g2, 14, 13, 3.5, c1, c2, 1); g2.fillStyle = 'rgba(255,255,255,.18)'; fcirc(g2, 17, 7.5, 2); ell(g2, 14, 15.5, 12, 1.6); g2.fillStyle = c2; g2.fill(); }), x - 6, y); return; }
    if (ch === 'd') {
      if (skin === 'mond' || skin === 'mars') { blit(spr('rover', 30, 22, (g2) => { g2.fillStyle = '#2a3040'; for (let i = 0; i < 3; i++) fcirc(g2, 5 + i * 10, 18, 3.5, '#2a3040', '#8a94a8', 1); rr(g2, 2, 8, 26, 8, 2); fs(g2, '#c8d0e0', '#4a5264', 1); g2.fillStyle = '#1a2a6a'; g2.fillRect(5, 5, 14, 4); g2.fillStyle = '#8a94a8'; g2.fillRect(22, 0, 1.6, 9); fcirc(g2, 23, 0.5, 2, '#8a94a8', '#4a5264', 0.8); fcirc(g2, 23.6, 0.3, 0.8, '#ff4a4a'); }), x - 7, y - 6); return; }
      blit(spr('dish', 26, 26, (g2) => { g2.fillStyle = '#8a94a8'; g2.fillRect(11, 14, 3, 12); g2.fillRect(5, 24, 15, 2); g2.save(); g2.translate(13, 12); g2.rotate(-0.6); ell(g2, 0, 0, 11, 4); fs(g2, '#dfe6f0', '#4a5264', 1); g2.fillStyle = '#4a5264'; g2.fillRect(-0.8, -9, 1.6, 9); fcirc(g2, 0, -9, 1.6, '#ff4a4a'); g2.restore(); }), x - 5, y - 10); return;
    }
    if (ch === 'Q') { blit(spr('module', 64, 50, (g2) => { rr(g2, 6, 12, 52, 34, 10); fs(g2, lin(g2, '', 0, 12, 0, 46, [0, '#e8ecf4', 0.5, '#b8c0d0', 1, '#6a7488']), '#3a4258', 1.2); g2.fillStyle = '#4a5264'; g2.fillRect(14, 12, 2, 34); g2.fillRect(48, 12, 2, 34); fcirc(g2, 32, 29, 9, '#0a1030', '#8a94a8', 2); fcirc(g2, 32, 29, 7, 'rgba(255,220,120,.35)'); fcirc(g2, 28, 25, 2, 'rgba(255,255,255,.5)'); g2.fillStyle = '#1a2a6a'; g2.fillRect(2, 4, 20, 8); g2.fillRect(42, 4, 20, 8); g2.strokeStyle = '#4a6ad0'; g2.lineWidth = 0.7; for (let i = 0; i < 4; i++) { g2.beginPath(); g2.moveTo(2 + i * 5, 4); g2.lineTo(2 + i * 5, 12); g2.moveTo(42 + i * 5, 4); g2.lineTo(42 + i * 5, 12); g2.stroke(); } g2.fillStyle = '#8a94a8'; g2.fillRect(30, 2, 4, 10); g2.fillStyle = '#ffd84a'; for (let i = 0; i < 4; i++) g2.fillRect(8 + i * 12, 42, 6, 2.5); }), x - 24, y - 34); ctx.globalAlpha = 0.3 + Math.sin(fr * 0.08) * 0.15; blit(glow('#ffd84a', 16), x + 8 - 16, y - 5 - 16); ctx.globalAlpha = 1; return; }
    if (ch === 'U') {
      blit(spr('prison', 64, 80, (g2) => { rr(g2, 4, 20, 56, 60, 5); fs(g2, lin(g2, '', 0, 20, 0, 80, [0, '#4a5264', 1, '#1e2430']), '#0a0e18', 1.5); g2.fillStyle = '#8a94a8'; for (let i = 0; i < 6; i++) { fcirc(g2, 9 + i * 9.2, 24, 1.1); fcirc(g2, 9 + i * 9.2, 76, 1.1); } rr(g2, 14, 30, 36, 42, 3); g2.fillStyle = '#05060f'; g2.fill(); rr(g2, 22, 8, 20, 14, 6); fs(g2, '#6a7488', '#0a0e18', 1.2); fcirc(g2, 32, 12, 5, '#ffe9a8', '#4a5264', 1); g2.fillStyle = '#c060ff'; g2.fillRect(4, 48, 56, 2); }), x - 20, y - 64);
      if (W.boss.final && !L().rescued) drawBear(x + 6, y - 8, false, 0, -1, false, true, true, 1, 1, false, 'sad');
      const pulse = 0.7 + Math.sin(fr * 0.15) * 0.3; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * pulse; for (let i = 0; i < 5; i++) blit(glow('#c060ff', 6), x - 6 + i * 8 + 1 - 6, y - 34 + 21 - 6 - 15); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.strokeStyle = '#e0a0ff'; ctx.lineWidth = 1.6; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - 5 + i * 8 + 1, y - 34); ctx.lineTo(x - 5 + i * 8 + 1, y + 8); ctx.stroke(); } ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 0.6; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - 5 + i * 8 + 1, y - 34); ctx.lineTo(x - 5 + i * 8 + 1, y + 8); ctx.stroke(); }
      const a = Math.sin(fr * 0.03) * 0.9; ctx.save(); ctx.translate(x + 12, y - 52); ctx.rotate(a); ctx.globalAlpha = 0.28; ctx.fillStyle = '#fff2a0'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-18, -90); ctx.lineTo(18, -90); ctx.closePath(); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1;
      return;
    }
  }
  /* ---- space creatures ---- */
  Object.assign(LOOK, {
    alien(e, x, y, an, fr, dir, sd) { const sq = 1 + Math.sin(an * 6) * 0.05; feet(x + 7, y + 13, an, '#2a9a78', '#145a44'); for (const d of [-1, 1]) { ctx.strokeStyle = '#145a44'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 7 + d * 2.5, y + 3); ctx.quadraticCurveTo(x + 7 + d * 5, y - 1, x + 7 + d * 5.5, y - 3); ctx.stroke(); fcirc(ctx, x + 7 + d * 5.5, y - 3.5, 1.5, '#ffe94a', '#145a44', 0.8); } ctx.save(); ctx.translate(x + 7, y + 14); ctx.scale(1 / sq, sq); ctx.translate(-(x + 7), -(y + 14)); blobPath(ctx, x + 0.5, y + 1.5, 13, 12.5, sd); fs(ctx, lin(ctx, 'alieng', 0, 1, 0, 14, [0, '#8af0c8', 1, '#36b890']), '#145a44', 1); ctx.restore(); for (const d of [-1, 1]) { fell(ctx, x + 7 + d * 2.9, y + 6.5, 2.3, 2.8, '#fff', '#145a44', 0.8); fcirc(ctx, x + 7 + d * 2.9 + dir * 0.6, y + 7, 1.3, blinkAt(fr, sd) ? '#fff' : '#1a1a2a'); if (blinkAt(fr, sd)) { ctx.strokeStyle = '#145a44'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 7 + d * 2.9 - 2, y + 6.5); ctx.lineTo(x + 7 + d * 2.9 + 2, y + 6.5); ctx.stroke(); } } smile(ctx, x + 7, y + 10.5, 1.4, '#145a44', false); },
    ufo(e, x, y, an, fr, dir, sd) { ctx.globalAlpha = 0.35 + Math.sin(an * 5) * 0.15; blit(glow('#8fd3ff', 12), x - 5, y + 2); ctx.globalAlpha = 1; fcirc(ctx, x + 7, y + 4.5, 3.8, 'rgba(160,235,255,.85)', '#3a5a7a', 0.9); fcirc(ctx, x + 5.5, y + 2.5, 1, 'rgba(255,255,255,.8)'); fcirc(ctx, x + 6, y + 5, 0.7, '#1a1a2a'); fcirc(ctx, x + 8.4, y + 5, 0.7, '#1a1a2a'); fell(ctx, x + 7, y + 8, 7.2, 2.8, lin(ctx, 'ufog', 0, 5, 0, 11, [0, '#dfe6f0', 1, '#7a8498']), '#2a3040', 1); fell(ctx, x + 7, y + 10, 4, 1.4, '#4a5264'); const on = (fr >> 3) % 2; for (let i = 0; i < 4; i++) fcirc(ctx, x + 2 + i * 3.4, y + 8.6, 0.9, (i % 2 === on) ? '#ff4a7a' : '#ffe94a'); },
    meteor(e, x, y, an, fr, dir, sd) { ctx.globalAlpha = 0.55; blit(glow('#ff8a2a', 16), x - 9, y - 8); ctx.globalAlpha = 1; ctx.save(); ctx.translate(x + 14, 0); ctx.scale(-1, 1); ctx.translate(-(x + 14), 0); for (let i = 0; i < 3; i++) { const fl = 1 + Math.sin(an * 11 + i * 2) * 0.3; fell(ctx, x + 14 + i * 2.5, y + 7 + (i - 1) * 2.4, 4.5 * fl, 1.8, ['#ff6a1a', '#ffb03a', '#fff2a0'][i]); } ctx.restore(); spikes(x + 7, y + 7.5, 4.6, 9, 3.2, '#ff9a2a', '#7a2a00', an * 0.6); spikes(x + 7, y + 7.5, 4.2, 9, 1.8, '#ffe08a', null, an * 0.6 + 0.35); fcirc(ctx, x + 7, y + 7.5, 5.2, lin(ctx, 'metg', 0, 2, 0, 13, [0, '#7a5a50', 1, '#3a2a2a']), '#1a0a0a', 1); ctx.strokeStyle = '#ff9a2a'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x + 3.5, y + 9); ctx.lineTo(x + 6, y + 10.5); ctx.lineTo(x + 8.5, y + 9.5); ctx.stroke(); angryFace(x + 7, y + 7, 2, false, '#ffe08a', 1.3); },
    plasma(e, x, y, an, fr, dir, sd) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; blit(glow('#a060ff', 22), x - 8, y - 12); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; for (let i = 0; i < 3; i++) { const fl = 1 + Math.sin(an * 12 + i * 2.1) * 0.25, w = [6.5, 4.5, 2.8][i], hgt = [22, 16, 10][i] * fl; ctx.beginPath(); ctx.moveTo(x + 14 - w, y + 14); ctx.quadraticCurveTo(x + 14 - w * 0.6, y + 14 - hgt * 0.6, x + 14, y + 14 - hgt); ctx.quadraticCurveTo(x + 14 + w * 0.6, y + 14 - hgt * 0.6, x + 14 + w, y + 14); ctx.closePath(); ctx.fillStyle = ['#7a2af0', '#c070ff', '#ffffff'][i]; ctx.fill(); } ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; for (let i = 0; i < 4; i++) { const t = (an * 4 + i * 1.7) % 1, sx = x + 4 + i * 6.5 + Math.sin(an * 7 + i) * 3, sy = y + 12 - t * 18; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 1.5, sy - 2.5); ctx.stroke(); } },
    hover(e, x, y, an, fr) { for (const tx of [x + 9, x + 31]) { const fl = 1 + Math.sin(an * 14 + tx) * 0.3; ctx.globalAlpha = 0.6; fell(ctx, tx, y + 13.5, 2.6, 4 * fl, '#8fd3ff'); fell(ctx, tx, y + 12.5, 1.3, 2.4 * fl, '#fff'); ctx.globalAlpha = 1; rr(ctx, tx - 3, y + 8.5, 6, 3, 1); fs(ctx, '#3a4258', '#1a1e28', 0.8); } rr(ctx, x, y, 40, 9, 3); fs(ctx, lin(ctx, 'hovg', 0, 0, 0, 9, [0, '#dfe6f0', 0.5, '#aab4c6', 1, '#6a7488']), '#2a3040', 1); ctx.save(); rr(ctx, x + 2, y + 5.5, 36, 2.6, 1); ctx.clip(); ctx.fillStyle = '#ffd84a'; ctx.fillRect(x, y + 5, 40, 4); ctx.fillStyle = '#1a1e28'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(x + i * 5, y + 9); ctx.lineTo(x + i * 5 + 2.5, y + 4); ctx.lineTo(x + i * 5 + 4.5, y + 4); ctx.lineTo(x + i * 5 + 2, y + 9); ctx.fill(); } ctx.restore(); ctx.fillStyle = '#8a94a8'; fcirc(ctx, x + 4, y + 2.5, 0.9); fcirc(ctx, x + 36, y + 2.5, 0.9); fcirc(ctx, x + 20, y + 2.5, 0.9); },
    robot(e, x, y, an, fr, dir, sd) { const up = e.t < 0.35; rr(ctx, x + 1, y + 11, 12, 3.5, 1.2); fs(ctx, '#2a3040', '#0a0e18', 0.8); ctx.fillStyle = '#6a7488'; for (let i = 0; i < 4; i++) fcirc(ctx, x + 2.8 + i * 2.8, y + 12.8, 0.7); rr(ctx, x + 2.5, y + 6, 9, 5.5, 1.5); fs(ctx, lin(ctx, 'robg', 0, 6, 0, 12, [0, '#c8d0e0', 1, '#7a8498']), '#2a3040', 1); ctx.fillStyle = '#ffd84a'; ctx.fillRect(x + 5, y + 8, 4, 1.4); rr(ctx, x + 3, y + 0.5, 8, 5.5, 1.5); fs(ctx, '#aab4c6', '#2a3040', 1); rr(ctx, x + 4, y + 2, 6, 2.6, 1); ctx.fillStyle = '#1a1e28'; ctx.fill(); const ex = x + 5 + ((fr >> 2) % 4) * 1.2; fcirc(ctx, ex, y + 3.3, 0.8, '#ff4a4a'); ctx.fillStyle = '#6a7488'; ctx.fillRect(x + 6.5, y - 2.5, 1, 3); fcirc(ctx, x + 7, y - 3, 1.1, (fr >> 4) % 2 ? '#ff4a4a' : '#7a1a1a'); limb(x + 7 + dir * 6, y + 8 - (up ? 3.5 : 0), 1.4, 2.6, dir * (up ? 2.4 : 0.5), '#8a94a8', '#2a3040'); limb(x + 7 - dir * 6, y + 8.5, 1.4, 2.6, -dir * 0.4, '#8a94a8', '#2a3040'); if (up) LOOK.bolt({}, x + 7 + dir * 7.5 - 4, y - 1.5, an, fr); },
    bolt(e, x, y, an, fr) { ctx.globalAlpha = 0.5; blit(glow('#ffe94a', 8), x - 4, y - 4); ctx.globalAlpha = 1; ctx.save(); ctx.translate(x + 4, y + 4); ctx.rotate(an * 2); ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; if (i) ctx.lineTo(Math.cos(a) * 3.8, Math.sin(a) * 3.8); else ctx.moveTo(Math.cos(a) * 3.8, Math.sin(a) * 3.8); } ctx.closePath(); fs(ctx, lin(ctx, 'boltg', -4, -4, 4, 4, [0, '#fff2a0', 1, '#e0a020']), '#7a4a10', 1); fcirc(ctx, 0, 0, 1.3, '#7a4a10'); ctx.restore(); },
    laserfall(e, x, y, an, fr, dir, sd) { const warn = e.state === 'warn', fall = e.state === 'fall' || e.state === 'hit'; if (fall) { ctx.globalAlpha = 0.5; ctx.fillStyle = '#ff4a4a'; ctx.fillRect(x + 5.5, y + 18, 3, 24); ctx.globalAlpha = 1; } rr(ctx, x - 1, y, 16, 13, 2); fs(ctx, lin(ctx, 'lfg', 0, 0, 0, 13, [0, '#7a8498', 1, '#3a4258']), '#0a0e18', 1.2); ctx.fillStyle = '#aab4c6'; for (const [px, py] of [[2, 2.5], [12, 2.5], [2, 10.5], [12, 10.5]]) fcirc(ctx, x + px, y + py, 1); ctx.fillStyle = '#ffd84a'; ctx.fillRect(x + 4, y + 5.5, 6, 2.2); ctx.fillStyle = '#1a1e28'; for (let i = 0; i < 3; i++) ctx.fillRect(x + 4.5 + i * 2, y + 5.5, 1, 2.2); ctx.beginPath(); ctx.moveTo(x + 2, y + 13); ctx.lineTo(x + 12, y + 13); ctx.lineTo(x + 7, y + 18); ctx.closePath(); fs(ctx, '#6a7488', '#0a0e18', 1); const lit = warn ? (fr >> 2) % 2 : (fall ? 1 : 0); fcirc(ctx, x + 7, y + 14.5, 1.6, lit ? '#ff4a4a' : '#5a1a1a', '#0a0e18', 0.7); if (lit) { ctx.globalAlpha = 0.6; blit(glow('#ff4a4a', 8), x - 1, y + 6.5); ctx.globalAlpha = 1; } },
  });
  function drawPirate(e, x, y, an, fr, c1, c2, ol, rage) {
    const sw = e.phase === 'swoop', fl2 = Math.sin(an * 3), dir = e.dir || -1, blink = blinkAt(fr, 0.3);
    ctx.save(); ctx.translate(x + 15, y + 15); ctx.rotate(sw ? 0.12 * dir : Math.sin(an * 1.5) * 0.04); ctx.translate(-15, -15);
    ctx.globalAlpha = 0.5 + Math.sin(an * 6) * 0.2; blit(glow('#8fd3ff', 18), -3, 14 + fl2); ctx.globalAlpha = 1;
    fell(ctx, 15, 25 + fl2, 17, 5.5, lin(ctx, 'psaucer', 0, 20, 0, 31, [0, '#dfe6f0', 1, '#6a7488']), '#2a3040', 1.2); fell(ctx, 15, 29 + fl2, 9, 2.4, '#3a4258'); const on = (fr >> 3) % 2; for (let i = 0; i < 6; i++) fcirc(ctx, 2 + i * 5.2, 26.5 + fl2, 1.2, (i % 2 === on) ? '#ff4a7a' : '#ffe94a');
    rr(ctx, 5, 12 + fl2, 20, 12, 4); fs(ctx, '#8a1a2a', ol, 1); ctx.fillStyle = '#ffd84a'; fcirc(ctx, 12, 18 + fl2, 1); fcirc(ctx, 18, 18 + fl2, 1); ctx.fillStyle = '#e8d8b0'; ctx.fillRect(13, 12 + fl2, 4, 6);
    fell(ctx, 15, 8 + fl2, 11, 10, lin(ctx, 'pirg' + c1, 0, -2, 0, 18, [0, shade(c1, 0.25), 1, shade(c1, -0.15)]), ol, 1.3);
    for (const d of [-1, 1]) { ctx.strokeStyle = ol; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(15 + d * 5, 0 + fl2); ctx.quadraticCurveTo(15 + d * 8, -5 + fl2, 15 + d * 9, -7 + fl2); ctx.stroke(); fcirc(ctx, 15 + d * 9, -7.5 + fl2, 1.6, '#7fff8a', ol, 0.8); }
    fell(ctx, 19.5, 8 + fl2, 3.4, 3.8, '#fff', ol, 0.8); fcirc(ctx, 20 + dir * 0.6, 8.5 + fl2, 1.9, blink ? '#fff' : '#ffe94a'); if (!blink) fcirc(ctx, 20 + dir * 0.6, 8.5 + fl2, 1, '#1a1a2a'); if (blink) { ctx.strokeStyle = ol; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(17, 8 + fl2); ctx.lineTo(23, 8 + fl2); ctx.stroke(); }
    fcirc(ctx, 10.5, 8 + fl2, 3.2, '#1a1a2a', ol, 0.8); ctx.strokeStyle = '#1a1a2a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(4.5, 5 + fl2); ctx.lineTo(13, 9 + fl2); ctx.stroke();
    brows(ctx, 15, 3.6 + fl2, 6, ol, false);
    ctx.strokeStyle = ol; ctx.lineWidth = 1.3; ctx.beginPath(); if (rage || sw) { ctx.moveTo(10, 14.5 + fl2); ctx.quadraticCurveTo(15, 11.5 + fl2, 20, 14.5 + fl2); } else { ctx.moveTo(10.5, 13.5 + fl2); ctx.quadraticCurveTo(15, 15.5 + fl2, 19.5, 13.5 + fl2); } ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(17, 13.6 + fl2); ctx.lineTo(18, 16 + fl2); ctx.lineTo(19, 13.6 + fl2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, -1 + fl2); ctx.lineTo(8, -7 + fl2); ctx.lineTo(11.5, -3.5 + fl2); ctx.lineTo(15, -9 + fl2); ctx.lineTo(18.5, -3.5 + fl2); ctx.lineTo(22, -7 + fl2); ctx.lineTo(22, -1 + fl2); ctx.closePath(); fs(ctx, '#ffd84a', '#c98a1a', 1); fcirc(ctx, 8, -7 + fl2, 1.2, '#ff6f9c'); fcirc(ctx, 15, -9 + fl2, 1.3, '#8fd3ff'); fcirc(ctx, 22, -7 + fl2, 1.2, '#ff6f9c');
    if (sw) { ctx.globalAlpha = 0.7; ctx.fillStyle = '#ff4a4a'; for (const bx of [8, 20]) ctx.fillRect(bx - 1, 30, 2, 14); ctx.globalAlpha = 1; }
    ctx.restore();
  }

  /* ================= particles ================= */
  function drawParticle(q, fr, W) {
    const a = clamp(q.t / 0.3, 0, 1); ctx.globalAlpha = a;
    switch (q.kind) {
      case 'heart': heartPath(ctx, q.x + 4, q.y + 4, 4); fs(ctx, '#ff6f9c', '#c9305f', 0.8); fcirc(ctx, q.x + 2.4, q.y + 2.4, 0.9, 'rgba(255,255,255,.75)'); break;
      case 'crumb': ctx.save(); ctx.translate(q.x + 2.5, q.y + 2.5); ctx.rotate(q.t * 7); rr(ctx, -2.5, -2.5, 5, 5, 1.3); fs(ctx, W.block.b, W.block.c, 0.8); ctx.restore(); break;
      case 'puff': ctx.globalAlpha = a * 0.85; fcirc(ctx, q.x + 1.5, q.y + 1.5, 2.2 + (1 - a) * 2.5, q.col || '#fff'); break;
      case 'star': ctx.save(); ctx.translate(q.x + 1.5, q.y + 1.5); ctx.rotate(q.t * 5); starPath(ctx, 0, 0, 3.4, 1.4, 4); ctx.fillStyle = '#ffd84a'; ctx.fill(); ctx.restore(); break;
      case 'splash': fell(ctx, q.x + 1, q.y + 1.5, 1.4, 2.2, q.col || W.liquid.b); break;
      case 'rain': ctx.strokeStyle = q.col || '#8fd3ff'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x, q.y + 3.5); ctx.stroke(); break;
      case 'text': txt(ctx, q.text, q.x + 6, q.y - 6, 9, '#fff', 'center', '#7a3b57', 3); break;
      default: fcirc(ctx, q.x + 1.5, q.y + 1.5, 2, q.col || '#fff');
    }
    ctx.globalAlpha = 1;
  }

  /* ================= weather (screen space) ================= */
  let weather = [], weatherKey = '';
  function drawWeather(W, fr, s) {
    const wt = W.weather; if (!wt || wt === 'none') return;
    if (W.key !== weatherKey) { weatherKey = W.key; weather = []; for (let i = 0; i < 46; i++) weather.push({x: Math.random() * VW, y: Math.random() * VH, s: 0.4 + Math.random(), p: Math.random() * 6.28, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.1}); }
    const wind = (s.wind || 0) * 6;
    if (wt === 'stars') { for (let i = 0; i < weather.length; i++) { const f = weather[i]; const tw = 0.5 + 0.5 * Math.sin(fr * 0.07 + f.p * 3); ctx.globalAlpha = 0.25 + tw * 0.7; const yy = f.y * 0.6; if (i % 4 === 0) { starPath(ctx, f.x, yy, 1.6 + tw * 1.2, 0.6, 4); ctx.fillStyle = '#fff'; ctx.fill(); } else fcirc(ctx, f.x, yy, 0.6 + f.s * 0.5, '#fff'); } ctx.globalAlpha = 1; return; }
    if (wt === 'embers') { ctx.globalCompositeOperation = 'lighter'; for (const f of weather) { f.y -= f.s * 0.7; f.x += Math.sin(fr / 30 + f.p) * 0.35 + wind; if (f.y < -4) { f.y = VH + 4; f.x = Math.random() * VW; } const fl = 0.6 + 0.4 * Math.sin(fr * 0.3 + f.p); ctx.globalAlpha = fl * (0.4 + f.s * 0.4); const col = f.s > 1 ? '#ffd24a' : '#ff7a2a'; blit(glow(col, 5), f.x - 5, f.y - 5); fcirc(ctx, f.x, f.y, 0.7 + f.s * 0.6, '#fff2a0'); } ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; return; }
    for (const f of weather) {
      f.y += f.s * (wt === 'snow' ? 0.45 : 0.6); f.x += Math.sin(fr / 40 + f.p) * (wt === 'leaves' ? 0.9 : 0.4) + wind * f.s; f.r += f.vr;
      if (f.y > VH + 6) { f.y = -6; f.x = Math.random() * VW; } if (f.x > VW + 6) f.x = -6; if (f.x < -6) f.x = VW + 6;
      ctx.globalAlpha = 0.35 + f.s * 0.45;
      if (wt === 'snow') { fcirc(ctx, f.x, f.y, 0.7 + f.s * 1.3, '#fff'); if (f.s > 1.2) fcirc(ctx, f.x - 0.4, f.y - 0.4, 0.5, 'rgba(255,255,255,.8)'); }
      else if (wt === 'leaves') { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.r); fell(ctx, 0, 0, 1.6 + f.s * 1.6, 0.9 + f.s * 0.6, f.s > 1 ? '#5fcf6a' : '#3fa15e'); ctx.strokeStyle = 'rgba(0,80,30,.5)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(2, 0); ctx.stroke(); ctx.restore(); }
      else { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.r); ell(ctx, 0, 0, 1.2 + f.s * 1.4, 0.8 + f.s * 0.7); ctx.fillStyle = f.s > 1 ? '#ff9eb0' : '#ffd1dc'; ctx.fill(); ctx.restore(); }
    }
    ctx.globalAlpha = 1;
  }
  /* colour grading and vignette */
  const GRADE = {wiese: 'rgba(255,170,210,.12)', insel: 'rgba(255,225,150,.12)', dschungel: 'rgba(110,200,120,.12)', schnee: 'rgba(170,205,255,.14)', lava: 'rgba(255,110,40,.16)', himmel: 'rgba(150,110,230,.16)'};
  function grade(W, s) {
    ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = s.room === 1 ? 'rgba(255,170,60,.18)' : (GRADE[W.key] || GRADE.wiese); ctx.fillRect(0, 0, VW, VH); ctx.globalCompositeOperation = 'source-over';
    const vg = spr('vignette', VW, VH, (g) => { g.fillStyle = rad(g, '', VW / 2, VH / 2, VH * 0.45, VW * 0.72, [0, 'rgba(40,20,40,0)', 1, 'rgba(40,20,40,.42)']); g.fillRect(0, 0, VW, VH); }); blit(vg, 0, 0);
  }

  /* ================= HUD ================= */
  function panel(x, y, w, h) { rr(ctx, x, y, w, h, 7); ctx.fillStyle = 'rgba(74,34,58,.5)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1; ctx.stroke(); }
  function bearIcon(x, y) { fcirc(ctx, x - 3.4, y - 3.2, 1.9, '#b07c44', '#4a2c14', 0.8); fcirc(ctx, x + 3.4, y - 3.2, 1.9, '#b07c44', '#4a2c14', 0.8); fcirc(ctx, x, y, 4.8, '#b07c44', '#4a2c14', 0.9); fell(ctx, x, y + 1.6, 2.2, 1.5, '#edd3a2'); fcirc(ctx, x, y + 1, 0.8, '#2a1b12'); fcirc(ctx, x - 1.9, y - 0.6, 0.7, '#2a1b12'); fcirc(ctx, x + 1.9, y - 0.6, 0.7, '#2a1b12'); }
  function starIcon(x, y, on) { starPath(ctx, x, y, 6, 3.1, 5); if (on) { fs(ctx, '#ffd84a', '#b8781a', 1); fcirc(ctx, x - 1.5, y - 0.8, 0.8, '#5a3a1a'); fcirc(ctx, x + 1.8, y + 1.4, 0.7, '#5a3a1a'); } else fs(ctx, 'rgba(255,255,255,.18)', 'rgba(255,255,255,.55)', 1); }
  function drawHUD(s, lv, W, fr) {
    panel(6, 5, 204, 19);
    bearIcon(18, 14.5); txt(ctx, '× ' + s.lives, 26, 14.5, 10, '#fff', 'left', '#7a3b57', 2.5);
    heartPath(ctx, 58, 14, 4.6); fs(ctx, '#ff6f9c', '#c9305f', 0.8); txt(ctx, String(s.hearts), 66, 14.5, 10, '#fff', 'left', '#7a3b57', 2.5);
    for (let i = 0; i < 3; i++) starIcon(100 + i * 14.5, 14.5, s.stars[i]);
    txt(ctx, String(s.score).padStart(6, '0'), 203, 14.5, 10, '#ffe9a8', 'right', '#7a3b57', 2.5);
    panel(322, 5, 152, 19);
    txt(ctx, 'Welt ' + (lv.wi + 1) + '-' + (lv.li + 1), 330, 14.5, 10, '#fff', 'left', '#7a3b57', 2.5);
    const low = s.time < 60, tc = low && (fr >> 4) % 2 ? '#ff6f9c' : (low ? '#ffb3c6' : '#fff');
    fcirc(ctx, 422, 14.5, 4.6, 'rgba(255,255,255,.9)', '#7a3b57', 1); ctx.strokeStyle = '#7a3b57'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(422, 14.5); ctx.lineTo(422, 11.5); ctx.moveTo(422, 14.5); ctx.lineTo(424.2, 15.5); ctx.stroke();
    txt(ctx, String(s.time), 468, 14.5, 10, tc, 'right', '#7a3b57', 2.5);
    let boss = null; for (const e of G.ents) if (e.kind === 'boss' && e.active) { boss = e; break; }
    if (boss) { txt(ctx, boss.name, VW / 2, 32, 11, '#fff', 'center', '#7a3b57', 3); for (let i = 0; i < boss.maxHp; i++) { const hx = VW / 2 - boss.maxHp * 7 + i * 14 + 5; heartPath(ctx, hx, 45, 5); fs(ctx, i < boss.hp ? '#ff6f9c' : 'rgba(0,0,0,.35)', i < boss.hp ? '#c9305f' : 'rgba(255,255,255,.4)', 0.9); } }
  }

  /* ================= frame and API ================= */
  G.draw = {
    init(c) { canvas = c; ctx = c.getContext('2d'); k = (c.height / VH) || 1; sk = clamp(k, 1, 4); ctx.imageSmoothingEnabled = true; },
    resize(cssW, cssH) {
      if (!canvas) return; const dpr = Math.max(1, window.devicePixelRatio || 1); let bw = Math.round(parseFloat(cssW) * dpr), bh = Math.round(parseFloat(cssH) * dpr);
      if (!(bw > 0) || !(bh > 0)) return; if (bw > 2048) { bh = Math.round(bh * 2048 / bw); bw = 2048; }
      if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
      k = canvas.height / VH; const nsk = clamp(k, 1, 4); if (Math.abs(nsk - sk) > 0.01) { sk = nsk; sprites.clear(); }
    },
    frame() {
      if (!ctx) return;
      ctx.setTransform(k, 0, 0, k, 0, 0); ctx.imageSmoothingEnabled = true; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (G.S.mode === 'dive' && G.dive && G.dive.frame) { G.dive.frame(ctx, k); return; }
      const s = S(), p = P(), lv = L(); if (!lv) { ctx.fillStyle = '#ffc9dc'; ctx.fillRect(0, 0, VW, VH); return; }
      const W = lv.world, fr = s.frames, cam = s.cam, shx = s.shake > 0 ? (Math.random() - 0.5) * s.shake : 0, shy = s.shake > 0 ? (Math.random() - 0.5) * s.shake : 0;
      if (s.room === 1) drawCave(cam, fr); else drawBackground(W, cam, fr);
      ctx.save(); ctx.translate(snap(-cam + shx), snap(OFFY + shy));
      const c0 = Math.max(0, Math.floor(cam / T) - 4), c1 = Math.min(lv.w - 1, Math.floor((cam + VW) / T) + 4);
      for (let cx = c0; cx <= c1; cx++) { const col = lv.cols[cx]; for (let cy = 0; cy < MH; cy++) { const ch = col[cy]; if (ch === '-' || ch === 'W' || ch === 'A') continue; let by = 0; for (const b of G.bumps) if (b.cx === cx && b.cy === cy) by = -Math.sin(b.t / 0.25 * Math.PI) * 6; for (const q of G.crumbles) if (q.cx === cx && q.cy === cy && !q.gone) by = (Math.random() - 0.5) * 2; drawTile(ch, cx, cy, cx * T, cy * T + by, fr); } }
      const tileAt = E().tileAt;
      for (const e of G.ents) if (e.alive && (e.kind === 'walker' || e.kind === 'spiky' || e.kind === 'thrower' || e.kind === 'milk' || (e.kind === 'boss' && e.look !== 'flyer' && e.active))) shadow(e.x, e.w, e.y, e.h, tileAt, 3);
      if (!p.dead && !p.climbing) shadow(p.x, p.w, p.y, p.h, tileAt, 8);
      for (const e of G.ents) { if (e.kind === 'bean' || e.kind === 'shot') continue; if (G.fx && G.fx.ent && G.fx.ent(ctx, e, fr)) continue; drawEnt(e, fr); }
      if (G.fx && G.fx.playerBack) G.fx.playerBack(ctx, p, fr);
      if (p.inv > 0 && (fr >> 2) % 2) ctx.globalAlpha = 0.4;
      drawBear(p.x, p.y, p.big, p.anim, p.facing, !p.onGround && !G.goalSeq && !p.climbing, false, false, p.sx, p.sy, p.gliding);
      ctx.globalAlpha = 1;
      if (G.fx && G.fx.playerFront) G.fx.playerFront(ctx, p, fr);
      for (const e of G.ents) { if (e.kind !== 'bean' && e.kind !== 'shot') continue; if (G.fx && G.fx.ent && G.fx.ent(ctx, e, fr)) continue; drawEnt(e, fr); }
      for (const q of G.parts) { if (G.fx && G.fx.particle && G.fx.particle(ctx, q, fr)) continue; drawParticle(q, fr, W); }
      ctx.restore();
      drawWeather(W, fr, s);
      grade(W, s);
      if (G.fx && G.fx.overlay) G.fx.overlay(ctx, fr);
      if (s.mode !== 'hub') drawHUD(s, lv, W, fr);
      if (G.fx && G.fx.hud) G.fx.hud(ctx, fr);
    },
    drawBear, drawBearAt, drawEnt, drawTile, sprite: spr, get ctx() { return ctx; }, get k() { return k; },
  };
})();
