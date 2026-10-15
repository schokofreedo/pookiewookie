/* The Starway Home: art for the Halloween event world "Gruselnacht / Spooky Night" (world key 'halloween'). Loaded after p/art.js.
   Hooks (each returns true when it drew):
   G.art.bg(ctx, W, cam, fr, VW)          the whole backdrop: purple-to-orange night sky, stars, a huge moon with bats and wisps of cloud,
                                           a castle far away, layered haunted hills with twisted trees and gravestones, drifting fog, will-o'-wisps
   G.art.decoTile(ctx, W, x, y, cx, fr, ch) level decorations ('d' or no ch): glowing pumpkins, gravestones, candles, crooked signposts, a pumpkin
                                           in a witch hat; with ch 'p' a twisted tree with blinking eyes, 'h' a pumpkin patch, 'f' a signpost
   G.art.ent(ctx, e, fr)                    chained onto art.js: jack-o'-lanterns (walker 'jacko'), ghosts and bats (flyer 'ghost'),
                                           dangling spiders (spiky 'spider'), flying brooms carrying a plank (platformH/V 'broom')
   G.art.menuHalloween(ctx, VW, t)          menu dressing: a big orange moon, flitting bats, glowing pumpkins in the corners, soft fog
   Static layers are cached in offscreen canvases at the backing-store scale. */
