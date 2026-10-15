/* The Starway Home puzzle: weltraum-bloecke "Die Frachtraum-Blöcke".
   A 3x3x3 build space in a cargo hold, seen in a live perspective 3D view (drag to orbit). Three hologram silhouettes (Vorne, Seite,
   Oben) are projected onto the back wall, the side wall and the floor; the blocks cast glowing shadows onto the same walls.
   Goal: match all three silhouettes with EXACTLY N blocks, where N is the minimum possible (found by a branch-and-bound search).
   Blocks are toggled in three 3x3 layer grids (unten / Mitte / oben). The targets come from a random connected shape of 6..9 blocks,
   and the generator makes sure the minimum is clearly smaller than "fill every allowed cell". */
(function () {
  const G = window.PW = window.PW || {};
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de);
  const TAU = Math.PI * 2, FONT = '"Fredoka", sans-serif';
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);

  /* ---------- tiny shared helpers ---------- */
  function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function txt(g, s, x, y, px, col, o) {
    o = o || {}; g.font = (o.w || 700) + ' ' + px + 'px ' + FONT; g.textAlign = o.align || 'center'; g.textBaseline = 'middle';
    if (o.stroke) { g.lineJoin = 'round'; g.lineWidth = o.sw || px * 0.28; g.strokeStyle = o.stroke; g.strokeText(s, x, y); }
    if (o.glow) { g.save(); g.shadowColor = o.glow; g.shadowBlur = o.blur || px * 0.6; g.fillStyle = col; g.fillText(s, x, y); g.restore(); }
    g.fillStyle = col; g.fillText(s, x, y);
  }
  function makeStage(root, hooks) {
    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none';
    root.appendChild(cv);
    const ctx = cv.getContext('2d');
    const S = {cv, ctx, w: 0, h: 0, dpr: 1, t: 0, hits: [], hover: null, dead: false, last: performance.now(), raf: 0};
    S.hit = (id, x, y, w, h, data) => S.hits.push({id, x, y, w, h, data});
    S.render = dt => { if (!S.w) return; S.dt = dt || 0; ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0); S.hits.length = 0; hooks.draw(ctx, S); };
    const resize = () => {
      const w = root.clientWidth, h = root.clientHeight; if (!w || !h) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (w === S.w && h === S.h && dpr === S.dpr) return;
      S.w = w; S.h = h; S.dpr = dpr; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      if (hooks.layout) hooks.layout(S); S.render(0);
    };
    const find = (x, y) => { for (let i = S.hits.length - 1; i >= 0; i--) { const b = S.hits[i]; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b; } return null; };
    const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const down = e => { e.preventDefault(); const [x, y] = pos(e); try { cv.setPointerCapture(e.pointerId); } catch (_) {} if (hooks.down) hooks.down(find(x, y), x, y, e); };
    const move = e => { const [x, y] = pos(e); const h = find(x, y); S.hover = e.pointerType === 'touch' ? null : (h ? h.id : null); cv.style.cursor = h ? (h.id === 'view' ? 'grab' : 'pointer') : 'default'; if (hooks.move) hooks.move(h, x, y, e); };
    const up = e => { const [x, y] = pos(e); if (hooks.up) hooks.up(find(x, y), x, y, e); };
    const leave = () => { S.hover = null; };
    cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('pointerleave', leave);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null; if (ro) ro.observe(root); window.addEventListener('resize', resize);
    const loop = now => { if (S.dead) return; const dt = Math.min(0.05, Math.max(0, (now - S.last) / 1000)); S.last = now; S.t += dt; S.render(dt); S.raf = requestAnimationFrame(loop); };
    resize(); S.raf = requestAnimationFrame(loop);
    /* the host may still change the header/footer height right after mounting: re-measure a few times */
    const reT = [30, 200, 600].map(ms => setTimeout(resize, ms));
    S.destroy = () => { S.dead = true; reT.forEach(clearTimeout); cancelAnimationFrame(S.raf); if (ro) ro.disconnect(); window.removeEventListener('resize', resize); cv.remove(); };
    return S;
  }
  function tone(f, d, o) { try { G.audio.tone(f, d, o); } catch (e) {} }
  function noise(d, o) { try { G.audio.noise(d, o); } catch (e) {} }
  function sparkle(g, x, y, r) { g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.3, y - r * 0.3); g.lineTo(x + r, y); g.lineTo(x + r * 0.3, y + r * 0.3); g.lineTo(x, y + r); g.lineTo(x - r * 0.3, y + r * 0.3); g.lineTo(x - r, y); g.lineTo(x - r * 0.3, y - r * 0.3); g.closePath(); g.fill(); }

  /* ---------- model: cell i = x + 3*z + 9*y (x: links->rechts, z: vorne->hinten, y: unten->oben) ---------- */
  const cx_ = i => i % 3, cz_ = i => Math.floor(i / 3) % 3, cy_ = i => Math.floor(i / 9);
  const idx = (x, y, z) => x + 3 * z + 9 * y;
  /* projection bits: front (x,y) 0..8, side (z,y) 9..17, top (x,z) 18..26 */
  const MASK = []; for (let i = 0; i < 27; i++) { const x = cx_(i), y = cy_(i), z = cz_(i); MASK.push((1 << (x + 3 * y)) | (1 << (9 + z + 3 * y)) | (1 << (18 + x + 3 * z))); }
  const pop = m => { let n = 0; while (m) { m &= m - 1; n++; } return n; };
  const projOf = cells => { let m = 0; for (let i = 0; i < 27; i++) if (cells[i]) m |= MASK[i]; return m; };
  function minCover(target) {
    const allowed = []; for (let i = 0; i < 27; i++) if ((MASK[i] & ~target) === 0) allowed.push(i);
    const byBit = []; for (let b = 0; b < 27; b++) byBit.push(allowed.filter(i => (MASK[i] >> b) & 1));
    let best = null, bestN = 99;
    const chosen = [];
    (function rec(cov) {
      if (cov === target) { if (chosen.length < bestN) { bestN = chosen.length; best = chosen.slice(); } return; }
      const rem = target & ~cov;
      const lb = Math.max(pop(rem & 511), pop((rem >> 9) & 511), pop((rem >> 18) & 511));
      if (chosen.length + lb >= bestN) return;
      let bb = -1, bn = 99; for (let b = 0; b < 27; b++) if ((rem >> b) & 1) { const n = byBit[b].length; if (n < bn) { bn = n; bb = b; } }
      if (bn === 0) return;
      for (const i of byBit[bb]) { chosen.push(i); rec(cov | MASK[i]); chosen.pop(); }
    })(0);
    return {allowed, best, N: bestN};
  }
  function generate(rng) {
    for (let tries = 0; tries < 400; tries++) {
      const n = 6 + Math.floor(rng() * 4), set = new Set([Math.floor(rng() * 27)]);
      while (set.size < n) {
        const arr = [...set], i = arr[Math.floor(rng() * arr.length)], x = cx_(i), y = cy_(i), z = cz_(i);
        const nb = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]][Math.floor(rng() * 6)];
        const X = x + nb[0], Y = y + nb[1], Z = z + nb[2]; if (X < 0 || X > 2 || Y < 0 || Y > 2 || Z < 0 || Z > 2) continue;
        set.add(idx(X, Y, Z));
      }
      const cells = new Array(27).fill(0); set.forEach(i => { cells[i] = 1; });
      const target = projOf(cells);
      const views = [target & 511, (target >> 9) & 511, (target >> 18) & 511];
      if (views.some(v => pop(v) < 3 || pop(v) > 8)) continue;
      const mc = minCover(target);
      if (!mc.best || mc.N < 5 || mc.N > 8) continue;
      if (mc.allowed.length - mc.N < 3) continue;
      /* assert: the stored solution really reproduces the targets with N blocks */
      const chk = new Array(27).fill(0); mc.best.forEach(i => { chk[i] = 1; });
      if (projOf(chk) !== target || mc.best.length !== mc.N) continue;
      return {target, N: mc.N, sol: mc.best, allowed: mc.allowed.length, shapeN: n};
    }
    /* fallback: a hand-checked "staircase" */
    const cells = new Array(27).fill(0); [idx(0, 0, 0), idx(1, 0, 0), idx(2, 0, 0), idx(2, 0, 1), idx(2, 1, 1), idx(2, 1, 2), idx(1, 2, 2), idx(0, 2, 2)].forEach(i => { cells[i] = 1; });
    const target = projOf(cells), mc = minCover(target);
    return {target, N: mc.N, sol: mc.best, allowed: mc.allowed.length, shapeN: 8};
  }

  /* ---------- tiny 3D ---------- */
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const TGT = [-0.3, -0.35, 0.3], DIST = 7.6, WALL = 2.0;
  function camera(th, ph) {
    const cam = [TGT[0] + DIST * Math.sin(th) * Math.cos(ph), TGT[1] + DIST * Math.sin(ph), TGT[2] - DIST * Math.cos(th) * Math.cos(ph)];
    const f = norm(sub(TGT, cam)), r = norm(cross([0, 1, 0], f)), u = cross(f, r);
    return {cam, f, r, u, focal: 1, ox: 0, oy: 0};
  }
  function proj(C, p) { const d = sub(p, C.cam), z = dot(d, C.f); return [C.ox + dot(d, C.r) / z * C.focal, C.oy - dot(d, C.u) / z * C.focal, z]; }
  function path(g, C, pts) { g.beginPath(); pts.forEach((p, i) => { const q = proj(C, p); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath(); }
  function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function shadeCol(h, k) { const c = hexRgb(h); const f = v => Math.round(k >= 1 ? v + (255 - v) * (k - 1) : v * k); return 'rgb(' + f(c[0]) + ',' + f(c[1]) + ',' + f(c[2]) + ')'; }
  const LAYER_COL = ['#ff9eb0', '#ffd84a', '#9be7a5'];
  const LAYER_NAME = [tr('Ebene unten', 'Bottom layer'), tr('Ebene Mitte', 'Middle layer'), tr('Ebene oben', 'Top layer')];
  const LIGHT = norm([0.45, 0.85, -0.55]);

  /* ---------- in-level station: a sci-fi crate with a hologram cube ---------- */
  function station(g, x, y, t, solved) {
    g.save();
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y, 15, 3, 0, 0, TAU); g.fill();
    rr(g, x - 13, y - 18, 26, 18, 3); g.fillStyle = '#6a7aa8'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#1a1a3a'; g.stroke();
    g.fillStyle = '#ffd84a'; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x - 11 + k * 6, y - 3); g.lineTo(x - 8 + k * 6, y - 3); g.lineTo(x - 5 + k * 6, y - 7); g.lineTo(x - 8 + k * 6, y - 7); g.closePath(); g.fill(); }
    rr(g, x - 8, y - 15, 16, 6, 2); g.fillStyle = '#2a2a5a'; g.fill(); g.fillStyle = solved ? '#9be7a5' : '#8fd3ff'; g.fillRect(x - 6, y - 13, 12 * (0.5 + 0.5 * Math.sin(t * 3)), 2);
    /* hologram cone + rotating wire cube */
    const col = solved ? '155,231,165' : '143,211,255';
    g.fillStyle = 'rgba(' + col + ',.35)'; g.beginPath(); g.moveTo(x - 3, y - 18); g.lineTo(x + 3, y - 18); g.lineTo(x + 9, y - 36); g.lineTo(x - 9, y - 36); g.closePath(); g.fill();
    const a = t * 1.4, s = 6.5, cyc = y - 29 + Math.sin(t * 2) * 1.2;
    const P = []; for (const dx of [-1, 1]) for (const dy of [-1, 1]) for (const dz of [-1, 1]) { const X = dx * Math.cos(a) - dz * Math.sin(a), Z = dx * Math.sin(a) + dz * Math.cos(a); P.push([x + X * s * 0.75, cyc + dy * s * 0.62 + Z * s * 0.25]); }
    g.strokeStyle = 'rgba(26,26,58,.55)'; g.lineWidth = 2.6; g.beginPath(); [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([p, q]) => { g.moveTo(P[p][0], P[p][1]); g.lineTo(P[q][0], P[q][1]); }); g.stroke();
    g.strokeStyle = 'rgba(' + col + ',1)'; g.lineWidth = 1.3; g.beginPath();
    [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([p, q]) => { g.moveTo(P[p][0], P[p][1]); g.lineTo(P[q][0], P[q][1]); }); g.stroke();
    g.restore();
  }

  /* ---------- mount ---------- */
  function mount(root, api) {
    const rng = api.rng || Math.random;
    let Z = generate(rng);
    const cells = new Array(27).fill(0), scale = new Array(27).fill(0), pulse = new Array(27).fill(0);
    let th = 0.62, ph = 0.42, drag = null, lastDrag = -10, done = false, winT = -1, warned = -1, pressBtn = null, pressT = 0, flashWall = [0, 0, 0], prevMatch = [false, false, false], hoverCell = -1, autoMode = false;
    const parts = [];
    let L = {};
    const timers = []; const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
    function burst(x, y, n, cols, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = (0.3 + Math.random()) * (sp || 120); parts.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life: 0.5 + Math.random() * 0.7, age: 0, r: 1.2 + Math.random() * 2, col: cols[i % cols.length], star: Math.random() < 0.5}); } }
    const count = () => cells.reduce((a, b) => a + b, 0);

    function layout(S) {
      const w = S.w, h = S.h, small = h < 260, pad = small ? 6 : 8;
      const vw = small ? clamp(w * 0.33, 220, 300) : clamp(w * 0.47, 300, 470);
      L.small = small;
      L.view = {x: pad, y: pad, w: vw, h: h - pad * 2};
      const RX = pad * 2 + vw, RW = w - RX - pad, RH = h - pad * 2;
      const lab = small ? 13 : 16, cS = small ? 16 : clamp(RH * 0.085, 18, 30), sGap = small ? 10 : 16, gGap = small ? 10 : 16, rowGap = small ? 6 : 14;
      const topH = small ? lab + 3 * cS : Math.max(lab + 3 * cS, 136);
      const cL = Math.floor(Math.min(48, (RH - topH - rowGap - lab) / 3, (RW - 2 * gGap) / 9));
      const total = topH + rowGap + lab + 3 * cL, oy = pad + Math.max(0, (RH - total) / 2);
      L.sil = {x: RX, y: oy, cS, sGap, lab};
      const silW = 9 * cS + 2 * sGap;
      L.ctrl = {x: RX + silW + (small ? 14 : 20), y: oy, w: RW - silW - (small ? 14 : 20), h: topH};
      L.grid = {x: RX, y: oy + topH + rowGap, cL, gGap, lab};
      /* fit the camera framing once, from the default angles */
      const C = camera(0.62, 0.42); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const a of [-WALL, WALL]) for (const b of [-WALL, WALL]) for (const p of [[-WALL, a, b], [a, -WALL, b], [a, b, WALL]]) { const q = proj(C, p); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
      const V = L.view, k = Math.min((V.w * 0.9) / (x1 - x0), (V.h * 0.86) / (y1 - y0));
      L.fit = {focal: k, ox: V.x + V.w / 2 - (x0 + x1) / 2 * k, oy: V.y + V.h / 2 - (y0 + y1) / 2 * k + V.h * 0.02};
    }

    function toggle(i, silent) {
      if (done) return;
      cells[i] ^= 1; pulse[i] = 1;
      const y = cy_(i);
      if (!silent) {
        if (cells[i]) { tone(330 + y * 110, 0.09, {type: 'triangle', gain: 0.16}); tone(660 + y * 220, 0.06, {type: 'sine', gain: 0.08, delay: 0.05}); noise(0.06, {type: 'lowpass', freq: 500, gain: 0.12}); }
        else { tone(300 + y * 80, 0.1, {type: 'sine', gain: 0.12, slide: -120, slideDur: 0.1}); }
      }
      check();
    }
    function check() {
      const cur = projOf(cells), n = count();
      const match = [0, 9, 18].map(s => ((cur >> s) & 511) === ((Z.target >> s) & 511));
      match.forEach((m, k) => { if (m && !prevMatch[k]) { flashWall[k] = 1; if (!autoMode) tone(880 + k * 110, 0.12, {type: 'sine', gain: 0.1}); } });
      prevMatch = match;
      if (match.every(Boolean)) {
        if (n === Z.N) { win(); return; }
        if (warned !== n) { warned = n; api.msg(tr('Alle drei Schatten passen – aber das sind ' + n + ' Blöcke. Es geht mit genau ' + Z.N + '!', 'All three shadows match – but that is ' + n + ' blocks. It works with exactly ' + Z.N + '!'), 'info'); }
      } else if (warned >= 0) { warned = -1; api.msg('', 'info'); }
    }
    function win() {
      if (done) return; done = true; winT = 0;
      try { G.audio.sfx.powerup(); } catch (e) {}
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, {type: 'triangle', gain: 0.13, delay: 0.1 + i * 0.07}));
      const V = L.view; burst(V.x + V.w / 2, V.y + V.h / 2, 60, ['#8fd3ff', '#ffd84a', '#ff9eb0', '#9be7a5', '#fff4e0'], 220);
      later(() => api.solved(), 1000);
    }
    function clearAll() { if (done) return; for (let i = 0; i < 27; i++) if (cells[i]) { cells[i] = 0; pulse[i] = 1; } tone(260, 0.15, {type: 'sine', gain: 0.12, slide: -100, slideDur: 0.15}); check(); }
    function fresh() { if (done) return; Z = generate(rng); for (let i = 0; i < 27; i++) cells[i] = 0; prevMatch = [false, false, false]; warned = -1; try { G.audio.sfx.appear(); } catch (e) {} api.msg(tr('Neue Fracht! Benutze genau ' + Z.N + ' Blöcke.', 'New cargo! Use exactly ' + Z.N + ' blocks.'), 'info'); }

    /* ---------- drawing ---------- */
    function draw(g, S) {
      const {w, h, t} = S, dt = S.dt || 0;
      pressT = Math.max(0, pressT - dt); if (winT >= 0) winT += dt;
      for (let i = 0; i < 27; i++) { scale[i] += ((cells[i] ? 1 : 0) - scale[i]) * Math.min(1, dt * 14); if (Math.abs(scale[i] - cells[i]) < 0.01) scale[i] = cells[i]; pulse[i] = Math.max(0, pulse[i] - dt * 2.5); }
      for (let k = 0; k < 3; k++) flashWall[k] = Math.max(0, flashWall[k] - dt * 1.5);
      const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#141432'); bg.addColorStop(1, '#22163a'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
      draw3D(g, S);
      drawSilhouettes(g, S);
      drawControls(g, S);
      drawGrids(g, S);
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.age += dt; if (p.age > p.life) { parts.splice(i, 1); continue; } p.vy += 120 * dt; p.x += p.vx * dt; p.y += p.vy * dt; g.globalAlpha = 1 - p.age / p.life; g.fillStyle = p.col; if (p.star) sparkle(g, p.x, p.y, p.r * 1.8); else { g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); } }
      g.restore(); g.globalAlpha = 1;
    }

    function wallPix(k, a, b) {
      /* k: 0 back wall (front view, a=x b=y), 1 left wall (side view, a=z b=y), 2 floor (top view, a=x b=z) */
      const A0 = a - 1.5, A1 = a - 0.5, B0 = b - 1.5, B1 = b - 0.5, e = 0.06;
      if (k === 0) return [[A0 + e, B0 + e, WALL], [A1 - e, B0 + e, WALL], [A1 - e, B1 - e, WALL], [A0 + e, B1 - e, WALL]];
      if (k === 1) return [[-WALL, B0 + e, A0 + e], [-WALL, B0 + e, A1 - e], [-WALL, B1 - e, A1 - e], [-WALL, B1 - e, A0 + e]];
      return [[A0 + e, -WALL, B0 + e], [A1 - e, -WALL, B0 + e], [A1 - e, -WALL, B1 - e], [A0 + e, -WALL, B1 - e]];
    }
    function draw3D(g, S) {
      const {t} = S, V = L.view;
      g.save(); rr(g, V.x, V.y, V.w, V.h, 14); g.clip();
      const vg = g.createLinearGradient(0, V.y, 0, V.y + V.h); vg.addColorStop(0, '#1e1e48'); vg.addColorStop(1, '#0e0e26'); g.fillStyle = vg; g.fillRect(V.x, V.y, V.w, V.h);
      const idle = !drag && S.t - lastDrag > 1.5;
      const T = th + (idle ? Math.sin(t * 0.6) * 0.07 : 0), Ph = ph + (idle ? Math.sin(t * 0.43) * 0.035 : 0);
      const C = camera(T, Ph); C.focal = L.fit.focal; C.ox = L.fit.ox; C.oy = L.fit.oy;
      const cur = projOf(cells);
      const WC = ['#3a3a7a', '#34346e', '#2e2e62'];
      const wallQuad = [
        [[-WALL, -WALL, WALL], [WALL, -WALL, WALL], [WALL, WALL, WALL], [-WALL, WALL, WALL]],
        [[-WALL, -WALL, -WALL], [-WALL, -WALL, WALL], [-WALL, WALL, WALL], [-WALL, WALL, -WALL]],
        [[-WALL, -WALL, -WALL], [WALL, -WALL, -WALL], [WALL, -WALL, WALL], [-WALL, -WALL, WALL]],
      ];
      const labels = [tr('VORNE', 'FRONT'), tr('SEITE', 'SIDE'), tr('OBEN', 'TOP')];
      for (let k = 0; k < 3; k++) {
        path(g, C, wallQuad[k]); g.fillStyle = WC[k]; g.fill(); g.lineWidth = 2; g.strokeStyle = '#0a0a20'; g.stroke();
        /* plating */
        g.strokeStyle = 'rgba(143,211,255,.08)'; g.lineWidth = 1;
        for (let s = -1; s <= 1; s += 2) {
          const q = wallQuad[k], lerp3 = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
          const f = 0.5 + s * 0.4; const p1 = lerp3(q[0], q[1], f), p2 = lerp3(q[3], q[2], f), p3 = lerp3(q[0], q[3], f), p4 = lerp3(q[1], q[2], f);
          g.beginPath(); let a = proj(C, p1), b = proj(C, p2); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); a = proj(C, p3); b = proj(C, p4); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
        }
        const tv = (Z.target >> (k * 9)) & 511, cv = (cur >> (k * 9)) & 511, full = tv === cv, fl = flashWall[k];
        for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
          const bit = 1 << (a + 3 * b), inT = tv & bit, inC = cv & bit;
          if (!inT && !inC) continue;
          path(g, C, wallPix(k, a, b));
          if (inT && inC) { g.fillStyle = full ? 'rgba(155,231,165,' + (0.75 + fl * 0.25) + ')' : 'rgba(170,235,255,.85)'; g.fill(); }
          else if (inC) { g.fillStyle = 'rgba(255,111,156,' + (0.6 + 0.2 * Math.sin(t * 8)) + ')'; g.fill(); }
          else { g.fillStyle = 'rgba(143,211,255,' + (0.14 + 0.06 * Math.sin(t * 3 + a + b)) + ')'; g.fill(); g.setLineDash([4, 3]); g.lineWidth = 1.5; g.strokeStyle = 'rgba(143,211,255,.8)'; g.stroke(); g.setLineDash([]); }
        }
        if (fl > 0) { path(g, C, wallQuad[k]); g.fillStyle = 'rgba(155,231,165,' + fl * 0.25 + ')'; g.fill(); }
        /* label */
        const lp = k === 0 ? [0, WALL - 0.22, WALL] : (k === 1 ? [-WALL, WALL - 0.22, 0] : [WALL - 0.45, -WALL, 0.3]);
        const q = proj(C, lp); txt(g, labels[k] + (full ? ' ✓' : ''), q[0], q[1], L.small ? 9 : 11, full ? '#9be7a5' : 'rgba(191,240,255,.85)', {stroke: '#0a0a20', sw: 3});
      }
      /* build platform: 3x3 grid under the volume */
      const yb = -1.5;
      path(g, C, [[-1.5, yb, -1.5], [1.5, yb, -1.5], [1.5, yb, 1.5], [-1.5, yb, 1.5]]); g.fillStyle = 'rgba(143,211,255,.08)'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(143,211,255,.55)'; g.stroke();
      g.strokeStyle = 'rgba(143,211,255,.25)'; g.lineWidth = 1; g.beginPath();
      for (let k = -0.5; k <= 0.5; k += 1) { let a = proj(C, [k, yb, -1.5]), b = proj(C, [k, yb, 1.5]); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); a = proj(C, [-1.5, yb, k]); b = proj(C, [1.5, yb, k]); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
      g.stroke();
      /* volume corner posts */
      g.strokeStyle = 'rgba(143,211,255,.14)'; g.beginPath(); for (const [x, z] of [[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]]) { const a = proj(C, [x, yb, z]), b = proj(C, [x, 1.5, z]); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke();
      const fq = proj(C, [0, yb, -1.5]); txt(g, tr('vorne', 'front'), fq[0], fq[1] + (L.small ? 8 : 11), L.small ? 9 : 11, 'rgba(191,240,255,.75)', {w: 600, stroke: '#0a0a20', sw: 3});
      /* cubes, far to near */
      const list = [];
      for (let i = 0; i < 27; i++) if (scale[i] > 0.02 || i === hoverCell) { const c = [cx_(i) - 1, cy_(i) - 1, cz_(i) - 1]; const d = sub(c, C.cam); list.push({i, c, d: dot(d, d)}); }
      list.sort((a, b) => b.d - a.d);
      for (const o of list) {
        if (scale[o.i] > 0.02) drawCube(g, C, o.c, scale[o.i], LAYER_COL[cy_(o.i)], pulse[o.i], o.i, t);
        if (o.i === hoverCell) drawGhost(g, C, o.c, t);
      }
      g.restore();
      /* frame */
      rr(g, V.x, V.y, V.w, V.h, 14); g.lineWidth = 2.5; g.strokeStyle = 'rgba(143,211,255,.5)'; g.stroke();
      txt(g, tr('↻ ziehen zum Drehen', '↻ drag to rotate'), V.x + V.w - 8, V.y + V.h - (L.small ? 9 : 12), L.small ? 9 : 11, 'rgba(191,240,255,.55)', {align: 'right', w: 500});
      S.hit('view', V.x, V.y, V.w, V.h);
    }
    function cubeFaces(c, hs) {
      const [x, y, z] = c;
      const v = (dx, dy, dz) => [x + dx * hs, y + dy * hs, z + dz * hs];
      return [
        {n: [1, 0, 0], p: [v(1, -1, -1), v(1, -1, 1), v(1, 1, 1), v(1, 1, -1)]},
        {n: [-1, 0, 0], p: [v(-1, -1, 1), v(-1, -1, -1), v(-1, 1, -1), v(-1, 1, 1)]},
        {n: [0, 1, 0], p: [v(-1, 1, -1), v(1, 1, -1), v(1, 1, 1), v(-1, 1, 1)]},
        {n: [0, -1, 0], p: [v(-1, -1, 1), v(1, -1, 1), v(1, -1, -1), v(-1, -1, -1)]},
        {n: [0, 0, 1], p: [v(1, -1, 1), v(-1, -1, 1), v(-1, 1, 1), v(1, 1, 1)]},
        {n: [0, 0, -1], p: [v(-1, -1, -1), v(1, -1, -1), v(1, 1, -1), v(-1, 1, -1)]},
      ];
    }
    function drawCube(g, C, c, sc, col, pl, i, t) {
      const won = winT >= 0, bounce = won ? Math.max(0, Math.sin(winT * 10 - cy_(i) * 1.2 - cz_(i) * 0.6)) * 0.12 * Math.max(0, 1 - winT) : 0;
      const hs = 0.47 * sc * (1 + pl * 0.12), cc = [c[0], c[1] + bounce, c[2]];
      for (const f of cubeFaces(cc, hs)) {
        const fc = [0, 1, 2].map(k => (f.p[0][k] + f.p[2][k]) / 2);
        if (dot(f.n, sub(C.cam, fc)) <= 0) continue;
        const lit = 0.62 + 0.5 * Math.max(0, dot(f.n, LIGHT));
        path(g, C, f.p); g.fillStyle = shadeCol(col, lit); g.fill(); g.lineJoin = 'round'; g.lineWidth = L.small ? 1.6 : 2.2; g.strokeStyle = '#2a1508'; g.stroke();
        /* inset panel */
        const cen = fc, ins = f.p.map(p => [p[0] + (cen[0] - p[0]) * 0.28, p[1] + (cen[1] - p[1]) * 0.28, p[2] + (cen[2] - p[2]) * 0.28]);
        path(g, C, ins); g.lineWidth = 1.2; g.strokeStyle = 'rgba(42,21,8,.35)'; g.stroke();
        if (f.n[1] === 1) { g.fillStyle = 'rgba(255,255,255,.18)'; g.fill(); }
        if (pl > 0 || won) { path(g, C, f.p); g.fillStyle = 'rgba(255,255,255,' + Math.max(pl * 0.5, won ? 0.25 * (0.5 + 0.5 * Math.sin(t * 8)) : 0) + ')'; g.fill(); }
      }
    }
    function drawGhost(g, C, c, t) {
      g.save(); g.setLineDash([4, 3]); g.lineWidth = 1.6; g.strokeStyle = 'rgba(191,240,255,' + (0.6 + 0.3 * Math.sin(t * 6)) + ')';
      for (const f of cubeFaces(c, 0.48)) { path(g, C, f.p); g.stroke(); }
      g.restore();
    }

    function drawSilhouettes(g, S) {
      const P = L.sil, cS = P.cS, cur = projOf(cells), names = [tr('Vorne', 'Front'), tr('Seite', 'Side'), tr('Oben', 'Top')];
      for (let k = 0; k < 3; k++) {
        const x0 = P.x + k * (3 * cS + P.sGap), y0 = P.y + P.lab;
        const tv = (Z.target >> (k * 9)) & 511, cv = (cur >> (k * 9)) & 511, ok = tv === cv;
        txt(g, names[k] + (ok ? ' ✓' : ''), x0 + 1.5 * cS, P.y + P.lab / 2, L.small ? 11 : 13, ok ? '#9be7a5' : '#bff0ff', {w: 700});
        rr(g, x0 - 3, y0 - 3, 3 * cS + 6, 3 * cS + 6, 6); g.fillStyle = 'rgba(10,10,40,.8)'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = ok ? '#9be7a5' : 'rgba(143,211,255,.5)'; g.stroke();
        for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
          const bit = 1 << (a + 3 * b), inT = tv & bit, inC = cv & bit;
          const x = x0 + a * cS, y = y0 + (2 - b) * cS;
          rr(g, x + 1, y + 1, cS - 2, cS - 2, 3);
          if (inT && inC) g.fillStyle = ok ? '#9be7a5' : '#bff0ff';
          else if (inC) g.fillStyle = '#ff6f9c';
          else if (inT) g.fillStyle = 'rgba(143,211,255,.35)';
          else g.fillStyle = 'rgba(255,255,255,.05)';
          g.fill();
          if (inT && !inC) { g.lineWidth = 1; g.strokeStyle = 'rgba(143,211,255,.8)'; g.stroke(); }
        }
      }
    }
    function button(g, S, id, label, x, y, w, h, col) {
      const p = pressBtn === id && pressT > 0 ? 3 : 0, hov = S.hover === id;
      rr(g, x, y + 3, w, h, h / 2); g.fillStyle = 'rgba(0,0,0,.4)'; g.fill();
      rr(g, x, y + p, w, h, h / 2); g.fillStyle = col; g.fill(); g.lineWidth = 2.2; g.strokeStyle = '#1a1a3a'; g.stroke();
      if (hov) { rr(g, x, y + p, w, h, h / 2); g.fillStyle = 'rgba(255,255,255,.14)'; g.fill(); }
      rr(g, x + 5, y + p + 3, w - 10, h * 0.32, h * 0.2); g.fillStyle = 'rgba(255,255,255,.22)'; g.fill();
      txt(g, label, x + w / 2, y + p + h / 2 + 1, Math.min(h * 0.42, 14), '#fff', {stroke: '#1a1a3a', sw: 3});
      S.hit(id, x, y, w, h);
    }
    function drawControls(g, S) {
      const P = L.ctrl, n = count(), small = L.small, t = S.t;
      const over = n > Z.N, col = n === Z.N ? '#9be7a5' : (over ? '#ff8fa8' : '#ffd84a');
      if (small) {
        txt(g, tr('Benutze genau ' + Z.N + ' Blöcke', 'Use exactly ' + Z.N + ' blocks'), P.x, P.y + 8, 12, '#fff4e0', {align: 'left', w: 600});
        txt(g, n + ' / ' + Z.N, P.x + P.w, P.y + 8, 15, col, {align: 'right', stroke: '#1a1a3a', sw: 3});
        const bh = 36, by = P.y + P.h - bh - 2, bw = (P.w - 8) / 2;
        button(g, S, 'clear', tr('✕ Leeren', '✕ Clear'), P.x, by, bw, bh, '#7a3b57');
        button(g, S, 'new', tr('✦ Neue Fracht', '✦ New cargo'), P.x + bw + 8, by, bw, bh, '#3a8ad8');
      } else {
        const pz = 1 + (pulse.some(v => v > 0.6) ? 0.06 : 0);
        txt(g, tr('Benutze genau', 'Use exactly'), P.x + P.w / 2, P.y + 9, 13, '#e6c9d6', {w: 600});
        txt(g, Z.N + tr(' Blöcke', ' blocks'), P.x + P.w / 2, P.y + 28, 20 * pz, '#fff4e0', {stroke: '#1a1a3a', sw: 4});
        txt(g, tr('gesetzt: ', 'placed: ') + n, P.x + P.w / 2, P.y + 47, 13, col, {stroke: '#1a1a3a', sw: 3});
        const bh = Math.min(36, (P.h - 58 - 6) / 2), bw = P.w;
        button(g, S, 'clear', tr('✕ Leeren', '✕ Clear'), P.x, P.y + P.h - bh * 2 - 6, bw, bh, '#7a3b57');
        button(g, S, 'new', tr('✦ Neue Fracht', '✦ New cargo'), P.x, P.y + P.h - bh, bw, bh, '#3a8ad8');
      }
      void t;
    }
    function drawGrids(g, S) {
      const P = L.grid, cL = P.cL, t = S.t;
      hoverCell = -1;
      for (let y = 0; y < 3; y++) {
        const x0 = P.x + y * (3 * cL + P.gGap), y0 = P.y + P.lab;
        txt(g, LAYER_NAME[y], x0 + 1.5 * cL, P.y + P.lab / 2 - 1, L.small ? 11 : 13, LAYER_COL[y], {w: 700, stroke: '#1a1a3a', sw: 3});
        rr(g, x0 - 3, y0 - 3, 3 * cL + 6, 3 * cL + 6, 8); g.fillStyle = 'rgba(10,10,40,.75)'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(143,211,255,.35)'; g.stroke();
        /* front edge marker */
        g.fillStyle = 'rgba(143,211,255,.55)'; rr(g, x0 + cL * 0.6, y0 + 3 * cL + 1, cL * 1.8, 3, 1.5); g.fill();
        for (let x = 0; x < 3; x++) for (let z = 0; z < 3; z++) {
          const i = idx(x, y, z), px = x0 + x * cL, py = y0 + (2 - z) * cL, on = cells[i], hv = S.hover === 'g' + i;
          if (hv) hoverCell = i;
          const pp = pulse[i] * 0.15, inset = 2 - pp * cL * 0.5;
          rr(g, px + inset, py + inset, cL - inset * 2, cL - inset * 2, 6);
          if (on) {
            const gr = g.createLinearGradient(0, py, 0, py + cL); gr.addColorStop(0, shadeCol(LAYER_COL[y], 1.15)); gr.addColorStop(1, shadeCol(LAYER_COL[y], 0.8));
            g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = '#2a1508'; g.stroke();
            rr(g, px + cL * 0.25, py + cL * 0.25, cL * 0.5, cL * 0.5, 4); g.lineWidth = 1.2; g.strokeStyle = 'rgba(42,21,8,.35)'; g.stroke();
          } else {
            g.fillStyle = hv ? 'rgba(143,211,255,.22)' : 'rgba(255,255,255,.06)'; g.fill(); g.lineWidth = 1; g.strokeStyle = 'rgba(143,211,255,.25)'; g.stroke();
          }
          S.hit('g' + i, px, py, cL, cL, i);
        }
      }
      void t;
    }

    const S = makeStage(root, {
      layout, draw,
      down(h, x, y) {
        if (!h || autoMode) return;
        if (h.id === 'view') { drag = {x, y, th, ph}; return; }
        if (done) return;
        if (h.id[0] === 'g') toggle(h.data);
        else if (h.id === 'clear') { pressBtn = 'clear'; pressT = 0.15; clearAll(); }
        else if (h.id === 'new') { pressBtn = 'new'; pressT = 0.15; fresh(); }
      },
      move(h, x, y) { if (drag) { th = clamp(drag.th - (x - drag.x) * 0.012, 0.12, 1.42); ph = clamp(drag.ph + (y - drag.y) * 0.01, 0.15, 1.05); lastDrag = S.t; } },
      up() { if (drag) { drag = null; lastDrag = S.t; } },
    });
    api.msg(tr('Benutze genau ' + Z.N + ' Blöcke. Tipp auf die Ebenen-Felder, um Blöcke zu setzen.', 'Use exactly ' + Z.N + ' blocks. Tap the layer squares to place blocks.'), 'info');

    return {
      destroy() { S.destroy(); timers.forEach(clearTimeout); },
      autoSolve() {
        if (done) return; autoMode = true;
        for (let i = 0; i < 27; i++) cells[i] = 0;
        prevMatch = [false, false, false];
        Z.sol.forEach((i, k) => later(() => { cells[i] = 1; pulse[i] = 1; tone(400 + k * 60, 0.08, {type: 'triangle', gain: 0.12}); if (k === Z.sol.length - 1) { autoMode = false; check(); } }, 150 + k * 150));
      },
    };
  }

  G.PZ.register({
    id: 'weltraum-bloecke', world: 'weltraum', slot: 0,
    title: tr('Die Frachtraum-Blöcke', 'The Cargo Hold Blocks'),
    intro: tr('Setze Blöcke so, dass ihre Schatten an den Wänden genau die Umrisse Vorne, Seite und Oben füllen – mit genau so vielen Blöcken wie angegeben.', 'Place blocks so their shadows on the walls exactly fill the Front, Side and Top outlines – using exactly as many blocks as shown.'),
    letter: tr('Ein einziger Block wirft gleichzeitig einen Schatten nach vorne, zur Seite und nach unten. Sei sparsam, Toffo: Lass jeden Block möglichst viele Felder auf einmal füllen!', 'A single block casts a shadow to the front, to the side and down, all at once. Be thrifty, Toffo: let every block fill as many squares as it can at the same time!'),
    hint: tr('Ein Block darf nur dort stehen, wo alle drei Umrisse ihn erlauben (Vorne: gleiche Spalte und Höhe, Seite: gleiche Tiefe und Höhe, Oben: gleiche Spalte und Tiefe). Fang mit der Ansicht an, die die meisten Felder hat: Jedes ihrer Felder braucht einen eigenen Block. Stell diese Blöcke so, dass sie gleichzeitig die Felder der anderen beiden Ansichten abdecken.', 'A block may only go where all three outlines allow it (Front: same column and height, Side: same depth and height, Top: same column and depth). Start with the view that has the most squares: each of its squares needs its own block. Place those blocks so they cover the squares of the other two views at the same time.'),
    station,
    mount,
  });
})();