(function () {
  const G = window.PW = window.PW || {}, PI = Math.PI, TAU = PI * 2, VH = 270, T = 16;
  const mod = (a, n) => ((a % n) + n) % n, clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const OL = '#24102e';
  function rnd(seed) { let s = (seed * 9301 + 49297) % 233280 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); }
  function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.01, r), 0, TAU); }
  function fs(c, fill, stroke, lw) { if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); } }
  function rr(c, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  const flick = (t, s) => 0.82 + Math.sin(t * 11.3 + s) * 0.08 + Math.sin(t * 23.7 + s * 2.1) * 0.06 + Math.sin(t * 5.1 + s * 0.7) * 0.04;

  /* ---------- offscreen cache: keyed by the context's current scale so menu and game share it ---------- */
  const cache = new Map();
  function scaleOf(c) { let a = 1; try { const m = c.getTransform(); a = Math.hypot(m.a, m.b); } catch (e) {} return clamp(Math.round(a * 4) / 4, 1, 4); }
  function spr(c, key, w, h, fn) {
    const sk = scaleOf(c), k = key + '@' + sk; let s = cache.get(k); if (s) return s;
    if (cache.size > 48) cache.clear();
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil(w * sk)); cv.height = Math.max(1, Math.ceil(h * sk));
    const g = cv.getContext('2d'); g.setTransform(sk, 0, 0, sk, 0, 0); g.lineJoin = 'round'; g.lineCap = 'round';
    fn(g, w, h); s = {c: cv, w, h}; cache.set(k, s); return s;
  }
  /* a seamless horizontal strip: the content is painted at -w, 0 and +w so the wrap never shows */
  function strip(c, key, w, h, fn) { return spr(c, key, w, h, (g) => { for (let o = -w; o <= w; o += w) { g.save(); g.translate(o, 0); fn(g, w, h); g.restore(); } }); }
  function drawStrip(c, s, y, scroll, VW, alpha) { let x = -mod(scroll, s.w); if (alpha !== undefined) c.globalAlpha = alpha; for (; x < VW; x += s.w) c.drawImage(s.c, x, y, s.w, s.h); c.globalAlpha = 1; }
  function blit(c, s, x, y) { c.drawImage(s.c, x, y, s.w, s.h); }

  /* ================= shared silhouettes ================= */
  /* a twisted, curly bare tree */
  function tree(g, x, y, h, seed, col, grow) {
    const r = rnd(seed), gw = grow || 0; g.strokeStyle = col; g.fillStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
    const tw = h * 0.07, lean = (r() - 0.5) * 0.35;
    g.beginPath(); g.moveTo(x - tw * 1.9, y + 1); g.quadraticCurveTo(x - tw * 0.7, y - h * 0.08, x - tw * 0.55, y - h * 0.3); g.quadraticCurveTo(x - tw * 0.2 + lean * h * 0.3, y - h * 0.5, x + lean * h * 0.45, y - h * 0.58);
    g.lineTo(x + lean * h * 0.45 + tw * 0.5, y - h * 0.56); g.quadraticCurveTo(x + tw * 0.6 + lean * h * 0.25, y - h * 0.42, x + tw * 0.6, y - h * 0.25); g.quadraticCurveTo(x + tw * 0.8, y - h * 0.06, x + tw * 2.1, y + 1); g.closePath(); g.fill(); if (gw) { g.lineWidth = gw; g.stroke(); }
    const branch = (bx, by, a, len, w, d) => {
      const bend = (r() - 0.5) * 1.0, ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len;
      g.lineWidth = w + gw; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + Math.cos(a + bend) * len * 0.6, by + Math.sin(a + bend) * len * 0.6, ex, ey); g.stroke();
      if (d <= 0) { const cr = len * 0.22, s = r() < 0.5 ? 1 : -1; g.lineWidth = w * 0.8 + gw; g.beginPath(); g.arc(ex + Math.cos(a + s * PI / 2) * cr, ey + Math.sin(a + s * PI / 2) * cr, cr, a - s * PI / 2, a - s * PI / 2 + s * 4.2, s < 0); g.stroke(); return; }
      const n = d >= 2 ? 2 : 2 + (r() < 0.45 ? 1 : 0);
      for (let i = 0; i < n; i++) branch(ex, ey, a + (i - (n - 1) / 2) * (0.6 + r() * 0.35) + (r() - 0.5) * 0.25, len * (0.6 + r() * 0.16), w * 0.6, d - 1);
    };
    const tx = x + lean * h * 0.45, ty = y - h * 0.57;
    branch(tx, ty, -PI / 2 - 0.55 + lean, h * 0.3, tw * 0.75, 2); branch(tx, ty, -PI / 2 + 0.5 + lean, h * 0.32, tw * 0.75, 2);
    branch(x - tw * 0.3, y - h * 0.36, -PI + 0.5, h * 0.2, tw * 0.5, 1);
  }
  function grave(g, x, y, w, h, kind, rot, col, rim) {
    g.save(); g.translate(x, y); g.rotate(rot || 0);
    const shape = () => {
      g.beginPath();
      if (kind === 'cross') { const a = w * 0.32; g.rect(-a / 2, -h, a, h); g.rect(-w / 2, -h * 0.78, w, a); }
      else if (kind === 'obelisk') { g.moveTo(-w / 2, 0); g.lineTo(-w * 0.32, -h * 0.82); g.lineTo(0, -h); g.lineTo(w * 0.32, -h * 0.82); g.lineTo(w / 2, 0); g.closePath(); }
      else { g.moveTo(-w / 2, 0); g.lineTo(-w / 2, -h + w / 2); g.arc(0, -h + w / 2, w / 2, PI, 0); g.lineTo(w / 2, 0); g.closePath(); }
    };
    shape(); g.fillStyle = col; g.fill();
    if (rim) { g.save(); shape(); g.clip(); g.strokeStyle = rim; g.lineWidth = 1.6; g.translate(-1.1, 1.1); shape(); g.stroke(); g.restore(); }
    g.restore();
  }
  function pumpkinShape(g, x, y, r) { g.beginPath(); for (const [dx, rx, ry] of [[-0.5, 0.62, 0.86], [0.5, 0.62, 0.86], [0, 0.7, 0.92]]) { g.moveTo(x + dx * r + rx * r, y); g.ellipse(x + dx * r, y, rx * r, ry * r, 0, 0, TAU); } }
  /* a glowing carved face, centred at (x, y), size r (r ~ pumpkin radius) */
  function carvedFace(g, x, y, r, f, glow, happy) {
    const k = r / 6, mean = false; g.save(); g.translate(x, y); g.scale(k * f, k);
    g.beginPath();
    if (happy) { for (const ex of [-2.2, 2.4]) { g.moveTo(ex - 1.6, -0.7); g.quadraticCurveTo(ex, -4.4, ex + 1.6, -0.7); g.quadraticCurveTo(ex, -2.4, ex - 1.6, -0.7); g.closePath(); } }
    else { g.moveTo(-3.6, -0.6); g.lineTo(-2.2, -3.4); g.lineTo(-0.8, -0.6); g.closePath(); g.moveTo(0.9, -0.6); g.lineTo(2.4, -3.5); g.lineTo(3.9, -0.6); g.closePath(); }
    g.moveTo(-3.8, 0.9); g.quadraticCurveTo(0, 2.4, 4.0, 0.9); g.quadraticCurveTo(3.4, 4.0, 0.1, 4.0); g.quadraticCurveTo(-3.2, 4.0, -3.8, 0.9); g.closePath();
    if (glow > 0) { const gr = g.createRadialGradient(0, 1.2, 0.2, 0, 1.2, 4.8); gr.addColorStop(0, '#fffbe0'); gr.addColorStop(0.5, '#ffd84a'); gr.addColorStop(1, '#ff8a1e'); g.fillStyle = gr; g.fill(); if (glow < 1) { g.fillStyle = 'rgba(200,70,10,' + ((1 - glow) * 0.7).toFixed(3) + ')'; g.fill(); } }
    else { g.fillStyle = '#3a1208'; g.fill(); }
    /* teeth */
    g.fillStyle = mean ? '#e06414' : '#ff8a2a'; g.fillRect(-1.6, 1.2, 1.2, 1.0); g.fillRect(1.0, 2.9, 1.2, 1.1); if (mean) g.fillRect(2.4, 1.0, 1.0, 0.9);
    g.restore();
  }
  function glowDot(c, x, y, r, col, a) { const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col.replace('A', a)); gr.addColorStop(1, col.replace('A', 0)); c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2); }

  /* ================= backdrop layers ================= */
  function skySpr(c) {
    return spr(c, 'hw-sky', 2, VH, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, VH);
      gr.addColorStop(0, '#0c0622'); gr.addColorStop(0.26, '#211046'); gr.addColorStop(0.45, '#46195f'); gr.addColorStop(0.57, '#84296b'); gr.addColorStop(0.66, '#cc4b62'); gr.addColorStop(0.74, '#ff8a4e'); gr.addColorStop(1, '#ffb466');
      g.fillStyle = gr; g.fillRect(0, 0, 2, VH);
    });
  }
  function starsSpr(c) {
    return strip(c, 'hw-stars', 640, 150, (g, w) => {
      const r = rnd(11);
      for (let i = 0; i < 110; i++) { const x = r() * w, y = r() * 145, s = r(); g.globalAlpha = (0.35 + s * 0.6) * (1 - y / 190); g.fillStyle = s > 0.9 ? '#ffe9c8' : '#fff'; circ(g, x, y, 0.35 + s * 0.6); g.fill(); }
      g.globalAlpha = 1;
    });
  }
  function moonSpr(c, R) {
    return spr(c, 'hw-moon' + R, R * 6, R * 6, (g) => {
      const cx = R * 3, cy = R * 3;
      let gr = g.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 3); gr.addColorStop(0, 'rgba(255,190,140,.42)'); gr.addColorStop(0.35, 'rgba(255,150,120,.16)'); gr.addColorStop(1, 'rgba(200,90,160,0)'); g.fillStyle = gr; g.fillRect(0, 0, R * 6, R * 6);
      gr = g.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.5); gr.addColorStop(0, 'rgba(255,236,190,.55)'); gr.addColorStop(1, 'rgba(255,220,160,0)'); g.fillStyle = gr; circ(g, cx, cy, R * 1.5); g.fill();
      gr = g.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R); gr.addColorStop(0, '#fffbe8'); gr.addColorStop(0.65, '#ffeec0'); gr.addColorStop(1, '#ffd890'); g.fillStyle = gr; circ(g, cx, cy, R); g.fill();
      g.save(); circ(g, cx, cy, R); g.clip();
      g.fillStyle = 'rgba(232,186,120,.32)'; for (const [dx, dy, rr0] of [[-0.35, -0.25, 0.22], [0.3, 0.32, 0.17], [0.15, -0.5, 0.11], [-0.1, 0.45, 0.1], [0.55, -0.1, 0.09], [-0.55, 0.2, 0.08]]) { circ(g, cx + dx * R, cy + dy * R, rr0 * R); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,.35)'; for (const [dx, dy, rr0] of [[-0.37, -0.28, 0.14], [0.28, 0.29, 0.1]]) { circ(g, cx + dx * R - rr0 * R * 0.25, cy + dy * R - rr0 * R * 0.25, rr0 * R * 0.7); g.fill(); }
      gr = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R); gr.addColorStop(0.55, 'rgba(255,140,80,0)'); gr.addColorStop(1, 'rgba(255,140,80,.35)'); g.fillStyle = gr; g.fillRect(cx - R, cy - R, R * 2, R * 2);
      g.restore();
    });
  }
  function cloudSpr(c, n) {
    return spr(c, 'hw-cloud' + n, 150, 34, (g) => {
      const r = rnd(40 + n); g.fillStyle = 'rgba(42,16,70,.62)';
      for (let i = 0; i < 9; i++) { const x = 18 + i * 13 + r() * 6, y = 18 + (r() - 0.5) * 6 + Math.abs(i - 4) * 0.8, rx = 10 + r() * 10, ry = 4 + r() * 3.5; ell(g, x, y, rx, ry); g.fill(); }
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,190,150,.28)'; g.fillRect(0, 0, 150, 13); g.globalCompositeOperation = 'source-over';
    });
  }
  /* far: distant hills, a castle on a crag, tiny trees (screen y 96..230) */
  function farSpr(c) {
    return strip(c, 'hw-far', 760, 134, (g, w, h) => {
      const col = '#3a1c5a', ridge = x => 92 - Math.sin(x / w * TAU * 2 + 0.6) * 8 - Math.sin(x / w * TAU * 5 + 2) * 3.5 - Math.exp(-Math.pow((x - 500) / 60, 2)) * 26;
      g.fillStyle = col; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 4) g.lineTo(x, ridge(x)); g.lineTo(w, h); g.closePath(); g.fill();
      /* rim light from the horizon glow */
      g.strokeStyle = 'rgba(255,150,120,.28)'; g.lineWidth = 1.2; g.beginPath(); for (let x = 0; x <= w; x += 4) { if (x) g.lineTo(x, ridge(x) + 0.6); else g.moveTo(x, ridge(x) + 0.6); } g.stroke();
      for (const [x, hh, s] of [[70, 22, 3], [212, 17, 4], [262, 13, 5], [650, 24, 6]]) tree(g, x, ridge(x) + 1, hh, s, col);
      /* the castle */
      const cx = 500, by = ridge(500) + 2, cc = '#2c1546';
      g.fillStyle = cc;
      const tower = (x, top, wd, roof) => { g.fillRect(x - wd / 2, top, wd, by - top + 2); g.beginPath(); g.moveTo(x - wd / 2 - 2.2, top + 0.5); g.quadraticCurveTo(x - 1, top - roof * 0.45, x, top - roof); g.quadraticCurveTo(x + 1, top - roof * 0.45, x + wd / 2 + 2.2, top + 0.5); g.closePath(); g.fill(); };
      g.fillRect(cx - 22, by - 38, 44, 40); for (let i = 0; i < 6; i++) g.fillRect(cx - 22 + i * 8, by - 42, 4.5, 5);
      tower(cx - 26, by - 54, 11, 17); tower(cx + 25, by - 62, 13, 22); tower(cx - 2, by - 66, 10, 20); tower(cx + 39, by - 36, 8, 12); tower(cx - 38, by - 34, 7, 10);
      g.fillRect(cx + 24.6, by - 92, 0.9, 10); g.beginPath(); g.moveTo(cx + 25.5, by - 92); g.quadraticCurveTo(cx + 30, by - 91, cx + 33, by - 89.5); g.quadraticCurveTo(cx + 29, by - 88.5, cx + 25.5, by - 87); g.closePath(); g.fill();
      /* lit windows with a soft glow */
      const win = (x, y, ww, hh) => { const gr = g.createRadialGradient(x, y, 0, x, y, 6); gr.addColorStop(0, 'rgba(255,190,90,.45)'); gr.addColorStop(1, 'rgba(255,190,90,0)'); g.fillStyle = gr; g.fillRect(x - 6, y - 6, 12, 12); g.fillStyle = '#ffd36a'; g.beginPath(); g.moveTo(x - ww / 2, y + hh / 2); g.lineTo(x - ww / 2, y - hh / 2 + ww / 2); g.arc(x, y - hh / 2 + ww / 2, ww / 2, PI, 0); g.lineTo(x + ww / 2, y + hh / 2); g.closePath(); g.fill(); };
      win(cx - 26, by - 44, 2.6, 4); win(cx + 25, by - 50, 3, 4.6); win(cx + 25, by - 38, 2.6, 3.8); win(cx - 2, by - 54, 2.6, 4); win(cx - 12, by - 26, 2.4, 3.6); win(cx + 10, by - 24, 2.4, 3.6);
      g.fillStyle = '#1c0c30'; g.beginPath(); g.moveTo(cx - 5, by + 2); g.lineTo(cx - 5, by - 9); g.arc(cx, by - 9, 5, PI, 0); g.lineTo(cx + 5, by + 2); g.closePath(); g.fill();
    });
  }
  /* mid: haunted hills, twisted trees, a crooked little house, small graves (screen y 140..250) */
  function midSpr(c) {
    return strip(c, 'hw-mid', 620, 110, (g, w, h) => {
      const col = '#26113f', ridge = x => 58 - Math.sin(x / w * TAU * 2 + 1.7) * 9 - Math.sin(x / w * TAU * 3 + 0.3) * 4;
      g.fillStyle = col; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 4) g.lineTo(x, ridge(x)); g.lineTo(w, h); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(200,120,200,.18)'; g.lineWidth = 1; g.beginPath(); for (let x = 0; x <= w; x += 4) { if (x) g.lineTo(x, ridge(x) + 0.5); else g.moveTo(x, ridge(x) + 0.5); } g.stroke();
      tree(g, 70, ridge(70) + 2, 58, 21, col); tree(g, 352, ridge(352) + 2, 46, 23, col); tree(g, 548, ridge(548) + 2, 66, 27, col);
      for (const [x, ww, hh, k, rot] of [[150, 7, 10, 'round', -0.08], [166, 5, 8, 'cross', 0.1], [418, 8, 11, 'round', 0.06], [436, 5, 7, 'round', -0.12], [452, 6, 9, 'cross', 0.04]]) grave(g, x, ridge(x) + 2, ww, hh, k, rot, col);
      /* a crooked little house with a lit window */
      const hx = 250, hy = ridge(250) + 3; g.save(); g.translate(hx, hy); g.rotate(0.04); g.fillStyle = col;
      g.fillRect(-13, -20, 26, 21); g.beginPath(); g.moveTo(-17, -19); g.lineTo(-2, -36); g.lineTo(16, -18); g.closePath(); g.fill(); g.fillRect(6, -34, 4, 10);
      const gr = g.createRadialGradient(-5, -11, 0, -5, -11, 9); gr.addColorStop(0, 'rgba(255,170,80,.5)'); gr.addColorStop(1, 'rgba(255,170,80,0)'); g.fillStyle = gr; g.fillRect(-14, -20, 18, 18);
      g.fillStyle = '#ffc45a'; g.fillRect(-7.5, -14, 5, 5); g.fillStyle = col; g.fillRect(-5.4, -14, 0.8, 5); g.fillRect(-7.5, -11.9, 5, 0.8); g.fillStyle = '#ffc45a'; g.fillRect(4, -9, 3, 3);
      g.restore();
    });
  }
  /* near: dark hills, big gravestones, a crooked fence, a tree, glowing pumpkins (screen y 176..266) */
  function nearSpr(c) {
    return strip(c, 'hw-near', 540, 90, (g, w, h) => {
      const col = '#190b2b', rim = 'rgba(190,150,255,.32)', ridge = x => 56 - Math.sin(x / w * TAU * 3 + 0.9) * 6 - Math.sin(x / w * TAU * 7) * 2;
      g.fillStyle = col; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 4) g.lineTo(x, ridge(x)); g.lineTo(w, h); g.closePath(); g.fill();
      tree(g, 400, ridge(400) + 2, 60, 31, col);
      for (const [x, ww, hh, k, rot] of [[38, 11, 20, 'cross', -0.1], [118, 13, 17, 'round', 0.07], [138, 8, 11, 'round', -0.14], [302, 12, 19, 'round', -0.06], [470, 9, 22, 'obelisk', 0.05], [496, 9, 12, 'round', 0.12]]) grave(g, x, ridge(x) + 3, ww, hh, k, rot, col, rim);
      /* crooked fence */
      g.fillStyle = col; for (let i = 0; i < 8; i++) { const x = 186 + i * 10, b = ridge(x) + 4, ht = 15 + (i % 3) * 2, a = (i % 2 ? 0.07 : -0.06) + (i === 5 ? 0.18 : 0); g.save(); g.translate(x, b); g.rotate(a); g.beginPath(); g.moveTo(-1.8, 0); g.lineTo(-1.8, -ht + 2); g.lineTo(0, -ht); g.lineTo(1.8, -ht + 2); g.lineTo(1.8, 0); g.closePath(); g.fill(); g.restore(); }
      g.save(); g.lineWidth = 2.2; g.strokeStyle = col; for (const yy of [-6, -11]) { g.beginPath(); g.moveTo(184, ridge(186) + yy + 3); g.lineTo(258, ridge(256) + yy + 4); g.stroke(); } g.restore();
      /* pumpkins with glowing faces */
      for (const [x, r, hp] of [[86, 5.2, 0], [97, 3.4, 0], [232, 4.6, 1], [352, 6, 0]]) { const y = ridge(x) + 2 - r * 0.8; const gr = g.createRadialGradient(x, y, 0, x, y, r * 3); gr.addColorStop(0, 'rgba(255,150,50,.35)'); gr.addColorStop(1, 'rgba(255,150,50,0)'); g.fillStyle = gr; g.fillRect(x - r * 3, y - r * 3, r * 6, r * 6); pumpkinShape(g, x, y, r); g.fillStyle = '#5a2410'; g.fill(); g.fillStyle = '#3a2410'; g.fillRect(x - 0.6, y - r - 2, 1.4, 2.6); if (r > 4) carvedFace(g, x + 0.3, y - 0.2, r * 0.82, 1, 1, hp); }
    });
  }
  function fogSpr(c) {
    return strip(c, 'hw-fog', 520, 56, (g, w) => {
      const r = rnd(77);
      for (let i = 0; i < 16; i++) { const x = r() * w, y = 30 + (r() - 0.5) * 16, rx = 26 + r() * 40, ry = 8 + r() * 8; g.save(); g.translate(x, y); g.scale(rx / ry, 1); const gr = g.createRadialGradient(0, 0, 0, 0, 0, ry); gr.addColorStop(0, 'rgba(214,190,255,.34)'); gr.addColorStop(1, 'rgba(214,190,255,0)'); g.fillStyle = gr; g.fillRect(-ry, -ry, ry * 2, ry * 2); g.restore(); }
    });
  }
  /* a bat silhouette; flap in -1..1 */
  function batPath(c, x, y, s, flap, f) {
    c.save(); c.translate(x, y); c.scale(s * (f || 1), s); const wy = flap * 3.4;
    c.beginPath(); c.ellipse(0, 0.2, 1.7, 2.3, 0, 0, TAU);
    c.moveTo(-1.3, -1.4); c.lineTo(-1.1, -3.4); c.lineTo(-0.3, -2.0); c.lineTo(0.3, -2.0); c.lineTo(1.1, -3.4); c.lineTo(1.3, -1.4);
    for (const d of [-1, 1]) { c.moveTo(d * 1.0, -0.9); c.quadraticCurveTo(d * 4.4, -3.4 - wy * 0.7, d * 8, -1.6 - wy); c.quadraticCurveTo(d * 7.3, -0.3 - wy * 0.75, d * 6.0, 0.9 - wy * 0.55); c.quadraticCurveTo(d * 5.0, -0.1 - wy * 0.4, d * 3.7, 1.4 - wy * 0.25); c.quadraticCurveTo(d * 2.6, 0.6, d * 1.0, 1.2); c.closePath(); }
    c.restore();
  }

  function drawBg(c, W, cam, fr, VW) {
    const t = fr / 60;
    c.drawImage(skySpr(c).c, 0, 0, VW, VH);
    /* stars: a cached field plus a few twinklers */
    drawStrip(c, starsSpr(c), 0, cam * 0.01, VW);
    { const r = rnd(5); c.fillStyle = '#fff'; for (let i = 0; i < 16; i++) { const x = mod(r() * 700 - cam * 0.01, VW), y = 6 + r() * 110, p = r() * TAU, tw = Math.max(0, Math.sin(t * (1.2 + r()) + p)); if (tw < 0.05) continue; const s = 0.8 + tw * 1.8; c.globalAlpha = tw * 0.9; c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s, y); c.quadraticCurveTo(x, y, x, y + s); c.quadraticCurveTo(x, y, x - s, y); c.quadraticCurveTo(x, y, x, y - s); c.fill(); } c.globalAlpha = 1; }
    /* a shooting star now and then (Toffo and Mallo used to count them) */
    { const ph = mod(fr, 720); if (ph < 46) { const k = ph / 46, sx = VW * 0.15 + mod(Math.floor(fr / 720) * 173, VW * 0.5), sy = 18 + mod(Math.floor(fr / 720) * 37, 40), x = sx + k * 110, y = sy + k * 38; const gr = c.createLinearGradient(x - 34, y - 12, x, y); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,245,220,' + (0.9 * Math.sin(k * PI)) + ')'); c.strokeStyle = gr; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x - 34, y - 12); c.lineTo(x, y); c.stroke(); } }
    /* the moon, wisps of cloud drifting across it, bats flying past */
    const R = 40, mx = VW * 0.72 - cam * 0.008, my = 74;
    blit(c, moonSpr(c, R), mx - R * 3, my - R * 3);
    for (let i = 0; i < 3; i++) { const s = cloudSpr(c, i % 2), x = mod(i * 260 + 120 - t * (3 + i) - cam * 0.02, VW + 340) - 170, y = 48 + i * 22; c.globalAlpha = 0.85; blit(c, s, x, y); }
    c.globalAlpha = 1;
    c.fillStyle = '#1a0b29';
    for (let i = 0; i < 6; i++) { const sp = 18 + (i % 3) * 7, x = mod(-t * sp + i * 97 + 300, VW + 220) - 110, y = 46 + (i * 17) % 50 + Math.sin(t * 1.6 + i * 2) * 9, fl = Math.sin(t * (13 + i) + i * 1.3); batPath(c, x, y, 0.75 + (i % 3) * 0.22, fl, -1); c.fill(); }
    /* layered hills with fog between them */
    drawStrip(c, farSpr(c), 96, cam * 0.05, VW);
    drawStrip(c, fogSpr(c), 160, cam * 0.08 + t * 3, VW, 0.75);
    drawStrip(c, midSpr(c), 142, cam * 0.15, VW);
    /* will-o'-wisps over the graveyard */
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) { const x = mod(i * 83 + Math.sin(t * 0.4 + i) * 24 - cam * 0.2, VW + 40) - 20, y = 186 + (i * 29) % 40 + Math.sin(t * 0.9 + i * 1.7) * 6, a = 0.35 + 0.45 * Math.max(0, Math.sin(t * 1.3 + i * 2.3)); glowDot(c, x, y, 5, i % 3 ? 'rgba(255,170,70,A)' : 'rgba(150,255,170,A)', a * 0.55); c.globalAlpha = a; c.fillStyle = i % 3 ? '#ffe2a0' : '#d8ffd8'; circ(c, x, y, 0.8); c.fill(); c.globalAlpha = 1; }
    c.restore();
    drawStrip(c, fogSpr(c), 196, cam * 0.22 + t * 6 + 200, VW, 0.85);
    drawStrip(c, nearSpr(c), 176, cam * 0.3, VW);
    drawStrip(c, fogSpr(c), 222, cam * 0.4 + t * 9 + 90, VW, 0.55);
    return true;
  }

  /* ================= level decorations (tile left x, tile top y; ground at y + 16) ================= */
  function halo(c, x, y, r, a) { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, x, y, r, 'rgba(255,150,50,A)', a); c.restore(); }
  function lantern(c, x, y, r, fr, seed, hat) {
    const t = fr / 60, k = flick(t, seed);
    halo(c, x, y, r * 2.6, 0.32 * k);
    pumpkinShape(c, x, y, r); fs(c, '#ff8a2a', OL, 1);
    c.save(); pumpkinShape(c, x, y, r); c.clip(); c.strokeStyle = 'rgba(176,64,20,.7)'; c.lineWidth = 0.8; for (const dx of [-0.42, 0.42]) { c.beginPath(); c.moveTo(x + dx * r, y - r); c.quadraticCurveTo(x + dx * r * 1.7, y, x + dx * r, y + r); c.stroke(); } ell(c, x - r * 0.45, y - r * 0.45, r * 0.18, r * 0.32, 0.4); c.fillStyle = 'rgba(255,255,255,.38)'; c.fill(); c.restore();
    carvedFace(c, x + r * 0.05, y - r * 0.05, r * 0.85, 1, k, hat);
    if (hat) {
      c.save(); c.translate(x + 0.5, y - r * 0.82); c.rotate(-0.12);
      ell(c, 0, 0, r * 1.15, r * 0.28); fs(c, '#3a2458', OL, 1);
      c.beginPath(); c.moveTo(-r * 0.62, -r * 0.1); c.quadraticCurveTo(-r * 0.3, -r * 1.2, r * 0.25, -r * 1.75); c.quadraticCurveTo(r * 0.5, -r * 1.9, r * 0.9, -r * 1.55); c.quadraticCurveTo(r * 0.3, -r * 1.3, r * 0.62, -r * 0.1); c.closePath(); fs(c, '#4a2c6e', OL, 1);
      c.fillStyle = '#ff8a2a'; c.fillRect(-r * 0.6, -r * 0.42, r * 1.22, r * 0.26); c.fillStyle = '#ffd84a'; c.fillRect(-r * 0.12, -r * 0.46, r * 0.26, r * 0.34);
      c.restore();
    } else { c.fillStyle = '#6a5a24'; rr(c, x - 0.9, y - r - 2.6, 2, 3.2, 0.8); c.fill(); c.strokeStyle = OL; c.lineWidth = 0.7; c.stroke(); c.strokeStyle = '#6fbf4a'; c.lineWidth = 0.8; c.beginPath(); c.arc(x - 2.4, y - r - 1.4, 1.3, 0, 4.4); c.stroke(); }
  }
  function plainPumpkin(c, x, y, r, col) {
    pumpkinShape(c, x, y, r); fs(c, col || '#ff9a3a', OL, 1);
    c.save(); pumpkinShape(c, x, y, r); c.clip(); c.strokeStyle = 'rgba(176,64,20,.6)'; c.lineWidth = 0.7; for (const dx of [-0.42, 0.42]) { c.beginPath(); c.moveTo(x + dx * r, y - r); c.quadraticCurveTo(x + dx * r * 1.7, y, x + dx * r, y + r); c.stroke(); } ell(c, x - r * 0.4, y - r * 0.45, r * 0.18, r * 0.3, 0.4); c.fillStyle = 'rgba(255,255,255,.4)'; c.fill(); c.restore();
    c.fillStyle = '#6a5a24'; rr(c, x - 0.7, y - r - 1.8, 1.5, 2.4, 0.6); c.fill();
  }
  function candle(c, x, b, h, fr, seed) {
    const t = fr / 60, k = flick(t * 1.4, seed), sway = Math.sin(t * 7 + seed) * 0.5;
    rr(c, x - 1.6, b - h, 3.2, h, 0.8); fs(c, '#f6eedb', OL, 0.8);
    c.fillStyle = '#e4d6b8'; c.fillRect(x + 0.5, b - h + 0.5, 0.9, h - 1);
    c.fillStyle = '#f6eedb'; ell(c, x - 0.9, b - h + 1.8, 0.55, 1.4); c.fill();
    c.strokeStyle = OL; c.lineWidth = 0.6; c.beginPath(); c.moveTo(x, b - h); c.lineTo(x, b - h - 1.2); c.stroke();
    halo(c, x, b - h - 3, 9, 0.35 * k);
    const fh = 3.6 * k; c.beginPath(); c.moveTo(x - 1.2, b - h - 1.4); c.quadraticCurveTo(x - 1.3, b - h - 1.4 - fh * 0.6, x + sway, b - h - 1.4 - fh); c.quadraticCurveTo(x + 1.3, b - h - 1.4 - fh * 0.6, x + 1.2, b - h - 1.4); c.quadraticCurveTo(x, b - h - 0.4, x - 1.2, b - h - 1.4); c.closePath(); c.fillStyle = '#ffb83a'; c.fill();
    ell(c, x + sway * 0.4, b - h - 2.4, 0.55, 1.1); c.fillStyle = '#fff6c8'; c.fill();
  }
  /* a foreground twisted tree (tile 'p'): outline pass, bark, a moonlit rim; a knot hole where two eyes blink */
  function treeSpr(c, n) {
    return spr(c, 'hw-ptree' + n, 76, 84, (g) => {
      const seed = 50 + n * 7, h = 60 + n * 5;
      tree(g, 38, 82, h, seed, OL, 2.4); tree(g, 38, 82, h, seed, '#3c2450');
      g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(150,120,200,.35)'; g.fillRect(41, 0, 40, 84); g.fillStyle = 'rgba(20,6,30,.35)'; g.fillRect(0, 0, 33, 84); g.restore();
      ell(g, 38.5, 82 - h * 0.3, 2.8, 3.6); g.fillStyle = '#140818'; g.fill();
      plainPumpkin(g, 50, 78.5, 4.2, '#ff9a3a');
    });
  }
  function drawDeco(c, W, x, y, cx, fr, ch) {
    const b = y + 16, m = x + 8;
    let v = mod(cx * 7 + (cx >> 2), 5);
    if (ch === 'p') {
      const n = mod(cx, 3), s = treeSpr(c, n), h = 60 + n * 5; blit(c, s, m - 38, b - 82);
      if (mod(fr + cx * 37, 260) > 12) { c.fillStyle = '#ffd84a'; circ(c, m - 0.6, b - h * 0.3 - 0.4, 0.75); c.fill(); circ(c, m + 1.6, b - h * 0.3 - 0.4, 0.75); c.fill(); }
      return true;
    }
    if (ch === 'h') { c.save(); c.translate(m, b); for (const [dx, a] of [[-6, -0.5], [5, 0.4], [-1, -0.1]]) { c.save(); c.translate(dx, -2); c.rotate(a); ell(c, 0, -3, 2.6, 4); fs(c, '#4f9a34', OL, 0.9); c.restore(); } plainPumpkin(c, -3, -4, 4.4); plainPumpkin(c, 4, -3, 3.2, '#ffa44a'); c.strokeStyle = '#6fbf4a'; c.lineWidth = 0.8; c.beginPath(); c.arc(8, -7, 1.6, 0.5, 5); c.stroke(); c.restore(); return true; }
    if (ch === 'f') v = 3;
    /* tufts of dark grass at the foot of every decoration */
    const tufts = (x0, n) => { c.fillStyle = '#2e5a3a'; for (let i = 0; i < n; i++) { const tx = x0 + i * 3.2; c.beginPath(); c.moveTo(tx - 1.4, b + 0.5); c.quadraticCurveTo(tx - 0.6, b - 3, tx + (i % 2 ? 0.9 : -0.6), b - 4.4); c.quadraticCurveTo(tx + 0.3, b - 2, tx + 1.4, b + 0.5); c.closePath(); c.fill(); } };
    if (v === 0) { plainPumpkin(c, m + 8, b - 3.6, 4.2); lantern(c, m - 1, b - 6.2, 7.2, fr, cx, false); tufts(m - 10, 3); }
    else if (v === 1) {
      const rot = ((cx % 3) - 1) * 0.07; c.save(); c.translate(m, b + 1); c.rotate(rot);
      c.beginPath(); c.moveTo(-6.5, 0); c.lineTo(-6.5, -13); c.arc(0, -13, 6.5, PI, 0); c.lineTo(6.5, 0); c.closePath(); fs(c, '#8a80a8', OL, 1);
      c.save(); c.clip(); c.fillStyle = '#a69ec4'; c.fillRect(-6.5, -21, 3, 22); c.fillStyle = 'rgba(40,20,60,.25)'; c.fillRect(3.6, -21, 3, 22); c.fillStyle = '#5e8a4a'; ell(c, -4, 0, 4, 2.4); c.fill(); ell(c, 4.6, -0.5, 3, 1.8); c.fill(); c.restore();
      c.strokeStyle = '#5a5078'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(0, -16.5); c.lineTo(0, -8.5); c.moveTo(-2.6, -13.6); c.lineTo(2.6, -13.6); c.stroke();
      c.strokeStyle = 'rgba(90,80,120,.6)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(-3.4, -5.4); c.lineTo(3.4, -5.4); c.moveTo(-2.4, -3.6); c.lineTo(2.4, -3.6); c.stroke();
      c.restore(); tufts(m - 8, 2); tufts(m + 6, 2);
      if (cx % 2) plainPumpkin(c, m + 8.5, b - 2.8, 3.1, '#ffa44a');
    }
    else if (v === 2) {
      ell(c, m, b - 1.5, 9, 3); fs(c, '#5a5070', OL, 1); c.fillStyle = '#7a7094'; ell(c, m - 2.5, b - 2.6, 4, 1.1); c.fill();
      candle(c, m - 4.5, b - 2.6, 8, fr, cx); candle(c, m + 1, b - 3.2, 12.5, fr, cx + 2.1); candle(c, m + 5.6, b - 2.4, 6, fr, cx + 4.3);
    }
    else if (v === 3) {
      c.save(); c.translate(m - 1, b + 1); c.rotate(-0.1);
      rr(c, -1.5, -26, 3, 27, 1); fs(c, '#6a4428', OL, 1);
      const board = (y0, d, rot, col) => { c.save(); c.translate(0, y0); c.rotate(rot); c.beginPath(); c.moveTo(-d * 2.5, -3.2); c.lineTo(d * 9, -3.2); c.lineTo(d * 12.5, 0); c.lineTo(d * 9, 3.2); c.lineTo(-d * 2.5, 3.2); c.closePath(); fs(c, col, OL, 1); c.strokeStyle = 'rgba(60,30,10,.35)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(-d * 1.5, -0.8); c.lineTo(d * 8, -0.6); c.stroke(); c.restore(); };
      board(-21, 1, 0.12, '#a8784a'); board(-13.5, -1, -0.1, '#9a6a3e');
      /* icons painted on the boards: a little ghost and a pumpkin */
      c.save(); c.translate(5.6, -20.4); c.rotate(0.12); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -0.6, 1.9, PI, 0); c.lineTo(1.9, 1.6); c.lineTo(0.95, 1.0); c.lineTo(0, 1.6); c.lineTo(-0.95, 1.0); c.lineTo(-1.9, 1.6); c.closePath(); c.fill(); c.fillStyle = OL; c.fillRect(-0.9, -1, 0.6, 0.8); c.fillRect(0.4, -1, 0.6, 0.8); c.restore();
      c.save(); c.translate(-5.4, -13.8); pumpkinShape(c, 0, 0, 1.9); c.fillStyle = '#ff8a2a'; c.fill(); c.fillStyle = '#4a7a2a'; c.fillRect(-0.3, -2.6, 0.8, 1); c.restore();
      c.strokeStyle = '#d8d0e8'; c.lineWidth = 0.4; c.beginPath(); c.moveTo(1.5, -24); c.lineTo(6, -23.4); c.moveTo(1.5, -24); c.lineTo(3.5, -26.5); c.stroke();
      c.restore(); tufts(m - 6, 4);
    }
    else { lantern(c, m, b - 6.4, 7, fr, cx, true); tufts(m - 9, 2); tufts(m + 6, 2); candle(c, m + 9.5, b, 5, fr, cx * 1.3); }
    return true;
  }

  /* ================= creatures ================= */
  /* dying: stomped ones squash flat, bumped ones flip and fall (entities.js moves them); both fade over 0.8 s */
  function dieXf(c, e, px, py) { const t = Math.max(0, e.dieT || 0); c.globalAlpha = Math.max(0, 1 - t / 0.8); c.translate(px, py); if (e.flip) c.scale(1, -1); else c.scale(1 + Math.min(1, t * 6) * 0.4, 1 - Math.min(1, t * 6) * 0.62); c.translate(-px, -py); }
  const faceDir = e => ((e.vx || e.lastVx || -1) < 0 ? -1 : 1);
  function jacko(c, e, fr) {
    const an = e.anim || 0, alive = e.alive, ph = alive ? mod(an * 1.5, PI) : 0, lift = Math.sin(ph) * 4.2, sq = Math.max(0, 1 - Math.sin(ph) * 4);
    const x = e.x + 7, b = e.y + 14, f = faceDir(e), k = alive ? flick(fr / 60, e.x * 0.1) : 0, air = Math.sin(ph);
    c.save(); if (!alive) dieXf(c, e, x, b);
    /* leaf feet: tucked on the ground, dangling in the air */
    for (const d of [-1, 1]) { ell(c, x + d * 3.4 * f, b - 0.9 - lift * 0.45, 2.2, 1.3, d * 0.2 + air * 0.4 * d); fs(c, '#3f7a2c', OL, 1); }
    c.translate(x, b - lift - 1.2); c.scale(f * (1 + sq * 0.16), 1 - sq * 0.16 + (ph > 0.2 && ph < PI / 2 ? 0.05 : 0)); c.rotate(alive ? Math.sin(ph * 2) * 0.08 : 0);
    if (k > 0) halo(c, 1, -6, 13, 0.34 * k);
    const LB = [[-3.8, 4.0, 5.1], [3.8, 4.0, 5.1], [0, 4.6, 5.7]], lobes = () => { c.beginPath(); for (const [dx, rx, ry] of LB) { c.moveTo(dx + rx, -6.2); c.ellipse(dx, -6.2, rx, ry, 0, 0, TAU); } };
    /* crooked stem and a curly vine */
    c.save(); c.translate(0.2, -11.4); c.rotate(-0.3); c.beginPath(); c.moveTo(-1.2, 0.6); c.quadraticCurveTo(-1.3, -2.6, 0.6, -4.2); c.lineTo(1.6, -3.2); c.quadraticCurveTo(0.6, -1.8, 1.2, 0.6); c.closePath(); fs(c, '#5e5020', OL, 1); c.restore();
    c.strokeStyle = OL; c.lineWidth = 1.7; c.beginPath(); c.arc(-3.0, -12.6, 1.7, -0.3, 4.4); c.stroke(); c.strokeStyle = '#7fcb4a'; c.lineWidth = 0.75; c.stroke();
    lobes(); c.lineWidth = 2.1; c.strokeStyle = OL; c.stroke();
    c.fillStyle = '#c9480a'; ell(c, -3.8, -6.2, 4.0, 5.1); c.fill(); ell(c, 3.8, -6.2, 4.0, 5.1); c.fill(); c.fillStyle = '#f2640f'; ell(c, 0, -6.2, 4.6, 5.7); c.fill();
    c.save(); lobes(); c.clip(); c.fillStyle = 'rgba(255,220,180,.35)'; ell(c, -2.2, -10.2, 1.4, 0.8, -0.3); c.fill(); c.fillStyle = 'rgba(80,10,0,.25)'; ell(c, 0.6, -0.6, 8, 2.4); c.fill(); c.restore();
    /* mean carved face: slanted eyes under carved brows, a wide zigzag grin */
    c.save(); c.translate(1.0, 0);
    c.beginPath();
    c.moveTo(-4.4, -8.6); c.lineTo(-0.9, -6.9); c.lineTo(-3.7, -5.6); c.closePath();
    c.moveTo(4.6, -8.8); c.lineTo(1.1, -7.0); c.lineTo(3.9, -5.6); c.closePath();
    c.moveTo(-5.0, -4.4); c.lineTo(-3.7, -3.4); c.lineTo(-2.5, -4.2); c.lineTo(-1.1, -3.2); c.lineTo(0.3, -4.1); c.lineTo(1.7, -3.2); c.lineTo(3.0, -4.1); c.lineTo(4.3, -3.3); c.lineTo(5.3, -4.5); c.quadraticCurveTo(4.6, -0.9, 0.2, -0.8); c.quadraticCurveTo(-4.3, -0.9, -5.0, -4.4); c.closePath();
    if (k > 0) { const gr = c.createRadialGradient(0, -4.2, 0.3, 0, -4.2, 5.6); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.5, '#ffc030'); gr.addColorStop(1, '#ff4a12'); c.fillStyle = gr; } else c.fillStyle = '#3a1208';
    c.fill(); c.strokeStyle = OL; c.lineWidth = 0.7; c.stroke();
    c.strokeStyle = OL; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-5.0, -10.0); c.lineTo(-1.0, -8.1); c.moveTo(5.2, -10.2); c.lineTo(1.2, -8.2); c.stroke();
    c.restore();
    c.restore();
  }
  function ghost(c, e, fr) {
    const an = e.anim || 0, x = e.x + 7, y = e.y + 6, f = faceDir(e), t = fr / 60;
    c.save(); if (!e.alive) dieXf(c, e, x, y + 6);
    c.translate(x, y); c.scale(f, 1); c.rotate(0.12);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, 0, 12, 'rgba(170,140,255,A)', 0.22); c.restore();
    const wv = an * 3, body = () => { c.beginPath(); c.moveTo(-5.4, 1); c.arc(0, -1, 5.4, PI, 0); c.lineTo(5.4, 3.4); for (let i = 0; i < 4; i++) { const x0 = 5.4 - i * 2.7, x1 = x0 - 2.7, yy = 6.4 + Math.sin(wv + i * 1.6) * 0.9 + (i === 3 ? 1.6 : 0); c.quadraticCurveTo((x0 + x1) / 2, yy + 1.8, x1, yy - 0.4); } c.quadraticCurveTo(-7.5, 5 + Math.sin(wv) * 1.2, -6.4, 3.2); c.closePath(); };
    body(); c.lineWidth = 2; c.strokeStyle = OL; c.stroke(); c.fillStyle = '#f8f5ff'; c.fill();
    c.save(); body(); c.clip(); c.fillStyle = '#ddd3f4'; c.beginPath(); c.rect(-9, -8, 18, 18); c.arc(1, -2, 5.6, 0, TAU, true); c.fill(); c.restore();
    /* little arms raised: boo! */
    const wave = Math.sin(an * 4) * 0.25;
    for (const [ax, a] of [[-5, -2.3 + wave], [4.8, 2.2 - wave]]) { c.save(); c.translate(ax, 1.2); c.rotate(a); ell(c, 0, -1.8, 1.3, 2.3); c.lineWidth = 1.4; c.strokeStyle = OL; c.stroke(); c.fillStyle = '#f8f5ff'; c.fill(); c.restore(); }
    /* face: big eyes, an open "boo" mouth, blush */
    c.fillStyle = OL; ell(c, -0.6, -1.6, 1.15, 1.55); c.fill(); ell(c, 2.9, -1.7, 1.15, 1.55); c.fill();
    c.fillStyle = '#fff'; circ(c, -0.3, -2.2, 0.45); c.fill(); circ(c, 3.2, -2.3, 0.45); c.fill();
    ell(c, 1.3, 1.6, 1.1, 1.4); c.fillStyle = '#5a1432'; c.fill(); c.fillStyle = '#ff7d9a'; ell(c, 1.3, 2.4, 0.7, 0.45); c.fill();
    c.globalAlpha *= 0.8; c.fillStyle = '#ffa8c8'; ell(c, -2.6, 0.4, 1.0, 0.55); c.fill(); ell(c, 4.6, 0.3, 0.8, 0.5); c.fill();
    c.restore();
  }
  function bat(c, e, fr) {
    const an = e.anim || 0, x = e.x + 7, y = e.y + 6, f = faceDir(e), fl = Math.sin(an * 7);
    c.save(); if (!e.alive) dieXf(c, e, x, y + 6);
    c.translate(x, y + fl * 0.8); c.scale(f, 1);
    batPath(c, 0, 0, 1.05, fl, 1); c.lineWidth = 1.8; c.strokeStyle = OL; c.stroke(); c.fillStyle = '#6a46a8'; c.fill();
    c.fillStyle = '#4a2c80'; ell(c, 0, 0.6, 1.4, 1.8); c.fill();
    c.fillStyle = '#ffa8c8'; for (const d of [-1, 1]) { c.beginPath(); c.moveTo(d * 0.9, -2.3); c.lineTo(d * 1.1, -3.3); c.lineTo(d * 0.45, -2.2); c.closePath(); c.fill(); }
    c.fillStyle = '#ffe36a'; ell(c, -0.2, -0.8, 0.75, 0.85); c.fill(); ell(c, 1.5, -0.8, 0.75, 0.85); c.fill(); c.fillStyle = OL; circ(c, 0.05, -0.7, 0.36); c.fill(); circ(c, 1.75, -0.7, 0.36); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0.2, 0.9); c.lineTo(0.55, 1.9); c.lineTo(0.9, 0.9); c.closePath(); c.fill(); c.beginPath(); c.moveTo(1.2, 0.9); c.lineTo(1.5, 1.7); c.lineTo(1.8, 0.9); c.closePath(); c.fill();
    c.restore();
  }
  function ceilingY(x, y) {
    const E = G.eng, cx = Math.floor(x / T); let cy = Math.floor(y / T) - 1;
    if (E && E.solidAt) for (let n = 0; n < 16 && cy >= 0; n++, cy--) if (E.solidAt(cx, cy)) return (cy + 1) * T;
    return ((G.S && G.S.camY) || 0) - 40;
  }
  function spider(c, e, fr) {
    const an = e.anim || 0, x = e.x + 7, bob = Math.sin(an * 0.9) * 2.2, y = e.y + 7 + bob, f = faceDir(e), sw = (e.vx || 0) * 4;
    c.save(); if (!e.alive) dieXf(c, e, x, e.y + 14);
    /* silk thread up to the ceiling (or out of the screen) */
    if (e.alive) { const top = ceilingY(x, e.y); c.strokeStyle = 'rgba(235,228,255,.75)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(x - sw, top); c.quadraticCurveTo(x - sw * 0.5, (top + y) / 2, x, y - 5); c.stroke(); }
    c.translate(x, y); c.scale(f, 1);
    /* eight wiggly legs */
    c.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) for (const d of [-1, 1]) for (let i = 0; i < 4; i++) {
      const w = Math.sin(an * 2.2 + i * 1.3 + (d > 0 ? 1.1 : 0)), ry = -1.8 + i * 1.25, kx = d * (6.2 + (i === 1 || i === 2 ? 0.7 : 0)), ky = ry - 2.6 + w * 0.7, fx = d * (7.0 + (i === 0 || i === 3 ? -0.6 : 0.4)), fy = ry + 2.4 + i * 0.5 - w * 0.5;
      c.beginPath(); c.moveTo(d * 2.4, ry); c.quadraticCurveTo(kx, ky, fx, fy); c.strokeStyle = pass ? '#3a2552' : OL; c.lineWidth = pass ? 0.9 : 2.1; c.stroke();
    }
    /* fuzzy spiky body: it is not safe to jump on */
    c.beginPath(); for (let i = 0; i < 22; i++) { const a = i / 22 * TAU, r = i % 2 ? 4.6 : 6.1; const px = Math.cos(a) * r, py = Math.sin(a) * r * 0.95; if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.closePath(); c.lineWidth = 1.6; c.strokeStyle = OL; c.stroke(); c.fillStyle = '#3a2552'; c.fill();
    c.fillStyle = '#ff8a2a'; c.beginPath(); c.moveTo(-1.2, -4.4); c.lineTo(1.2, -4.4); c.lineTo(0, -2.8); c.closePath(); c.fill(); c.beginPath(); c.moveTo(-1.2, -1.2); c.lineTo(1.2, -1.2); c.lineTo(0, -2.8); c.closePath(); c.fill();
    /* face: two big glowing eyes, two small ones, fangs */
    const blink = mod(an * 0.4 + e.x * 0.01, 5) < 0.12;
    c.fillStyle = '#ff5a6a'; if (blink) { c.fillRect(-2.6, 1.2, 2, 0.6); c.fillRect(0.8, 1.2, 2, 0.6); } else { ell(c, -1.6, 1.4, 1.2, 1.35); c.fill(); ell(c, 1.8, 1.4, 1.2, 1.35); c.fill(); c.fillStyle = '#fff'; circ(c, -1.3, 0.9, 0.45); c.fill(); circ(c, 2.1, 0.9, 0.45); c.fill(); }
    c.fillStyle = '#ff9aa6'; circ(c, -3.1, -0.2, 0.5); c.fill(); circ(c, 3.3, -0.2, 0.5); c.fill();
    c.fillStyle = '#fff'; for (const d of [-1, 1]) { c.beginPath(); c.moveTo(d * 0.4 + 0.1, 3.1); c.lineTo(d * 1.3 + 0.1, 3.1); c.lineTo(d * 0.85 + 0.1, 4.6); c.closePath(); c.fill(); }
    c.restore();
  }
  function broom(c, e, fr) {
    const x = e.x, y = e.y, t = fr / 60, dir = e.kind === 'platformH' ? ((e.vx || 1) * (e.dir || 1) < 0 ? -1 : 1) : 1, bob = Math.sin(t * 2.4 + x * 0.05) * 0.6;
    c.save();
    /* magic dust trailing from the bristles */
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) { const p = mod(t * 1.3 + i / 6, 1), px = x + 20 - dir * (30 + p * 18), py = y + 9 + Math.sin(p * 9 + i) * 2.4 + p * 3; c.globalAlpha = 0.8 * (1 - p); c.fillStyle = i % 2 ? '#ffb84a' : '#c9a0ff'; circ(c, px, py, 0.9 * (1 - p) + 0.3); c.fill(); }
    c.restore();
    c.translate(x + 20, y + 8.5 + bob); c.scale(dir, 1); c.rotate(-0.04);
    /* bristles */
    const br = () => { c.beginPath(); c.moveTo(-21, -1.6); c.quadraticCurveTo(-28, -5.5, -34, -4.2); c.quadraticCurveTo(-31, -0.5, -35, 3.6); c.quadraticCurveTo(-28, 4.5, -21, 1.6); c.closePath(); };
    br(); c.lineWidth = 2; c.strokeStyle = OL; c.stroke(); c.fillStyle = '#e8b04a'; c.fill();
    c.save(); br(); c.clip(); c.strokeStyle = '#b8802a'; c.lineWidth = 0.6; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(-21, i * 0.4); c.quadraticCurveTo(-28, i * 1.0, -35, i * 1.3 + Math.sin(t * 6 + i) * 0.4); c.stroke(); } c.restore();
    rr(c, -23, -2.2, 3.2, 4.4, 1); c.fillStyle = '#8a3ac0'; c.fill(); c.strokeStyle = OL; c.lineWidth = 0.8; c.stroke();
    /* the stick */
    rr(c, -22, -1.1, 46, 2.2, 1.1); c.fillStyle = '#7a4a26'; c.fill(); c.strokeStyle = OL; c.lineWidth = 0.9; c.stroke();
    c.restore();
    /* the plank tied onto the broom: its top is the platform surface */
    c.save(); c.translate(0, bob * 0.3);
    rr(c, x - 0.5, y - 1, 41, 6.4, 1.6); c.fillStyle = '#9a6a42'; c.fill(); c.strokeStyle = OL; c.lineWidth = 1; c.stroke();
    c.fillStyle = 'rgba(255,230,190,.28)'; c.fillRect(x + 1.5, y - 0.2, 37, 1.2);
    c.strokeStyle = 'rgba(70,35,15,.45)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(x + 3, y + 2.6); c.quadraticCurveTo(x + 12, y + 1.9, x + 19, y + 2.8); c.moveTo(x + 22, y + 2.2); c.quadraticCurveTo(x + 30, y + 3, x + 37, y + 2.3); c.stroke();
    c.fillStyle = '#4a3a3a'; circ(c, x + 3.2, y + 1.2, 0.55); c.fill(); circ(c, x + 36.8, y + 1.2, 0.55); c.fill();
    c.strokeStyle = '#d8b878'; c.lineWidth = 1.1; for (const rx of [x + 9, x + 31]) { c.beginPath(); c.moveTo(rx - 1, y - 1); c.lineTo(rx - 1, y + 9.6); c.moveTo(rx + 1, y - 1); c.lineTo(rx + 1, y + 9.6); c.stroke(); }
    c.restore();   /* (one restore per save: an extra one here popped the level transform and lifted everything drawn after a broom) */
  }
  function drawEnt(c, e, fr) {
    const L = e.look;
    if (L === 'jacko' && e.kind === 'walker') { jacko(c, e, fr); return true; }
    if (L === 'ghost' && e.kind === 'flyer') { if (e.hwBat === undefined) e.hwBat = Math.floor(e.x / 16) % 2 === 1; if (e.hwBat) bat(c, e, fr); else ghost(c, e, fr); return true; }
    if (L === 'spider' && e.kind === 'spiky') { spider(c, e, fr); return true; }
    if (L === 'broom' && (e.kind === 'platformH' || e.kind === 'platformV')) { broom(c, e, fr); return true; }
    return false;
  }

  /* ================= main menu dressing (drawn over the hills, under the pedestal and the hero) ================= */
  function menuOverlay(c, VW, t) {
    const hx = 10 + (VW - 266) / 2, mx = hx + 72, my = 58, R = 30;
    /* a big orange harvest moon between the title and the dashboard */
    c.save();
    let gr = c.createRadialGradient(mx, my, R * 0.6, mx, my, R * 3.2); gr.addColorStop(0, 'rgba(255,160,70,.42)'); gr.addColorStop(0.4, 'rgba(255,120,80,.14)'); gr.addColorStop(1, 'rgba(255,100,120,0)'); c.fillStyle = gr; c.fillRect(mx - R * 3.2, my - R * 3.2, R * 6.4, R * 6.4);
    gr = c.createRadialGradient(mx - R * 0.35, my - R * 0.4, R * 0.1, mx, my, R); gr.addColorStop(0, '#ffe2a8'); gr.addColorStop(0.6, '#ffb45a'); gr.addColorStop(1, '#ff8a3a'); c.fillStyle = gr; circ(c, mx, my, R); c.fill();
    c.save(); circ(c, mx, my, R); c.clip(); c.fillStyle = 'rgba(214,100,40,.28)'; for (const [dx, dy, r0] of [[-0.35, -0.2, 0.22], [0.3, 0.35, 0.16], [0.18, -0.48, 0.11], [-0.12, 0.48, 0.1], [0.55, -0.05, 0.09]]) { circ(c, mx + dx * R, my + dy * R, r0 * R); c.fill(); } c.restore();
    /* a wisp of cloud across it */
    { const cw = cloudSpr(c, 1), x = mx - 75 + Math.sin(t * 0.25) * 10; c.globalAlpha = 0.55; c.drawImage(cw.c, x, my + 2, cw.w, cw.h * 0.8); c.globalAlpha = 1; }
    /* bats flitting around the moon and over the sky */
    c.fillStyle = '#1a0b29';
    for (let i = 0; i < 5; i++) { const a = t * (0.5 + i * 0.07) + i * 1.3, rx = 44 + i * 14, ry = 16 + i * 5, x = mx + Math.cos(a) * rx - 10, y = my + Math.sin(a * 1.3) * ry - 6 + i * 3, fl = Math.sin(t * (11 + i * 1.7) + i); batPath(c, x, y, 0.8 + (i % 3) * 0.2, fl, Math.sin(a) > 0 ? 1 : -1); c.fill(); }
    /* glowing pumpkins on the hills in the bottom corners */
    const pk = (x, y, r, s) => { const k = flick(t, s); c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, x, y, r * 3.2, 'rgba(255,140,40,A)', 0.4 * k); c.restore(); pumpkinShape(c, x, y, r); fs(c, '#ff8a2a', OL, 1.2); c.save(); pumpkinShape(c, x, y, r); c.clip(); c.strokeStyle = 'rgba(176,64,20,.7)'; c.lineWidth = 0.9; for (const dx of [-0.42, 0.42]) { c.beginPath(); c.moveTo(x + dx * r, y - r); c.quadraticCurveTo(x + dx * r * 1.7, y, x + dx * r, y + r); c.stroke(); } c.fillStyle = 'rgba(255,255,255,.35)'; ell(c, x - r * 0.45, y - r * 0.45, r * 0.16, r * 0.3, 0.4); c.fill(); c.restore(); c.fillStyle = '#6a5a24'; rr(c, x - r * 0.12, y - r * 1.25, r * 0.26, r * 0.42, r * 0.1); c.fill(); carvedFace(c, x + r * 0.05, y, r * 0.85, 1, k, s % 2 === 1); };
    const vine = (x0, y0, x1, y1) => { c.strokeStyle = OL; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 7, x1, y1); c.stroke(); c.strokeStyle = '#5aa83a'; c.lineWidth = 1; c.stroke(); const lx = (x0 + x1) / 2, ly = Math.min(y0, y1) - 3.4; c.save(); c.translate(lx, ly); c.rotate(-0.5); ell(c, 2.6, 0, 3, 1.5); fs(c, '#6fbf4a', OL, 0.9); c.restore(); c.strokeStyle = '#6fbf4a'; c.lineWidth = 0.9; c.beginPath(); c.arc(lx - 3, ly - 2, 1.6, 0, 4.6); c.stroke(); };
    vine(24, 246, 47, 258); pk(22, 250, 12, 0); pk(48, 261, 7, 3); pk(6, 266, 6, 5);
    vine(hx + 92, 262, hx + 110, 256); pk(hx + 108, 258, 9, 1); pk(VW - 16, 263, 7.5, 2);
    /* soft fog drifting along the bottom */
    for (let i = 0; i < 6; i++) { const x = mod(i * 110 + t * (6 + i), VW + 160) - 80, y = 238 + (i % 3) * 9; c.save(); c.translate(x, y); c.scale(3.4, 1); gr = c.createRadialGradient(0, 0, 0, 0, 0, 16); gr.addColorStop(0, 'rgba(220,196,255,.16)'); gr.addColorStop(1, 'rgba(220,196,255,0)'); c.fillStyle = gr; c.fillRect(-16, -16, 32, 32); c.restore(); }
    c.restore();
    return true;
  }

  G.art = G.art || {};
  const prevEnt = G.art.ent, prevBg = G.art.bg, prevDeco = G.art.decoTile;
  G.art.bg = (ctx, W, cam, fr, VW) => (W && W.key === 'halloween') ? drawBg(ctx, W, cam, fr, VW || G.VW || 480) : (prevBg ? prevBg(ctx, W, cam, fr, VW) : false);
  G.art.decoTile = (ctx, W, x, y, cx, fr, ch) => (W && W.key === 'halloween') ? drawDeco(ctx, W, x, y, cx, fr, ch) : (prevDeco ? prevDeco(ctx, W, x, y, cx, fr, ch) : false);
  G.art.ent = (ctx, e, fr) => drawEnt(ctx, e, fr) || (prevEnt ? prevEnt(ctx, e, fr) : false);
  G.art.menuHalloween = (ctx, VW, t) => menuOverlay(ctx, VW || G.VW || 480, +t || 0);
})();
